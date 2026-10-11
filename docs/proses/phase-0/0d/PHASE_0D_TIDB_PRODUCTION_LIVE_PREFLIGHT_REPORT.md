# Phase 0D-5A — TiDB Production Live Foundation Preflight Report

Tanggal verifikasi: **2026-10-11, Asia/Jakarta**. Repository: **ArdhanKurniawan/courier-route-planner**. Mode: audit source dan authenticated provider preflight read-only, desain provisioning, review independen, lalu STOP.

Evidence dibedakan menjadi **fresh local inspection**, **fresh authenticated dashboard observation**, **current official documentation**, dan **historical evidence**. Future checks adalah rencana; belum merupakan hasil koneksi atau mutation Production.

## A. Verdict

**TIDB PRODUCTION PREFLIGHT READY — PROVISIONING APPROVAL REQUIRED**

Pemeriksaan lokal/provider mendukung satu calon resource Starter terpisah dengan spending limit 0. Production belum ada. Tidak ada unresolved blocker biaya, kartu, inventory, tooling atau migration history. Independent review menghasilkan **0 Critical / 0 Important**; final preservation checks PASS. READY berlaku untuk checkpoint provisioning; actual live Production verification tetap future work.

Task berhenti sebelum provisioning. Phase 0D dan **Gate 1 tetap OPEN**; Vercel Preview tetap NOT READY menurut laporan historisnya. Tidak ada klaim Production-ready.

## B. Repository Baseline

| Pemeriksaan fresh | Hasil |
| --- | --- |
| Branch | `feature/phase-0d-tidb-production-live` |
| HEAD / testing / origin/testing | `48dc28c64d25a58ffbef92095694e0484d369895` |
| Merge base HEAD/testing | SHA yang sama |
| main / origin/main | `7836b894c212e951dfe652d30b2531b128f7deff` |
| Working tree awal | Clean, termasuk untracked files |
| Index awal | Empty |
| Initial `git diff --check` | PASS, exit 0 |
| Preservation snapshot | 224 tracked public files dan 424 files `.agents/` |

Branch/base memenuhi task. Tidak ada fetch, branch creation atau operasi Git write. PR #18 merged ke testing dan Quality push run **38067902034**, Quality Gate success, merupakan **baseline yang diberikan manusia dalam task**, bukan fresh remote API verification dalam audit ini.

Empat laporan wajib dibaca penuh: [Production tooling](PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md), [Testing tooling](PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md), [Testing live foundation](PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md), dan [Vercel Preview preflight](PHASE_0D_VERCEL_PREVIEW_PREFLIGHT_REPORT.md). Bagian relevan laporan Phase 0C final/Dev live, Phase 0D baseline, CI implementation, remote CI, required-check enforcement/behavioral proof, dan runtime audit corrective juga diperiksa. Historical reports dipertahankan.

`AGENTS.md`, RTK.md dan inventory `.agents/` diperiksa. Skills: using-superpowers, verification-before-completion, requesting-code-review, receiving-code-review untuk finalisasi hasil review, serta computer-use untuk browser. Seluruh shell commands memakai **RTK proxy**. Tidak memasang skill atau mengubah `.agents/` / `skills-lock.json`.

## C. Production Tooling Baseline

Fresh source inspection mengonfirmasi:

| Contract | Actual source |
| --- | --- |
| Production helper | `getProductionMigrationCredentials` dalam `src/config/db-env.ts` |
| APP_ENV | Exact raw value `production`; nilai hilang, padded atau case berbeda ditolak |
| Logical DB | Exact decoded `courier_route_planner_production` |
| Parser | Shared hardened MySQL URL validation; query/fragment, controls dan ambiguous input ditolak |
| Error | Generic `DatabaseConfigError: Invalid database configuration.` |
| TLS | `ssl: { rejectUnauthorized: true }` |
| Config | `drizzle.production.config.ts`, memakai offline schema/history yang sama dan Production guard |
| Manual script | `db:migrate:production`, dengan file `.env.migrations.production.local` dan config Production eksplisit |
| Installed versions | drizzle-kit **0.31.11**, drizzle-orm **0.45.3**, mysql2 **3.24.5**, HTTP driver **0.3.0** |

Exact script body current:

```text
node --env-file=.env.migrations.production.local ./node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.production.config.ts
```

