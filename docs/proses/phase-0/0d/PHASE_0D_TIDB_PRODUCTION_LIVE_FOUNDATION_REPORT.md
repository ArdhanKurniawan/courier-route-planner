# Phase 0D-5B — TiDB Production Live Foundation Report

Tanggal closure: **2026-10-11, Asia/Jakarta**. Repository: **ArdhanKurniawan/courier-route-planner**. Scope closure: repository documentation only, memakai safe evidence Checkpoint A/B yang sudah selesai. Tidak ada koneksi provider/DB, SQL, migration atau credential work baru.

Evidence live di bawah berasal dari execution sebelumnya pada tanggal yang sama. Fresh closure checks hanya baseline, file preservation, dokumentasi, derived parity, bounded secret scan dan quality pada public isolated copy. Laporan [tooling](PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md) dan [preflight](PHASE_0D_TIDB_PRODUCTION_LIVE_PREFLIGHT_REPORT.md) dipertahankan sebagai historical snapshots.

## A. Verdict

**TIDB PRODUCTION LIVE FOUNDATION VERIFIED**

Approved initial migration sudah diterapkan tepat sekali: **invocations 1 / retries 0 / exit 0**. Postapply read-only evidence membuktikan Production independent Starter, exact scoped roles/TLS, schema depots, ledger satu row dan application ORM read PASS. Local unchanged health/readiness handlers PASS memakai Production app credential. Public deployed HTTP belum diverifikasi.

Verdict terbatas pada initial database foundation. Vercel **NOT integrated**, Preview preflight **NOT READY**; main foundation promotion **NOT YET performed**, main required-check behavioral proof **DEFERRED**; Phase 0D dan Gate 1 **OPEN**. Tidak ada klaim overall production deployment-readiness.

## B. Repository Baseline

| Fresh closure baseline | Hasil |
| --- | --- |
| Branch | `feature/phase-0d-tidb-production-live` |
| BASE | `testing` |
| HEAD / testing / origin/testing / merge-base | `48dc28c64d25a58ffbef92095694e0484d369895` |
| Initial status with all untracked files | Hanya expected existing preflight report |
| Initial index / diff check | Empty / PASS, exit 0 |
| Public preservation snapshot | 224 tracked files; 424 files `.agents/` |
| Baseline MASTER reconstruction | Exact parity, 45 source blocks |

`AGENTS.md`, RTK.md, `.agents/` inventory dan actual package scripts diperiksa. Skills: **using-superpowers**, **verification-before-completion**, **requesting-code-review**; **systematic-debugging** untuk native build environment failure. Shell commands memakai RTK. Tidak memasang skills atau mengubah `.agents/` / `skills-lock.json`. Tidak fetch atau mengubah Git refs/index/history. Current testing/origin/testing adalah local source of truth; fresh remote GitHub verification tidak dilakukan.

Plan closure: baca complete tooling/preflight dan safe A/B evidence → sync factual source docs → record current outcome → regenerate derived docs dengan existing process → public checks/quality → fresh-context independent review → final checks → STOP sebelum Git mutation.

## C. Production Resource

**Verified YES**, berdasarkan authorized provisioning dan postapply provider readback, bukan inventory query baru dalam closure.

| Property | Recorded state |
| --- | --- |
| Resource | `route-planner-production`, tepat satu |
| Plan / status | Starter / Active |
| Cloud / region | AWS Tokyo / `ap-northeast-1` |
| Organization / project | Existing organization / default project |
| Submitted Monthly Spending Limit | **0** |
| Creation summary / card requirement | **$0/month / No credit card required** |

Preflight menemukan dua resource dan Production absent. Immediate pre-provision recheck mempertahankan Starter, Tokyo, zero-spend/card boundary; satu independent Production dibuat dengan approval K. Final Checkpoint B inventory memiliki tepat tiga resource Active Starter Tokyo. Tidak ada Production kedua, clone/branch/import/restore atau paid upgrade.

## D. Physical Isolation

**Distinct Dev / Testing / Production: YES.** Provider visible instance identities dicocokkan dengan resource mapping dan pairwise distinct; raw IDs tidak dipublikasikan. Captured Production credential namespace dicocokkan secara privat terhadap kedua authenticated sessions. App/migrator menunjuk resource Production yang sama dan berbeda dari Dev/Testing.

