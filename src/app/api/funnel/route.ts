import { NextResponse } from "next/server";
import { isFunnelEventName } from "@/core/leads/model";
import { sameOriginMutation } from "@/server/access/request-security";
import { sessionFromRequest } from "@/server/access/session";
import { funnelIdForRequest, setFunnelCookie } from "@/server/leads/funnel";
import { leadRepository } from "@/server/leads/postgres";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return new NextResponse(null, { status: 403 });
  try {
    const body = await request.json() as { event?: unknown };
    if (!isFunnelEventName(body.event)) return new NextResponse(null, { status: 400 });
    const funnelId = funnelIdForRequest(request);
    const session = sessionFromRequest(request);
    await leadRepository.recordFunnelEvent(body.event, funnelId, session?.leadId);
    const response = new NextResponse(null, { status: 204 });
    setFunnelCookie(response, funnelId);
    return response;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