Source/tests/config/schema diperiksa; helper/config tidak diimpor untuk live connection. Dev dan Testing tetap memiliki helper/config eksplisit masing-masing. Runtime menggunakan `@tidbcloud/serverless` + Drizzle HTTP, migrator menggunakan mysql2. Tidak ada migration pada install/build/start atau quality workflow. Required scripts lint/typecheck/test/build tersedia.

Guard memvalidasi environment dan logical DB; ia tidak memvalidasi provider instance identity, SQL role, password separation atau authorization manusia. Port default parser adalah 3306; future private URL harus menggunakan port yang benar dari provider, secara eksplisit bila berbeda.

## D. TiDB Account Context

Authenticated dashboard menampilkan **Ardhan Kurniawan**, organisasi **Ardhan's Org**, dan kedua resource di **default project**. Inventory Resource View diperiksa tanpa name/ID/plan/region/project filters; total dua, pada satu halaman. Form calon resource juga menampilkan default project sebagai pilihan yang tersedia.

Plan resource current adalah Starter; tidak ditemukan badge subscription plan organisasi terpisah pada halaman yang diperiksa. Jangan mengarang nama plan akun global dari tier instance. Billing Payment Methods menampilkan Credit Cards / Add a New Card tanpa existing card entry. Form Starter secara eksplisit menampilkan **No credit card required**.

Organization timezone dashboard adalah UTC+00:00; timestamps created-at provider di E mengikuti timezone tersebut. Tanggal laporan mengikuti Asia/Jakarta. Email, account/organization/resource IDs, authentication URL fragments, tokens dan connection values tidak disimpan dalam laporan. Tidak ada credential yang sengaja disalin atau dipersist dari browser.

## E. Current Resource Inventory

Fresh authenticated inventory, diperiksa kembali setelah form dibatalkan:

| Purpose | Provider name | Status | Plan | Project | Cloud / region | Created at, provider UTC |
| --- | --- | --- | --- | --- | --- | --- |
| Dev | `DevCourierRoute` | Active | Starter | default project | AWS Tokyo, `ap-northeast-1` | 2026-10-04 02:01:34 |
| Testing | `route-planner-testing` | Active | Starter | default project | AWS Tokyo, `ap-northeast-1` | 2026-10-10 12:26:21 |
| Production | **ABSENT** | N/A | N/A | N/A | N/A | N/A |

Total **2**. Tidak ada `route-planner-production` atau nama resource semantically equivalent dengan Production pada inventory organisasi ini. Tidak menyimpulkan inventory organisasi lain. Testing Overview juga menampilkan Active, Starter, AWS Tokyo dan Current Spend **Free**. Metrics storage/RU yang dibulatkan tidak dipakai untuk menyimpulkan schema atau ledger state.

Dev live dan Testing migrated sekali adalah historical evidence dari laporan masing-masing; tidak ada fresh SQL/HTTP DB query ke Dev, Testing atau Production pada task ini.

## F. Account Capacity / Quota

**Capacity untuk satu additional independent Starter saat preflight: YES**, berdasarkan gabungan evidence akun berikut:

1. Inventory organisasi tanpa filter berjumlah dua resource Starter.
2. Form creation pada organisasi terautentikasi menyatakan maksimum **5 free Starter instances per organization**.
3. Form lengkap untuk `route-planner-production`, default project, AWS Tokyo, spending limit 0 menunjukkan **Create enabled**, tanpa quota warning, paid upgrade atau card gate.

Selisih 5−2 = **3 slot** adalah perhitungan dari limit dan inventory yang terlihat, bukan dedicated remaining-quota counter atau reservation dari provider. Tidak melakukan submit untuk menguji acceptance server. Evidence form akun membuktikan eligibility yang tersedia melalui preflight read-only; generic docs tidak digunakan sendirian untuk menetapkan capacity.

Capacity/permission/provider checks harus diulang tepat sebelum future provisioning. Jika UI berubah, Create disabled karena quota, inventory berbeda, atau capacity tidak lagi dapat ditetapkan, STOP; unknown account capacity menjadi **HUMAN VERIFICATION REQUIRED**.

## G. Cost / Billing Guard

| Intended form setting / fresh observation | Value |
| --- | --- |
| Selected plan | Starter, MySQL Compatible |
| Monthly Spending Limit field | `0.00` |
| Summary Spending Limit | `$0 / month` |
| Displayed maximum price | **$0.00 maximum/month** |
| Card requirement | **NO**, explicit No credit card required |
| Creation eligibility | Create enabled; not clicked |
| Current Testing spend | Free |
| Billing card entries | None visible in Payment Methods |