Recorded inventory: Dev `DevCourierRoute`, Testing `route-planner-testing`, Production `route-planner-production`. Same regional endpoint bukan bukti same resource; hostname tidak digunakan sebagai isolation proof tunggal. Starter memakai managed multi-tenant infrastructure; independent instance tidak mengklaim dedicated hardware. Dev/Testing tidak di-query ulang pada closure atau Production apply continuation.

## E. Logical Database

`courier_route_planner_production` dibuat pada authorized Checkpoint A. Application dan migrator `DATABASE()` cocok exact intended DB, provider prefix dan principal PASS. Label APP_ENV/database saja tidak membuktikan physical target; mapping D juga diperlukan.

Database tidak dibuat ulang; closure tidak menjalankan SQL. Initial postapply expected base tables: **`depots`** dan **`__drizzle_migrations`** saja.

## F. Application Role

Actual existing dedicated application identity diverifikasi secara privat terhadap env dan authenticated session. Full SQL username tidak disalin ke report. Effective privileges tepat **SELECT, INSERT, UPDATE, DELETE**, hanya pada Production DB, dengan literal underscores pada grant pattern di-escape.

Postapply app evidence: exact scope/principal PASS; active roles NONE; no operational global privilege, GRANT OPTION atau unexpected role assignment. Bare global USAGE marker memberikan no operational privilege. App tidak memakai root/admin atau migrator. Read-only checks tidak mencoba CREATE/DML untuk menguji rejection.

## G. Migrator Role

Actual dedicated migration identity berbeda dari application, verified privately. Effective privileges tepat **CREATE, SELECT, INSERT**, hanya pada exact Production DB dengan escaped grant pattern. No operational global privilege, GRANT OPTION, unexpected role assignment atau active role; admin excluded.

Minimum ini sesuai frozen initial SQL dan installed Drizzle runner: CREATE ledger, SELECT latest entry, CREATE depots, INSERT migration row. Tidak perlu privilege expansion. mysql2 hanya CLI dev adapter; runtime app memakai Drizzle + `@tidbcloud/serverless` HTTP. TCP certificate authorized, TLSv1.3, `rejectUnauthorized: true`.

## H. Private Credential Boundary

Admin initial password generation/copy dan dedicated SQL user/password setup memakai **private human handoff**. Manusia menyimpan ignored `.env.production.local` untuk app dan `.env.migrations.production.local` untuk migrator, exact APP_ENV/DATABASE_URL keys. Actual accounts/passwords berbeda, same verified Production resource/database; admin tidak digunakan pada kedua files.

Provider name-length constraint menyebabkan actual dedicated account identities berbeda dari candidate preflight names; manusia mengotorisasi expected-identity alignment. Full identity/password/host/URL tetap privat. Earlier grant attempt gagal sebelum intended users tersedia; human handoff menyelesaikan CREATE USER → GRANT → SHOW GRANTS. Agent tidak mengulang account/grants setelah state sesuai.

Private env preserved saat apply/read-only verification; tidak disalin ke Git, runtime client, Vercel, report atau chat. Closure ini tidak membaca, menampilkan atau mengubah private env, tidak generate/reset password dan tidak membuka credential UI.

## I. Pre-Migration State

Immediate gates **2026-10-11 04:23:23–04:23:25 UTC** (11:23 WIB) memakai app/migrator dan menemukan exact Production DB kosong: **0 tables/views**, depots absent, Drizzle ledger absent. Identity, TLS, effective grants, private separation, provider mapping, public preservation dan exact artifacts/invocation PASS sebelum sole spawn.

Ini historical pre-apply state; current recorded postapply state adalah dua tabel dan satu ledger row. Closure tidak mencoba mereproduksi empty state, drop table atau mengulang inspection live.

## J. Migration Artifact Review

One SQL migration / one journal entry, idx 0, tag **`0000_dear_rictor`**, timestamp **1791072707266**, breakpoints true. Migration source/config/history tidak diubah untuk Production.

