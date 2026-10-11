import { checkDatabaseReadiness } from "@/db/readiness";

export async function GET() {
  const result = await checkDatabaseReadiness();
  return Response.json(result, {
    status: result.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
