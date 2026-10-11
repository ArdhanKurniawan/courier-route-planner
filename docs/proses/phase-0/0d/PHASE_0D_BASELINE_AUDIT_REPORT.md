# Phase 0D — Baseline Audit Report

Tanggal audit: **2026-10-04**. Repository: `ArdhanKurniawan/courier-route-planner`.

Mode: **STRICT READ-ONLY AUDIT + RESEARCH + RECOMMENDATION**. Satu-satunya output repository adalah laporan ini. Rekomendasi berikut belum merupakan izin implementasi, perubahan cloud, atau operasi Git.

Label evidence:

- **PROJECT-SOURCE FINDING**: pemeriksaan source, Git, laporan historis, atau pemeriksaan baru yang disebutkan secara eksplisit.
- **CURRENT OFFICIAL EXTERNAL SOURCE FINDING**: perilaku platform dari dokumentasi resmi yang diakses 2026-10-04.
- **RECOMMENDATION / INFERENCE**: desain yang diusulkan berdasarkan evidence tersebut; belum diuji pada akun/runner/deployment target.
- **NOT VERIFIED**: evidence akun/live belum tersedia. Pernyataan manusia tentang resource dibedakan dari inventory cloud baru.

## A. Audit Verdict

**READY FOR HUMAN DECISION CHECKPOINT**.

Phase 0C **CLOSED**: PR #9 merged ke `testing`; remote, merge commit, dan tree sesuai baseline yang diminta. Quality suite baru lulus tanpa env privat. Phase 0D **belum diimplementasikan**, dan **Gate 1 tetap OPEN**.

Tidak ada blocker untuk menyusun keputusan. Ada checkpoint sebelum implementasi: akun/quota cloud, target migration, konfigurasi Vercel, required checks, bootstrap `main`, dan reproduksi anggota kedua. Dibutuhkan **20 keputusan manusia** pada bagian AE.

## B. Repository Baseline

**PROJECT-SOURCE FINDING**, snapshot awal `2026-10-04T08:47:07.066Z`:

| Item | Actual |
| --- | --- |
| Branch | `feature/foundation-ci-vercel` |
| HEAD | `e1c36988e588e397af312a140677c3f71bd451d2` |
| Local `testing` | `e1c36988e588e397af312a140677c3f71bd451d2` |
| Local `origin/testing` | `e1c36988e588e397af312a140677c3f71bd451d2` |
| `merge-base HEAD testing` | `e1c36988e588e397af312a140677c3f71bd451d2` |
| Remote `refs/heads/testing`, read-only `ls-remote` | SHA sama dengan HEAD |
| Local/remote `main` | `7836b894c212e951dfe652d30b2531b128f7deff` |
| Working tree sebelum laporan | Clean, termasuk untracked files |
| Index | Empty |
| `git diff --check` | Exit 0 |
| `core.hooksPath` | `.githooks` |

Branch gate terpenuhi. Tidak dilakukan branch creation, fetch, pull, checkout, staging, commit, push, atau merge. Repository public, default branch `main`, menurut metadata GitHub read-only.

**Risiko bootstrap:** tree `main` saat ini hanya berisi dokumentasi/instruksi/template; belum ada `package.json`, source aplikasi, atau workflow. Delta `main` → `testing`: 191 files, 25.709 insertions, 853 deletions. Foundation perlu dipromosikan melalui PR terpisah yang disetujui sebelum deployment Production aplikasi dapat diterima.

## C. Phase 0C Closure Evidence

