# Phase 0C — Database Foundation Implementation Report

## A. Stage Status

**OFFLINE FOUNDATION COMPLETE — LIVE DEV PENDING**

2026-10-04: Stage 1 implemented locally and offline quality verification PASS. Phase 0C remains open; Gate 1 OPEN. This task provides no evidence of a live TiDB resource, applied schema, or live readiness.

## B. Repository Context

- Branch: `feature/foundation-database`.
- HEAD, testing, origin/testing and merge-base: `11985b6a3532b3773eebe63d330d84788bbf2be1`, unchanged.
- Node `24.19.0`, npm `11.6.0`, Next `16.3.6`.
- Initial index empty; only existing untracked [baseline audit](PHASE_0C_BASELINE_AUDIT_REPORT.md). Its bytes remain unchanged.
- Phase 0A CLOSED/PR #7; Phase 0B CLOSED/PR #8 with independent verification PASS.
- Task attachment `a7139868-88df-48fe-95e5-954aeba6c815` approves bounded offline work. RTK proxy used for package, Git and verification commands. Skills: using-superpowers, executing-plans, TDD, systematic-debugging and verification-before-completion; final review follows requesting-code-review.
- Approved audit plan plus detailed human task served as execution plan; TEMP ledger records rulings/TDD. No extra repository plan, worktree or Git mutation.

## C. Human-Approved Decisions

HTTP application stack: Next.js → Drizzle → `@tidbcloud/serverless` → TiDB. `mysql2` is a dev-only Kit exception, documented in ADR-013. Dev-first sequence preserves three independent Starter resources: Testing before integration/Preview Phase 0D, Production before controlled rollout, without a shared fallback.

Depots only; DOUBLE coordinates, BIGINT auto-increment/server bigint, future decimal-string DTO IDs, DATETIME(3) UTC-by-convention. Separate `/api/ready`, one SELECT 1, 5000 ms operation deadline, no retry. `db:push` and automatic migration prohibited. Apply requires a later human approval.

## D. Dependency Delta

| Package | Requested | Resolved | Category | Purpose / license |
|---|---|---|---|---|
| drizzle-orm | 0.45.3 | 0.45.3 | runtime | Typed MySQL schema/query adapter; Apache-2.0 |
| @tidbcloud/serverless | 0.3.0 | 0.3.0 | runtime | TiDB HTTP transport; Apache-2.0 |
| zod | 4.6.5 | 4.6.5 | runtime | Runtime URL/result validation; MIT |
| drizzle-kit | 0.31.11 | 0.31.11 | dev | Offline generation/check, future reviewed migration; MIT |
| mysql2 | 3.24.5 | 3.24.5 | dev | Stable Kit MySQL CLI adapter, TLS verification; MIT |

Installed with `npm install --save-exact` and `--save-dev --save-exact`, only these five direct additions. Fresh metadata check confirmed exact availability/engines/peer compatibility and no direct deprecation; npm advisory bulk check of approved versions returned `{}` before install. Existing stack had no ORM, TiDB transport or concrete Zod validation; built-in URL parsing alone normalizes unsafe input and provides no runtime schema contract. Kit avoids a custom migration runner.

Maintenance/security and install-size impact: three runtime libraries and two dev tools enlarge the dependency tree; actual deployed bundle size was not measured. All five are open-source. Kit adds legacy deprecated loader dependencies; audit delta below. Lock review: 97 added package entries, none removed, only existing resolved version change is Zod 4.1.13 → approved 4.6.5 (previously transitive). No unrelated direct version changes, overrides, update/dedupe/audit-fix or manual transitive edits.

`mysql2` remains in devDependencies; npm labels its lock entry `devOptional` because Drizzle declares an optional mysql2 peer. Omit-dev installations may retain optional peers; dev-only here is the explicit dependency and usage boundary, not a claim of physical package absence. Application imports only the TiDB HTTP adapter and no mysql2/TCP pool.

## E. Security Audit Delta

| Audit | Before | After | Exit / assessment |
|---|---|---|---|
| Full | 15: 1 low, 2 moderate, 12 high, 0 critical | 19: 1 low, 6 moderate, 12 high, 0 critical | Both exit 1; findings remain, not a clean full audit |
| Runtime `--omit=dev` | 0 | 0 | Both exit 0; PASS |