Generic Create Resource initially opened an **Essential** form with a paid/card gate. Plan selection was changed locally to **Starter before assessment**; its summary then showed the values above. No Essential selection was submitted, card entered, or paid service enabled. Future operator must explicitly verify Starter; default form plan is unsafe to assume.

Current Starter contract: spending limit 0 uses free quota and throttles/rejects new connections when quota is exhausted; increasing the limit may require a payment method. This caps intended spend while sacrificing availability at the free limit. Resource creation consumes one organization slot and creates persistent cloud state; no paid upgrade or additional spend is authorized. [Creation contract](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/?plan=starter), [Spending limit](https://docs.pingcap.com/tidbcloud/manage-serverless-spend-limit/).

Any unexpected charge, card requirement, positive spending limit, or paid upgrade for the intended Starter resource: **STOP without requesting provisioning approval**. Account/form state must be rechecked after approval before mutation.

## H. Current Official Provider Contract

Official documentation checked **2026-10-11**; this is verification date, not a claimed publication date. Some PingCAP direct page retrievals failed; official search-index content supplied the relevant statements. No community source substitutes for these contracts.

| Topic | Current contract and source |
| --- | --- |
| Creation / limits / region | Organization Owner or Project Owner can create; cloud/region are selected before submit. Default five free Starter instances; limit 0 remains free, positive limit/additional instances require card. [Create Starter](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/?plan=starter) |
| Quota behavior | First five instances have free quota; exceeding free limit restricts new connections/throttles. No paid quota increase is selected. [Spending limit](https://docs.pingcap.com/tidbcloud/manage-serverless-spend-limit/) |
| TLS | Public Starter connections require TLS; supported versions 1.2/1.3. Preserve certificate verification and trusted roots. [TLS](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/) |
| Instance / username identity | Starter is multi-tenant; each instance has a unique username prefix required for SQL users/connections. [Select a plan / user prefix](https://docs.pingcap.com/tidbcloud/select-cluster-tier/) |
| User creation | SQL user identity combines username/host; CREATE USER supports password and REQUIRE SSL. Creation/credential entry is future human work. [CREATE USER](https://docs.pingcap.com/tidbcloud/sql-statement-create-user/) |
| Grants | GRANT targets a pre-existing user; grantor needs GRANT OPTION and allocated privileges. Application/migrator recipients do not receive GRANT OPTION. [GRANT](https://docs.pingcap.com/tidbcloud/sql-statement-grant-privileges/) |
| DB patterns | `%` / `_` in DB privilege patterns are wildcards. Escape all literal underscores; backticks alone do not remove pattern semantics. Direct grants and inherited/default/active roles must be assessed together. [Privilege management](https://docs.pingcap.com/tidb/stable/privilege-management/), [Database users and roles](https://docs.pingcap.com/tidbcloud/configure-sql-users/) |
| DDL / transactions | DDL implicitly commits and cannot be assumed rolled back with migration bookkeeping. [Transactions](https://docs.pingcap.com/tidb/stable/transaction-overview/) |

Available AWS regions were freshly inspected in the Starter form: Tokyo, Singapore, Frankfurt, Sao Paulo, N. Virginia and Oregon. Tokyo was selected and matched both existing resources. This UI evidence establishes the current target choice; docs alone do not establish account-specific availability or quota.

## I. Production Resource Design

| Planned property; not provisioned | Value |
| --- | --- |
| Provider resource name | `route-planner-production` |
| Logical DB | `courier_route_planner_production` |
| Organization / project | Ardhan's Org / default project |
| Plan | Starter, MySQL Compatible |
| Cloud / region | AWS Tokyo, `ap-northeast-1` |
| Spending limit | **0** |
| Creation mode | One independent instance; no Dev/Testing branch, clone, import or restore |

Tokyo preserves operational consistency with Testing; no objective reason to select another available region emerged. Keeping the same project/region does not replace instance isolation. No project, resource, DB, user or credential was created.

## J. Physical Isolation Plan

**Isolation design PASS; actual Production identity NOT YET VERIFIED because resource is absent.** “Independent” means a separate provider instance and credential namespace from Dev/Testing. Starter uses shared multi-tenant infrastructure; this plan does not claim dedicated hardware. [Starter / prefix contract](https://docs.pingcap.com/tidbcloud/select-cluster-tier/).

After future authorized provisioning, correlate provider resource identity and unique username prefix privately. Production instance ID must differ from both existing instances; both Production credentials must map to that same new instance/prefix, with different app/migrator usernames and passwords. Compare safe boolean results or protected fingerprints; never publish full IDs, usernames, host/URL/password.

Confirm both sessions' authenticated user and default DB using read-only queries, together with provider mapping. Neither credential may map to Dev/Testing. Regional hostnames may be shared, so hostname inequality is not required and hostname equality alone cannot identify an instance. DB name, APP_ENV, SELECT 1 or readiness success alone is insufficient. STOP on any mapping ambiguity before migration.

## K. Application Role

Future user suffix: `production_app`, using the new Production prefix. Intended effective access: **SELECT, INSERT, UPDATE, DELETE** on the exact Production database only. No schema administration, global access, CREATE USER, GRANT OPTION or broad built-in role.

Reviewed template, **not executed**, with placeholder user identity:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE
ON `courier\_route\_planner\_production`.*
TO '<production-prefix>.production_app'@'%';
```

Every underscore is escaped as a literal DB-pattern character. Host `%` is the SQL account host pattern, separate from DB scope. Future SHOW GRANTS/effective-role verification must reject wildcard DB scope, unexpected role inheritance or effective global privileges. A bare USAGE marker on `*.*` grants no operation and must not be confused with global data/admin permission. [Privilege semantics](https://docs.pingcap.com/tidb/stable/privilege-management/).

DB-wide CRUD also covers ledger DML after it exists; this template does not enforce table-level ledger immutability. It follows the task's reviewed DB-scoped application contract. No application code uses the ledger. Any later table-specific hardening needs a separately reviewed grant design.

## L. Migrator Role

Future suffix: `production_migrator`, different user/password from application. Candidate minimum for **this exact initial history**: **CREATE, SELECT, INSERT** on the exact Production database.

Reviewed template, **not executed**:

```sql
GRANT CREATE, SELECT, INSERT
ON `courier\_route\_planner\_production`.*
TO '<production-prefix>.production_migrator'@'%';
```

Fresh installed-source review: Kit `bin.cjs:79305` selects mysql2 and imports `drizzle-orm/mysql2/migrator`; migrate handler at `92018` passes the configured history. `mysql2/migrator.cjs:25` reads history and delegates to `mysql-core/dialect.cjs:46`. Dialect creates `__drizzle_migrations`, SELECTs latest ledger row, executes migration CREATE TABLE depots, then INSERTs hash/timestamp. The initial inline primary key does not require separate CREATE INDEX; no ALTER/DROP/UPDATE/DELETE statement occurs.

Thus CREATE/SELECT/INSERT is sufficient by static review of current SQL/runner, consistent with historical Testing evidence. Production effective privileges and actual apply remain untested. Connection/transaction setup does not justify global privileges. No ALL PRIVILEGES, global operations, GRANT OPTION, role_admin, CREATE USER, manual ledger or extra database is approved. Any future privilege error requires STOP and evidence review, not automatic grant expansion.

## M. Admin Boundary

Provider/admin/root is for **human provisioning only**. It is excluded from both private application/migration files, source, tests, reports, chat and Vercel. Runtime uses the app user; migration uses the migrator user.

No Connect / Generate Password / SQL Editor / SQL Users creation action was used. Future password generation, creation/rotation or copying requires a private human handoff; clear password displays before agent inspection. Do not send credentials to chat or log them. Reviewed admin execution of DB/user/grants is confined to checkpoint A.

## N. Private Env Contract

Both future files are **absent now**, checked by existence metadata only, and match Git ignore rules:

| Future file | Allowed content |
| --- | --- |
| `.env.production.local` | APP_ENV=production; DATABASE_URL for Production **application** credential |
| `.env.migrations.production.local` | APP_ENV=production; DATABASE_URL for Production **migrator** credential |

Names, users and passwords must remain distinct; both URLs target the same Production instance and exact DB. Human privately stores percent-encoded URL credentials with the correct provider port. Future parser verification emits only presence/validity/distinctness/mapping booleans, never content. Reject duplicate/unexpected env keys, preloads or TLS overrides, including values embedded in the env file itself. No admin credential, NEXT_PUBLIC variable or migration credential in runtime/Vercel.

No private env file was read or created in this task. No env contents requested from the human. Existing Dev/Testing private files remain outside inspection.

## O. Migration History

Fresh raw filesystem bytes/hash match the Production tooling report exactly:

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `drizzle/0000_dear_rictor.sql` | 341 | `64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577` |
| `drizzle/meta/0000_snapshot.json` | 2129 | `9d3a7d20deacbd8ab4e85b4fba5cbc0a51b787a3800969cffaafdbb23ddfe584` |
| `drizzle/meta/_journal.json` | 200 | `9e3ed23ec5e1bb4fbce6a8b4a3f06362cbd38f29ccbb428392fa20b4324578b8` |

Exactly **one SQL migration**, one journal entry: idx 0, tag `0000_dear_rictor`, timestamp **1791072707266**, breakpoints true. SQL creates only `depots`, eight columns and primary key. Snapshot has only depots, no additional tables/views. No second migration or drift.

Installed `drizzle-orm/migrator.cjs` hashes the raw UTF-8 SQL string. Current CRLF bytes produce the SQL hash above; Git/LF normalization can change the hash without changing SQL semantics. Before future apply, review the exact bytes that will be executed again. Never normalize them during apply or silently accept changed history. Runtime SQL mutation count in this preflight is **0**, regardless of repository history count 1.

## P. Exact Invocation Limitation

Future approved command must be exactly:

```text
npm run db:migrate:production
```

**No appended arguments.** The script name is not an authorization or physical-isolation boundary. Historical tooling probes demonstrated appended `--config` override; fresh installed parser inspection shows repeated options assign `result[name] = data` sequentially (`bin.cjs:91301–91316`), so the last config can win. No bypass command was executed here.

Before future apply pin exact argv, resolved config, intended private file, verified binary/npm runtime, clean environment, unchanged package/config/history, physical Production mapping and separate migration approval. No generic db:migrate, Testing migrate, push, custom config, manual equivalent SQL or wrapper that appends options. This limitation is preserved openly; no stronger enforcement is claimed.

## Q. Clean Environment Requirement

Node `--env-file` gives inherited environment values precedence; it also parses Node startup variables from the file. [Node 24 CLI env-file](https://nodejs.org/download/release/v24.21.0/docs/api/cli.html#--env-filefile). Therefore exact filenames alone do not guarantee effective Production values.

Future procedure, **not executed against Production**:

1. Before launching Node/npm, create a child process environment from a reviewed minimal OS/runtime allowlist. Use a verified Node 24/npm pair and trusted PATH, explicit cwd and reviewed npm configuration; no profile, preload, alternate script-shell or extra CLI argument.
2. Exclude inherited APP_ENV, DATABASE_URL, NODE_OPTIONS, NODE_TLS_REJECT_UNAUTHORIZED, SSLKEYLOGFILE, NODE_PATH, NODE_DEBUG/NODE_DEBUG_NATIVE, DEBUG, OpenSSL/CA override variables and any equivalent loader/proxy/TLS override. Do not print their values. Keep certificate verification enabled.
3. Privately validate the intended env file has only its two approved keys, correct APP_ENV, valid URL, correct role/instance and no duplicate assignment. Treat unexpected file keys, Node startup variables or missing file as STOP.
4. Use the same approved clean-environment procedure for read-only checks and later exact apply; report only sanitized structural results. Recheck that inherited overrides are absent immediately before launching the approved command. A parent environment scrub after Node startup is too late for preloads.

No root Vite/Vitest/Next process or env-file loader was run here. The audit helper read public files only, with child Node startup overrides removed before launch. No fresh lint/typecheck/test/build is claimed for this report-only stage.

## R. Future Pre-Migration State

After separately authorized provisioning/private setup, read-only pre-apply inspection must find:

| Expected Production DB state | Required |
| --- | --- |
| Logical database | Present, exact intended name |
| Application tables | **0** |
| depots | Absent |
| Drizzle ledger | Absent |
| Unexpected user tables/objects | **0** |

Current Production schema/ledger are **N/A, resource absent**. Do not label them live-verified empty now. Future information_schema reads, identity and effective grants inspection must complete before checkpoint B. Existing objects, an unexpected view/table, partial ledger, identity ambiguity or history drift cause STOP; never drop/recreate automatically.

## S. Future Apply Sequence

1. Repeat local baseline, provider context, inventory/name, capacity, Starter/region/spend/card checks.
2. Obtain exact **human provisioning approval** (W).
3. Create one independent Production resource, logical DB, application user, separate migrator user and only reviewed grants; verify counts/settings. Hand off all password generation/entry/copying privately to the human.
4. Human stores the two private files; perform structural verification, app read-only connectivity via existing HTTP driver and migrator read-only connectivity via mysql2 with verified TLS.
5. Verify physical mapping, authenticated users, distinct passwords, effective direct/inherited grants and empty schema/ledger; re-review exact migration bytes and hash.
6. STOP at **separate human migration approval** (X).
7. After recheck, run exact command in P **ONCE**, in the verified clean environment. Track invocation count as well as ledger state; do not infer success solely from CLI exit code.
8. Read-only verify one ledger row with exact SQL hash/timestamp, depots schema parity (eight columns/PK), expected tables only, application read and local health/readiness using only Production app credential. No seed/CRUD/write-permission probe.
9. Verify role isolation from effective privileges/provider mapping, close connections and STOP. No Vercel/deployment/main/Git step follows.

Readiness SELECT 1 proves connectivity only; it does not prove instance identity, correct role, schema or ledger. Health/readiness source is inspected, not exercised on Production. Negative role assessment remains read-only; no cross-environment credential probe or CREATE attempt is permitted implicitly.

## T. Partial Failure Policy

If a future apply fails or its result is ambiguous: **STOP, NO RETRY**. Read-only inspect ledger, information_schema, actual tables and partial DDL state. Record safe error classification and invocation count; do not print connection values or raw driver errors containing secrets.

TiDB DDL auto-commits; the Drizzle transaction wrapper is not proof of atomic schema+ledger rollback. Never auto-drop, edit ledger, replay SQL or broaden grants. Recovery/rollback mitigation requires a separate evidence-based human decision and scope. [TiDB transaction behavior](https://docs.pingcap.com/tidb/stable/transaction-overview/).

## U. Vercel Boundary

No Vercel operation occurred. [Preview preflight](PHASE_0D_VERCEL_PREVIEW_PREFLIGHT_REPORT.md) remains **NOT READY**: historical blockers include GitHub linkage, workspace connector access and first-deployment target contract. This task does not investigate/fix those blockers or authorize project creation, Git connection, env configuration, Preview/Production deployment, domains or promotion.

## V. Main Branch Boundary

No testing→main merge/PR, foundation promotion, ruleset edit or GitHub mutation. Historical [behavioral proof](PHASE_0D_ENFORCEMENT_BEHAVIOR_PROOF_REPORT.md) verifies Testing behavior; Main behavioral proof remains deferred. Phase 0D / Gate 1 remain OPEN. Local main/origin/main refs are preserved, not freshly remote-audited here.

## W. Human Provisioning Authorization

After this preflight is finalized READY, STOP and request exactly:

**YES PROVISION PRODUCTION RESOURCE**

Future phrase authorizes **only checkpoint A**: one independent `route-planner-production` Starter in AWS Tokyo with spending limit 0, logical DB `courier_route_planner_production`, one application SQL user, one separate migrator SQL user, and reviewed DB-scoped grants in K/L. Recheck baseline/inventory/name/price/card/capacity before mutation; drift causes STOP.

It does not authorize migration, table/ledger creation, second resource, wider grants, destructive cleanup, Vercel, deployment/domain, main promotion or Git operations. Password work remains private human handoff. This task does not consume historical Testing approvals or provision during preflight.

## X. Human Migration Authorization

Checkpoint A is never reused as migration approval. After provisioning, private setup and **all** read-only identity/grants/empty-state/hash checks pass, STOP again and request exactly:

**YES APPLY PRODUCTION MIGRATION**

Only this separate future checkpoint can authorize the reviewed exact migration once. Its packet must state resource/role mapping, effective grants, schema/ledger absent, count/hash/timestamp, clean env, exact invocation limitation, cost unchanged and failure policy. No Vercel, main, Git or destructive remediation is included.

## Y. Scope / Mutation Verification

Only repository output: **this report**. Browser actions were navigation, read-only observations, and unsaved form selections/name input followed by Cancel. Final Create/Update/Add Card/Generate Password/SQL execution was never clicked. Inventory remained two resources after Cancel. Overview views do not constitute an agent SQL connection or migration.

| Operation during this preflight | Count |
| --- | ---: |
| TiDB resources created | **0** |
| Logical databases created | **0** |
| SQL users / credentials created | **0** |
| GRANT mutations | **0** |
| Production SQL / app connections | **0** |
| Migration invocations / applies, all environments | **0 / 0** |
| Production private files created/read | **0 / 0** |
| Vercel mutations | **0** |
| Main promotion / GitHub mutation | **0 / 0** |
| Git mutations | **0** |

Initial RTK commands PASS: branch, HEAD/testing/origin/testing/main/origin/main, merge-base, status with all untracked files, cached diff stat, diff check, public file hashes, installed metadata and migration hash comparison. `git check-ignore .env.production.local .env.migrations.production.local` PASS; both files absent by metadata. Source/installed runner/official docs and authenticated dashboard inspected as described above.

Fresh local lint/typecheck/test/build, migration dry execution, runtime audit and DB smoke: **NOT RUN** for this audit/report-only stage. Previous test/audit/build success stays historical; it is not a fresh PASS claim. No dependency installation or background server.

External evidence, outside repository:

`C:/Users/L E N O V O/.codex/visualizations/2026/10/02/01a0fcc3-a956-7a52-a7d5-e5f1890cf773/tidb-production-live-preflight-20261011/`

Files: `initial-public.json`, `final-public.json`, initial inventory/form/billing DOM observations, sanitized Testing overview, `starter-form.jpg`, `final-inventory.dom.txt`, `final-inventory.jpg`, independent review record dan public-only verifier. Snapshot/role/price fields are safe; email/resource IDs from Testing Overview were removed before persistence. Form screenshot menunjukkan calon Starter yang belum disubmit; final inventory screenshot menunjukkan dua resource setelah Cancel. Authentication redirect data is not included. These local assets are supplementary, not portable Git evidence.

Independent review: **PASS**, fresh-context reviewer `/root/phase0d5a_preflight_reviewer`, yang tidak ikut menulis laporan/provisioning/tooling task ini. Reviewer membaca task, captured provider DOM dan kedua screenshots, actual source/history/installed runner/parser, official contract, safety/approval wording serta independently recomputed preservation/migration hashes. Hasil substantive: **0 Critical / 0 Important**. Dua Minor finalization items (draft/PENDING wording dan evidence inventory) diselesaikan dalam laporan final. Reviewer tidak mengubah file atau provider state.

Review limits: provider observation berasal dari capture coordinator, bukan independent live dashboard observation. Tidak ada server-submit acceptance/reserved-quota proof, exhaustive provider mutation log, actual Production identity/credentials/grants/connectivity/schema/apply, fresh quality suite, atau fresh remote GitHub/Vercel audit. Batas ini sesuai read-only stage; tidak menghapus future acceptance requirements. Reviewer pertama kali menemui unavailable Get-FileHash pada spawned PowerShell, kemudian independent .NET SHA-256 computation PASS; tidak ada mutation.

Final RTK checks **PASS**: `git status --short --untracked-files=all` hanya report untracked; `git diff --check` exit 0; `git diff --cached --stat` kosong; `git rev-parse HEAD` tetap baseline. Public preservation: **224 original files unchanged**, **424 skill files unchanged**, refs unchanged, Production env metadata tetap absent, tiga migration hashes identik. Report langsung divalidasi: **26 A–Z headings, 0 trailing whitespace**; ini melengkapi diff check yang tidak mencakup untracked file.

## Z. Recommendation

**TIDB PRODUCTION PREFLIGHT READY — PROVISIONING APPROVAL REQUIRED**. Independent review dan preservation checks PASS; tidak ada unresolved Critical/Important finding. Starter form eligibility telah diperiksa, tetapi capacity/settings dapat berubah sebelum execution; ulang seluruh guard sebelum provisioning kelak.

Minta persis **YES PROVISION PRODUCTION RESOURCE**, sesuai task bagian 27, lalu **STOP**. Approval hanya checkpoint A pada W. Actual resource identity, credential/grants enforcement, connectivity dan schema tetap perlu dibuktikan sesudah authorized provisioning; migration tetap memerlukan checkpoint B terpisah. Tidak ada provisioning, credential request atau mutation lanjutan pada task ini.
