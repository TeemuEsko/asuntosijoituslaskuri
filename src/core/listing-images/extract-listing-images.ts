import type { ListingImageCandidate, ListingImageExtractionSource, ListingImageType } from "./types.ts";

export const LISTING_IMAGE_LIMITS = { maxCandidates: 24 } as const;

type RawCandidate = Omit<ListingImageCandidate, "source" | "extractionSource" | "index" | "type" | "confidence"> & {
  extractionSource: ListingImageExtractionSource;
  alt?: string;
  context?: string;
  confidence?: number;
};

const blockedTokens = /(?:^|[\W_])(logo|icon|avatar|agent|broker|realtor|välittäj|valittaj|henkilö|henkilo|portrait|profile|banner|advert|mainos|doubleclick|tracking|pixel|sprite|placeholder|kartta|map|floor[\s_-]?plan|pohja(?:kuva|piirros)|energy|energia(?:todistus|luokka)|document|asiakirja|pdf)(?:[\W_]|$)/i;
const exteriorTokens = /julkisivu|ulkokuva|exterior|facade|piha|yard|terassi|terrace|parveke|balcony/i;
const interiorTokens = /olohuone|makuuhuone|keittiö|keittio|kylpyhuone|sauna|eteinen|sisäkuva|sisakuva|living|bedroom|kitchen|bathroom|interior/i;
const imageKey = /(?:^|[_-])(image|images|photo|photos|picture|pictures|gallery|media)(?:$|[_-])/i;