Four additional moderate affected package nodes: drizzle-kit 0.31.11, @esbuild-kit/esm-loader 2.6.5, @esbuild-kit/core-utils 3.3.2, nested esbuild 0.18.20. They share the old esbuild development-server advisory [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99); this is four affected packages, not four independent root advisories. The two loader packages also emit deprecation warnings. No new runtime HIGH/CRITICAL, no new dev CRITICAL. No Studio/dev server was started. Existing 12 high findings remain in the inherited dev tree; this task makes no whole-repository security claim.

## F. DB Env TDD

`npm run test -- tests/unit/db-env.test.ts`: initial RED, target module absent. First implementation: 42 PASS/1 FAIL, raw extra `@` accepted after WHATWG normalization. Investigation reproduced URL password normalization; raw authority guard corrected the root cause. GREEN: 43/43, including pure CLI conversion/Dev guard tests.

## G. DB Env Contract

`src/config/db-env.ts` uses concrete Zod safeParse, explicit input, fixed `DatabaseConfigError: Invalid database configuration.` No raw Zod issues, cause, URL or credential in public error. Returns only validated URL to avoid storing duplicate credential fields.

Accepts mysql scheme, required user/password, DNS/IPv4 hostname, optional valid 1–65535 port, and exactly one explicit database name using letters/digits/underscore/hyphen. Encoded credential delimiters accepted. Rejects missing/empty/padded/non-string input, unsupported scheme, missing fields, extra path, query/fragment, malformed percent escapes, control/newline injection, raw extra @, encoded hostname/slash and ambiguous path. No trimming, default DB or ambient env read/mutation. Import succeeds with no DATABASE_URL.

`getDevMigrationCredentials` is pure: requires exact APP_ENV development and database courier_route_planner_dev; decodes user/password/database, uses supplied port or MySQL 3306, and returns supported Kit object credentials with `ssl.rejectUnauthorized: true`. It logs nothing and performs no network. Logical names do not prove cloud resource identity.

Final parser regression coverage: 53 tests. Raw authority requires digits when a port is explicitly present; an empty port cannot disappear into a default. DNS labels must be nonempty, length-valid and avoid edge hyphens; numeric IPv4 octets are checked. Empty-port, -, ..., doubled dots, out-of-range IP and oversized DNS label cases all reject safely. Valid TiDB-style hyphenated hostname and IPv4 remain accepted.

## H. DB Client Contract

`src/db/client.ts` uses Next `server-only`, TiDB connect and drizzle-orm/tidb-serverless with schema, logger false/debug false. Import performs no env read, query, network or migration. `getDatabase()` reads current DATABASE_URL only when called; factory validates explicitly supplied input, permits injected fake HTTP transport and creates ORM without I/O. No cached credentials, global timeout signal or TCP pool.

Each driver HTTP request receives a fresh native `AbortSignal.timeout(5000)`, attached through body consumption. No retry or Promise.race abandoning a request. Tests advance a scoped fake clock around the native deadline factory, asserting no abort at 4999 ms, abort at 5000 ms for both pending fetch and pending body, one request only. Transport/JSON read failures become a fixed DatabaseTransportError with no raw cause; provider/decoding details are contained by the readiness boundary.

Client TDD: missing-module RED, then genuine unresolved server-only marker. Allowed test-only fixture/alias added; production marker preserved. GREEN 7 tests. No new server-only dependency.

Final correction validates successful HTTP wire results before driver conversion: string/null cells, row widths matching fields, nonempty unique field metadata and full integer text for INT/UNSIGNED INT. This blocks permissive parseInt and discarded/overwritten cells. Provider error payloads keep the driver's normal error path and are contained by readiness. Current queries require unambiguous result field names; future joins must use explicit unique aliases.

## I. Initial Schema

`src/db/schema.ts`, sole table export: depots.

| Column | SQL contract |
|---|---|
| id | BIGINT AUTO_INCREMENT NOT NULL PRIMARY KEY; Drizzle bigint mode |
| name | VARCHAR(255) NOT NULL |
| address | TEXT NULL |
| latitude / longitude | DOUBLE NOT NULL |
| is_active | BOOLEAN NOT NULL DEFAULT true |
| created_at / updated_at | DATETIME(3) NOT NULL, UTC-by-convention |