| Artifact | Raw bytes | SHA-256 reviewed and applied |
| --- | ---: | --- |
| `drizzle/0000_dear_rictor.sql` | 341 | `64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577` |
| `drizzle/meta/0000_snapshot.json` | 2129 | `9d3a7d20deacbd8ab4e85b4fba5cbc0a51b787a3800969cffaafdbb23ddfe584` |
| `drizzle/meta/_journal.json` | 200 | `9e3ed23ec5e1bb4fbce6a8b4a3f06362cbd38f29ccbb428392fa20b4324578b8` |

Hash menggunakan exact raw filesystem bytes, termasuk CRLF SQL, bukan LF-normalized semantic equivalent. SQL creates only depots; runner creates its own ledger. Companion snapshot/journal unchanged. Fresh closure recomputes public artifact hashes, tanpa import migration config atau execution runner.

## K. Human Provisioning Authorization

Human memberikan exact **YES PROVISION PRODUCTION RESOURCE**, checkpoint A only: satu independent named Starter Tokyo, spending limit 0, logical Production DB, satu app/satu migrator dan reviewed DB-scoped grants. Recheck inventory/name/quota/plan/region/price/card dilakukan sebelum submit. Password generation/entry/copy diarahkan ke private human handoff.

Approval ini tidak digunakan untuk migration. No ALL PRIVILEGES, global operations, GRANT OPTION, manual depots/ledger, Vercel, deployment, promotion atau Git mutation diotorisasi. Current account/grants yang sudah PASS dipertahankan.

## L. Human Migration Authorization

Setelah preapply packet dan independent review PASS, agent STOP. Human memberikan exact **YES APPLY PRODUCTION MIGRATION**, terpisah dari provisioning, mengotorisasi satu exact initial migration pada existing verified target.

Immediate guard rechecks sesudah approval PASS sebelum invocation M. Approval initial ini sudah digunakan; bukan standing permission untuk migration kedua, retry atau remediation. Closure user secara eksplisit melarang migration/live operations baru.

## M. Migration Execution

| Recorded execution | Hasil |
| --- | --- |
| Exact command | `npm run db:migrate:production` |
| npm argv / forwarded options | `run`, `db:migrate:production` / **0** |
| Invocations / retries | **1 / 0** |
| Exit / CLI success marker | **0 / true** |
| Duration | **6772 ms** |
| Completed | **2026-10-11 04:23:31 UTC / 11:23:31 WIB** |

Actual unchanged package script:

```text
node --env-file=.env.migrations.production.local ./node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.production.config.ts
```

Trusted Node 24/npm CLI; child started with minimal OS/runtime allowlist and trusted Node/Windows/Git PATH. Inherited APP_ENV/DATABASE_URL, preload/TLS/proxy/npm overrides excluded before startup; exact private two-key file validated. No migration hooks, alternate shell, local/ancestor `.bin` Node shadow or appended config options. Exclusive `apply-attempt.json` marker written before sole spawn; `apply-result.json` records one invocation/exit 0, raw stdout/stderr suppressed in memory.

Drizzle created depots and ledger and inserted entry. No manual CREATE/ledger INSERT, seed, DML probe or retry. Script name alone is not a physical/approval guard: appended duplicate config can override; inherited env beats env-file. TiDB DDL may autocommit; future partial/ambiguous failure requires STOP, read-only inspection and separate mitigation approval, without automatic rollback/drop/replay. Initial command **must not be run again**.

## N. Ledger Verification

Both postapply roles verified **exactly 1 ledger row**. Hash **`64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577`**, timestamp **1791072707266** match exact SQL/journal. Ledger has runner's three columns (id/hash/created_at); recorded positive ID, without assuming id=1.

Sole invocation is established by apply marker/result together with empty-state and ledger evidence; ledger row count alone is insufficient to count attempts. No ledger edits or manual creation. Checks were recorded at **04:23:52 UTC app / 04:24:03 UTC migrator**, not repeated during closure.

## O. Live Schema Verification

Both roles confirm exactly two base tables: depots and runner ledger, no unexpected table/view. Depots ordered columns:

