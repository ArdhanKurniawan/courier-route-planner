import type { Config } from "@tidbcloud/serverless";

export const fakeDatabaseUrl =
  "mysql://fixture_user:fixture_password@fixture.invalid/courier_route_planner_dev";
export type DatabaseFetch = NonNullable<Config["fetch"]>;

export function tidbResponse(value = "1", type = "BIGINT") {
  return Response.json(
    { types: [{ name: "ok", type, nullable: false }], rows: [[value]] },
    {
      headers: { "TiDB-Session": "fixture-session" },
    },
  );
}