No timestamp defaults/on-update, seed, FK, extra index, uniqueness/global active-depot constraint or coordinate CHECK. Future mutation validation owns coordinate ranges; no arbitrary rounding or CRUD. Schema import TDD: RED missing module → GREEN 1 test, no env/network, sole approved table. SQL review provides primary field evidence.

## J. Migration Generation

`npm run db:generate` PASS without APP_ENV/DATABASE_URL or real env files. Installed Kit reported one table, eight columns, zero extra indexes/FKs. Original generated names/layout preserved:

- `drizzle/0000_dear_rictor.sql`.
- `drizzle/meta/0000_snapshot.json`.
- `drizzle/meta/_journal.json`.

Manual SQL review: one CREATE TABLE depots; BIGINT auto-increment PK, required varchar/double/boolean/datetime fields and nullable address match approval. No other objects, seed INSERT, DROP/TRUNCATE/ALTER, database creation, grants, trigger/procedure, host, credential or URL. Snapshot only depots; stable snapshot version 5/journal version 7 as generated. `npm run db:check` PASS: offline history consistency only.

## K. Migration Safety

**NOT APPLIED. NO LIVE DB QUERY.** Never executed db:migrate, direct Kit migrate/push, generated SQL, cloud provisioning or a live route invocation. No inherited credential used. Future TiDB DDL may autocommit; first apply needs target/history review and a partial-failure mitigation plan. Offline generation/check does not establish live migration status or rollback safety.

## L. Drizzle Configuration

- `drizzle.config.ts`: mysql dialect, ./src/db/schema.ts, ./drizzle, breakpoints true; no env/credential/client/loader/network. `satisfies Config` preserves the literal dialect; initial defineConfig union-widening typecheck failure was corrected using the installed function signature.
- `drizzle.dev.config.ts`: inherits offline config, explicitly reads env only on future config load, calls the tested pure Dev guard and uses supported object credentials/TLS. Not loaded with credentials or connected during Stage 1. No unsupported Kit tidb-serverless selector.

## M. DB Scripts

| Script | Actual command | Stage 1 use |
|---|---|---|
| db:generate | drizzle-kit generate --config=drizzle.config.ts | PASS, offline |
| db:check | drizzle-kit check --config=drizzle.config.ts | PASS, offline |
| db:migrate | node --env-file=.env.migrations.local ./node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.dev.config.ts | NOT RUN; future guarded Dev apply |

Installed bin verified as bin.cjs. No npx download/env loader, optional Studio, push/reset/seed/drop or Testing/Production migrate script. No migration on install/ci/build/start/dev/routes/Actions/Vercel. Inherited shell variables override Node env-file; future operator must verify a clean shell without printing secrets.

## N. Readiness TDD

Service initial RED missing module → GREEN 15 tests; final regression suite 27 PASS. Route initial RED missing module → GREEN 8 tests; final 11 PASS. Real ORM/driver/readiness logic uses fake HTTP responses; route mocks only lazy acquisition. Missing/invalid configuration sends zero requests. Network/abort/timeout/provider/invalid JSON/empty/malformed/missing session/unexpected value/extra rows produce small safe error classification, one attempt only.