**PROJECT-SOURCE FINDING**, [PR #9](https://github.com/ArdhanKurniawan/courier-route-planner/pull/9), dibaca melalui GitHub read-only:

| Evidence | Actual |
| --- | --- |
| PR | #9, state `closed`, `merged=true` |
| Base | `testing` |
| Head | `feature/foundation-database` |
| Feature commit | `91514174898d52d892ef0e1b65577a30b70b63ab` |
| Merge commit | `e1c36988e588e397af312a140677c3f71bd451d2` |
| Merge time | `2026-10-04T08:36:14Z` |
| Merge parents | `11985b6a3532b3773eebe63d330d84788bbf2be1`, lalu feature commit di atas |
| Remote `testing` | Merge commit di atas, dikonfirmasi API branch dan `ls-remote` |
| Feature tree dan merge tree | Keduanya `55dcdb8ddd5fa0afc38c6c02ed806b1951cd13f6` |
| File diff feature → merge | Empty; perbedaan hanya topology commit |

Kelima laporan Phase 0C dibaca penuh melalui reviewer dengan konteks terpisah. Urutan evidence: baseline meminta keputusan; Stage 1 selesai offline; independent offline verification PASS; Dev live verification PASS; final independent verification **VERIFIED PASS WITH NON-BLOCKING FINDINGS — READY TO COMMIT**.

Final verification historis mencatat Dev schema `depots`, primary key, satu migration ledger yang cocok dengan history/hash, application read, migrator TCP/TLS, `/api/health`, dan `/api/ready` PASS. First apply dilakukan manusia; auditor terdahulu memeriksa hasilnya secara read-only. Audit 0D ini tidak mengulang query Dev atau migration.

Status historis “ready to commit/not closed” pada laporan proses valid pada waktu penulisannya. Evidence merge baru menutup Phase 0C; laporan historis tersebut tidak perlu ditulis ulang. Penutupan 0C tidak menutup Gate 1 atau provisioning Testing/Production.

## D. Current Phase 0D Implementation State

| Area | Actual state | Basis/limit |
| --- | --- | --- |
| GitHub Actions | Belum ada | `.github/` dan workflow tidak ada; API workflows HTTP 200, `total_count=0` |
| Vercel local config | Belum ada | Tidak ada `vercel.json`, `.vercel`, deploy script, atau token deployment di contract source |
| Vercel project/Git connection | NOT VERIFIED secara global | Query repository pada account scope yang tersedia mengembalikan 0 project; scope/team lain tidak diperiksa |
| TiDB Dev | Provisioned, migration/live verification PASS historis | Konteks manusia + laporan 0C; bukan inventory live baru |
| TiDB Testing | Belum provisioned menurut konteks manusia | Tidak diperiksa melalui provider inventory baru |
| TiDB Production | Belum provisioned menurut konteks manusia | Tidak diperiksa melalui provider inventory baru |
| Gate 1 | OPEN | CI/cloud/isolation/reproduction belum dibuktikan |

## E. Existing Quality Foundation

**PROJECT-SOURCE FINDING**: manifest dibaca; lockfile v3 diparse penuh, 805 package entries termasuk root. Root dependency graph sesuai manifest. Runtime yang dipakai untuk pemeriksaan baru: Node **24.19.0**, npm **11.6.0**; project engines `24.x`, `.nvmrc=24`.

| Actual script | Implementation |
| --- | --- |
| `dev` / `build` / `start` | `next dev` / `next build` / `next start` |
| `lint` | `eslint .` |
| `typecheck` | `next typegen && tsc --noEmit` |
| `test` / `test:watch` | `vitest run` / `vitest` |
| `test:coverage` | `vitest run --coverage` |
| `db:generate` | Drizzle Kit generate dengan offline config |
| `db:check` | Drizzle Kit check dengan offline config |
| `db:migrate` | Node `--env-file=.env.migrations.local`, Drizzle Kit migrate, `drizzle.dev.config.ts` |

Next **16.3.6**, React **19.2.8**, TypeScript **5.9.3**, Vitest **4.1.11**, Drizzle ORM **0.45.3**, TiDB serverless driver **0.3.0**, Zod **4.6.5**, Drizzle Kit **0.31.11**, mysql2 **3.24.5** resolved pada lockfile. Fresh install proof tercatat terpisah pada AB. jsdom **30.1.1** membutuhkan Node `^22.22.2 || ^24.15.0 || >=26`; pilih Node 24 terbaru yang kompatibel, bukan arbitrary patch 24 lama.

Fresh result: **9 test files / 147 tests PASS**, build PASS, offline migration-history check PASS. Coverage dijalankan tanpa threshold. Tidak ada script E2E, deploy, CI, atau `setup:git-hooks`; jangan menyebutnya sebagai command existing.

Project tidak memiliki `preinstall`/`postinstall` migration. Lima lock entries dengan vendor install scripts adalah binary/tooling esbuild, fsevents, dan unrs-resolver; tidak mengarah ke migration project. Tidak ditemukan migration otomatis dalam build, startup, routes, Git hooks, atau CI.

## F. Existing Environment Contract

**PROJECT-SOURCE FINDING** dari `.env.example`, env parsers, DB client/readiness, routes, configs, dan tests:

- `APP_ENV` mengenali `development`, `testing`, `production`; runtime health membutuhkan nilai valid. Jangan memakai `NODE_ENV=testing` untuk menggantikannya.
- `DATABASE_URL` adalah server-only MySQL-format input dengan credential, hostname, dan logical DB. Parser menolak query/fragment. Nilai privat tidak dibaca dalam audit ini; jangan menyalin URL provider yang memakai query TLS tambahan tanpa penyesuaian contract.
- DB client lazy; import module tidak membuat query. Runtime memakai Drizzle + TiDB serverless HTTP, debug/logger dimatikan.
- `/api/health`: minimal `200 {"status":"ok"}` bila app env valid, error minimal jika invalid, `Cache-Control: no-store`.
- `/api/ready`: satu `SELECT 1`, timeout 5 detik, tanpa retry; `200 {"status":"ok"}` atau expected config/transport failure `503 {"status":"error"}`, `no-store`.
- Readiness tidak memvalidasi `APP_ENV` sendiri, tidak membuktikan schema/ledger/grants mutation, dan tidak membuktikan resource isolation. APP_ENV tidak mengikat DATABASE_URL ke resource tertentu.
- Expected DB errors tidak menampilkan provider detail ke response. Unexpected programming errors masih dapat masuk penanganan error framework; pemeriksaan log privat tetap perlu saat deployment nanti.
- Migrator Dev memakai mysql2 TCP/TLS dengan `rejectUnauthorized: true`; guard mewajibkan `APP_ENV=development` dan logical DB `courier_route_planner_dev`.

**PASS** untuk build/test quality tanpa APP_ENV, DATABASE_URL, atau private env: dibuktikan pada fresh TEMP copy. Health/readiness live membutuhkan konfigurasi runtime tersendiri. Tidak ada custom dotenv loader atau build-time readiness call.

## G. Current GitHub Actions State

Tidak ada workflow tracked maupun lokal. Public Actions API mengembalikan HTTP 200 dengan 0 workflows; ini evidence remote yang mendukung inventory source.

Read-only ruleset inventory:

| Ruleset | Enforcement/ref | PR review | Other observed rules |
| --- | --- | --- | --- |
| `protect-main` | Active, `refs/heads/main` | 1 approval; dismiss stale reviews | Deletion dan non-fast-forward diblokir |
| `protect-testing` | Active, `refs/heads/testing` | 0 approvals; stale dismissal false | Deletion dan non-fast-forward diblokir |

Tidak ada rule `required_status_checks` pada dua ruleset yang terbaca. Classic protection endpoint mengembalikan HTTP 401; konfigurasi classic/other rules, bypass policy, administrator behavior, dan account Actions policy **NOT VERIFIED**. Jangan menafsirkan 401 sebagai “tidak ada protection”. Tidak dilakukan percobaan push untuk menguji enforcement.

Local hooks mendukung protected-branch safety. Hook lokal tidak menggantikan remote CI/PR enforcement.

## H. Recommended CI Trigger Model

**RECOMMENDATION**:

- `pull_request` dengan base branches **testing dan main**; default activities `opened`, `synchronize`, `reopened` cukup.
- `push` pada **testing dan main** untuk memeriksa actual merge/branch commit yang dapat dideploy Vercel. Ini justified karena PR merge-ref dan commit sesudah merge bukan identitas SHA yang selalu sama.
- Tidak perlu push CI pada setiap feature branch sebelum PR. Tidak menggunakan `pull_request_target`.
- Workflow **Quality**, job ID **quality**, explicit job name **Quality Gate**; satu job tanpa matrix menjaga check name stabil.

PR checks menjalankan merge-ref default. Conflict yang mencegah PR workflow harus diselesaikan melalui workflow manusia; tidak boleh dianggap PASS. Push check memberi evidence untuk actual branch SHA. Trigger/filter semantics didukung [GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

CI hanya quality. Deployment dilakukan Vercel Git Integration. Preview dapat dibuat sebelum PR CI selesai; jangan menyatakan Vercel otomatis menunggu Actions hanya karena keduanya terhubung.

## I. Recommended CI Command Matrix

Urutan required quality mengikuti pemeriksaan baru pada AB, lalu runtime audit. “No DB network” tidak berarti seluruh command offline: npm installation/audit membutuhkan registry network.

| Command | Required? | Secret? | DB network? | Failure policy | Rationale |
| --- | --- | --- | --- | --- | --- |
| `npm ci` | REQUIRED GATE | No project secret | No | Nonzero fail | Reproducible lockfile install |
| `npm run lint` | REQUIRED GATE | No | No | Nonzero fail | Existing ESLint contract |
| `npm run typecheck` | REQUIRED GATE | No | No | Nonzero fail | Generate Next types + strict TS |
| `npm run test` | REQUIRED GATE | No | No | Nonzero fail | Unit/invariant/config tests |
| `npm run test:coverage` | REQUIRED GATE | No | No | Nonzero fail; no numeric threshold | Preserve visibility of coverage |
| `npm run db:check` | REQUIRED GATE | No | No | Nonzero fail | Offline migration history consistency |
| `npm run build` | REQUIRED GATE | No | No | Nonzero fail | Compile current Next application |
| `npm run typecheck` after build | REQUIRED GATE | No | No | Nonzero fail | Verify build-generated type compatibility |
| `npm audit --omit=dev --json` | REQUIRED GATE | No | No | Findings of any severity or tool failure fail | Runtime zero baseline |
| `npm audit --json` | OPTIONAL INFORMATIONAL; recommended every run | No | No | Advisory findings visible/nonblocking; transport/parse failure cannot be called clean | Keep dev findings visible without permanent baseline failure |
| `npm run db:generate` | DO NOT RUN IN CI | No | No | Not invoked | Generates history; not a read-only validation |
| `npm run db:migrate` / Drizzle push | DO NOT RUN IN CI | Yes, if executed | Yes | Not invoked | Manual target-specific approval only |
| `npm run dev`, `start`, `test:watch` | DO NOT RUN IN CI | Runtime-dependent | Potential runtime DB | Not invoked | Persistent processes unsuitable for this gate |
| Deploy commands / cloud setup | DO NOT RUN IN CI | Would require cloud access | Not relevant | Not invoked | Deployment belongs to Git Integration |
| E2E command | DO NOT RUN IN CI at this stage | Not assessed | Not assessed | No script exists | Later explicit Playwright scope |

CI does not need APP_ENV. Do not provide real or dummy DB credentials as workflow env. Unit tests already use explicit fixtures/stubs; integration DB testing remains separately scoped.

## J. CI Permissions / Cache / Concurrency / Timeout

**RECOMMENDATION**:

- Runner `ubuntu-latest`, Node `24` latest compatible patch; record resolved Node/npm versions. Fresh audit used Windows, so Linux runner behavior remains to be verified remotely.
- Checkout **v7.0.1**, pin SHA `3d3c42e5aac5ba805825da76410c181273ba90b1`; setup-node **v7.0.0**, pin SHA `820762786026740c76f36085b0efc47a31fe5020`. Add release comments and review future pin updates. Current official releases: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node](https://github.com/actions/setup-node/releases/tag/v7.0.0).
- Workflow `permissions: contents: read`; unspecified permissions remain none. Checkout `persist-credentials: false`. GitHub's automatic token still exists with restricted scope; no custom write token, PAT, deployment token, OIDC write grant, TiDB/Vercel credential, or production secret is required. See [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) and [secure use](https://docs.github.com/en/actions/reference/security/secure-use).
- Explicit setup-node `cache: npm`, `cache-dependency-path: package-lock.json`. Cache npm package data; no `node_modules`, generated app output, or custom cache complexity. Public registry requires no NODE_AUTH_TOKEN. Supported by [setup-node README](https://github.com/actions/setup-node/blob/v7.0.0/README.md).
- Concurrency group: `${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}`. `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`. Superseded PR runs cancel; unrelated PRs/event types/refs remain separate. Active push validation is preserved. Default concurrency may replace older pending runs; it does not guarantee every historical push is executed. Require the newest branch SHA evidence. See [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
- Job timeout **10 minutes**. Eight quality commands took 172.964 seconds locally, about 2.88 minutes; this gives reasonable cold-install/network headroom. Reassess after real Linux Actions measurements; do not treat local timing as a platform benchmark.

## K. CI Security Audit Policy

Choose **runtime hard gate + full audit informational**, corresponding to task options B + C. Full-audit hard fail now would permanently fail on the 19 known dev findings. Omitting audit would lose useful evidence.

Runtime baseline is zero; fail on any runtime advisory and on inability to obtain/parse a valid audit response. Full advisory exit 1 is an explicit known nonblocking result, not PASS. Record severity totals and packages every run. Full-audit transport/tool failure must be visible and retried or investigated; do not hide every failure behind blanket `|| true`.

No audit fix, override, package upgrade, or arbitrary coverage threshold is proposed in this task. Development dependencies still execute in build/tooling: runtime zero does not remove their security impact. Future dependency triage needs its own scoped task and owner.

## L. Required Status Check Strategy

Recommend stable job name **Quality Gate** for both `testing` and `main`. After the first successful actual workflow run, inspect GitHub's real check context/app and select that exact name in protection. UI may show workflow/job together; do not invent a required context string before it exists.

Sequence: implement → approved remote PR/run → verify result → explicit human-approved required-check configuration → prove subsequent PR is gated. Successful recent checks are needed for selection; skipped path-filtered workflows can leave required checks pending. Keep this job unconditional and avoid ambiguous duplicate job names. See [required-check troubleshooting](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) and [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

Recommend requiring branches up to date before merge, while retaining existing PR approval, deletion, and non-fast-forward rules. Never accept failed/pending/cancelled Quality Gate as merge evidence; resolve failure or rerun for current SHA. Account bypass policy needs private human verification.

Vercel deployment timing is separate. A main push check can still run while Vercel builds. If the account supports Deployment Checks, select the observed Quality Gate to hold Production promotion. Otherwise use a staged Production build and approved promotion after current-SHA quality + smoke. These are alternatives: Deployment Checks require automatic alias assignment, while staged manual promotion disables it. See [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks) and [promotion](https://vercel.com/docs/deployments/promoting-a-deployment). Availability/configuration on this account is NOT VERIFIED.

## M. Current Vercel State

| Question | Evidence/status | Exact human check still needed |
| --- | --- | --- |
| Existing project | Available read-only repo query returned 0 projects | Search all relevant owner/team scopes privately; avoid duplicate project |
| GitHub connected | NOT VERIFIED | Inspect project Git repository and integration access |
| Local config | No `.vercel` or `vercel.json` | No cloud inference follows from local absence |
| Production Branch | NOT VERIFIED | Verify `main` in production branch tracking |
| Preview behavior | NOT VERIFIED | Inspect Git settings and deployment targets for testing/feature refs |
| Env vars | NOT VERIFIED; values not queried | Privately inspect scope/name/binding and deployment freshness |
| Node/runtime/build settings | NOT VERIFIED | Check Node 24, framework/root/build commands and absence of migration hooks |
| Plan/protection/promotion | NOT VERIFIED | Check account plan, deployment protection, initial-deploy behavior, and chosen promotion mode |

A zero-result query in one accessible account scope does not establish absence in every team. No import, connect, deploy, env pull, log dump, token/profile read, or cloud mutation was performed.

## N. Recommended Vercel Git Model

| Git ref | Target | Runtime DB role | URL strategy |
| --- | --- | --- | --- |
| `main` | Production | Production application credential | Production URL + exact deployment URL/SHA evidence |
| `testing` | Preview, stable integration | Testing application credential | Generated branch alias sufficient; exact deployment URL for evidence |
| `feature/*` and approved PR branches | Preview | Shared Testing application credential | Generated preview/deployment URL |

Production Branch remains **main**. `testing` is a Preview branch; a custom domain or extra custom environment is unnecessary for this foundation. All non-production branches can use normal Preview semantics. See [Vercel Git](https://vercel.com/docs/git), [environments](https://vercel.com/docs/deployments/environments), and [generated URLs](https://vercel.com/docs/deployments/generated-urls).

Configure Node **24.x** consistently in project settings and manifest; platform patches may change automatically. The supported Node major is confirmed by [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). Compile without DB access; do not add migration to build/install/startup.

**Bootstrap checkpoint:** current `main` lacks the application. Git import's Deploy action can start an initial build; a project's first deployment may be Production. Do not assume the first deployment of a newly created project is Preview. [Git import documentation](https://vercel.com/docs/git) and [first-deployment behavior](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting) support this risk.

Recommended future operator path: create/configure an empty project without starting a deployment or connecting Git; verify empty deployment inventory; configure Node, Preview/Production env bindings, protection, `main` branch tracking, and a supported hold/promotion mode before Git connection. The official [Create Project API](https://vercel.com/docs/rest-api/projects/create-a-new-project) separates project creation from deployment and permits optional Git configuration. **Inference:** configuration can be prepared separately; this exact account/bootstrap path has not been exercised here.

After explicit setup approval, verify the first intended `testing` deployment is actually target Preview before counting its smoke. If the chosen UI/API route cannot hold or correctly classify the initial deployment, stop at a setup checkpoint and resolve the operator procedure. Never temporarily make a feature/testing branch the Production Branch to bypass this issue. A docs-only main build or incorrectly classified deployment is not Production PASS.

Promote foundation from testing to main through a separately reviewed/approved PR; the current 191-file delta warrants full foundation review. First accepted Production evidence must come from a main Git deployment with Production env, migrated Production schema, current-SHA quality, and smoke. Do not reuse a Preview deployment as isolation proof for Production.

## O. Target Environment Matrix

| Target | APP_ENV | DATABASE_URL binding | Migration | Logical DB recommendation |
| --- | --- | --- | --- | --- |
| Local Dev | `development` | Independent TiDB Dev, application credential | Manual Dev migrator, private local file | Existing `courier_route_planner_dev` |
| Vercel Preview / testing | `testing` | Independent TiDB Testing, application credential | Manual Testing migrator outside build/CI | `courier_route_planner_testing` |
| Vercel Production / main | `production` | Independent TiDB Production, application credential | Manual Production migrator outside build/CI | `courier_route_planner_prod` |
| Vercel Development scope | Optional | If needed, Dev only | No Vercel migration | Local `.env.local` remains sufficient |

Only APP_ENV and server-only DATABASE_URL are required for current runtime behavior; public app branding has a default. Never use NEXT_PUBLIC_DATABASE_URL. Preview branch-specific overrides are supported but unnecessary now; avoid an override pointing to Dev or Production. Env updates affect subsequent deployments, so record deployment creation after configuration changes. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

Source accepts testing/production APP_ENV and valid DB URLs, but does not enforce the matrix automatically. Provider identity, credential scope, and Vercel binding need human evidence. Three independent resources are mandatory; no Dev/Testing or Testing/Production shared fallback.

## P. TiDB Testing Strategy

Provision Testing **before first meaningful Preview deployment/readiness verification**. Role label from docs: `route-planner-testing`; proposed logical DB: **courier_route_planner_testing**. This is a future target, not an existing cloud identity verified in this audit.

Use separate application and migrator credentials scoped to this resource/logical DB. For read-only Phase 0D, application SELECT access to approved tables is sufficient; `SELECT 1` alone does not prove table privileges. Future CRUD may explicitly approve SELECT/INSERT/UPDATE/DELETE on application tables. No DDL, global ALL, GRANT OPTION, admin credential, or migration-ledger write in application runtime.

Migrator needs only the SQL privileges required by reviewed migration statements and its ledger, inside the target logical DB. Exact minimal grants depend on Drizzle's actual ledger/DDL operations; validate them privately before apply. Cloud IAM and SQL privileges are different controls. Official [TiDB privilege management](https://docs.pingcap.com/tidb/stable/privilege-management/) supports scoped grants. Exact Starter console role availability is **NOT VERIFIED FROM CURRENT OFFICIAL SOURCE**; inspect account capabilities before choosing user-management steps.

Runtime HTTP and migrator TCP/TLS remain distinct; require certificate verification, no insecure TLS shortcut. Official [Starter connectivity](https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/) and [secure connections](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/) support this model.

Human must verify an independent resource slot, region/latency, spend limit, monthly quota, owner permissions, credential separation, and target identity. Quota failure is a checkpoint; do not fall back to Dev or Production.

## Q. TiDB Production Strategy

Choose **A: first accepted Production deployment must prove `/api/ready`**, rather than health-only skeleton acceptance. Provision Production and apply its reviewed initial migration before Git connection can cause a Production deployment. Role label: `route-planner-production`; proposed logical DB: **courier_route_planner_prod**.

Testing must first validate the same migration history and schema. Production gets distinct application/migrator credentials, scoped privileges, TLS verification, and private resource mapping as in P. No Dev/Testing credential reuse. Production migration approval remains separate from routine CI/Preview access.

Bring Production preparation earlier than a naive “connect Vercel, then provision Prod” sequence because import/initial deployment can target Production. This preparation does not authorize main promotion; testing-to-main review and controlled Production acceptance happen later.

Generic Starter quotas do not prove this account has capacity or budget. Verify available resource count, spend limit, billing authorization, access model, and backup/mitigation capability before provisioning. No provisioning occurred in this audit.

## R. Migration Strategy

**PROJECT-SOURCE FINDING:** current `db:migrate` is deliberately Dev-only. Testing/Production require a separately approved implementation of target guards/configuration. Do not run the Dev command with production credentials or set APP_ENV=development to bypass the guard. Do not invent an already-available Testing/Production script.

Initial committed migration creates `depots` with eight columns and primary key only: bigint auto-increment id; name; nullable address; latitude/longitude; active flag; millisecond created/updated timestamps supplied by application. No seed/CRUD/reset exists. Offline `db:check` does not validate live schema or target permissions.

Testing flow, before Preview deployment:

1. Implement/review separate target guards in a future authorized task; validate logical DB and environment agreement without printing credential input.
2. Human privately verifies resource identity, credential role/TLS, environment binding, and target schema/ledger pre-state.
3. Review committed SQL, journal, hash, pending migration set, and privilege requirements; do not regenerate history during apply.
4. Obtain explicit approval for this target/apply operation.
5. Run controlled migration outside CI/Vercel with private target-specific migrator credentials. Review inherited shell env: Node `--env-file` does not overwrite already inherited values.
6. Read-only verify ledger count/hash/history, schema columns/PK, and expected privilege scope. Existing successful first apply is not repeated blindly.
7. Create the correctly scoped Preview deployment and run smoke.

Production flow: Testing validation → approved Production target/pre-state verification → SQL/hash and compatibility/mitigation review → explicit apply/window approval → controlled manual apply → ledger/schema verification → approved main release → Production smoke/promotion.

No migration in npm install/postinstall, Actions, Vercel build, startup, or routes. Prefer backward-compatible schema changes. TiDB DDL auto-commits and cannot be transactionally rolled back: partial failure requires stopping, inspecting actual ledger/schema, and approving a forward repair. Do not promise automatic DB rollback or blindly rerun failed DDL. Code rollback is useful only while schema remains compatible. See [TiDB transaction overview](https://docs.pingcap.com/tidb/stable/transaction-overview/).

## S. Preview / Production Isolation

Shared Testing untuk Preview **acceptable pada foundation 0D saat ini**: hanya health/readiness dan UI shell; belum ada CRUD, seed, reset, atau destructive E2E. Syaratnya semua Preview memakai schema-compatible commit dan satu migration history terkoordinasi. Future writes memerlukan ownership/tagging data test, larangan truncate/reset bersama, dan jadwal migration; incompatible feature schema membutuhkan keputusan isolation tambahan sebelum digunakan pada shared Testing.

**Safest proof**: manusia memeriksa identitas resource Dev/Testing/Production di provider secara privat, role/grants aplikasi, dan binding env Preview/Production di Vercel; lalu menghubungkannya ke exact deployment target/SHA yang dibuat setelah konfigurasi. Simpan hanya label role/logical DB non-secret, waktu, dan boolean hasil perbandingan bahwa resources serta credentials berbeda. Jangan menyimpan URL koneksi, username lengkap, hostname privat, resource ID, atau hash credential.

APP_ENV yang berbeda, logical DB label, atau SELECT 1 saja tidak membuktikan beda resource. Logical DB name dapat sama pada resource lain. Readiness menunjukkan connectivity; ledger/schema perlu pemeriksaan terpisah. Alias branch bisa berubah, sehingga gunakan exact deployment evidence untuk pembuktian.

Tidak perlu endpoint diagnostik baru atau data write. Bila private provider/env mapping belum cukup menunjukkan binding deployment aktual, berhenti di checkpoint; pertimbangkan server-only non-secret fingerprint atau diagnostic terbatas dalam task terpisah, dengan akses/lifetime/removal review. Tidak ada diagnostic dibuat dalam audit ini.

## T. Post-Deploy Smoke Strategy

Setelah manusia memastikan environment/target dan migration benar, jalankan flow berikut pada exact Preview dan exact Production deployment:

| Request | Expected | Evidence/limit |
| --- | --- | --- |
| `GET /` | HTTP 200, Courier Route Planner dashboard shell | Route aktual `src/app/(admin)/page.tsx`; branding/menu benar, tidak ada critical client error |
| `GET /api/health` | HTTP 200, exact minimal `{"status":"ok"}`, no-store | App env valid; tidak membuktikan DB |
| `GET /api/ready` | HTTP 200, exact minimal `{"status":"ok"}`, no-store | DB connectivity, timeout 5 detik ditambah HTTP overhead; bukan schema/ledger proof |

HTTP 503 readiness pada environment yang wajib ready adalah FAIL. Redirect/login/401 dari deployment protection belum merupakan aplikasi PASS; manusia harus memakai akses resmi yang sah. [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication) mendukung protection; cek permission/plan akun tanpa membagikan bypass secret.

Catat waktu, commit SHA, deployment target/role, status HTTP, dan payload minimal. Jangan memakai GET `/dashboard` sebagai pengganti route root yang diminta. Tidak ada POST/PUT/DELETE, data insertion, CRUD, auth, OSRM, atau algorithm smoke dalam foundation ini.

Operator kemudian memeriksa build/runtime log secara privat untuk credential disclosure dan unexpected provider/stack output. Expected error response sudah minimal menurut source/tests; build log dan cloud behavior tetap perlu evidence baru. Jangan dump log atau secret ke laporan. Source/build-log access protection dan fork-deployment approval perlu tetap dijaga; lihat [Vercel security settings](https://vercel.com/docs/project-configuration/security-settings).

## U. Second-Member Reproduction Plan

Status sekarang **PENDING PHASE 0D**. Subagent review dan TEMP quality pada komputer auditor bukan reproduksi anggota tim kedua.

1. Anggota manusia lain melakukan fresh clone pada workspace/komputer terpisah, memilih foundation ref yang telah disetujui/merged, dan mencatat SHA. Baca AGENTS, RTK, template provenance, environment contract, dan Preview/Production rules.
2. Gunakan Node 24 patch kompatibel, minimum 24.15 untuk jsdom saat ini; catat actual Node/npm/Git. Jangan menyalin `node_modules`, `.next`, coverage, atau private env dari laptop pertama.
3. Pada shell tanpa inherited app/DB secrets dan tanpa private env, jalankan delapan quality commands pada AB, lalu dua audit commands dengan kebijakan K. Harapkan actual count/evidence; jangan memaksa 147 bila commit berubah.
4. Konfigurasikan hook melalui existing Git config procedure `git config core.hooksPath .githooks`, lalu verifikasi config. Tidak ada npm setup-hook script. Demonstrasi hook dapat memakai isolated disposable repository/synthetic refs; tidak perlu mencoba commit/push protected branch repository asli.
5. Pahami `.env.example`: APP_ENV development, DATABASE_URL kosong. Runtime health bisa PASS dengan APP_ENV valid; readiness 503 tanpa DB adalah expected negative check, bukan bukti DB setup selesai.
6. Untuk full setup Gate 1, manusia berwenang menerbitkan credential Dev aplikasi dengan akses read paling sedikit yang diperlukan kepada anggota kedua melalui jalur privat. Jangan membagikan root/migrator/Production credential. Verifikasi local health/readiness 200 dan safe application read; tidak melakukan migration atau writes.
7. Simpan label anggota yang redacted, waktu, ref/SHA, versions, command results, hook state, role Dev non-secret, dan minimal smoke payload. Tidak menyimpan email, credential, atau private provider identity.

**Recommendation:** secret-free quality reproduction wajib; authorized least-privilege Dev live read diperlukan untuk menyatakan reproduksi setup DB penuh. Jika akses belum tersedia, quality boleh dicatat PASS, namun full second-member Gate 1 tetap pending. Audit ini tidak menerbitkan atau mendistribusikan credential.

## V. Gate 1 Current Matrix

Penilaian ulang terhadap `docs/23_PHASE_GATES_CHECKLISTS.md` dan template gate `docs/30_UI_TEMPLATE_GUIDE.md`, bukan penyalinan checkbox. PASS historis dibedakan dari pemeriksaan baru; checklist lama yang unchecked tidak otomatis berarti implementasinya belum ada.

| Item | Current classification | Evidence / remaining action |
| --- | --- | --- |
| Node 24 contract | PASS | Manifest/.nvmrc + fresh Node 24.19.0 |
| Clean npm ci | PASS | Fresh TEMP copy, exit 0 |
| Lint | PASS | Fresh exit 0 |
| Typecheck dari generated state bersih | PASS | Fresh copy tanpa .next; pre/post-build exit 0 |
| Unit/component testing foundation | PASS | Fresh 9 files / 147 tests; 2/11 dan 4/48 di dokumen adalah milestone historis |
| Coverage command/report tanpa threshold | PASS | Fresh V8 report; seluruh-source coverage rendah tercatat |
| Build | PASS | Fresh build exit 0 |
| Runtime audit | PASS | Fresh 0 findings; full 19 tetap disclosed, 15 pada 0A adalah snapshot historis |
| TailAdmin Free provenance/adopted SHA/license | PASS | THIRD_PARTY_NOTICES.md mencatat Free 2.4.0, SHA `4fba02489c93171220c13cd2b44cc0161ff6d2a1`, MIT license |
| No TailAdmin Pro/paid assets | PASS — recorded provenance/cleanup evidence | THIRD_PARTY_NOTICES.md mencatat Free edition only dan cleanup verified 2026-10-02; tidak ada asset baru. Penilaian berbasis provenance tersebut, tanpa mengulang origin setiap asset |
| Template baseline build sebelum cleanup | PASS — historical evidence | Milestone cleanup tercatat; bukan fresh pre-cleanup build yang dijalankan ulang |
| Route-planner menu/branding | PASS | Current root dashboard/navigation tests + source; browser cleanup historis |
| ApexCharts cleanup/core status | PASS | Tidak ada apexcharts/react-apexcharts dalam graph manifest/lock; license/provenance tetap ada |
| Next.js local works | PASS — historical live + fresh compile/test | Live local sebelumnya; browser/dev server manusia tidak dijalankan ulang oleh audit ini |
| App-only health | PASS | Source/tests baru + historical Dev HTTP PASS |
| Phase 0C offline parser/client/schema/history/readiness | PASS | Fresh tests/db:check + independent reports |
| Human Dev provisioning/first apply | PASS — human/historical evidence | Provider settings tidak diaudit ulang; first apply tidak diulang |
| Dev HTTP app / TCP-TLS migrator / schema / ledger | PASS — historical live verification | Final 0C evidence, tanpa live query baru pada 0D |
| Final independent Phase 0C verification | STALE DOC; actual PASS | Final report PASS + remote PR #9 merged; checkbox/prose masih pending |
| Phase 0C closure | STALE DOC; actual CLOSED | Remote merge/tree evidence C |
| Vercel main deployment | PENDING PHASE 0D | Main belum berisi app; needs approved promotion + proper Production |
| Vercel feature Preview | PENDING PHASE 0D | No verified deployment |
| Stable testing Preview | PENDING PHASE 0D | Target/default branch alias dan smoke belum ada |
| Preview DB != Production DB | PENDING PHASE 0D | Private provider/env binding proof + deployment evidence S |
| CI basic green / required quality checks | PENDING PHASE 0D | No workflows; no required-status-check rule observed |
| Env ignore/template exception | PASS | Private env filenames ignored `.gitignore:70`; .env.example tracked; contents privat tidak dibaca |
| Second team member reproduction | PENDING PHASE 0D | Real independent human/laptop evidence U required |
| Remote PR/force/delete protection | PASS untuk observed config | Main 1 approval/testing 0; bypass/classic config NOT VERIFIED |
| Provider account/quota/permissions | NOT VERIFIED | Account-specific private human checks Z |
| Testing/Production provisioning/schema/ledger | PENDING PHASE 0D | Human context not provisioned; no fresh cloud inventory |
| Template Preview/human adoption acceptance | PENDING PHASE 0D | Exit guide docs30 membutuhkan Preview dan human review; provenance Free historis sudah tercatat |
| Depot/scenario/order CRUD, auth, map, OSRM, algorithms, E2E domain flows | DEFERRED LATER | Explicitly outside foundation; no Depot CRUD before Gate 1 closes |

**Exact proposed Gate 1 exit:** all required foundation quality PASS on current SHA, stable remote Quality Gate enforced on testing/main, reviewed foundation merged to main, correct Vercel Production/Preview targets, three independent TiDB resources with approved schema/ledger/role evidence, Preview and Production three-GET smoke PASS, isolation proof, private log/env review, actual second-member full setup proof, recorded Free provenance retained and template Preview/human acceptance PASS, current docs and derived packs synchronized in an authorized later task, final independent verification with no unresolved blocker, and explicit human closure. A custom domain is optional; generated URLs suffice. Known dev audit/coverage warnings remain visible and accepted separately.

## W. Phase 0C Documentation Drift

**PROJECT-SOURCE FINDING:** **12 unique source documents, 20 stale passages**, plus **1 derived file** mirroring those passages. Total current files requiring closure-sync consideration: **13**. Line numbers refer to baseline e1c3698, before any later edits.

| Source path | Exact lines | Stale claim / future correction |
| --- | --- | --- |
| `README.md` | 3, 58, 78 | Final 0C verification pending; update to final PASS/PR #9 merged/CLOSED |
| `docs/04_TECH_STACK_ADRS.md` | 229 | ADR-013 closure summary still final-review pending |
| `docs/07_TIDB_GUIDE.md` | 45 | Final 0C review pending despite Dev live evidence |
| `docs/08_DATABASE_DESIGN.md` | 3 | Foundation final verification pending |
| `docs/09_REPO_STRUCTURE.md` | 73 | Current DB foundation final review pending |
| `docs/10_ENVIRONMENTS_SECRETS.md` | 7 | Final 0C independent review pending |
| `docs/14_TESTING_QA.md` | 164 | Final review pending |
| `docs/16_OBSERVABILITY_RUNBOOK.md` | 82 | Final 0C verification pending |
| `docs/17_SETUP_FROM_ZERO.md` | 129, 150, 186, 215 | Setup/Dev checkpoints still describe final review pending |
| `docs/18_ROADMAP_BACKLOG.md` | 27, 38 | Phase 0C not closed/final independent review pending |
| `docs/19_DEFINITION_OF_DONE.md` | 47 | Final independent 0C review pending |
| `docs/23_PHASE_GATES_CHECKLISTS.md` | 32, 34, 47 | Narrative and final-review checkbox stale; Gate 1 itself stays OPEN |

`MASTER_GUIDE.md` is derived; corresponding stale lines: **16, 71, 91, 1529, 1858, 1952, 2303, 2376, 3050, 3314, 3482, 3503, 3539, 3568, 3746, 3757, 3923, 4854, 4856, 4869**. Do not independently edit these generated passages.

Fresh read-only integrity check: **MANIFEST 46 entries, 0 byte/hash mismatches; MASTER 45 source sections, 0 parity mismatches** after normalizing line endings and relative links. This is semantic status drift, not pack corruption. MANIFEST has no status claim requiring closure correction; it will need regeneration only after authorized source-doc changes.

No additional current source statement that “initial Git checkpoint pending” or “PR #9 not merged” was found beyond the pending/closure passages above. Historical process reports remain valid snapshots; preserve them.

Separate policy wording drift: ADR-008 at `docs/04_TECH_STACK_ADRS.md:118` still mentions an older same-instance/separate-database fallback. Latest explicit human task and ADR-013 require three independent resources; AGENTS supplies the source-of-truth priority. That priority resolves the conflict: fallback is **not allowed**. Future authorized ADR clarification should mark older fallback superseded; this is not an additional final-review stale passage in the 12-document count.

## X. Phase 0D Documentation Delta Plan

Required means needed in a later authorized documentation sync, not permission to edit now. Update only claims that new implementation evidence supports.

| File/group | Classification | Future delta |
| --- | --- | --- |
| README | REQUIRED | 0C closure + real CI/deploy/setup state |
| docs/04 | REQUIRED | Closure, CI/Vercel/migration accepted decisions, superseded fallback wording |
| docs/07 | REQUIRED | Testing/Prod resource roles, guarded manual flows, quota evidence, 0C closure |
| docs/08 | REQUIRED | Closure wording; schema/design only if later actual schema change |
| docs/09 | REQUIRED | Closure wording and actual workflow/guard file locations |
| docs/10 | REQUIRED | Env scopes, role isolation, manual credential handling, closure |
| docs/12 | REQUIRED | Actual CI triggers/commands/check policy, Git deployment/promotion behavior |
| docs/14 | REQUIRED | Coverage/audit gates, remote evidence, smoke/reproduction, closure |
| docs/16 | REQUIRED | Deployed health/readiness/log/error procedure, migration failure flow |
| docs/17 | REQUIRED | Actual reproducible setup, guard commands when implemented, 0C closure |
| docs/18 | REQUIRED | 0C CLOSED; staged 0D evidence and remaining work |
| docs/19 | REQUIRED | CI/Testing/Production DoD evidence; close only verified items |
| docs/23 | REQUIRED | Actual Gate 1 state and closure criteria; preserve later gates |
| docs/31 | REQUIRED | Observed required check/context/enforcement procedure, current bypass verification limits |
| docs/06_VERCEL_GUIDE.md | REQUIRED | Bootstrap/main promotion, Preview/Production target/env/protection procedure |
| docs/30_UI_TEMPLATE_GUIDE.md | LIKELY | Only actual foundation Preview/adoption acceptance evidence; retain provenance rules |
| docs/03_SYSTEM_ARCHITECTURE.md | NO CHANGE expected | Existing locked architecture already supports quality/deploy separation and independent resources |
| AGENTS, research contracts docs/15/32/33/34 | NO CHANGE | Invariants preserved |
| Five Phase 0C process reports | NO CHANGE | Immutable historical audit snapshots |
| MASTER_GUIDE and MANIFEST | REQUIRED after authorized source sync | Regenerate/verify existing pack scope; no standalone manual status edits |

Task attachment names `docs/06_ARCHITECTURE.md`, which does not exist. Actual architecture is `docs/03_SYSTEM_ARCHITECTURE.md`; actual Vercel guide is `docs/06_VERCEL_GUIDE.md`. Both were read fully. No fabricated missing file was created.

This process report is outside the existing derived pack source scope; creating it does not require modifying MASTER/MANIFEST during this audit.

## Y. Current Official Source Research

All sources below accessed **2026-10-04**. Claims are short paraphrases; generic documentation is not evidence that account configuration exists. Code/repository findings are recorded separately above.

| Provider | Source title / current URL | Accessed | Claim supported |
| --- | --- | --- | --- |
| GitHub | [Checkout v7.0.1 release](https://github.com/actions/checkout/releases/tag/v7.0.1) / [commit](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1) | 2026-10-04 | Current release and full pin identity |
| GitHub | [Setup-node v7.0.0 release](https://github.com/actions/setup-node/releases/tag/v7.0.0) / [commit](https://github.com/actions/setup-node/commit/820762786026740c76f36085b0efc47a31fe5020) | 2026-10-04 | Current release and full pin identity |
| GitHub | [Setup-node README](https://github.com/actions/setup-node/blob/v7.0.0/README.md) | 2026-10-04 | Node selection; npm lock-based cache, not node_modules |
| GitHub | [Checkout README](https://github.com/actions/checkout/blob/v7.0.1/README.md) | 2026-10-04 | Read contents permission; persist-credentials option |
| GitHub | [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) | 2026-10-04 | PR activities/base filter/merge-ref; push SHA semantics |
| GitHub | [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) | 2026-10-04 | Permissions and timeout configuration |
| GitHub | [Workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) | 2026-10-04 | Groups, cancellation expressions, pending replacement |
| GitHub | [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) | 2026-10-04 | Required checks, unique names, protected PR flow |
| GitHub | [Troubleshooting required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) | 2026-10-04 | Recent successful context selection and skipped-workflow pitfalls |
| GitHub | [Secure use](https://docs.github.com/en/actions/reference/security/secure-use) | 2026-10-04 | Least privilege, full SHA pinning, untrusted PR risks |
| GitHub | [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | 2026-10-04 | Public standard-runner compute model; larger/private/storage costs differ |
| Vercel | [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github) | 2026-10-04 | Automatic Git-based deployment and Preview workflow |
| Vercel | [Git](https://vercel.com/docs/git) | 2026-10-04 | Production branch, non-main Preview, import Deploy action |
| Vercel | [Environments](https://vercel.com/docs/deployments/environments) | 2026-10-04 | Local/Preview/Production semantics |
| Vercel | [Environment variables](https://vercel.com/docs/environment-variables) | 2026-10-04 | Scope/branch overrides; changes affect new deployments |
| Vercel | [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) | 2026-10-04 | Node 24 support and project/package major configuration |
| Vercel | [Generated URLs](https://vercel.com/docs/deployments/generated-urls) | 2026-10-04 | Deployment and branch aliases; exact deployment evidence |
| Vercel | [Deployment Checks](https://vercel.com/docs/deployment-checks) | 2026-10-04 | Hold Production promotion using selected GitHub checks |
| Vercel | [Promoting deployments](https://vercel.com/docs/deployments/promoting-a-deployment) | 2026-10-04 | Staged Production/manual promotion option |
| Vercel | [Deploying and redirecting](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting) | 2026-10-04 | First-project deployment Production risk |
| Vercel | [Create a new project API](https://vercel.com/docs/rest-api/projects/create-a-new-project) | 2026-10-04 | Project creation; optional Git configuration; separate deployment operation |
| Vercel | [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication) | 2026-10-04 | Authorized access to protected deployments; plan-specific limits |
| Vercel | [Security settings](https://vercel.com/docs/project-configuration/security-settings) | 2026-10-04 | Build/source access and fork-deployment protection |
| Vercel | [Hobby plan](https://vercel.com/docs/plans/hobby) | 2026-10-04 | Personal/noncommercial scope and plan constraints |
| Vercel | [Limits](https://vercel.com/docs/limits) | 2026-10-04 | Build/deployment/connection quotas require plan awareness |
| TiDB/PingCAP | [Starter limitations](https://docs.pingcap.com/tidbcloud/serverless-limitations/) | 2026-10-04 | Default free resource count and per-instance allowances |
| TiDB/PingCAP | [Starter FAQ](https://docs.pingcap.com/tidbcloud/serverless-faqs/) | 2026-10-04 | Usage/spend limit, quota exhaustion behavior |
| TiDB/PingCAP | [Create Starter](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/) | 2026-10-04 | Spend limit and provisioning options |
| TiDB/PingCAP | [Connect to Starter](https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/) | 2026-10-04 | TCP/driver connection choices and requirements |
| TiDB/PingCAP | [Secure Starter connections](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/) | 2026-10-04 | TLS/certificate verification |
| TiDB/PingCAP | [Configure SQL users](https://docs.pingcap.com/tidbcloud/configure-sql-users/) | 2026-10-04 | SQL role/user model; exact Starter UI applicability unverified |
| TiDB/PingCAP | [Privilege management](https://docs.pingcap.com/tidb/stable/privilege-management/) | 2026-10-04 | Database/table-scoped SQL permissions |
| TiDB/PingCAP | [Transaction overview](https://docs.pingcap.com/tidb/stable/transaction-overview/) | 2026-10-04 | DDL auto-commit and inability to rollback DDL |
| TiDB/PingCAP | [Serverless driver + Drizzle example](https://docs.pingcap.com/developer/serverless-driver-drizzle-example/) | 2026-10-04 | Approved HTTP runtime integration model |

Account-specific Deployment Checks availability, safe bootstrap UI/API procedure, existing env/project state, bypass policy, Starter-specific SQL-user UI, and actual remaining quotas are **NOT VERIFIED FROM CURRENT OFFICIAL SOURCE** as account facts. Generic source support cannot substitute for private account verification.

## Z. Cost / Quota / Account-Specific Checks

All missing account facts: **ACCOUNT-SPECIFIC — HUMAN VERIFICATION REQUIRED**.

| Platform | Generic official-source finding | Required private human verification |
| --- | --- | --- |
| GitHub Actions | Public repo standard hosted runner compute has a free model; larger runners/private usage/storage have different billing | Confirm repo remains public, standard runner choice, Actions allowed policy, storage/cache limits, spending controls and permissions |
| Vercel | Hobby is personal/noncommercial; build/deploy/protection/Git limits depend on plan | Actual plan, owner/team access, project slots, integration authorization, workload eligibility, build/deployment usage, authenticated Preview access, promotion/check capability |
| TiDB Starter | Default maximum five free Starter instances per organization; first-five allowance per instance includes 5 GiB row, 5 GiB column and 50 million RUs/month | Existing instance count, three independent slots, effective plan/region/usage, spend limit zero or approved budget, SQL-user privileges, backup/mitigation options |

TiDB quota exhaustion can limit reads/writes; positive spend limits can permit charges. Vercel/GitHub limits can delay builds or block access. No claim that this project's three-resource deployment is free follows from generic docs alone. If any plan/quota prevents approved separation, stop for human decision; never silently share resources.

## AA. Security / Secret Boundaries

- Read AGENTS and referenced RTK instructions; relevant skills: using-superpowers, verification-before-completion, requesting-code-review, systematic-debugging for tooling failures, Vercel deployments-cicd/env-vars. No skill installation or edits.
- Supported shell operations used RTK proxy. `gh` was unavailable; read-only connector/public API evidence was used instead. A PowerShell quoting/builtin invocation error was corrected; it did not change repository/cloud state and is not an application failure.
- Did not read/copy `.env.local` or `.env.migrations.local`; checked only filenames/ignore behavior. Did not inspect shell history or print inherited secrets.
- Did not query provider credentials, private account profile/email, private hostnames, resource IDs, tokens, or Vercel env values. Remote API output was filtered to necessary public repository/rules evidence.
- Fresh quality child environment removed inherited APP_ENV, DATABASE_URL, NEXT_PUBLIC_APP_NAME, and NODE_OPTIONS case-insensitively. No private env or `.git`/skills/dependencies/generated state was copied into the quality source copy.
- No CI/cloud configuration, DB query against real Dev/Testing/Production, grants, migration, deployment, dependency manifest/lock change, source/test change, existing-doc edit, or Git mutation.
- Root dependency/generated state and human dev server were preserved. Dependency installation occurred only in disposable TEMP verification copy to satisfy the requested fresh baseline; no dependency was added/updated in the project.

Expected-error tests are useful evidence; they do not establish a blanket security claim. Platform logs and deployed errors must be reviewed privately later.

## AB. Fresh Quality Baseline

**PROJECT-SOURCE FINDING**, fresh execution on 2026-10-04. Copied 209 tracked source files byte-for-byte to TEMP without private env, root dependencies, `.next`, coverage, Git, or skill trees. Source hashes matched before and after the suite. Node 24.19.0/npm 11.6.0 ran through RTK proxy with the scrubbed environment described in AA. Existing npm registry cache was reused; network registry access was allowed. No production/dev DB network was needed.

| Command | Exit | Result | Wall seconds |
| --- | --- | --- | ---: |
| `npm ci` | 0 | PASS; lockfile install | 33.567 |
| `npm run lint` | 0 | PASS | 43.692 |
| `npm run typecheck` | 0 | PASS; initially absent generated state | 19.677 |
| `npm run test` | 0 | PASS; 9 files, 147 tests | 24.577 |
| `npm run test:coverage` | 0 | PASS; 9 files, 147 tests | 8.468 |
| `npm run db:check` | 0 | PASS; offline history check | 1.451 |
| `npm run build` | 0 | PASS; 17 static pages, health/ready dynamic | 37.705 |
| `npm run typecheck` after build | 0 | PASS | 3.827 |

Total eight-command wall time **172.964 seconds**. Node/npm proxy startup included; this is timeout planning evidence, not algorithm/deployment benchmark. Logs and parsed results retained outside Git at `C:/Users/L E N O V O/AppData/Local/Temp/courier-phase0d-baseline-20261004/quality-results.json` and `quality-1.log` through `quality-8.log`.

Coverage, entire included TS/TSX source: statements **18.11% (94/519)**, branches **16.21% (66/407)**, functions **17.34% (30/173)**, lines **18.61% (89/478)**. No numeric threshold; no new exclusions. Low coverage is a known nonblocking foundation limitation requiring later feature/test work.

Warnings: Vite CJS config loader future compatibility notice; legacy Drizzle tooling loader deprecations during install. Commands still exit 0. No fixes undertaken. This proves Windows TEMP baseline; actual GitHub Linux and Vercel deployment remain pending.

## AC. Fresh Audit Baseline

| Command | Exit | Actual findings | Wall seconds | Interpretation |
| --- | --- | --- | ---: | --- |
| `npm audit --json` | 1 | **19 total: 1 low, 6 moderate, 12 high, 0 critical** | 2.869 | Findings present; NOT PASS for zero-vulnerability full audit |
| `npm audit --omit=dev --json` | 0 | **0 total, all severities 0** | 1.618 | Runtime baseline PASS |

Parsed audit JSON and every affected locked node: all reported nodes marked `dev: true`. Complete 19 package findings:

| Severity | Packages |
| --- | --- |
| Low (1) | `@babel/core` |
| Moderate (6) | `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `@humanfs/node`, `ajv`, `drizzle-kit`, `esbuild` |
| High (12) | `@babel/plugin-transform-modules-systemjs`, `@next/eslint-plugin-next`, `brace-expansion`, `braces`, `browserslist`, `eslint-config-next`, `fast-glob`, `flatted`, `js-yaml`, `micromatch`, `minimatch`, `svgo` |

These are npm package finding counts, not 19 independent unique advisories. Dev-only classification came from the complete lock/audit mapping, not just `omit=dev` inference. Runtime zero does not imply build tooling is safe. No audit fix, override, forced installation, or dependency update. Raw audit JSON retained in TEMP `quality-9.log` / `quality-10.log`; no secret output was included.

## AD. Proposed Phase 0D Staging Plan

All stages require subsequent explicit task/approval; none was executed here. Corrected order brings Production preparation before Vercel connection because first-deployment/default-main behavior creates bootstrap risk.

| Stage | Future scope | Exit evidence / checkpoint |
| --- | --- | --- |
| 0D-1 | Quality-only CI implementation | Approved D1–D8; minimal workflow, actual scripts, no project secrets/migration/deploy; fresh checks + independent review |
| 0D-2 | Authorized remote CI verification and required checks | Approved Git operations; real Linux workflow PASS/current context; human configures testing/main checks after successful run; bypass policy verified |
| 0D-3 | Testing guards, independent resource/users, reviewed manual migration | Separate code/provision/apply approvals; target/quota/TLS verified, ledger/schema/roles PASS |
| 0D-4 | Production guards/resource/users and initial reviewed migration preparation/apply | Testing migration first validated; explicit Production provision/apply approvals; schema/ledger/mitigation ready before any Production-capable Git connection |
| 0D-5 | Vercel bootstrap, Git Integration, testing + feature Preview | Account capability/bootstrap path approved; empty project configured before connection; main branch tracking retained; chosen hold mode; exact targets/env verified; Preview smoke PASS |
| 0D-6 | Reviewed testing → main foundation release, controlled Production | Main application tree reviewed; approved PR/merge; actual main-SHA quality and Production deployment; smoke/log evidence; chosen promotion/check flow |
| 0D-7 | Preview/Production isolation proof | Private provider/env/deployment binding mapping, three-resource/role separation booleans; no data writes |
| 0D-8 | Second-member reproduction | Different human/workspace quality/hook proof + authorized least-privilege Dev read/runtime evidence |
| 0D-9 | Authorized doc sync + Gate 1 independent final verification | 0C drift fixed, actual 0D procedures/evidence documented, derived packs verified, Free provenance retained and template Preview/human acceptance PASS; no unresolved blocker; explicit human Gate 1 closure |

If safe initial-deployment hold/target behavior cannot be confirmed, Stage 0D-5 stops at a human checkpoint. Do not connect Git blindly to outdated main or call an initial failed/misclassified build PASS. Migration tooling for Testing/Production is new scoped work, not an existing capability hidden in Stage 1.

## AE. Human Decision Table

**20 decisions; all require human approval YES.** Options apply within locked project constraints; resource-sharing, automatic migrations, CI secret access, or changing Production Branch to testing are not valid fallback choices. Approval of a design does not itself authorize cloud/Git/apply operations without the later scoped task.

| ID / decision | Options | Recommendation | Rationale | Risk / checkpoint | Human approval |
| --- | --- | --- | --- | --- | --- |
| D1 CI triggers | PR only; PR + testing/main push | PR testing/main + push testing/main | Validate proposed merge and actual deployable branch SHA | Extra merge run; avoid feature push duplication | YES |
| D2 Required commands | Existing minimal four; complete fresh foundation suite | Eight quality commands I + runtime audit; Node24, one Quality Gate | Covers coverage, generated types, offline history and build | Linux/cold install still needs real run | YES |
| D3 Coverage | Run/no threshold; omit; explicitly justified later threshold | Run coverage/no threshold | Matches current contract and exposes gaps | Low whole-source coverage remains visible | YES |
| D4 Audit | Full hard gate; runtime hard + full info; omit | Runtime any-severity hard gate + full informational | Runtime0 preserved, known dev19 not hidden | Dev build risk needs separate triage; tool failure not clean | YES |
| D5 db:check | Required offline gate; informational | Required | Detect migration-history inconsistency without credential | Does not prove live schema | YES |
| D6 Concurrency | No cancellation; cancel superseded PR only; cancel all same refs | J expression, PR-only active cancellation | Isolates unrelated runs and preserves running push checks | Default older pending replacement; latest SHA required | YES |
| D7 Timeout | 10 min; measurement-based later change | 10 min initially | Fresh quality about 2.88 min | Registry/runner variance; reassess actual Linux data | YES |
| D8 Required name/enforcement | Stable single job; matrix/multiple names | Quality / job quality / name Quality Gate; select actual context after first success; enforce testing/main/up-to-date | Stable review/check contract | Bypass/classic rules and observed app/context require human check | YES |
| D9 Production Branch/bootstrap | Main with supported Deployment Checks; main with staged/manual promotion | Main; privately confirm safe empty-project setup/hold path before Git connection | Locked Git model; current main has no app | First deployment may be Production; choose one compatible hold mode | YES |
| D10 testing Preview | Generated branch alias; optional custom domain | Stable testing Preview via generated alias | Built-in integration URL sufficient | Exact deployment/SHA needed when alias moves | YES |
| D11 Feature Preview | Shared compatible Testing; separately approved isolated Testing for incompatible feature | Shared Testing for read-only foundation | Current UI/health/readiness has no writes | Future writes/schema branches can collide | YES |
| D12 Testing provisioning order | Before Preview deploy; after skeleton deployment | Independent Testing before meaningful Preview deployment | Ready/schema smoke must prove correct target | Slot/budget/privileges need private verification | YES |
| D13 Production provisioning order | Before Git connection/first Production; health-only skeleton first | Independent Production prepared/migrated after Testing validation, before Production-capable connection | Avoid missing Prod configuration during bootstrap | Earlier provision cost; no first-production PASS without ready | YES |
| D14 Preview env | Shared Preview scope; branch-specific override | APP_ENV testing + Testing app credential for Preview; no overrides now | Simple scope for compatible branches | APP_ENV alone does not bind resource; inspect mappings | YES |
| D15 Production env | Prod-only binding; postpone ready evidence | APP_ENV production + distinct Prod application credential | Production target isolated from Testing | Changes need new deployment; never NEXT_PUBLIC credential | YES |
| D16 Testing migration timing | Before Preview deploy; after deploy before smoke | Reviewed guarded manual apply before deploy | Schema ready before validation; explicit target guard | Current db:migrate rejects Testing; future implementation required | YES |
| D17 Production migration timing | Approved pre-release manual apply; defer until post-release | Testing-validated, manually approved apply + ledger/schema verification before main rollout | Predictable readiness and compatibility | DDL auto-commit; partial failure needs approved forward repair | YES |
| D18 Isolation evidence | Private provider/env binding + deployment proof; restricted diagnostic if insufficient | Private mapping with non-secret labels/booleans, exact target/SHA | Avoid credentials/endpoints/writes | Readiness/APP_ENV alone insufficient | YES |
| D19 Second member | Secret-free quality only; quality + authorized least-privilege Dev live read | Both for full Gate 1 setup proof | Proves DB setup on a different human/workspace | No root/migrator/Prod credential distribution | YES |
| D20 Gate 1 closure | Partial quality-only acceptance; full current foundation matrix | V exit criteria + final independent review + explicit closure | CI, cloud, isolation, reproduction and provenance all evidenced | Gate remains OPEN until all required pending/gaps resolved | YES |

## AF. Risks / Blockers

| Classification | Finding | Handling |
| --- | --- | --- |
| BLOCKER | None for baseline audit/human decision readiness | Does not imply implementation/deployment is unblocked |
| IMPORTANT | Current main lacks foundation; first Vercel deployment may be Production | Approved empty-project bootstrap/hold and main foundation PR; verify target before acceptance |
| IMPORTANT | Existing migration command is Dev-only | Separate reviewed Testing/Production guards; never bypass Dev guard |
| IMPORTANT | 0 remote workflows; no required-status-check rule observed pada dua rulesets; classic protection belum diverifikasi | Implement/verify/configure only after approved decisions; retain evidence boundaries |
| IMPORTANT | APP_ENV/readiness cannot prove resource identity | Private provider/env/deployment mapping required |
| IMPORTANT | No independent current Testing/Prod or Vercel global inventory | Human checks before configuration/provisioning; scoped query result is bounded |
| IMPORTANT | Shared Preview resource can collide after future writes/schema changes | Compatible schema, no destructive tests; additional isolation decision later |
| MINOR | docs/06_ARCHITECTURE.md in task absent | Actual docs03 architecture/docs06 Vercel read; no file fabricated |
| MINOR | 12 source docs + derived MASTER retain stale closure wording | Future authorized sync; historical reports preserved |
| KNOWN NON-BLOCKING | 19 dev audit findings, runtime0 | Visible separate triage; no zero-full-audit claim |
| KNOWN NON-BLOCKING | Low whole-source coverage, no threshold | Coverage command required; later test work scoped to features |
| KNOWN NON-BLOCKING | Vite/legacy tooling notices | Commands PASS; future maintenance task only |
| HUMAN CHECKPOINT | Actual plans, slots, spend limits, SQL-user controls, account bypass/protection | Private human verification; never shared-resource fallback |
| HUMAN CHECKPOINT | D1–D20, cloud/Git/migration operations | Separate approvals/tasks after this report |
| HUMAN CHECKPOINT | Template Preview/human acceptance and second-member full setup | Resolve before explicit Gate 1 closure; preserve recorded Free provenance |

## AG. Recommendation

Approve or revise **D1–D20** first. Exact next implementation task afterward: **Phase 0D-1 — quality-only GitHub Actions**, on `feature/foundation-ci-vercel`, with one stable Quality Gate, existing commands, read-only permissions, and no project/cloud/DB secrets or migrations. Remote Git operations and required-check configuration require subsequent explicit authorization.

Continue through corrected staging AD only in separately authorized scopes. **Gate 1 stays OPEN; no Depot CRUD yet.** Do not describe the repository as production-ready, fully secure, or deployed based on this audit.

Audit output: only `docs/proses/phase-0/0d/PHASE_0D_BASELINE_AUDIT_REPORT.md`. No existing documentation/source/tests/packages/skills changed; no MASTER/MANIFEST regeneration. No CI implementation, Vercel mutation, TiDB Testing/Production provisioning, migration, Git add/commit/push/merge, or branch creation. Fresh quality/audit installation and logs stayed in TEMP.

**STOP AFTER AUDIT — waiting for human decisions.**

### Final preservation and report review

Independent reviewer read the entire draft and checked task structure, Phase 0C evidence, drift inventory, and Vercel bootstrap source support. Initial wording findings (1 IMPORTANT, 3 MINOR) were corrected only in this report; bounded follow-up confirmed **0 BLOCKER, 0 IMPORTANT, 0 MINOR** remaining report-review findings. Account/deployment/implementation results were not inferred from review and remain pending.

Final read-only checks after report creation/corrections:

- `git status --short --untracked-files=all`: only `?? docs/proses/phase-0/0d/PHASE_0D_BASELINE_AUDIT_REPORT.md`.
- `git diff --check`: exit 0; `git diff --cached --stat`: empty.
- `git rev-parse HEAD`: unchanged `e1c36988e588e397af312a140677c3f71bd451d2`; branch, five initial refs, merge-base and hooksPath unchanged.
- SHA-256 preservation: **209 baseline repository files and 402 skill files unchanged**; fresh source-copy baseline files also unchanged. `skills-lock.json` is included in preserved baseline files.
- Derived integrity: MANIFEST **46 entries / 0 mismatches**, MASTER **45 source sections / 0 parity mismatches**.
- Report checks: **33 ordered A–AG sections, 20 D1–D20 YES decisions**, no trailing whitespace, replacement characters, or matches for basic credential-URL/token/email patterns. This scan is a bounded check, not a general security guarantee.

No repository output besides this untracked report; index remains empty. Quality logs/helpers retained only in TEMP. Human action still needed: decide D1–D20 and verify account-specific constraints, then issue the next scoped implementation task.
