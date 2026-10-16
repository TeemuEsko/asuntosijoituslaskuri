import { NextResponse } from "next/server";
import { secureTokenMatches } from "@/server/access/request-security";
import { marketingLeadsCsv } from "@/server/leads/csv";
import { leadRepository } from "@/server/leads/postgres";
import type { LeadRepository } from "@/server/leads/repository";

export const runtime = "nodejs";
type Dependencies = { repository: LeadRepository; adminToken?: string };

export async function handleCsvExport(request: Request, dependencies: Dependencies): Promise<Response> {
  const authorization = request.headers.get("authorization");
  const provided = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  if (!secureTokenMatches(provided, dependencies.adminToken)) return NextResponse.json({ error: "Pääsy estetty." }, { status: 401 });
  try {
    const csv = marketingLeadsCsv(await dependencies.repository.listMarketingLeads());
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="kajabi-marketing-leads.csv"', "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Vienti epäonnistui." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return handleCsvExport(request, { repository: leadRepository, adminToken: process.env.LEAD_EXPORT_ADMIN_TOKEN });
}
