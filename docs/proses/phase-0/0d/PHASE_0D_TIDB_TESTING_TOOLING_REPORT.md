# Phase 0D-3A — TiDB Testing Migration Tooling Report

Date: 2026-10-04. Scope: local offline tooling and documentation only. Evidence timestamps below use UTC. Testing resource **NOT YET PROVISIONED**; Testing migration **NOT APPLIED**; Production **NOT YET PROVISIONED**; Gate 1 **OPEN**.

## A. Verdict

**TESTING MIGRATION TOOLING VERIFIED — READY FOR HUMAN PROVISIONING CHECKPOINT**.

Dev guard preserved; exact Testing guard/config/manual script, offline tests, fresh quality, artifact integrity and derived docs PASS. Fresh-context independent review reports 0 Critical, 0 Important and 0 Minor findings. This verdict covers local tooling; cloud resource/connectivity/apply remain pending the separately authorized 0D-3B stage.

## B. Repository Baseline

Initial snapshot: `2026-10-04T15:29:59.641Z`.

| Check | Evidence |
|---|---|
| Branch | `feature/phase-0d-tidb-testing-foundation` |
| HEAD / testing / origin/testing / merge-base | `5d54403feca3ba2397c89e884650208ed84fba6d` |
| Initial working tree / index / diff check | CLEAN / empty / PASS |
| Initial repository / skill files | 215 / 402 |
| Hooks | `.githooks` |