| Column | Verified source/SQL parity |
| --- | --- |
| id | Signed BIGINT, NOT NULL, AUTO_INCREMENT, sole PK |
| name | VARCHAR(255), NOT NULL |
| address | TEXT, nullable |
| latitude / longitude | DOUBLE, NOT NULL |
| is_active | TINYINT(1), NOT NULL, default 1 |
| created_at / updated_at | DATETIME(3), NOT NULL, no DB timestamp default |

**8 columns**, PK exactly id, no unexpected depot indexes. Types/nullability/defaults/precision match reviewed source/SQL/snapshot. Depots row count **0**. Domain tables/CRUD/auth/research schema remain future work; no seed or manual table patch.

## P. Application Read Verification

**PASS**: authenticated application SELECT 1/DATABASE()/identity/grants and unchanged `src/db/client.ts` source factory + real Drizzle schema ORM SELECT returned empty depots rows. Uses Production application credential and HTTP driver/default fetch with certificate validation enabled.

No application write test or cross-environment credential probe. App read establishes read compatibility for current schema; it does not prove CRUD feature completion, auth or deployed runtime.

## Q. Health / Readiness Verification

**Local unchanged `/api/health` and `/api/ready` handlers were invoked successfully against the Production application credential.** Both returned 200, status ok, Cache-Control no-store. Health remains app-only; readiness performed SELECT 1 connectivity check using only app credential.

**Public deployed HTTP verified: NO.** No HTTP server or Vercel deployment was used for this Production smoke. Direct handler invocation proves the recorded local source behavior. Ready SELECT 1 alone does not prove physical isolation/schema/role; separate evidence D–P supplies those checks.

## R. Role Isolation

PASS within read-only effective-privilege/provider mapping assessment: dedicated principals and passwords differ, both Production prefixes/DB match, Dev/Testing/Production IDs distinct, app CRUD versus migrator CREATE/SELECT/INSERT scope exact; active roles NONE, admin excluded, grants unchanged after apply.

No forbidden write attempt, cross-environment query or negative CREATE probe was performed. DB-wide app CRUD includes DML on ledger/future tables under reviewed contract; ledger immutability is **not claimed**. Table-specific hardening needs separate reviewed scope.

## S. Cost / Resource State

Submitted Starter limit **0**, creation summary **$0/month**, explicit **No credit card required**. Postapply same physical Production Active Starter AWS Tokyo, Current Spend **Free**, Set Spending limit available; inventory remains three. Payment Methods readback shows Add a New Card only with no saved-card widget/table indicators; no card/upgrade/limit submission.

Overview did not directly render the saved numeric limit. Submitted zero plus Free/Set/no-card signals are the bounded cost evidence; do not claim a fresh saved-numeric read or guarantee future quota/availability. No provider setting checked/changed anew in closure. Future preflight must review current account limits/pricing separately.

## T. Security / Secret Preservation

Prior Checkpoint B final scan PASS: actual private values absent from **25** B text artifacts, private env structure/preservation PASS. Full username/password/hostname/URL/token/credential screenshots are excluded from repository report. Only safe role flags, resource names, logical DB and migration metadata are retained.

Fresh closure bounded pattern scan/public preservation **PASS**: 16 changed/status documentation files scanned, **0 findings**; 210 original tracked files unchanged, 14 tracked documentation files changed within scope, 424 skill files preserved. Existing preflight report hash preserved, index empty/refs unchanged; fresh public migration hashes match J. Scope covers changed tracked documentation and both untracked reports, including derived MASTER. Private env files are not opened; this scan cannot compare against all private values or prove absence of every possible secret format. Historical exact-value scan complements it without a new env read. Checks rerun after review finalization.

Source/runtime/config/workflow/dependency/migration/.agents/skills-lock bytes are preserved against initial snapshot. Existing preflight report is byte-for-byte retained. Closure has no SQL, DB/provider connection, credential/grant/resource/Vercel/Git mutation. Relevant commands are public-only; no previous live helper is reexecuted.

## U. Superseded Evidence / Incident Notes

Earlier read-only observations temporarily suggested application account absence and authentication failed (HTTP 401 / TCP access-denied). Later human authoritative confirmation and **03:51:00 UTC** authenticated source app evidence established that the existing actual application identity, CRUD grants and empty-state were PASS; immediate/postapply checks also PASS.

