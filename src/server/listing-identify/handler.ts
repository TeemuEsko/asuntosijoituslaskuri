import type { ListingFinding } from "../../core/parser/listing-parser.ts";
import type { ListingPreview } from "../../core/leads/listing-preview.ts";
import type { ListingAcquisitionResult } from "../../core/listing-acquisition/types.ts";
import { sameOriginMutation } from "../access/request-security.ts";
import { safeServerErrorCode, type ListingIdentifyRateLimitResult } from "../access/listing-identify-rate-limit.ts";
import { funnelCookieHeader, funnelIdForRequest } from "../leads/funnel.ts";

export function previewFromFindings(findings: ListingFinding[]): ListingPreview {
  const preview: ListingPreview = {};
  if (!Array.isArray(findings)) return preview;
  for (const finding of findings) {
    if (!finding || typeof finding !== "object" || !("field" in finding) || !("normalizedValue" in finding)) continue;
    const field = String(finding.field) as keyof ListingPreview;
    if (!["address", "roomDescription", "areaSqm", "debtFreePrice", "buildingType"].includes(field)) continue;
    if (finding.validationResult !== "accepted" || finding.conflicts.length) continue;
    preview[field] = finding.normalizedValue as never;
  }
  return preview;
}

export type ListingIdentifyDependencies = {
  acquireListing: (value: string) => Promise<ListingAcquisitionResult>;
  allowAttempt: (request: Request) => Promise<ListingIdentifyRateLimitResult>;
  recordFunnelEvent?: (funnelId: string) => Promise<void>;
  logger?: Pick<Console, "error">;
};

export async function handleListingIdentify(
  request: Request,
  dependencies: ListingIdentifyDependencies,
): Promise<Response> {
  const logger = dependencies.logger ?? console;
  if (!sameOriginMutation(request)) return Response.json({ error: "Pyyntö estettiin turvallisuussyistä." }, { status: 403 });
  let body: { value?: string };
  try {
    body = await request.json() as { value?: string };
  } catch {
    return Response.json({ error: "Pyyntöä ei voitu lukea." }, { status: 400 });
  }
  const value = body.value?.trim() ?? "";
  if (!value || value.length > 2_048) return Response.json({ error: "Anna kelvollinen ilmoituslinkki." }, { status: 400 });

  const rateLimit = await dependencies.allowAttempt(request);
  if (!rateLimit.allowed) return Response.json({ error: "Liian monta hakua. Odota hetki ja yritä uudelleen." }, { status: 429 });

  let acquisition: ListingAcquisitionResult;
  try {
    acquisition = await dependencies.acquireListing(value);
  } catch (error) {
    logger.error("[listing-identify] acquisition failed", {
      stage: "acquisition",
      code: safeServerErrorCode(error),
    });
    return Response.json({ error: "Kohteen tunnistaminen epäonnistui. Yritä uudelleen." }, { status: 503 });
  }
  if (!acquisition.ok) {
    logger.error("[listing-identify] acquisition rejected", {
      stage: "acquisition",
      code: acquisition.code,
      status: acquisition.status,
      fetchStatus: acquisition.diagnostics.fetchStatus,
      finalErrorType: acquisition.diagnostics.finalErrorType,
    });
    return Response.json({ code: acquisition.code, error: acquisition.error }, { status: acquisition.status });
  }

  const preview = previewFromFindings(acquisition.result.findings);
  const response = Response.json({ preview });
  if (rateLimit.persistent && dependencies.recordFunnelEvent) {
    const funnelId = funnelIdForRequest(request);
    try {
      await dependencies.recordFunnelEvent(funnelId);
      response.headers.append("Set-Cookie", funnelCookieHeader(funnelId));
    } catch (error) {
      logger.error("[listing-identify] funnel event unavailable", {
        stage: "funnel_event",
        code: safeServerErrorCode(error),
      });
    }
  }
  return response;
}
