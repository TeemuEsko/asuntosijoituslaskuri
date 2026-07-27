import { isIP } from "node:net";
import { promises as dns } from "node:dns";

const rules = [
  { source: "etuovi" as const, hosts: ["etuovi.com", "www.etuovi.com"], path: /^\/kohde\/[a-z0-9-]+\/?$/i },
  { source: "oikotie" as const, hosts: ["asunnot.oikotie.fi", "www.oikotie.fi", "oikotie.fi"], path: /^\/(?:myytavat-asunnot|kohde)\/[a-z0-9-]+(?:\/[^?#]*)?$/i },
];

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 0) || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127);
}

export function validateListingUrl(input: string) {
  let url: URL;
  try { url = new URL(input); } catch { return { ok: false as const, code: "unsupported_url", error: "Linkki ei ole kelvollinen." }; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return { ok: false as const, code: "unsupported_url", error: "Vain suojatut Etuovi- ja Oikotie-linkit ovat sallittuja." };
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || isIP(host) && isPrivateAddress(host)) return { ok: false as const, code: "unsafe_url", error: "Paikalliset ja sisäverkon osoitteet eivät ole sallittuja." };
  const rule = rules.find((candidate) => candidate.hosts.includes(host) && candidate.path.test(url.pathname));
  if (!rule) return { ok: false as const, code: "unsupported_url", error: "Linkki ei ole tuettu Etuovi- tai Oikotie-ilmoitusosoite." };
  url.hash = "";
  return { ok: true as const, url, source: rule.source };
}

export async function assertPublicListingDestination(url: URL): Promise<void> {
  if (isIP(url.hostname)) { if (isPrivateAddress(url.hostname)) throw new Error("unsafe_destination"); return; }
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error("unsafe_destination");
}

export function isAllowedNavigationUrl(input: string): boolean {
  return validateListingUrl(input).ok;
}