Those absence/failure observations are **superseded historical evidence**. The current verifier already used approved actual role suffixes; evidence does not establish the cause of the earlier discrepancy. No cause is asserted and no extra app user, grant reapplication or password reset is claimed to resolve it. Missing-account handoff proposal was withdrawn and executable creation/grant instructions removed. Candidate-to-actual account alignment from H is recorded separately and is not asserted as the cause of that later discrepancy.

Before Checkpoint B, minimal PATH lacked Git and stopped public preparation before network/migration. Bounded diagnosis added only verified Git directory; migration count remained 0 until sole approved spawn. Wrapper reviewer Minor ancestor-bin shadow check was fixed before apply. These preparation checks were not migration retries.

For closure quality preparation, an older public candidate differed in four Production tooling files; it was rejected before lint/build. A fresh public copy was prepared with current bytes and existing installed dependencies. No repository implementation or private file changed to repair the candidate.

Fresh lint exit 0. First build stopped loading next.config.ts: Windows native canonicalization returned Access is denied. Minimal Node realpath/SWC probe reproduced EPERM/native failure in sandbox; identical probe outside sandbox PASS. Only build was repeated outside sandbox with the same public source/config and clean child environment; exit 0. First failure retained in build-sandbox-failure.log, final build.log/quality.json show compilation/TypeScript/static generation PASS. This build retry is separate from migration: Production invocations remain 1/retries 0. No application fix or config override was made.

## V. Documentation Sync

All twelve requested source docs inspected and updated factually: **README; docs/04, 07, 08, 09, 10, 12, 14, 17, 18, 19, 23**. Actual three-environment initial DB status is now Dev LIVE/established; Testing LIVE/migrated once/verified; Production LIVE/independent Starter/migrated exactly once/schema-ledger verified. Generic future workflow/ADR/research contract remains; old process reports remain historical.

Vercel NOT integrated/Preview preflight NOT READY; main foundation promotion not performed/main behavior deferred; Phase 0D/Gate 1 OPEN. Source docs link this current report and retain tooling/preflight as history. README Stage 1 security counts/version explicitly historical, no fresh audit claim.

Changed files: twelve source docs above, derived MASTER_GUIDE.md/MANIFEST.md, this new live report. Existing untracked preflight report remains in deliverable status unchanged. No source/package/runtime/migration/workflow or skill edits.

Actual lint/typecheck/test/build scripts exist. Docs/19 Documentation-only DoD asks lint/build when possible; fresh **npm run lint PASS / npm run build PASS**, both exit 0 in public isolated copy without ignored env/inherited startup or target overrides. **152 public non-Markdown files** matched repository before/after quality, including source/config/tests/package/lockfile. Build includes its TypeScript phase; standalone typecheck/test/coverage/audit/db:check **NOT RUN** for this closure. No fresh full quality-suite PASS. Future PR Quality Gate remains required; no PR created here.

Fresh RTK public checks PASS: branch/rev-parse/merge-base/status with all untracked files, cached diff stat empty, git diff --check exit 0, public SHA-256 preservation, report 26 A–Z headings/no trailing whitespace, internal link targets present, bounded secret scan, MASTER reconstruction and MANIFEST actual bytes/hashes. Git diff --check checks tracked changed lines; untracked reports are checked separately. Existing inherited template whitespace in MASTER remains canonical. No ignored private env read, installation or background server.

## W. MASTER / MANIFEST

Existing process preserved: reconstruct baseline exact MASTER from its ordered **45** source blocks; rebase relative Markdown links to repo root and fragment-only links to canonical source; normalize source bodies CRLF→LF; update regeneration date. MANIFEST retains **46** entries including MASTER, excludes self-hash and process reports; byte counts/SHA-256 use actual filesystem bytes.

Regeneration and fresh verification **PASS**: **0 missing / 0 hash mismatch / 0 size mismatch / 0 material MASTER parity mismatch**; 45 MASTER source blocks / 46 MANIFEST entries. Regeneration date 2026-10-11. New process report is intentionally outside existing derived-pack membership; source docs link it. No count inferred from older historical pack versions.

## X. Independent Review