Read-only GitHub evidence captured at `15:30:01Z`: [PR #13](https://github.com/ArdhanKurniawan/courier-route-planner/pull/13) closed and merged into testing at `15:19:14Z`, merge commit matches the baseline. [Quality push run 37212546428](https://github.com/ArdhanKurniawan/courier-route-planner/actions/runs/37212546428), attempt 1, completed/success on the same testing SHA. Testing Quality Gate behavioral enforcement is VERIFIED; main configuration is VERIFIED and behavior DEFERRED to real testing → main promotion. These are baseline results, not a remote run of this uncommitted change.

AGENTS.md and RTK.md were read before implementation. Relevant skills: using-superpowers, test-driven-development, verification-before-completion, requesting-code-review, and systematic-debugging for the TEMP config-probe harness. All shell commands, including child verification commands, used RTK 0.48.0. No skills were installed or changed. Five required historical 0D reports were fully read in this conversation; fresh hash comparisons confirm unchanged content. Relevant 0C reports and the current database source/tests/docs were inspected. Historical reports remain evidence and were not rewritten.

## C. Existing Dev Migration Contract

Before this task, the only apply path was `npm run db:migrate`: Node 24 `--env-file=.env.migrations.local`, installed Drizzle Kit bin, `drizzle.dev.config.ts`. Its helper requires exact `APP_ENV=development` and parsed DB `courier_route_planner_dev`, with `ssl.rejectUnauthorized: true`. Missing/invalid URL, Testing/Production env and wrong DB are rejected through generic `DatabaseConfigError`.

The original parser and entire Dev helper remain unchanged. Dev config and script are unchanged. Runtime uses the existing lazy server-only TiDB HTTP client; migration CLI uses the existing dev-only mysql2 dependency. No driver/dependency or runtime boundary changed.

## D. Testing Tooling Design

Add explicit pure `getTestingMigrationCredentials(rawAppEnv, rawUrl)` beside the Dev helper, reuse the hardened `parseDatabaseConfig`, and return the Drizzle MySQL credential shape. Add a separate Testing config and one manual package script. Small credential-output duplication preserves the reviewed Dev code without introducing a public environment switch.

No generic `db:migrate:any`, `db:migrate:env` or Production path. No shared-resource fallback. No dependency added; package-lock.json is unchanged.

## E. Database Guard Contract

The Testing helper requires `rawAppEnv === "testing"` and decoded database exactly `courier_route_planner_testing`. It has no trimming, default env, ambient env read or Dev/Production fallback. Valid output contains host, numeric port (default 3306), decoded user/password, exact database and `ssl: { rejectUnauthorized: true }`.

The shared parser continues to reject non-mysql schemes, missing credentials, malformed authority, invalid ports/DNS/IPv4, path confusion, query/fragment, malformed encoding, ambiguous `@` and unsafe controls. Rejection stays `Invalid database configuration.` without credential/cause disclosure. The helper has no logger, file access or network operation.

## F. Cross-Environment Safety Matrix

| Helper | APP_ENV / DB | Expected / observed |
|---|---|---|
| Dev | development / Dev | ACCEPT / PASS |
| Dev | testing / Testing | REJECT / PASS |
| Dev | development / Testing | REJECT / PASS |
| Dev | testing / Dev | REJECT / PASS |
| Dev | production / Production | REJECT / PASS |
| Testing | testing / Testing | ACCEPT / PASS |
| Testing | development / Dev | REJECT / PASS |
| Testing | testing / Dev | REJECT / PASS |
| Testing | development / Testing | REJECT / PASS |
| Testing | production / Production | REJECT / PASS |

Valid URL syntax cannot override the env/database pair. Production APP_ENV is rejected independently of URL syntax.

## G. Testing Drizzle Config

[`drizzle.testing.config.ts`](../../../../drizzle.testing.config.ts) spreads the existing offline config and adds credentials from the explicit Testing helper using process APP_ENV/DATABASE_URL. It loads no file itself, has no dotenv/fallback, and does not connect during import.

Offline TEMP probe at `15:50:18.603Z`: **11/11 cases PASS**. It transpiled actual config/helper source to CJS, used real installed defineConfig/Zod, and blocked net/TLS/HTTP/HTTPS/fetch entry points. Offline config loads without env/credentials; valid Dev/Testing configs load; invalid cross-env configs reject generically. No connection attempt or real env load occurred. This proves import/guard behavior; live Kit/TiDB apply compatibility remains a 0D-3B checkpoint.

Initial esbuild bundle probes stopped on sandbox access to the TEMP parent during path resolution. A working-directory adjustment did not resolve it. The final harness uses transformSync on source bytes, avoiding filesystem resolution; application code was unchanged by this harness correction. No access escalation was used.

## H. Package Scripts

| Script | Actual command |
|---|---|
| `db:check` | `drizzle-kit check --config=drizzle.config.ts` |
| `db:migrate` | `node --env-file=.env.migrations.local ./node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.dev.config.ts` |
| `db:migrate:testing` | `node --env-file=.env.migrations.testing.local ./node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.testing.config.ts` |

Only the last script is new. Both migrate commands are manual future actions; neither was executed. No migration is chained into install/ci/build/dev/start/test/Actions/Vercel.

## I. Env File Policy

`git check-ignore -v` confirms both future Testing files are protected by `.gitignore:70`, `.env.*`; `.env.example` remains an exception. `.gitignore` and `.env.example` are unchanged.

`.env.testing.local` and `.env.migrations.testing.local` were absent initially and remain absent. No existing private Dev env values were read or printed. Quality ran in a TEMP copy that excludes ignored/private files and scrubs inherited APP_ENV/DATABASE_URL and Node preload/TLS bypass variables. Node `--env-file` does not override inherited env; a clean, verified shell is required before future migration. No secret is requested in this stage.

## J. Migration History Integrity

Exactly one initial migration, journal index 0/tag `0000_dear_rictor`; snapshot remains depots-only. All three artifact bytes match the initial working-tree snapshot:

| Artifact | Current raw SHA-256 |
|---|---|
| `drizzle/0000_dear_rictor.sql` | `64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577` |
| `drizzle/meta/0000_snapshot.json` | `9d3a7d20deacbd8ab4e85b4fba5cbc0a51b787a3800969cffaafdbb23ddfe584` |
| `drizzle/meta/_journal.json` | `9e3ed23ec5e1bb4fbce6a8b4a3f06362cbd38f29ccbb428392fa20b4324578b8` |

SQL currently has 341 bytes/11 CRLFs. Its Git blob and LF-normalized SHA-256 are `557fbc895d535904f390f99cc3cc7b41b7e0659c1b155b205c1987d8bdb9ba29`, matching the historical Dev-applied SQL hash in the [0C final report](../0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md). This inherited line-ending difference is recorded, not edited. A raw migration hash can differ with line endings; 0D-3B must review/freeze the exact bytes that will be applied and verify the ledger against that hash. Normalized comparison does not prove raw-byte equality.

No second migration was generated. Testing will use the same reviewed history, with exact apply-byte review before approval. `db:check` PASS proves offline history consistency, not a live ledger/schema match.

## K. Production Hard Stop

No Production migration helper/config/script or unrestricted apply path was added. Dev and Testing apply guards reject APP_ENV=production. Production provisioning/tooling remains a separately authorized future stage; no Production credential or resource was touched.

## L. Tests

New [`tests/unit/db-migration.test.ts`](../../../../tests/unit/db-migration.test.ts): **65 tests**, Node environment. Includes credential/TLS output, default/explicit port, exact env/database variations, malformed URL rejection, safe errors, explicit-input purity and the cross-env matrix. Synthetic `.invalid` fixtures only; no real network/URL/private env. All 147 existing tests remain unchanged.

| TDD step | Fresh evidence |
|---|---|
| RED | `15:35:49.225–15:36:09.035Z`, exit 1: 60 failed/58 passed; old 53 DB-env tests passed. Failures reflect missing Testing export, before helper implementation. |
| GREEN | `15:37:23.849–15:37:26.342Z`, exit 0: 2 files / 118 tests PASS (53 old + 65 new). |
| Full suite | 10 files / 212 tests PASS; also 212 PASS under coverage. |

## M. Fresh Quality Suite

Actual Node **v24.19.0**, npm **11.6.0**. Fresh lockfile install and all required commands ran in `C:/Users/L E N O V O/AppData/Local/Temp/courier-phase0d-testing-tooling-20261004/candidate`, without private env. The 217 source files at copy time matched byte-for-byte; later edits were documentation only. Static parity confirms all **151 non-Markdown source paths** still match the tested copy.

| Command | UTC start–finish | Exit / result |
|---|---|---|
| `npm ci` | 15:38:41–15:39:31 | 0 / PASS |
| `npm run lint` | 15:39:32–15:40:10 | 0 / PASS |
| `npm run typecheck` | 15:40:10–15:40:30 | 0 / PASS |
| `npm run test` | 15:40:30–15:40:58 | 0 / PASS, 10 files / 212 tests |
| `npm run test:coverage` | 15:40:58–15:41:08 | 0 / PASS, 10 files / 212 tests |
| `npm run db:check` | 15:41:08–15:41:10 | 0 / PASS, offline |
| `npm run build` | 15:41:10–15:41:51 | 0 / PASS, Next 16.3.6, 17 static pages |
| `npm run typecheck` after build | 15:41:51–15:41:55 | 0 / PASS |

Detailed TEMP evidence: `initial.json`, `candidate-snapshot.json`, `quality-environment.json`, `red-results.json`, `green-results.json`, `suite-results.json`, per-command `suite-*.log`, `config-probe.json`, `static-check.json`, and `evidence-summary.json` in the directory above. Generated node_modules/.next/coverage stayed in TEMP. Existing deprecated esbuild-kit loaders and Vite future config-loader warning remain tooling limitations; current commands pass. No dependency fix/override was attempted.

## N. Coverage

V8 JSON summary, all existing src TypeScript/TSX coverage scope; no threshold/exclusion change:

| Metric | Covered / total | Percentage |
|---|---:|---:|
| Statements | 101 / 526 | 19.20% |
| Branches | 72 / 413 | 17.43% |
| Functions | 31 / 174 | 17.81% |
| Lines | 95 / 484 | 19.62% |

These are informational coverage totals, not live DB or multi-environment verification.

## O. Security Audits

| Fresh command | UTC | Exit | Findings / policy |
|---|---|---:|---|
| `npm audit --omit=dev --json` | 15:41:55–15:41:57 | 0 | 0; runtime hard gate PASS |
| `npm audit --json` | 15:41:57–15:42:01 | 1 | Valid advisories: 19 total, 1 low/6 moderate/12 high/0 critical; informational under current CI policy |

Both JSON payloads parsed with valid metadata and no tool/network error. Full audit exit 1 is advisory evidence, not an all-clear result. Direct affected dev packages: drizzle-kit (moderate) and eslint-config-next (high); remaining affected packages/transitive severity detail are in the captured JSON. Lockfile unchanged; no audit fix.

## P. Static Migration Safety Audit

Static checks at `15:51:45.241Z` PASS: package JSON differs solely by the new Testing script; offline config/Dev config are unchanged; Testing helper is referenced only in its pure module, Testing config and offline tests. No source runtime import, Production config, generic migration script, db:push or automatic migrate path was introduced. Workflow, hooks, dependency lock and runtime modules are unchanged.

No real DB URL was added to source artifacts; new test URLs are deliberately synthetic. TLS verification remains true. The parser checks structure and logical target, not provider identity or effective privileges; absence of a new root/admin convenience path does not mean the helper can identify every provider admin username. Future role/provider verification is mandatory.

## Q. Documentation Sync

Changed source docs: README; docs/04, 07, 09, 10, 12, 14, 17, 18, 19 and 23. They describe explicit Testing tooling, separate future env files, no automatic/Production migration, exact guards, the physical-identity limitation and separate future approval. Legitimately touched stale status is corrected: 0C CLOSED, remote CI/enforcement verified on testing, main behavior deferred, Testing/Production pending and Gate 1 OPEN. Untouched historical reports remain unchanged.

docs/08 and 16 were inspected; schema/readiness contract did not change, so they were preserved. This new report is the only process report added; no live-foundation report was created.

## R. MASTER_GUIDE / MANIFEST

Regenerated using the existing repository process: preserve ordered source set, normalize CRLF→LF for MASTER blocks, rebase relative inline links to repo root, canonical EOF; MANIFEST uses actual file bytes/SHA-256. Baseline derivation was checked independently against Git HEAD: 45 sources, 0 parity mismatches. Scope remains 45 MASTER sources / 46 MANIFEST entries including MASTER and excluding MANIFEST itself/process reports. Separate validator after verdict/review edits at `16:05:59.394Z` confirms 0 material MASTER parity mismatches, 0 missing files, 0 size mismatches, 0 hash mismatches and 0 missing local links/fragments; all 27 ordered report sections PASS. This process report is excluded, so final report edits do not change manifest scope/hashes.

## S. Independent Review

Fresh-context reviewer `/root/phase0d_testing_tooling_review` was dispatched after implementation and local verification with no conversation-history fork; it did not implement these changes. Result: **READY for Phase 0D-3B human provisioning checkpoint; 0 Critical / 0 Important / 0 Minor findings**. No unresolved finding or source correction is required.

Reviewer independently inspected code, current diff, package/installed Kit argument handling, Dev preservation, malformed URL and cross-env rejection, config import safety, no Production/automatic apply, migration/lock/runtime integrity, secret boundaries, documentation and fresh quality evidence. No added URL override or guard bypass was found. The reviewer reran **2 files / 118 guard/parser tests**, **11 offline config probes** and **10 additional encoded-target adversarial inputs**, all PASS/rejected as expected. Those TEMP adversarial checks are additional evidence, not part of the 212 repository tests.

Reviewer also verified 151 tested/current non-Markdown paths identical, 45 MASTER blocks/46 MANIFEST entries with zero mismatches/links/fragments, and preservation at `16:03:37.625Z` PASS: scope exact, empty index, refs/hooks/historical reports/artifacts/skills unchanged and Testing env files absent. Quality logs substantiate the reported full suite/coverage/audits. Official-source findings and physical identity, privilege, inherited-env and exact SQL-byte limitations were checked. No cloud/live DB/private-env/Git mutation was performed by the reviewer.

## T. Future Testing Resource Design

0D-3B will require separate human authorization. Provision one independent TiDB Cloud Starter Testing resource, distinct from Dev and Production, with logical DB `courier_route_planner_testing`. No shared-resource fallback.

Current official source check on 2026-10-04: PingCAP documents a default maximum of five free Starter instances per organization and monthly free quotas for the first five. Account capacity, current resource use, spending limits/payment state and regional availability are **HUMAN VERIFICATION REQUIRED**; generic eligibility does not prove capacity in this account. Review [Starter plan/quota](https://docs.pingcap.com/tidbcloud/select-cluster-tier/) and [creation/spending settings](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/?plan=starter) again before provisioning. No account/resource query or provisioning was performed here.

Public Starter connections require TLS; the config preserves certificate verification. [Official TLS guidance](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/) supports TLS 1.2/1.3 and CA verification. [MySQL tool compatibility](https://docs.pingcap.com/developer/dev-guide-mysql-tools/) and [Drizzle HTTP tutorial](https://docs.pingcap.com/developer/serverless-driver-drizzle-example/) support the existing stack; HTTP runtime examples do not establish success of this exact CLI/Testing apply. Live compatibility remains unverified.

## U. Future Roles / Privileges

| Credential | Future scope/capability |
|---|---|
| Application | Separate Testing user; SELECT/INSERT/UPDATE/DELETE on `courier_route_planner_testing.*`; no global grants or schema-management privilege unless separately justified by an actual application need |
| Migrator | Separate Testing credential; only privileges needed by reviewed SQL and Drizzle ledger operations, scoped to `courier_route_planner_testing.*`; no global `*.*` or GRANT OPTION |
| Root/admin | Human-controlled provisioning only; never passed to app/runtime/migration tooling |

Current [CREATE USER](https://docs.pingcap.com/tidbcloud/sql-statement-create-user/) and [GRANT privileges](https://docs.pingcap.com/tidbcloud/sql-statement-grant-privileges/) docs distinguish account creation from assigning database/table privileges. The human provisioner needs authority to grant; the app/migrator should not receive that authority. Reverify exact Starter SQL syntax, instance username conventions and the minimum migrator privilege set during 0D-3B against the actual reviewed migration/ledger implementation. No SQL user/grant command is provided for execution or was executed in this task.

## V. Resource Identity Limitation

An exact logical DB name can exist on the wrong physical resource. The URL parser and APP_ENV guard cannot prove provider identity, role scope or absence of root privilege. Before future connections/apply, independent human/provider evidence must confirm Testing identity, distinction from Dev/Production, exact Testing DB, both app/migrator credentials pointing to the same Testing resource, and neither pointing to Production. Keep credential values out of chat/logs/report.

## W. Future Human Provisioning Checkpoint

After a separately authorized 0D-3B task, the human verifies account quota/spending/resource identity, provisions the independent Testing resource and logical DB, creates scoped app/migrator users, then saves private local files without pasting values:

- `.env.testing.local`: logically APP_ENV=testing + Testing application DATABASE_URL.
- `.env.migrations.testing.local`: logically APP_ENV=testing + Testing migrator DATABASE_URL.

These file contents are future contracts, not files created now. Structural checks should return safe pass/fail evidence without printing URL/user/password/host or credential objects. Scrub inherited variables and verify TLS/role/target before read-only checks.

## X. Future Migration Approval Checkpoint

Strict 0D-3B order:

1. Provision independent Testing resource.
2. Create Testing logical DB.
3. Create scoped application role.
4. Create separate scoped migration role.
5. Human saves private credentials locally.
6. Safe structural credential/target checks.
7. Read-only application connectivity.
8. Read-only migrator connectivity.
9. Inspect target tables and migration ledger.
10. Review SQL/history and freeze exact apply-byte hash, including line-ending review from section J.
11. Human explicitly authorizes **YES APPLY TESTING MIGRATION**, or a clearly equivalent instruction for this reviewed target/change.
12. Apply Testing migration **ONCE** via the Testing-only command.
13. Read-only verify ledger/hash/schema.
14. Verify application read.
15. **No second migrate** to test idempotence.

Provisioning authorization does not replace apply approval. No migrate command may run before this approval; nothing in 0D-3A authorizes cloud/apply.

## Y. Partial-Failure Policy

TiDB DDL can autocommit; do not assume transaction rollback for schema changes. [Official transaction overview](https://docs.pingcap.com/tidb/stable/transaction-overview/) describes DDL transaction behavior. Before apply, inspect current schema/ledger and define mitigation. After an error, stop and inspect migration ledger, information_schema, actual tables and partial DDL state. Decide remediation through a separate reviewed/authorized action; do not blindly rerun, drop/recreate, edit an applied migration or assume a second migrate is harmless.

## Z. Scope Verification

Final preservation check after review at `16:06:00.546Z` PASS: 15 tracked files changed (package, helper, 11 source docs, MASTER/MANIFEST) plus 3 new files (Testing config, guard tests, this report). Exact scope matches the allowlist; refs/branch/hooks unchanged, index empty, diff check clean, protected files/skills unchanged and both Testing env files absent. Repeated static check at `16:06:00.937Z` confirms code/test/config parity with the tested copy and unchanged artifacts/history.

No change to offline/Dev configs, lockfile, .gitignore/.env.example, existing tests, runtime DB/readiness/schema/health/ready, migration SQL/meta, workflow, hooks, AGENTS, skills-lock or 402 skill files. Historical 19 process reports are unchanged. No algorithm/research/domain implementation, auth/order/CRUD, E2E setup, dependency upgrade, Production tooling or live-foundation report.

No TiDB resource/database/user/grant creation; no live DB connection/query; no migration apply. No Testing private env creation; no Vercel/project/env/deploy; no GitHub configuration mutation. No git add, commit, push, merge, rebase, reset, restore, clean, stash or tag; no branch or PR creation. All Git work is read-only; index stays empty and HEAD stays at the baseline.

## AA. Recommendation

**READY FOR PHASE 0D-3B — TIDB TESTING LIVE FOUNDATION**, through a separate human task. Human quota/spending/resource/role verification and the later explicit apply checkpoint remain required. Stop after 0D-3A; no provisioning or connection is started by this recommendation. Testing/Production remain unprovisioned, Testing migration unapplied and Gate 1 OPEN.