function decodeHtml(value: string): string {
  return value.replace(/&amp;/gi, "&").replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[(match[1] ?? "").toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function safeUrl(value: string, pageUrl: string): string | null {
  try {
    const decoded = decodeHtml(value).replace(/\\u0026/gi, "&").replace(/\\\//g, "/").trim();
    if (!decoded || decoded.startsWith("data:") || decoded.startsWith("blob:")) return null;
    const url = new URL(decoded, pageUrl);
    if (!/^https:$/.test(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
}

function numeric(value?: string): number | undefined {
  const parsed = Number(value?.match(/\d+/)?.[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function srcsetCandidates(value: string): Array<{ url: string; width?: number }> {
  const candidates: Array<{ url: string; width?: number }> = [];
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(\S+)(?:\s+(\d+(?:\.\d+)?)(w|x))?$/i);
    if (!match) continue;
    const amount = Number(match[2]);
    candidates.push({ url: match[1]!, width: match[3]?.toLowerCase() === "w" && Number.isFinite(amount) ? amount : match[3]?.toLowerCase() === "x" && Number.isFinite(amount) ? amount * 1000 : undefined });
  }
  return candidates.sort((left, right) => (right.width ?? 0) - (left.width ?? 0));
}

function classification(value: string): ListingImageType {
  if (/logo|icon|avatar|agent|broker|realtor|välittäj|valittaj|portrait|profile/i.test(value)) return "logo";
  if (/floor[\s_-]?plan|pohja(?:kuva|piirros)/i.test(value)) return "floor_plan";
  if (/(?:^|[\W_])map(?:[\W_]|$)|kartta/i.test(value)) return "map";
  if (/energy|energia(?:todistus|luokka)|document|asiakirja|\.pdf(?:$|\?)/i.test(value)) return "document";
  if (exteriorTokens.test(value)) return "exterior";
  if (interiorTokens.test(value)) return "interior";
  return "unknown";
}

function canonicalKey(input: string): string {
  const url = new URL(input);
  const path = url.pathname
    .replace(/^\/(?:\d{2,5}x\d{0,5}(?:,[^/]*)?)\/(?=etuovimedia\/)/i, "/")
    .replace(/\/(?:w|h|q|width|height)[_-]?\d+(?:[,_-](?:w|h|q)[_-]?\d+)*\//gi, "/")
    .replace(/(?:[-_])(?:thumb|thumbnail|small|medium|large|original|\d{2,4}x\d{2,4}|\d{3,4})(?=\.[a-z]{2,5}$)/i, "")
    .replace(/\.(?:jpe?g|png|webp)$/i, "");
  const identity = [...url.searchParams.entries()].filter(([key]) => /^(?:id|imageid|image_id|uuid|key|filename)$/i.test(key)).sort(([a], [b]) => a.localeCompare(b));
  return `${url.hostname.toLowerCase()}${path.toLowerCase()}?${new URLSearchParams(identity).toString()}`;
}

function score(item: RawCandidate): number {
  const pixels = (item.width ?? 0) * (item.height ?? (item.width ? Math.round(item.width * .75) : 0));
  return (item.confidence ?? .5) * 1_000_000 + pixels;
}

function sourceConfidence(source: ListingImageExtractionSource): number {
  if (source === "json_ld" || source === "open_graph") return .94;
  if (source === "srcset" || source === "picture_source") return .9;
  if (source === "hydration_json" || source === "internal_json") return .86;
  if (source === "lazy_attribute") return .82;
  return .74;
}

function selectRepresentative(items: ListingImageCandidate[], limit: number): ListingImageCandidate[] {
  if (items.length <= limit) return items;
  const groups = ["interior", "exterior", "unknown"] as const;
  const selected: ListingImageCandidate[] = [];
  const used = new Set<number>();
  for (const type of groups) {
    const item = items.find((candidate) => candidate.type === type && !used.has(candidate.index));
    if (item) { selected.push(item); used.add(item.index); }
  }
  for (const item of items) {
    if (selected.length >= limit) break;
    if (!used.has(item.index)) { selected.push(item); used.add(item.index); }
  }
  return selected.sort((left, right) => left.index - right.index);
}

export function extractListingImages(html: string, pageUrl: string, limit: number = LISTING_IMAGE_LIMITS.maxCandidates): ListingImageCandidate[] {
  const raw: RawCandidate[] = [];
  const add = (value: string | undefined, extractionSource: ListingImageExtractionSource, metadata: Omit<RawCandidate, "url" | "extractionSource"> = {}) => {
    if (!value) return;
    const url = safeUrl(value, pageUrl);
    if (url && !/\.(?:avif|gif|svg|bmp|tiff?)(?:$|\?)/i.test(url)) {
      const pathDimensions = url.match(/\/(\d{2,5})x(\d{2,5})(?:[,/]|$)/);
      raw.push({ url, extractionSource, ...metadata, width: metadata.width ?? numeric(pathDimensions?.[1]), height: metadata.height ?? numeric(pathDimensions?.[2]), confidence: metadata.confidence ?? sourceConfidence(extractionSource) });
    }
  };

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const context = `${attrs.alt ?? ""} ${attrs.title ?? ""} ${attrs.class ?? ""} ${attrs.id ?? ""}`;
    const metadata = { alt: attrs.alt, context, width: numeric(attrs.width), height: numeric(attrs.height) };
    const bestSrcset = srcsetCandidates(attrs.srcset ?? attrs["data-srcset"] ?? "")[0];
    if (bestSrcset) add(bestSrcset.url, "srcset", { ...metadata, width: bestSrcset.width ?? metadata.width });
    const lazyKey = ["data-original", "data-full", "data-image", "data-src", "data-lazy-src"].find((key) => attrs[key]);
    if (lazyKey) add(attrs[lazyKey], lazyKey === "data-image" ? "data_attribute" : "lazy_attribute", metadata);
    add(attrs.src, "img_src", metadata);
  }
  for (const match of html.matchAll(/<source\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const best = srcsetCandidates(attrs.srcset ?? attrs["data-srcset"] ?? "")[0];
    if (best) add(best.url, "picture_source", { width: best.width, context: `${attrs.media ?? ""} ${attrs.type ?? ""}` });
  }
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (/^(?:og:image(?::secure_url)?|twitter:image(?::src)?)$/i.test(attrs.property ?? attrs.name ?? "")) add(attrs.content, "open_graph", { context: attrs.property ?? attrs.name });
  }

  const visitJson = (node: unknown, source: ListingImageExtractionSource, path: string[] = [], imageContext = false) => {
    if (typeof node === "string") { if (imageContext) add(node, source, { context: path.join("."), confidence: sourceConfidence(source) }); return; }
    if (Array.isArray(node)) { node.forEach((item, index) => visitJson(item, source, [...path, String(index)], imageContext)); return; }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const nextPath = [...path, key];
      const nextContext = imageContext || imageKey.test(key) || /contenturl|thumbnailurl/i.test(key);
      if (typeof value === "string" && nextContext) add(value, source, { context: nextPath.join("."), confidence: sourceConfidence(source) });
      else if (value && typeof value === "object") visitJson(value, source, nextPath, nextContext);
    }
  };
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attributes(`<script ${match[1] ?? ""}>`);
    const body = (match[2] ?? "").trim();
    if (!body || body.length > 1_500_000) continue;
    const source: ListingImageExtractionSource = /ld\+json/i.test(attrs.type ?? "") ? "json_ld" : attrs.id === "__NEXT_DATA__" || /hydration|preloaded|initial-state/i.test(`${attrs.id ?? ""} ${attrs.type ?? ""}`) ? "hydration_json" : "internal_json";
    const jsonBody = /^\s*[\[{]/.test(body) ? body : body.match(/=\s*([\[{][\s\S]*[\]}])\s*;?\s*$/)?.[1];
    if (!jsonBody) continue;
    try { visitJson(JSON.parse(jsonBody), source); } catch { /* Rikkinäinen sivuston tila ei estä muiden lähteiden käyttöä. */ }
  }

  const bestByKey = new Map<string, RawCandidate>();
  for (const item of raw) {
    const combined = `${item.url} ${item.alt ?? ""} ${item.context ?? ""}`;
    const type = classification(combined);
    const knownSmall = item.width !== undefined && item.height !== undefined && (item.width < 320 || item.height < 240);
    if (knownSmall || blockedTokens.test(combined) || ["floor_plan", "map", "document", "logo"].includes(type)) continue;
    const current = bestByKey.get(canonicalKey(item.url));
    if (!current || score(item) > score(current)) bestByKey.set(canonicalKey(item.url), item);
  }

  const candidates = [...bestByKey.values()].map((item, index): ListingImageCandidate => ({
    url: item.url,
    source: "listing",
    extractionSource: item.extractionSource,
    index,
    type: classification(`${item.url} ${item.alt ?? ""} ${item.context ?? ""}`),
    width: item.width,
    height: item.height,
    confidence: Number((item.confidence ?? sourceConfidence(item.extractionSource)).toFixed(2)),
  }));
  return selectRepresentative(candidates, Math.max(1, limit));
}