**PASS**, fresh-context reviewer `/root/production_closure_docs_review`, yang tidak mengimplementasikan closure dan tidak menerima implementation history. **0 unresolved Critical / 0 unresolved Important / 0 unresolved Minor**. Reviewer membaca exact task, complete tooling/preflight/live reports, twelve source-doc diffs, safe A/B evidence dan quality logs/helpers. Independent public verification **2026-10-11 04:55:29 UTC** mengonfirmasi 224 tracked files (210 unchanged/14 scoped Markdown changes), 424 skills unchanged, expected two untracked reports/preflight preserved, refs/index unchanged, exact raw migration hashes, 45 MASTER blocks/46 MANIFEST entries/zero mismatch, 16-document bounded scan zero, internal file targets zero missing dan 152 public quality files byte parity.

Evidence marker/result/empty gates dan kedua postapply records mendukung apply 1/retry 0/exit 0, ledger satu row/hash/journal, depots parity/ORM/local handlers PASS. Superseded failures netral, tidak ada inferred cause atau extra-account resolution. Lint/build disclosure dan Vercel/main/OPEN gates akurat. Record: external `tidb-production-closure-20261011/INDEPENDENT_CLOSURE_REVIEW.md` dan `independent-public-verification.json`; tidak ada reviewer repository/live/Git write atau quality rerun. Initial reviewer helper membandingkan skills-lock terhadap quality copy yang sengaja mengomitnya; comparison diperbaiki ke actual 152-file scope, repository skills-lock tetap independently preserved. Ini bukan repository finding.

Previous Checkpoint A packet, B wrapper and B postapply closure reviews PASS are historical and do not substitute for this new documentation review. Review is offline against safe captured evidence, not independent live provider/private credential inspection.

## Y. Remaining Phase 0D Work

- Main foundation promotion **preflight** and separately authorized Git/PR/review/merge process; promotion not performed.
- Main required-check behavioral proof deferred to actual controlled promotion.
- Vercel Git Integration/bootstrap design; Preview preflight still NOT READY; no project/deployment/public Production URL.
- Preview versus Production deployed DB isolation and public HTTP smoke after authorized deployment.
- Second-member setup reproduction, further QA/E2E and Gate 1 review.

Phase 0D/Gate 1 **OPEN**. Full Database/Release DoD pending; approved initial DB foundation is verified. No credential handoff remains for this closure.

Safe evidence read from local session, outside repository:

```text
C:/Users/L E N O V O/.codex/visualizations/2026/10/02/01a0fcc3-a956-7a52-a7d5-e5f1890cf773/
```

| Directory | Primary safe records |
| --- | --- |
| tidb-production-checkpoint-a-20261011 | CHECKPOINT_A_PREAPPLY_VERIFICATION.md; readonly-current-app-20261011035100104.json; physical-identity-current.json; billing-current.json; withdrawn missing-account proposal |
| tidb-production-checkpoint-b-20261011 | CHECKPOINT_B_EXECUTION_RECORD.md; immediate-preapply-gates.json; apply-attempt.json; apply-result.json; postapply-app-1791692632592.json; postapply-migrator-1791692644028.json; provider-postapply-readback.json; final-local-verification.json; POSTAPPLY_CLOSURE_REVIEW.md |
| tidb-production-closure-20261011 | Fresh public baseline/verification, docs regeneration/public quality helpers and logs, independent closure review |

Local assets supplement this portable summary; screenshots/credential UI are not copied into Git. Closure helpers only read public files and invoke public quality scripts, not DB/config/migrator helpers.

## Z. Recommendation

**READY FOR MAIN FOUNDATION PROMOTION PREFLIGHT**

**TIDB PRODUCTION LIVE FOUNDATION VERIFIED**; factual docs/derived sync, fresh bounded public checks dan independent review PASS. Recommendation terbatas pada next preflight; main promotion/deployment tetap memerlukan task dan authorization terpisah. No pending credential handoff atau unresolved Critical/Important finding untuk closure ini. Future public/deployment/full release checks pada Y tetap diperlukan.

STOP before Git mutation. No second Production migration; no TiDB/credential/grant/Vercel mutation; no main promotion; no Git add/commit/push/merge/rebase/reset/restore/clean/stash. Human handles Git after review. Future migrations/recovery need separate task/review/approval; initial authorization is consumed.