GET /api/ready executes only SELECT 1 AS ok. Exactly one integer ok=1 row → 200 `{"status":"ok"}`: INT/UNSIGNED INT decode to numeric 1; BIGINT/UNSIGNED BIGINT stay exact string "1". Type metadata is checked; FLOAT/VARCHAR, malformed integer text, surplus cells and duplicate fields → 503. No Number conversion of BIGINT. Expected failures → 503 `{"status":"error"}`. Both JSON + no-store, one payload key, no details. Unexpected acquisition bug propagates to framework and cannot produce successful readiness. No table query, schema checking, mutation, migration, OSRM or auth. Live behavior not verified. BIGINT text behavior is documented by the [official driver guide](https://docs.pingcap.com/developer/serverless-driver/) and confirmed against installed 0.3.0 source.

### Final review and correction evidence

One fresh-context independent reviewer found 0 Critical, 3 Important, 0 Minor: valid BIGINT probe falsely unavailable; permissive driver parseInt/row projection hiding malformed wire values; empty port/invalid DNS accepted. All three accepted after offline reproduction. Regression run: 20 failed / 69 passed across env/service/route, before corrections. BIGINT typed success correction left seven wire failures; wire validation then yielded 45/45 client/service/route; raw authority correction yielded 5 files/99 focused tests PASS. Full fresh suite rerun after the single fix pass, recorded below. The original reviewer verdict was acceptance pending these fixes; final regression/quality evidence resolves them, without asserting a second independent review.

Reviewer exclusions accepted: live DB/TLS/apply proof, IPv6/IDN/uncommon DB names, physical absence of optional mysql2 peer, production/auth/CRUD features. These are explicitly outside Stage 1 or the documented URL contract; no hidden deferred blocker.

## O. Health Regression

Existing health source and tests byte-unchanged. Existing 19 health tests PASS, including DATABASE_URL absent. App-only liveness/APP_ENV contract unchanged; readiness is separate. Health still does not prove DB connectivity.

## P. Test Evidence

| Run | Actual result |
|---|---|
| Fresh baseline full suite | 4 files / 48 tests PASS |
| Focused DB + existing health | 6 files / 93 tests PASS |
| Focused five new files after fixes | 5 files / 99 tests PASS |
| Final full suite | 9 files / 147 tests PASS |
| Final coverage suite | 9 files / 147 tests PASS |

All tests use scoped env fixtures/fake transport, no real network or credential. Existing 48 tests remain green.

## Q. Quality Suite

Fresh final run started 2026-10-04 07:40:00 WIB (00:40:00 UTC), RTK proxy, Node 24.19.0/npm 11.6.0. APP_ENV, DATABASE_URL and NEXT_PUBLIC_APP_NAME removed from child-process environment; real env files absent.

| Command | Result |
|---|---|
| npm ci | PASS / exit 0 |
| npm run lint | PASS / exit 0 |
| npm run typecheck | PASS / exit 0 |
| npm run test | PASS / exit 0 |
| npm run test:coverage | PASS / exit 0 |
| npm run db:check | PASS / exit 0 |
| npm run build | PASS / exit 0; Next 16.3.6, /api/health and /api/ready dynamic |
| npm run typecheck after build | PASS / exit 0 |
| npm audit --json | exit 1; 19 findings, limitation as section E |
| npm audit --omit=dev --json | PASS / exit 0, 0 findings |
| git diff --check | PASS / exit 0 |

Read raw logs, not only exit summaries. Vite's existing future native-config-loader warning persists; current Vitest runner PASS. TEMP `courier-phase0c-stage1-{baseline,final}-quality-20261004.json` and per-command logs record exits/timings; these machine-local scratch files are not repository artifacts.

## R. Coverage

Whole src TS/TSX V8, no new exclusions or threshold:

| Metric | Actual |
|---|---|
| Statements | 18.11% (94/519) |
| Branches | 16.21% (66/407) |
| Functions | 17.34% (30/173) |
| Lines | 18.61% (89/478) |

Coverage is informational; largely untested UI primitives remain in the denominator. HTML/JSON reports remain ignored build artifacts.

## S. Secret / Boundary Review

Changed/new files scanned without printing suspect values: zero actual credential/private-key findings. Credential-shaped values occur only in explicit fixture tests under fixture.invalid, with fixture user/password markers. `.env.example` URL blank; no host/secret template. No .env.local/.env.migrations.local or other real env file created, inspected or printed; ignore rules verified for both.

No UI/Client Component imports DB client/readiness/DB parser; no mysql2 source import/TCP pool, algorithm DB import, or research implementation leakage. Schema pure and credential-free. Existing AGENTS.md, skills-lock.json, APP_ENV parser, health, 0A/0B reports and 0C baseline unchanged; `.agents` untouched. No tracked build artifact.

## T. Documentation Sync

Source docs updated: README; docs/04, 07, 08, 09, 10, 14, 16, 17, 18, 19, 23. Phase 0B CLOSED/PR #8 + independent PASS, Stage 1 offline status, live Dev pending, Dev-first/deferred resources, HTTP/CLI distinction, safe env/guard/migration flow, and health/readiness separation synced. docs/08 keeps **Conceptual target design only** with sole actual depots exception; research contract/other tables unchanged. Full DB DoD and Gate 1 remain open. Historical process reports preserved.

## U. MASTER_GUIDE / MANIFEST

MASTER regenerated from the same 45 ordered sources, generated warning retained, LF normalization and repository-root link rebasing retained. Verified unchanged-source transform parity before regeneration, then all regenerated blocks. MANIFEST same 46 entries (including MASTER, excluding itself/application/process reports), actual bytes/SHA-256 recomputed. Zero parity/hash/scope/order mismatches; changed-source file/fragment links resolve.

## V. Live Resource Status

| Resource / evidence | Status |
|---|---|
| TiDB Dev | NOT PROVISIONED BY THIS TASK; identity/connectivity NOT VERIFIED |
| Migration apply / live query / live readiness | PENDING HUMAN APPROVAL; NOT RUN |
| Testing | DEFERRED before integration/Preview Phase 0D |
| Production | DEFERRED before controlled rollout |

## W. HUMAN STOP GATE

Before a new live stage, human review must approve:

1. TiDB Dev provisioning settings, region/tier/zero-cost limits.
2. Actual independent Dev resource identity and database courier_route_planner_dev.
3. Credential handling: server-only application credential and dedicated migration role/file; no secret in chat/Git/screenshots, clean/verified shell.
4. Generated `drizzle/0000_dear_rictor.sql` and history, DDL compatibility/partial-failure mitigation.
5. First Dev migration apply, followed by separately authorized live verification.

This report does not authorize provisioning, credential storage, migration apply or live queries. Stage 1 stops here; no silent continuation.

## X. Scope Verification

No live DB creation/query/provisioning, migration apply/push, real credential creation/storage/access, depot CRUD/repository/actions/forms/API/seed, research schema/algorithm/matrix work, auth, GitHub Actions, Vercel/deployment, or Testing/Production resource mutation.

18 tracked files modified; 17 new implementation/config/test/migration files plus this report (36 task files). Existing untracked baseline report preserved separately. Nothing staged; HEAD/branch unchanged. No git add/commit/push/merge/rebase/reset/restore/clean/stash.

| Change group | Exact file inventory |
|---|---|
| Modified configuration/packages | `.env.example`, `package.json`, `package-lock.json`, `vitest.config.ts` |
| Modified source docs | `README.md`, `docs/04_TECH_STACK_ADRS.md`, `docs/07_TIDB_GUIDE.md`, `docs/08_DATABASE_DESIGN.md`, `docs/09_REPO_STRUCTURE.md`, `docs/10_ENVIRONMENTS_SECRETS.md`, `docs/14_TESTING_QA.md`, `docs/16_OBSERVABILITY_RUNBOOK.md`, `docs/17_SETUP_FROM_ZERO.md`, `docs/18_ROADMAP_BACKLOG.md`, `docs/19_DEFINITION_OF_DONE.md`, `docs/23_PHASE_GATES_CHECKLISTS.md` |
| Modified derived docs | `MASTER_GUIDE.md`, `MANIFEST.md` |
| New configs/artifacts | `drizzle.config.ts`, `drizzle.dev.config.ts`, `drizzle/0000_dear_rictor.sql`, `drizzle/meta/0000_snapshot.json`, `drizzle/meta/_journal.json` |
| New source | `src/config/db-env.ts`, `src/db/client.ts`, `src/db/schema.ts`, `src/db/readiness.ts`, `src/app/api/ready/route.ts` |
| New tests/fixtures | `tests/unit/db-env.test.ts`, `tests/unit/db-schema.test.ts`, `tests/unit/db-client.test.ts`, `tests/unit/db-readiness.test.ts`, `tests/unit/ready.test.ts`, `tests/fixtures/server-only.ts`, `tests/fixtures/tidb-http.ts` |
| New report | `docs/proses/phase-0/0c/PHASE_0C_IMPLEMENTATION_REPORT.md` |

## Y. Recommendation

**READY FOR HUMAN DEV PROVISIONING CHECKPOINT**

Offline implementation and verification are complete. Remaining live Dev work and full database DoD require the explicit checkpoint above; Phase 0C and Gate 1 remain open. Full audit dev findings and deferred live verification remain known limitations.
