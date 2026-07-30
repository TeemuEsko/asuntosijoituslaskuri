import { isIP } from "node:net";
import { promises as dns } from "node:dns";
import type { ListingSourceType } from "../../core/parser/listing-parser.ts";
import type { ListingImageErrorCode } from "../../core/listing-images/types.ts";
import { readImageDimensions } from "./image-dimensions.ts";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const approvedHosts: Record<Exclude<ListingSourceType, "pasted_text">, string[]> = {
  etuovi: ["etuovi.com", "www.etuovi.com", "cdn.etuovi.com", "images.etuovi.com", "d3ls91xgksobn.cloudfront.net"],
  oikotie: ["asunnot.oikotie.fi", "www.oikotie.fi", "oikotie.fi", "images.asunnot.oikotie.fi", "images.sanoma-sndp.fi"],
};

export class ListingImageFetchError extends Error {
  readonly code: ListingImageErrorCode;
  constructor(code: ListingImageErrorCode, message: string) { super(message); this.code = code; this.name = "ListingImageFetchError"; }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0]!;
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) return isPrivateAddress(normalized.slice(7));
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0]! >= 224
    || (parts[0] === 100 && parts[1]! >= 64 && parts[1]! <= 127)
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19));
}

function configuredHosts(source: Exclude<ListingSourceType, "pasted_text">): string[] {
  const extra = process.env[`LISTING_IMAGE_HOSTS_${source.toUpperCase()}`]?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
  return [...new Set([...approvedHosts[source], ...extra])];
}

export function isApprovedListingImageUrl(input: string | URL, source: Exclude<ListingSourceType, "pasted_text">): boolean {
  try {
    const url = input instanceof URL ? input : new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return configuredHosts(source).some((allowed) => host === allowed || (allowed === "etuovi.com" || allowed === "oikotie.fi") && host.endsWith(`.${allowed}`));
  } catch { return false; }
}

type ResolveHost = (hostname: string) => Promise<Array<{ address: string }>>;

async function assertPublicHost(url: URL, resolveHost: ResolveHost): Promise<void> {
  if (url.hostname.toLowerCase() === "localhost") throw new ListingImageFetchError("LISTING_IMAGE_ACCESS_DENIED", "Paikallinen osoite estettiin.");
  if (isIP(url.hostname)) {
    if (isPrivateAddress(url.hostname)) throw new ListingImageFetchError("LISTING_IMAGE_ACCESS_DENIED", "Yksityinen verkko-osoite estettiin.");
    return;
  }
  let addresses: Array<{ address: string }>;
  try { addresses = await resolveHost(url.hostname); }
  catch { throw new ListingImageFetchError("LISTING_IMAGE_FETCH_FAILED", "Kuvan verkkotunnusta ei voitu ratkaista."); }
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) throw new ListingImageFetchError("LISTING_IMAGE_ACCESS_DENIED", "Kuvan kohdeosoite ei ole julkinen.");
}

async function boundedBody(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES) throw new ListingImageFetchError("IMAGE_TOO_LARGE", "Ilmoituksen kuva on liian suuri.");
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) throw new ListingImageFetchError("IMAGE_TOO_LARGE", "Ilmoituksen kuva on liian suuri.");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function fetchListingImage(input: {
  url: string;
  listingPageUrl: string;
  source: Exclude<ListingSourceType, "pasted_text">;
  fetchImpl?: typeof fetch;
  resolveHost?: ResolveHost;
  timeoutMs?: number;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const resolveHost = input.resolveHost ?? (async (hostname: string) => dns.lookup(hostname, { all: true, verbatim: true }));
  let current: URL;
  try { current = new URL(input.url); } catch { throw new ListingImageFetchError("LISTING_IMAGE_ACCESS_DENIED", "Kuvan osoite ei ole kelvollinen."); }
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    if (!isApprovedListingImageUrl(current, input.source)) throw new ListingImageFetchError("LISTING_IMAGE_ACCESS_DENIED", "Kuvan verkkotunnus ei ole sallittu.");
    await assertPublicHost(current, resolveHost);
    let response: Response;
    try {
      response = await fetchImpl(current, { redirect: "manual", cache: "no-store", headers: { Accept: "image/webp,image/png,image/jpeg", Referer: input.listingPageUrl, "User-Agent": "asuntosijoituslaskuri.fi/1.0 listing image analysis" }, signal: AbortSignal.timeout(input.timeoutMs ?? 8_000) });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new ListingImageFetchError("IMAGE_ANALYSIS_TIMEOUT", "Ilmoituksen kuvan haku aikakatkaistiin.");
      throw new ListingImageFetchError("LISTING_IMAGE_FETCH_FAILED", "Ilmoituksen kuvaa ei voitu hakea.");
    }
    if (response.status >= 300 && response.status < 400) {
      if (redirect === MAX_REDIRECTS) throw new ListingImageFetchError("LISTING_IMAGE_ACCESS_DENIED", "Kuvan uudelleenohjauksia oli liikaa.");
      const location = response.headers.get("location");
      if (!location) throw new ListingImageFetchError("LISTING_IMAGE_FETCH_FAILED", "Kuvan uudelleenohjaus oli puutteellinen.");
      current = new URL(location, current);
      continue;
    }
    if (response.status === 401 || response.status === 403) throw new ListingImageFetchError("LISTING_IMAGE_ACCESS_DENIED", "Ilmoituksen kuvan käyttö estettiin.");
    if (!response.ok) throw new ListingImageFetchError("LISTING_IMAGE_FETCH_FAILED", "Ilmoituksen kuvan haku epäonnistui.");
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (contentType !== "image/jpeg" && contentType !== "image/png" && contentType !== "image/webp") throw new ListingImageFetchError("UNSUPPORTED_IMAGE_FORMAT", "Ilmoituksen kuvan tiedostomuotoa ei tueta.");
    const mediaType = contentType as "image/jpeg" | "image/png" | "image/webp";
    const bytes = await boundedBody(response);
    const dimensions = readImageDimensions(bytes, mediaType);
    if (!dimensions || dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) throw new ListingImageFetchError("NO_ANALYSABLE_LISTING_IMAGES", "Ilmoituksen kuvan tarkkuus ei riitä analyysiin.");
    return { bytes, mediaType, width: dimensions.width, height: dimensions.height };
  }
  throw new ListingImageFetchError("LISTING_IMAGE_FETCH_FAILED", "Ilmoituksen kuvan haku epäonnistui.");
}
