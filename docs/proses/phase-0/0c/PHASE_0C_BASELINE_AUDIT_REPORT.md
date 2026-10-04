# Phase 0C — Database Foundation Baseline Audit Report

Tanggal: 2026-10-04, Asia/Jakarta. Repository: ArdhanKurniawan/courier-route-planner.
Mode: READ-ONLY baseline, architecture, dependency, dan provisioning audit. Semua rancangan implementation di bawah adalah **proposal**, belum dibuat atau dijalankan.

## A. Verdict

**HUMAN DECISION REQUIRED BEFORE IMPLEMENTATION**

Baseline branch/base, working tree, quality suite dan runtime security lulus. Tidak ada baseline defect atau suspected tracked secret yang mengharuskan recovery.

Keputusan sebelum coding:

1. Setujui pengecualian **mysql2 sebagai dev dependency untuk Drizzle Kit CLI saja**, atau pilih alternative HTTP migrator dengan verification tersendiri. Rekomendasi audit adalah CLI stabil + mysql2; runtime aplikasi tetap Drizzle + `@tidbcloud/serverless`.
2. Setujui **Dev terlebih dahulu pada 0C**, Testing sebelum integration/Preview pada 0D, Production sebelum release 0D. Target akhir tiga independent Starter instances ADR-008 tetap berlaku; penundaan resource bukan perubahan menjadi satu shared instance.
3. Setujui scope **depots only** dan kontrak koordinat sebelum migration dibuat. DOUBLE adalah kandidat yang direkomendasikan; exact DECIMAL precision/scale belum disetujui dan tidak ditebak.

Task audit selesai dengan evidence dan proposal yang bisa direview. Verdict ini bukan izin implementation, provisioning, credential storage, atau migration apply. Gate 1 tetap OPEN.

## B. Repository Context

| Item | Actual evidence |
|---|---|
| Branch | feature/foundation-database |
| HEAD | 11985b6a3532b3773eebe63d330d84788bbf2be1 |
| testing | 11985b6a3532b3773eebe63d330d84788bbf2be1 |
| origin/testing, local ref | 11985b6a3532b3773eebe63d330d84788bbf2be1 |
| merge-base HEAD testing | 11985b6a3532b3773eebe63d330d84788bbf2be1 |
| Latest commit | Merge pull request #8 from ArdhanKurniawan/feature/foundation-environment-health |
| Node / npm | v24.19.0 / 11.6.0, actual runner |
| Next / React / TypeScript | 16.3.6 / 19.2.8 / 5.9.3, actual installed/lock |
| Initial working tree | CLEAN; status --short --untracked-files=all kosong |
| Initial index | Kosong |
| Preservation inventory | 187 original tracked project files, SHA-256 terhadap bytes saat audit dimulai |
| Prior phases | Phase 0A CLOSED via PR #7; Phase 0B CLOSED via PR #8, sesuai task dan local merge/ref evidence |

Tidak melakukan fetch; origin/testing di atas bukan verifikasi live GitHub. Branch safety gate dijalankan sebelum perencanaan perubahan. AGENTS.md dan RTK.md dibaca, `.agents/` diinventarisasi. Skills: using-superpowers, brainstorming untuk perbandingan rancangan, writing-plans sebagai pedoman proposal urutan kerja, dan verification-before-completion. Tidak ada skill installation, perubahan skills-lock, atau agent delegation.

Seluruh shell commands memakai RTK v0.48.0/proxy. Node/npm CLI yang sudah tersedia dipakai lewat absolute paths dan npm cache TEMP existing. Scratch logs/source research disimpan di TEMP. Tidak membuat spec/plan file tambahan; task hanya mengizinkan laporan ini.

## C. Current Database State

| Area | Actual state |
|---|---|
| Direct DB/validation dependencies | drizzle-orm, drizzle-kit, @tidbcloud/serverless, zod dan mysql2 belum direct dependencies |
| Transitive Zod | 4.1.13 pada lock/install, dibutuhkan eslint-plugin-react-hooks; belum dipakai aplikasi |
| DB source/config | src/db, drizzle.config.ts dan directory drizzle tidak ada |
| Schema/migrations/seed/reset | Tidak ada implementation DB atau migration artifacts |
| Readiness | src/app/api/ready/route.ts belum ada |
| Existing environment | Pure src/config/env.ts; APP_ENV strict development/testing/production |
| Existing health | GET /api/health app-only; 200 status:ok atau 503 status:error, JSON + no-store |
| Runtime DATABASE_URL | Tidak dibaca source aplikasi; disebut sebagai absence fixture pada health tests |
| Env files | .env.example tracked berisi APP_ENV=development; tidak ada real root .env variants |
| Secret ignore | .env dan .env.* ignored, exception !.env.example tersedia |
| Tests | 4 files / 48 tests; Node env/health tests dan UI component tests |
| CI/deployment | .github/scripts DB dan provisioning implementation belum ada |

Placeholder halaman depot/order/scenario adalah UI shell, bukan CRUD atau evidence schema. Search membedakan source, tests, documentation examples dan komentar UI yang memakai kata migration. Checkout .env.example memakai CRLF, 21 bytes; logical contract tetap satu APP_ENV line. Historical laporan 0B tentang LF/20 bytes tidak ditulis ulang.

## D. Approved Phase Boundary

| Phase | Concern yang disetujui |
|---|---|
| 0C | Server DB config, lazy client, approved DB packages, migration foundation, bounded initial schema, Dev verification dan safe DB readiness |
| 0D | GitHub Actions, Vercel Git Integration/scopes, main/Preview deployments, Testing/Production rollout, isolation proof dan second-member reproduction |
| Phase 1 | Depot/scenario/order CRUD, mutation validation, application services, DTOs, feature integration tests dan UI flows |
| Research infrastructure/algorithm phases | Immutable snapshots, frozen directed meter matrix/hash, OSRM adapter, NN+2-Opt, Classical Ant System dan controlled benchmark |

Schema docs/08 adalah conceptual target. Tidak mengimplementasikan seluruhnya pada 0C. DB/network tetap di luar algorithm core dan timer; formal benchmark tidak bergantung runtime Vercel. Existing research decisions docs/32/34 tidak diubah.

Required documentation dibaca: AGENTS, README, docs/03/04/07/08/09/10/12/13/14/16/17/18/19/21/22/23/24/25/31/32/34, serta tiga laporan 0B baseline/implementation/independent verification. Prompt examples docs/22 dan future setup snippets adalah referensi, bukan perluasan authorization task ini.

## E. Documentation Drift

| Source | Drift / future bounded correction |
|---|---|
| README.md | 0B masih locally implemented/pending independent verification; perlu CLOSED/PR #8 + verification link saat authorized docs sync |
| docs/18_ROADMAP_BACKLOG.md | Status independent 0B perlu diperbarui; 0C/0D dan Gate 1 tidak otomatis dicentang |
| docs/23_PHASE_GATES_CHECKLISTS.md | Local/pending wording tertinggal; overall Gate 1 tetap OPEN |
| docs/17_SETUP_FROM_ZERO.md | Status 0B stale; contoh module-level DATABASE_URL throw bertentangan dengan proposed no-env build; learning table bukan schema final yang diwajibkan |
| docs/07_TIDB_GUIDE.md | Diagram connection perlu mengikuti application → Drizzle → driver → TiDB; provisioning/version/CLI details perlu current evidence |
| docs/09/10/14/16 | Future client paths, DB env, testing dan readiness perlu disinkronkan setelah implementation benar-benar PASS |
| docs/08_DATABASE_DESIGN.md | Pertahankan conceptual label; catat hanya depots sebagai actual bila diterima/implemented, sisanya future |
| docs/19_DEFINITION_OF_DONE.md | DB DoD mencakup Dev dan Testing migrations; Dev-only 0C tidak memenuhi seluruh DB DoD, perlu explicit deferred Testing status |
| docs/04_TECH_STACK_ADRS.md | ADR/task approval diperlukan untuk mysql2 tooling exception; ADR-008 tiga resource tetap dipertahankan |
| MASTER_GUIDE.md | Derived copies mewarisi stale status; regenerate hanya setelah authorized source sync |
| MANIFEST.md | Regenerate actual bytes/hashes pada future covered-doc sync, tidak untuk report-only audit ini |

Tidak mengubah source-of-truth, derived documents atau historical reports. Current process report excluded dari existing documentation-pack manifest policy. Line-ending differences checkout tidak disamakan dengan kehilangan evidence atau izin rewrite historical report.

## F. Current Official Dependency Research

Metadata diperiksa baru menggunakan `npm view` (read-only), official docs dan pinned upstream source. Semua chosen candidates memakai stable latest tag; tutorial Drizzle saat ini memakai @rc, sehingga API/config diverifikasi juga pada stable tag 0.45.3. Tidak meng-install candidates.

| Package | Latest stable / chosen candidate | Runtime/Dev | Engines/Peers relevan | Source |
|---|---|---|---|---|
| drizzle-orm | 0.45.3 / 0.45.3 | Runtime | Tidak mendeklarasikan Node engines; optional peer @tidbcloud/serverless:*; mysql2 optional >=2 bila adapter itu dipakai | [Registry](https://registry.npmjs.org/drizzle-orm/0.45.3), [stable TiDB adapter](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/tidb-serverless/driver.ts) |
| drizzle-kit | 0.31.11 / 0.31.11 | Dev tooling | Tidak mendeklarasikan Node engines/peerDependencies; memiliki tooling dependencies; stable MySQL CLI perlu installed driver | [Registry](https://registry.npmjs.org/drizzle-kit/0.31.11), [stable package](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-kit/package.json) |
| @tidbcloud/serverless | 0.3.0 / 0.3.0 | Runtime | Node >=16; tidak mendeklarasikan dependencies/peers | [Registry](https://registry.npmjs.org/@tidbcloud/serverless/0.3.0), [driver guide](https://docs.pingcap.com/developer/serverless-driver/) |
| zod | 4.6.5 / 4.6.5 | Runtime config validation | Tidak mendeklarasikan Node engines/peers; official TS guidance >=5.5 + strict | [Registry](https://registry.npmjs.org/zod/4.6.5), [Zod](https://zod.dev/) |
| mysql2, conditional extra | 3.24.5 / 3.24.5 | Dev CLI only, HUMAN APPROVAL REQUIRED | Node >=8; ORM optional peer >=2 terpenuhi | [Registry](https://registry.npmjs.org/mysql2/3.24.5), [Kit connections](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-kit/src/cli/connections.ts) |

Node 24.19.0, TS 5.9.3 strict, Next App Router dan existing Vitest sesuai declared guidance. ORM adapter menerima driver Connection API yang tersedia pada 0.3.0. Tidak ada deprecated field pada selected package metadata. Engines yang tidak dideklarasikan bukan bukti setiap Node version didukung.

Ini **metadata/source compatibility assessment**, belum actual installation/typecheck/live verification terhadap combined future dependency graph. Installation nanti wajib lockfile review, full quality dan fresh security audit. Tidak membuat klaim zero vulnerability untuk packages yang belum masuk lock.

## G. Dependency Recommendation

Exact proposed direct set: runtime **drizzle-orm@0.45.3, @tidbcloud/serverless@0.3.0, zod@4.6.5**; dev **drizzle-kit@0.31.11**, serta **mysql2@3.24.5 hanya setelah explicit approval/ADR tooling exception**. Recheck metadata saat implementation bila ecosystem berubah; jangan mengganti candidate diam-diam.

| Package | Masalah / why existing insufficient | License, maintenance dan size/runtime impact |
|---|---|---|
| ORM | Typed MySQL/TiDB schema dan parameterized query layer belum ada | Apache-2.0; 10,516,772 unpacked bytes seluruh package; server imports saja, ukur actual bundle kemudian |
| Driver | Approved HTTP SQL transport belum ada di aplikasi | Apache-2.0; 48,922 unpacked bytes; no declared external dependencies; public-preview operational risk |
| Zod | Runtime DATABASE_URL validation memberi concrete use, TypeScript saja tidak memvalidasi env | MIT; 6,140,311 unpacked bytes, bukan browser bundle measurement; zero external dependencies |
| Kit | SQL generation/history/check tooling belum tersedia | MIT; 10,267,562 unpacked bytes; dev dependency graph mencakup tsx, esbuild, brocli dan esm-loader; audit transitives nanti |
| mysql2 | Stable Kit connectToMySQL hanya memilih mysql2 atau @planetscale/database, tidak HTTP TiDB driver | MIT; 630,026 unpacked bytes + tujuh declared dependencies; TCP/TLS attack/maintenance surface tooling; jangan diimport app runtime |

Ukuran npm unpacked bukan transfer size atau deployed bundle. Semua package di atas open-source; layanan TiDB tetap tunduk quota/billing tersendiri.

Migration alternatives:

| Path | Benefit / cost | Decision |
|---|---|---|
| Stable Kit migrate + mysql2 dev | Official CLI workflow, tracked history, local TCP/TLS connection; membutuhkan extra package dan separate migration privilege | **RECOMMENDED, conditional human approval** |
| Official drizzle-orm/tidb-serverless/migrator + custom script | Tidak perlu mysql2; stable source ada, tetapi memakai adapter transaction API, experimental HTTP transactions dan custom runner/test burden | Alternative jika manusia menolak extra; jangan mengklaim sudah live-verified |
| RC packages/tutorial atau primary driver replacement | Mengubah stability/stack assumptions dan verification scope | Tidak direkomendasikan |

[Pinned HTTP migrator](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/tidb-serverless/migrator.ts) dan [session](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/tidb-serverless/session.ts) membuktikan alternative tersedia. mysql2 bukan satu-satunya cara universal migrasi TiDB; kebutuhan extra berlaku pada **recommended stable CLI path**. Tidak menambah dotenv, @next/env direct dependency, tsx direct dependency, server-only package, Prisma atau testing framework baru.

## H. TiDB Current Offering

**VERIFIED dari official public sources, bukan account inspection:**

| Topic | Current documented fact / implication |
|---|---|
| Product/resource term | TiDB Cloud Starter, formerly Serverless; official docs menyebut Starter instance. Organization dan optional Project mengelola resource; database adalah SQL namespace di dalam instance |
| Free capacity | Default sampai lima free Starter instances per organization; masing-masing first five mendapat 5 GiB row storage, 5 GiB column storage, 50 million RU/month |
| Spending | Spending limit 0 mempertahankan free mode; quota exhaustion dapat menolak new connections/throttle existing; jangan aktifkan paid budget/card tanpa keputusan manusia |
| Connection ceiling | Starter default 400 concurrent connections; ini product limit, bukan rekomendasi membuat TCP pool pada HTTP runtime |
| Scaling | Starter automatically scales; tidak ada manual capacity tuning yang dibutuhkan foundation |
| Regions | Official CLI region table menyebut AWS N. Virginia, Oregon, Singapore, Frankfurt, Tokyo dan Alibaba Singapore untuk Starter; account/console availability harus dicek saat provisioning |
| HTTP driver | Public preview, Starter/Essential; private endpoint unsupported, backend use, single statement/query dan maximum 10,000 returned rows |

Sumber: [Starter limitations](https://docs.pingcap.com/tidbcloud/serverless-limitations/), [create Starter](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/?plan=starter), [regions](https://docs.pingcap.com/ai/ti-regions-security-and-limitations/), [scaling](https://docs.pingcap.com/tidbcloud/scale-tidb-cluster/), [driver](https://docs.pingcap.com/developer/serverless-driver/).

**NOT VERIFIED:** actual organization eligibility, remaining free slots, card/billing settings, current usage, existing resources, selected region latency, live server version atau account-specific permissions. Tidak menjanjikan selalu Rp0 atau SLA production dari public free quota.

Idle auto-sleep/cold-start duration untuk Starter instance tidak terverifikasi pada inspected sources. Official HTTP driver's experimental stateful session mempunyai idle expiry; itu bukan bukti instance tidur. Readiness memakai deadline dan generic failure, tanpa keep-alive polling atau invented wake-up policy. [Official driver README](https://github.com/tidbcloud/serverless-js), [Starter FAQ](https://docs.pingcap.com/tidbcloud/serverless-faqs/).

## I. TiDB Environment Recommendation

| Option | Benefit | Risk/cost/phase fit |
|---|---|---|
| A. Provision Dev/Test/Prod sekarang | ADR-008 isolation siap lebih awal | Belum perlu Prod untuk coding 0C; tiga credential/resource lifecycles dan cloud approvals sekarang |
| B. Dev sekarang; Test/Prod bertahap | Kecil, Dev verification nyata, final ADR tetap tiga independent instances | Testing/Prod readiness dan full DB DoD belum boleh diklaim; timing perlu human decision |
| C. Satu instance, tiga databases | Menghemat free slots | Shared resource/failure/quota boundary; weaker isolation, membutuhkan ADR fallback approval |
| D. Local MySQL/SQLite substitute | Bisa offline | Tidak membuktikan TiDB HTTP behavior; extra stack, bukan pengganti accepted TiDB verification |

**RECOMMEND B.** Manusia provision Dev untuk live 0C. Testing harus ada sebelum write integration tests dan Preview di 0D. Production disiapkan sebelum controlled production migration/deploy pada 0D. Bila manusia menghendaki semua resources pada 0C, A cocok target ADR dengan approval tersendiri; tidak otomatis dilakukan.

Tiga first-five free instances feasible **jika** organization masih mempunyai tiga free slots dan setiap resource stay within quota; audit tidak memeriksa akun. Quota shortage tidak mengizinkan silent C fallback. Docs/17 all-three setup dan docs/19 Dev+Testing DoD perlu explicit phased acceptance bila B diterima; overall Gate 1 tetap OPEN.

Proposed instance names: route-planner-dev, route-planner-testing, route-planner-production. Proposed SQL databases: courier_route_planner_dev, courier_route_planner_testing, courier_route_planner_production. Project grouping courier-route-planner optional. AWS Singapore kandidat region bagi tim Indonesia; selection tetap manusia setelah console/network requirements diperiksa, tanpa klaim latency terbaik.

## J. Provisioning Responsibility Matrix

| Action | Human | Agent Later with Approval | Prohibited |
|---|---|---|---|
| Account/organization, billing/card | HUMAN MUST DO | Read public instructions; tidak mengelola pembayaran | Semua account/cloud action pada audit ini |
| Project/group dan create Dev Starter | Human owner verifies quota/spending | Named resource creation hanya jika task eksplisit mengizinkan | Silent creation/paid upgrade |
| Provider/region/spending limit | HUMAN MUST DECIDE | Apply exact approved settings | Guess region/budget |
| SQL database dan users/grants | Approve environment/least privilege | Approved Dev-only SQL/task, setelah resource identity verified | Broad production/admin grants untuk local tests |
| Generate/save initial password | HUMAN MUST DO via console/password manager | Credential-consuming operation setelah explicit authorization, tanpa disclosure | Credential output ke chat/Git/screenshot |
| Rotation/revoke/delete/reset | Human approves named target/impact | Separate explicit task/process | Audit mutation; destructive action tanpa approval |
| Create Testing/Production | HUMAN timing/resource approval | Named bounded task setelah approval | Treat Dev approval as Prod approval |
| Set Vercel secret/scopes | Human Phase 0D approval | Explicit scoped task | Audit access; Preview menggunakan Prod secret |
| First Dev migration | Human approves reviewed SQL + target | Apply exact reviewed artifacts later | Apply generated SQL automatically |
| Testing/Production migration | Separate human target/window/mitigation approval | Approved named migration later | Automatic install/build/startup/HTTP migration |

Tidak ada akun, dashboard, API credential atau production resource diakses pada audit.

## K. Environment Contract

| Variable | Contract |
|---|---|
| APP_ENV | Existing exact development/testing/production; parser unchanged, no trim/default, runtime-only validation |
| DATABASE_URL | Server-only secret; required hanya saat DB operation/online CLI; validated explicit input, tidak pada import/build/typegen atau ordinary unit suite |
| NODE_ENV | Framework-managed, bukan database environment identifier |
| NEXT_PUBLIC_* | Tidak digunakan untuk DB URL, users, password atau DB environment proof |

Future mapping: local development → Dev, Preview/testing → Testing, main Production → Production. Phase 0D mengatur deployment scopes dan memverifikasi actual targets.

Proposed safe template (belum ditulis): existing APP_ENV=development line + comment bahwa DATABASE_URL diisi manusia dengan Dev credential + blank `DATABASE_URL=`. Tidak memakai credential-looking sample. Root .env.local ignored; jangan menyalin production credential ke local file. Current health tidak mewajibkan DB URL meskipun template nanti mempunyai blank field.

## L. DATABASE_URL Validation Strategy

Proposed `src/config/db-env.ts`: pure Zod-backed parser menerima `string | undefined`, mengembalikan validated connection config atau fixed `DatabaseConfigError`. Tidak membaca ambient env/fetch dan tidak memakai server-only marker agar dapat dipakai CLI/unit tests. Environment reader berada di server `src/db/client.ts` saat getter dipanggil.

Validate missing/blank/padded/control input, URL parseability, exact mysql scheme, nonempty hostname/username/password, explicit single database path, valid port dan percent-encoding. Reject fragments, multiple database segments dan unsupported connection options daripada mengabaikannya diam-diam. URL-special characters pada credentials harus percent-encoded. Pure `z.url()` saja tidak membuktikan accepted SQL scheme. Driver constructor tidak membuktikan credential benar; live connection tetap diperlukan.

Tidak memakai `process.env.DATABASE_URL!`, default database `test`, silent trim atau automatic provider substitution. Driver documentation dan actual constructor berbeda dalam fallback detail; proyek menetapkan explicit database untuk menghindari ambiguity. [Driver configuration](https://docs.pingcap.com/developer/serverless-driver/), [pinned URL parsing](https://raw.githubusercontent.com/tidbcloud/serverless-js/93376e800ed18902da8b90f01a5981e7405e88b6/src/index.ts).

Zod errors/issues/raw input tidak dilempar/log/return. Fixed message misalnya `Database configuration is invalid`; error category boleh fixed enum. Tests memakai unmistakable fake markers dan memastikan marker/password/raw URL tidak muncul. AppEnv parser tetap terpisah supaya health tidak ikut menuntut DB config. Zod pada 0C punya concrete config use; mutation schemas baru Phase 1, tanpa automatic Drizzle-to-Zod duplication.

## M. Environment Loading for Drizzle Kit

Kit berjalan di luar Next runtime; `.env.local` tidak otomatis dimuat hanya karena Next memakainya.

| Option | Dependency / cross-platform / secret / reproducibility |
|---|---|
| A. Manual shell env | Zero package; PowerShell/Git Bash syntax berbeda, raw secret mudah masuk history, inherited env mudah salah; useful pada later controlled runner |
| B. Node built-in --env-file | Zero package; Node 24 available, sama di Windows/Git Bash; explicit ignored file, mudah didokumentasikan |
| C. dotenv | Extra direct dependency untuk loader yang Node sudah sediakan; tidak justified |
| D. @next/env | Official loader untuk outside Next, tetapi direct dependency/runtime coupling perlu policy; tidak diperlukan untuk single explicit file |
| E. Custom loader/wrapper | Bisa memperluas guards, tetapi menambah code/maintenance; tidak diperlukan untuk minimal proposal |

**RECOMMEND B.** Offline generate/check memakai credential-free base config. Online migrate memakai Node `--env-file=.env.migrations.local` untuk dedicated Dev migration credential; runtime/studio memakai `.env.local` untuk Dev application credential. Keduanya ignored, dibuat/disimpan manusia setelah approval, memakai APP_ENV dan DATABASE_URL yang sama namanya tetapi role berbeda. Next tidak memakai file migration sebagai runtime env. Node flag diberikan sebelum direct Kit bin dan separate Dev config. Missing file gagal; inherited variables mengalahkan file, sehingga operator harus memastikan shell tidak membawa URL/APP_ENV lain. Jangan mencetak env values untuk pemeriksaan. Node `--run` mempunyai caveat env-file propagation; proposal langsung menjalankan bin, tidak memakai --run. [Node 24 CLI](https://nodejs.org/download/release/latest-v24.x/docs/api/cli.html#--env-filefile).

Dev config harus menolak APP_ENV selain exact development dan database namespace selain courier_route_planner_dev. Ini layer guard tambahan, bukan proof instance identity. Human target inventory + scoped Dev credentials tetap wajib. Tidak membuat env loader atau generic configuration framework.

## N. Proposed Database Folder Structure

```text
src/config/db-env.ts              pure validated DB config; reusable by CLI/tests
src/db/schema.ts                  pure mysql-core depots definitions, no client/env
src/db/client.ts                  server-only lazy getDb, stateless driver + Drizzle
src/db/readiness.ts               one bounded SELECT, generic result classification
src/app/api/ready/route.ts        request-time readiness, exact safe HTTP response
drizzle.config.ts                offline generation/check configuration
drizzle.dev.config.ts            guarded local online configuration, TLS credentials
drizzle/                        tracked SQL and generated meta, only after generation
tests/unit/db-env.test.ts        parser and safe errors
tests/unit/db-client.test.ts     no-import-I/O, lazy validation and request timeout
tests/unit/db-readiness.test.ts  real readiness logic, fake transport failures/results
tests/unit/ready.test.ts         direct GET response/header/error boundaries
tests/fixtures/server-only.ts    test-only empty marker alias, if Vitest needs resolution
```

Tidak membuat generic repositories/base classes, DI container, unused services, domain folders, models per conceptual table atau seed/reset scripts. Future Route Handlers/Server Actions/application services boleh memanggil getter; Client Components dan algorithm modules tidak boleh mengimport client/readiness/schema value modules.

`import 'server-only'` pada client/readiness modules memberi Next compiler boundary. Official Next menangani marker internal; package installation optional, sehingga tidak perlu extra server-only dependency. Vitest alias menuju fixture hanya untuk unit runtime, tidak mengubah Next/compiler production guard. Pure schema dan parser tidak membawa marker/credential. [Next server-only guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components).

## O. Connection Lifecycle

Application → `getDb()` → validate current APP_ENV/DB URL → `connect({url, fetch})` → stable `drizzle(client, {schema, logger:false})` → explicit async operation.

Pinned `connect` synchronously constructs Connection dan parses config; HTTP dilakukan di execute/postQuery. ORM construction membangun dialect/session, tanpa SELECT atau migration. Namun getter tetap dipilih agar missing config tidak memecahkan import dan secret tidak dibaca terlalu awal. [Driver constructor](https://raw.githubusercontent.com/tidbcloud/serverless-js/93376e800ed18902da8b90f01a5981e7405e88b6/src/index.ts), [ORM construction](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/tidb-serverless/driver.ts).

Default stateless HTTP client dapat direuse dalam process setelah first use; jangan cache query results atau claim singleton menyelesaikan semua connection limits. Configuration cache lifetime harus jelas: credential rotation restart process; tests reset isolated modules. Jangan simpan raw URL pada globals, logs, client props atau error objects yang diserialisasi. Tidak membuat TCP pool untuk app HTTP runtime, tidak memakai persist/experimental transaction pada readiness, tidak menjalankan query saat module import/startup/build. Stateful transaction/session tidak dibagi antar request.

## P. Drizzle Config Proposal

| Field | Offline drizzle.config.ts | Online drizzle.dev.config.ts |
|---|---|---|
| dialect | mysql | Inherit mysql |
| schema | ./src/db/schema.ts | Inherit |
| out | ./drizzle | Inherit |
| breakpoints | true | Inherit; single-statement boundaries dipertahankan |
| driver | Omit; **tidb-serverless bukan Kit driver selector** | mysql2 autodetected setelah approved dev install |
| credentials | Omit; tidak membaca env | Validated URL parsed menjadi host/port/user/password/database + ssl object |
| env loading | None | Node CLI --env-file, bukan dotenv import |
| application imports | Pure schema path saja | Pure config parser + existing APP_ENV parser; tidak mengimport server client/Next route |

Dua configs menghindari coupling implicit argv/command detection dan memberi offline checks tanpa secret. Multiple config files didukung official CLI. Online credentials menggunakan supported **object branch** dengan `ssl: {rejectUnauthorized:true}`; jangan menambahkan ssl di samping URL dan menganggap stable union mempertahankannya. Port diambil dari validated URL; bila absent gunakan documented TiDB TCP port saat target ditetapkan. Certificate trust diverifikasi pada Dev; jangan mematikan verification untuk mengatasi error. [Config docs](https://orm.drizzle.team/docs/drizzle-config-file), [stable MySQL credential union](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-kit/src/cli/validations/mysql.ts), [MySQL2 SSL](https://sidorares.github.io/node-mysql2/docs/documentation/ssl).

Base config tidak mengetahui credentials. Online config adalah CLI-only dan boleh validate saat CLI load, karena invocation sudah explicit DB use. Next build/typegen tidak mengimport online config; future implementation harus membuktikan no-env quality tetap PASS.

## Q. Proposed npm DB Scripts

Berikut proposal, belum ditambahkan atau dijalankan. Online commands conditional pada mysql2 approval dan human-verified Dev target.

| Script | Command | Purpose | Credential Required | Environment Risk |
|---|---|---|---|---|
| db:generate | drizzle-kit generate --config=drizzle.config.ts | Generate reviewed SQL/meta dari schema | No | File mutation saja, no DB apply; sama artifacts dipromosikan |
| db:check | drizzle-kit check --config=drizzle.config.ts | Generated migration-history consistency | No | Bukan live schema/status check; baru berguna setelah artifacts ada |
| db:migrate | node --env-file=.env.migrations.local ./node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.dev.config.ts | Apply reviewed migrations dengan dedicated Dev migration role | Yes | DDL mutation; first apply approval wajib; guard rejects testing/production |
| db:studio, optional | node --env-file=.env.local ./node_modules/drizzle-kit/bin.cjs studio --config=drizzle.dev.config.ts --host=127.0.0.1 | Local Dev inspection | Yes | UI dapat mutate; Dev only, no public expose, no verbose SQL logging |

Bare bin pada npm script resolved dari installed package, tanpa npx fetching. No push/reset/seed/prod shortcut. Testing apply dilakukan melalui separate approved procedure/config pada fase terkait, bukan mengganti APP_ENV pada Dev script. Production tidak otomatis lewat script ini/install/build/CI/server. Default health/build tidak menjalankan DB scripts.

Syntax/current meanings: [generate](https://orm.drizzle.team/docs/drizzle-kit-generate), [check](https://orm.drizzle.team/docs/drizzle-kit-check), [migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate), [studio](https://orm.drizzle.team/docs/drizzle-kit-studio). Studio default loopback juga didokumentasikan; proposal menegaskannya, tidak membuat hosted studio.

## R. Migration Policy

1. Generate offline setelah schema decision; review SQL, column mappings, TiDB compatibility, diff dan history. Generation bukan application.
2. Track generated SQL **dan** snapshots/meta/_journal.json. Stable 0.x migration reader memakai ordered journal entries, named SQL files dan statement breakpoints; jangan menyalin v1 RC folder conventions. Naming awal semantic misalnya init_depots; sequence/prefix dari installed stable generator dipertahankan.
3. Manusia approves target dan first Dev DDL. Apply Dev; verify table definitions dan migration ledger; repeat migrate seharusnya no pending apply. Repeat ini DB operation yang tetap memerlukan authorized live task.
4. Promote exact reviewed artifacts ke Testing setelah Dev evidence; separate target/privileges. Production hanya explicit human approval/window, compatibility/backup-or-export/mitigation review dan post-apply smoke.
5. Jangan edit/delete/reorder applied migrations atau manually forge ledger. New forward migration memperbaiki perubahan. One migration operator; no concurrent branch apply tanpa coordination.
6. `drizzle-kit push` **DISALLOWED PROJECT-WIDE** sebagai proposed policy: direct mutation melewati reviewed SQL history. Experimental schema work tetap generate/review/apply di disposable approved target.
7. Destructive drop/truncate/reset atau narrowing/renaming column memerlukan explicit target/data-loss approval. Tidak menyediakan reset command di 0C. Dev reset future hanya human-approved disposable target; Testing coordinated; Production no reset.
8. TiDB DDL auto-commits dan tidak bisa di-rollback seperti DML transaction. Partial migration failure mungkin meninggalkan DDL sebelum ledger recorded; stop, inspect actual state, buat reviewed remediation. Jangan blindly rerun/drop, dan jangan menjanjikan atomic migration dari ORM transaction wrapper.

Sumber: [migration reader 0.45.3](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/migrator.ts), [TiDB transactions](https://docs.pingcap.com/tidb/stable/transaction-overview/), [push](https://orm.drizzle.team/docs/drizzle-kit-push).

Tracking default `__drizzle_migrations` berada pada selected MySQL database. Table name configurable; MySQL dialect tidak memakai Postgres-style migrationsSchema. Stable dialect menyimpan hash + created_at, memilih pending berdasarkan latest recorded timestamp versus journal time; ini bukan full applied-file tamper detector. SQL/history review dan immutable applied files tetap perlu. [Pinned MySQL dialect](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/mysql-core/dialect.ts).

Mitigation: additive expand/contract, compatible code rollout, retained prior application deployment, and reviewed forward fix. App rollback sendiri tidak mengembalikan schema/data. Destructive production work memerlukan restorable export/backup plan yang availability-nya dicek pada actual plan, tanpa mengarang free restore guarantee.

## S. Minimum Schema Decision

| Option | Benefits | Risk/coupling/migration cost/phase fit |
|---|---|---|
| A. No domain schema | Smallest connection/readiness foundation, no coordinate choice | Generate/apply meaningful app migration belum terbukti; throwaway learning table menambah future removal |
| B. depots only | Concrete first migration, aligns Phase 1 first entity, no FK dependency | Coordinate/type contract perlu approval; small meaningful surface, no CRUD |
| C. depots + scenarios + orders | Prepares several CRUD entities | More FK/lifecycle/field decisions sebelum feature evidence, larger migration churn |
| D. Full conceptual research schema | Broad target coverage | Premature immutable snapshot/matrix/experiment design, OPEN research details, largest coupling/testing cost |

**RECOMMEND B: depots only.** Satu reusable operational table memberi useful migration evidence tanpa learning-table cleanup atau seluruh conceptual graph. C/D ditunda. Tidak membuat routes/pages/queries CRUD, initial depot row, seeds atau domain validation flows pada 0C.

Docs/17 learning-table example bukan requirement yang mengalahkan current task minimum-schema decision. Human acceptance harus memilih B dan resolve coordinate representation sebelum coding; recommendation ini tidak mengunci arbitrary precision.

## T. Proposed Initial Schema Contract

Conceptual checklist untuk **depots** saja, belum SQL/Drizzle code:

| Field/constraint | Proposal |
|---|---|
| id | BIGINT AUTO_INCREMENT primary key; no gap-free/sequential display assumption |
| name | Required VARCHAR; nonempty operational name, candidate max 255 characters, confirm before migration |
| address | Nullable TEXT |
| latitude / longitude | Required coordinate columns; candidate DOUBLE, DECIMAL precision/scale alternative requires explicit decision |
| is_active | Required boolean, candidate default true; accepted DB values 0/1 |
| created_at / updated_at | Required UTC-convention DATETIME(3); explicit application UTC values when future mutation occurs |
| Coordinates | Finite/ranges [-90,90] and [-180,180]; DB CHECK design reviewed for actual TiDB support and future Zod boundary; no arbitrary rounding/snapping |
| Indexes/FKs | Primary key only initially; no foreign keys, no invented unique name/global single-row rule |

Satu depot pada optimizer input tidak berarti database hanya boleh mempunyai satu historical depot row. Pemilihan satu active depot per operation diputuskan pada Phase 1, tidak ditambahkan sebagai unapproved global unique constraint. No operational rows inserted during foundation verification.

## U. ID / Timestamp / Coordinate / FK Decisions

**ID:** Pertahankan conceptual BIGINT AUTO_INCREMENT. Drizzle MySQL mode bigint di server, bukan number; driver BIGINT/lastInsertId strings memerlukan careful mapping. Future JSON/URL DTO ID = decimal string, `JSON.stringify(bigint)` langsung dilarang. Test values > Number.MAX_SAFE_INTEGER dan round-trip di future CRUD; jangan memakai `$returningId` arithmetic tanpa adapter-specific verification. [Stable bigint mapping](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/mysql-core/columns/bigint.ts), [driver result types](https://raw.githubusercontent.com/tidbcloud/serverless-js/93376e800ed18902da8b90f01a5981e7405e88b6/src/index.ts).

**Timestamps:** TiDB TIMESTAMP melakukan timezone conversion dan mempunyai batas 2038; DATETIME tidak melakukan conversion itu. Recommend DATETIME(3) UTC-by-convention, Drizzle mode date, explicit UTC application values. Jangan mengandalkan local session CURRENT_TIMESTAMP untuk UTC atau `$onUpdate` sebagai DB-wide trigger. No implicit DB defaults/on-update pada initial proposal; future writes set created/updated values, unknown writers harus mengikuti convention. Jika DB-generated defaults dipilih, actual session timezone dan DEFAULT/ON UPDATE expression harus diverifikasi lebih dulu. [TiDB dates](https://docs.pingcap.com/tidb/stable/data-type-date-and-time/), [stable datetime mapping](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/mysql-core/columns/datetime.ts).

**Boolean/coordinates:** TiDB BOOLEAN aliases TINYINT(1); Drizzle boolean provides TS mapping, tetapi DB numeric type bukan strict 0/1 validation sendiri. DOUBLE approximate IEEE representation cocok candidate latitude/longitude JS; DECIMAL exact storage biasanya string dan needs explicit scale/rounding rules. Human coordinate decision masih OPEN; jangan memakai arbitrary DECIMAL(10,6) atau rounding before formal snapshot hash. Raw geographic values bukan Cartesian kilometer. [TiDB numeric types](https://docs.pingcap.com/tidb/stable/data-type-numeric/).

**FK:** Official stable TiDB reference menyebut FK supported sejak 6.6 dan GA sejak 8.5. Older-version experimental wording bukan current blanket limitation. Type/size/collation/index compatibility, REFERENCES privilege, partition/virtual-column limitations dan migration ordering tetap perlu diuji. Initial depots tidak memiliki FK. Future operational graph sebaiknya memakai enforceable DB FKs setelah actual cloud version/support verified; RESTRICT/NO ACTION default lebih aman untuk history. CASCADE tidak boleh menghapus benchmark snapshots/experiments saat live order/depot dihapus. No blanket MySQL parity assumption atau foreign_key_checks=0 shortcut. [Current FK reference](https://docs.pingcap.com/tidb/stable/foreign-key/).

**Serialization:** future DTOs explicitly map IDs/DECIMAL to strings, dates to UTC ISO strings; coordinates ke finite numbers hanya setelah approved conversion. Jangan mengirim driver FullResult, SQL/metadata atau inferred DB object langsung ke client. Serializer/domain mutation validators belum dibuat pada 0C.

## V. Database Testing Strategy

| Layer | Minimum meaningful future evidence |
|---|---|
| Unit config | Valid mysql config, missing/malformed/database-less/padded inputs, encoding/port cases, fixed redacted error, purity/import safety |
| Unit client | No driver creation/fetch on import; missing URL rejected only getDb; fake fetch verifies correct query transport path and abort signal; no cached dead signal |
| Schema construction | Pure import and reviewed generated SQL/type mapping; no artificial implementation-mirror tests per field |
| Unit readiness/route | Real readiness logic with fake transport: successful expected SELECT value, malformed result, network/config/abort/provider failure; exact 200/503 body and no-store; no disclosure |
| Existing contracts | Existing 48 tests retained; health remains app-only even DATABASE_URL absent |
| Build/boundary | All quality scripts without APP_ENV/DATABASE_URL/real env; server-only boundary reviewed through Next build/import graph, unit marker stub is not proof of Next enforcement |
| Live Dev | Opt-in human-authorized read-only SELECT and schema/history inspection after separately approved migration |
| Future write integration | Dedicated Testing instance/database/credential required; isolated fixtures, recorded cleanup, never Prod |

Ordinary npm test/coverage tidak membaca developer .env.local, tidak melakukan network, migrate/create/drop table atau seed. Existing Vitest cukup; server tests memakai Node environment dan scoped env restoration. Marker alias only test config, no broader mocking that makes real logic meaningless.

Dev-only live verification cukup untuk limited 0C acceptance, bukan proof Testing isolation/full DB DoD. Future integration migrations dilakukan controlled setup sekali, bukan setiap test atau parallel worker. DML rollback hanya boleh dipakai setelah actual driver transaction behavior verified; tidak memakai experimental HTTP transaction sebagai promised cleanup, dan DDL rollback tidak supported. Feature write fixtures memakai owned IDs/data cleanup pada approved Testing target; no global truncation/reset.

## W. Live Dev Verification Contract

**NO LIVE CHECK EXECUTED NOW.** Setelah approved provisioning/credential handling dan SQL review/apply, bounded future Dev verification:

1. Human confirms named Dev instance/database, spending 0, approved SQL user/grants; operator checks selected config tanpa menampilkan raw URL.
2. Invoke actual application HTTP driver/Drizzle dengan one `SELECT 1 AS ok`, deadline; expected ok value 1. CLI TCP success sendiri tidak membuktikan application HTTP path.
3. Read-only selected database/migration metadata dan `SHOW CREATE TABLE depots` dalam private verification context. Compare expected SQL/meta and `__drizzle_migrations`; jangan publish host/user/database identifiers sebagai public readiness payload.
4. Confirm expected history and no pending reviewed artifacts. `db:check` sendiri bukan live migration status; migration reapply/no-op merupakan separate authorized operation.
5. Run dev server via existing npm run dev, `GET /api/health` dan `/api/ready` on localhost; confirm exact body/cache/failure behavior. Missing/wrong config tests memakai fixtures/fake failures, bukan deliberately damaging cloud resource.
6. Record runtime/driver/package versions, source SHA, selected logical environment, safe success/failure evidence dan human checkpoint. No rows inserted, no production query.

Provisioning **tidak diperlukan sebelum pure offline coding/unit/build**. Dev resource/credential diperlukan sebelum claim LIVE DEV DB VERIFIED. Tidak meminta credential dikirim ke chat.

## X. Health vs Readiness Decision

| Option | Evaluation |
|---|---|
| A. Extend /api/health with DB | Mengubah accepted app-only contract; outages/network cost ikut health, tests dan no-DB behavior berubah |
| B. Existing /api/health + /api/ready | Memisahkan app config/liveness dan explicit DB connectivity evidence; satu kecil route/service tambahan |
| C. Private CLI-only check | Berguna untuk initial verification, tetapi tidak memberi runtime request probe ketika DB app berjalan |

**RECOMMEND B.** Health tetap exact Phase 0B behavior; readiness request hanya pada kebutuhan smoke/operator, tanpa polling monitor otomatis. Terminologi Kubernetes bukan requirement. Vercel integration/probe consumption tetap 0D; no claim Vercel automatically uses this endpoint.

## Y. Proposed DB Readiness Contract

| Property | Proposal |
|---|---|
| Path / method | /api/ready; export async GET, default Node runtime |
| Success | HTTP 200, exact {"status":"ok"} |
| Expected unavailable/config/timeout/invalid result | HTTP 503, exact {"status":"error"} |
| Headers | application/json; Cache-Control:no-store pada success/failure |
| Operation | One awaited static parameter-free `SELECT 1 AS ok` through Drizzle/TiDB HTTP; verify actual returned row/value |
| Deadline | Candidate 5,000 ms per HTTP operation, including response body; engineering proposal, bukan vendor/scientific threshold |
| Retries | None for probe; fail generic, next explicit request may recheck |
| Error policy | Safe categories only, no raw driver/Zod error/SQL/stack/credential/URL/host/user/database/region metadata |
| Other probes | No OSRM/filesystem/auth/CRUD/schema mutation; migration readiness checked separately |

Pinned driver Config mendukung injected fetch, tetapi tidak mendeklarasikan timeout field. Proposed custom fetch memakai native AbortSignal.timeout per invocation; signal tetap mengikat body consumption. Jangan cache satu timeout signal pada singleton atau hanya Promise.race lalu membiarkan network berjalan. Driver postQuery awaits fetch + response.json; implementation harus test both header/body stall behavior. [Config API](https://raw.githubusercontent.com/tidbcloud/serverless-js/93376e800ed18902da8b90f01a5981e7405e88b6/src/config.ts), [HTTP implementation](https://raw.githubusercontent.com/tidbcloud/serverless-js/93376e800ed18902da8b90f01a5981e7405e88b6/src/serverless.ts).

Readiness uses getter whose fetch creates fresh deadline for each query. Lightweight configurable test boundary cukup, no generic resilience framework/circuit breaker. 5-second value perlu accepted operational policy; actual slow provider could report unavailable, not successful fallback. Abort proves bounded client wait, bukan guarantee server query cancellation. One trivial SELECT limits residual server work.

Expected config/transport/provider/result failures become 503. Unexpected programming errors must not be swallowed as success; framework-safe handling still emits no raw response. Internal optional log enum seperti DB_CONFIG_INVALID/DB_TIMEOUT/DB_UNAVAILABLE only; driver debug/logger disabled, no error object dumps/observability SDK. Endpoint success proves connectivity at that moment, bukan schema completeness, permissions for CRUD atau production readiness.

## Z. Environment Isolation Strategy

0C: least-privilege separate Dev runtime/migration credential, ignored `.env.local` dan `.env.migrations.local` dengan role-specific access, guarded Dev CLI, approved resource inventory, no Prod credentials for unit/build/local tests. Jangan swap DDL password ke runtime file; jangan menjalankan migration dari shell yang mewarisi application DATABASE_URL. Explicit database allowlist adds protection but tidak membuktikan remote host belongs to correct environment. Environment marker table tidak dibuat hanya untuk menghindari proper credential segregation.

0D: Production scope only Prod URL, Preview/testing only Testing URL, feature Preview never Prod. Verify branch-specific overrides, actual scopes and grants privately; deployment integration tests menggunakan Testing. Record host/resource identity in access-controlled human inventory, bukan brittle substring inference di code atau public response. APP_ENV=development dengan Prod URL tetap mungkin bila operator salah konfigurasi; enum parser bukan isolation proof.

Combined controls: independent instances + scoped credentials/grants + explicit config target checks + human ownership inventory + deployed isolation verification. Code cannot reliably recognize every Prod host solely from arbitrary URL names. Do not cache/build-inline DATABASE_URL in next.config/env/NEXT_PUBLIC fields. Production credential must never enter local development env or automated test runner.

## AA. Production Guardrails

- No production DB access/provisioning/migration pada audit atau ordinary 0C Dev task.
- Runtime credential tidak memiliki DDL/reset rights; dedicated migration operator credential hanya pada approved apply window. Dev online scripts reject testing/production values.
- No migrations during npm install/ci, Next build/start, route invocation, automated quality tests atau automatic Vercel Git deployment.
- Production apply membutuhkan named resource, reviewed artifact revision/hash, expected state, backup/export or approved mitigation, owner/window, post-apply smoke dan separate authorization.
- No implicit prod schema push/reset, force migration, raw credential logs atau shared universal password. Suspected wrong target → stop DB operation, correct scopes/rotate as needed under human control, record safe incident evidence.
- rollback plan includes application compatibility and forward SQL remediation; app deploy rollback tidak sama dengan DDL rollback.

## AB. Team Credential Workflow

Human owner invites team through appropriate TiDB console roles; cloud console access berbeda dengan SQL credential grants. Least privilege dan per-environment users/passwords, ideally individual Dev access; Production limited to owner/operator. Specific console account capabilities belum diperiksa.

Use team password manager or approved secure sharing, copy Dev credential locally without terminal echo/history. No plaintext WhatsApp/channel/Git/screenshot distribution. Template stays blank. Credential rotation and member offboarding owned by human; restart processes holding cached client after rotation.

Proposed local workflow after approved implementation:

1. Clone/pull accepted code on allowed branch; Node 24.19+ and `npm ci` using committed lock.
2. Human copies `.env.example` → ignored `.env.local` (`Copy-Item .env.example .env.local` on PowerShell; equivalent copy on Git Bash).
3. Set APP_ENV=development and **Dev-only** URL through private editor/password manager; verify no inherited conflicting config without printing values.
4. `npm run db:check`; reviewed existing migrations only. Dedicated migration operator, setelah target/DDL approval, copies safe template privately ke ignored `.env.migrations.local` dan sets Dev-only migration-role URL; first `npm run db:migrate` memakai file ini. Team member biasa tidak perlu migration password/DDL grants. Do not regenerate migrations as every developer onboarding step.
5. `npm run dev`, local health/ready smoke; ordinary unit/build still works without DB credentials. Share safe logical results, no raw CLI outputs containing connection details.

Studio optional local Dev convenience; same mutation responsibility as SQL editor. No public tunnel, 0.0.0.0 bind or production config. No reset script proposed; destructive future process always target-specific human approval.

## AC. Phase 0C Proposed Implementation Files

**NEW conditional on approved design:** files in N; generated drizzle SQL/snapshots/journal only after schema approval; one implementation report under phase-0/0c. `drizzle.dev.config.ts` is small CLI-specific extension, not separate DB architecture. No generic wrapper script required.

**MODIFY later:** package.json/package-lock.json for approved exact packages/scripts; .env.example for safe blank DB field; vitest.config.ts only if test-only server-only alias needed. Existing APP_ENV parser/health route/tests retain contract; do not refactor them to require DB.

**Documentation sync later:** README, docs/04 if extra accepted, docs/07/08/09/10/14/16/17/18/19/23 as justified by final behavior and phased resource status; regenerate MASTER_GUIDE and MANIFEST with existing scope/order/parity. Historical 0A/0B reports and skills-lock remain unchanged. No standalone specs/plans, broad module scaffolding, UI/CRUD/auth/CI/Vercel source or research tables.

Audit itself adds **only this report**, none of those proposed files.

## AD. Phase 0C Implementation Sequence

Detailed proposal, **not executed**:

1. Human approves recommended migration path/tooling extra, bounded depots field/coordinate contract, readiness deadline and resource timing. Record ADR exception; establish future task scope before coding.
2. Repeat branch/status/base/unknown-change gates; read accepted task/AGENTS/research contracts, inspect actual scripts. Preserve human files, no protected-branch edits/Git mutation without explicit task.
3. Recheck selected stable metadata/engines; add only accepted runtime/dev packages and exact lock resolutions. Review npm delta/licenses/transitives/audit; do not apply audit-fix blanket changes.
4. Write meaningful config tests first, then pure Zod DB parser; retain APP_ENV behavior. Verify safe errors/imports without env and malformed/encoded URL cases.
5. Write lazy-client/import/fake-network/deadline tests, then server-only getDb using existing driver/ORM API. Unit alias only if needed; enforce app/client/domain import boundaries.
6. Define only accepted depots schema, no connection/env imports. Generate offline initial SQL/meta after field contract approval; review IDs, coords, UTC, boolean and absence of FK/domain expansion.
7. Add offline base and guarded online Dev config/scripts; verify generate/check without URL, Node explicit loader with separate runtime/migration credential files, supported credentials object/TLS, no prod shortcuts. Generation alone does not apply SQL.
8. Write readiness/GET contract tests first; implement bounded SELECT and safe JSON/error behavior; keep health app-only, test real logic with transport failures and body stall.
9. Run npm ci/lint/typecheck/test/coverage/build with custom env absent and no real env file. Fresh runtime audit, boundary/secret/diff checks; do not weaken quality config to pass.
10. Human provisioning checkpoint: verify free slots, region/spending, create Dev named resource/database/users, privately store approved Dev access. Offline steps do not depend on this checkpoint.
11. Human first-migration checkpoint: approve exact reviewed SQL/artifacts/target, apply only Dev, inspect history/schema and mitigate partial failure if any. No automatic Prod/Test operation.
12. Perform separately authorized live Dev HTTP driver SELECT and localhost health/ready; retain safe evidence. Separate app connectivity from SQL schema/history and future feature-write verification.
13. Sync only final actual behavior/status in justified docs, preserve 0A/0B historical reports; regenerate derived pack with source parity and actual hashes. Resource Test/Prod statuses recorded explicitly, Gate 1 remains OPEN.
14. Independent verification and human checkpoint, actual full quality/security/scope evidence; controlled Testing/Production provisioning/migration/deploy proceeds via later explicit tasks. No Phase 1 CRUD before overall gate accepted.

If any baseline/secret/runtime blocker appears, stop and report; do not silently broaden task. Implementation review must revisit compatibility after actual installation, rather than treating this proposal as proof candidate graph passed tests.

## AE. Human Approval Gates

| Gate | Exact decision / pause point |
|---|---|
| Before implementation | Stable CLI + mysql2 dev exception vs separately verified HTTP runner; approve selected versions/depots fields including DOUBLE vs DECIMAL and readiness policy |
| Resource timing | Approve B Dev-first or A all-three now; no shared-instance fallback without ADR |
| Before cloud creation | Organization/free slots, region, named Dev resource, zero spending and owner confirmed |
| Before storing credentials | Human creates/saves scoped access privately; no real secret committed or sent in chat |
| Before first migration | SQL/meta revision, Dev target and grants reviewed; human explicitly permits apply |
| Before Testing/Production | Separate resource/timing/credential approvals; Dev approval does not extend to them |
| Before destructive operation | Named target, data loss, export/restore/mitigation and separate authorization |
| Before production apply/deployment | Explicit window/owner/compatibility/rollback plan and safe smoke acceptance, Phase 0D task |

These gates come from active audit task sections 18/30/56/66 and project change discipline. They are not new permission requests for read-only research or report creation. No pending authorization was assumed from elapsed time.

## AF. Baseline Quality

Fresh suite 2026-10-04 06:18–06:20 WIB, before implementation; actual scripts inspected first. Child runner explicitly removed APP_ENV/DATABASE_URL/NEXT_PUBLIC_APP_NAME; no real env files. All commands through RTK proxy on Node 24.19.0/npm 11.6.0.

| Command | Exit | Actual result |
|---|---:|---|
| npm ci | 0 | PASS; 707 packages added, 708 audited; current committed lock only |
| npm run lint | 0 | PASS; no errors/warnings reported |
| npm run typecheck | 0 | PASS; next typegen then tsc --noEmit |
| npm run test | 0 | PASS; 4 files / 48 tests |
| npm run test:coverage | 0 | PASS; same 4/48 + V8 report; no threshold |
| npm run build | 0 | PASS; Next 16.3.6, 16 static pages, dynamic /api/health |
| npm audit --omit=dev --json | 0 | PASS; vulnerabilities empty, all severity counts 0 |

Coverage: statements 4.95% (22/444), branches 3.68% (13/353), functions 6% (9/150), lines 5.36% (22/410). Env/health each 100% on fresh coverage summary. Overall coverage remains low; current no-threshold contract applies. Known Vite future native-config-loader warning on test/coverage remains non-blocking, no suppression/fix.

TEMP ledger courier-phase0c-audit-quality-20261004.json; raw courier-phase0c-audit-{ci,lint,typecheck,test,coverage,build,audit-runtime}-20261004.log. Baseline PASS concerns existing stack only; DB candidates were not installed or executed. Mandatory `npm ci` reinstalls existing lock dependencies; **NO NEW DB DEPENDENCY INSTALL** is the exact no-install scope claim.

## AG. Security / Secret Baseline

Runtime audit new: info/low/moderate/high/critical/total all 0, no JSON error. Full npm ci summary still 15 findings (1 low, 2 moderate, 12 high), consistent with known dev baseline; dedicated full advisory re-triage/remediation not performed. Runtime zero does not clear future Kit/mysql2 or entire dev tooling graph.

Read-only obvious-secret scan over 187 original tracked files (text inspected, binaries skipped) produced **0 candidates** for credential URLs, recognizable service tokens, private keys and assigned secrets. It did not print secret values. This bounded pattern scan is not universal secret-detection proof; no suspected real-secret blocker found. New report uses blank/fixed conceptual examples and public sources only.

Ignore/tracking review: root .env variants absent; .env/.env.local/.env.production match ignore rules, tracked .env.example exception retained. No credential acquisition, cloud-account inspection, SQL query, audit-fix, provider API mutation or production access.

## AH. Risks / Open Decisions

- **Blocking human decisions:** tooling mysql2 exception/migration path; phased Test/Prod timing; accepted depots field/coordinate contract. These make verdict HUMAN DECISION REQUIRED rather than READY.
- **Future operational acceptance:** 5-second deadline, region/free slots/TLS trust/user privileges and Dev target inventory must be accepted/verified before live operations. Public docs cannot prove account configuration.
- Stable tutorial/RC drift: generic TiDB tutorial alone does not prove stable Kit HTTP CLI support. Candidate APIs assessed from pinned source, actual combined installation remains future work.
- HTTP driver public preview and experimental stateful transactions; keep foundation stateless and no transaction-cleanup assumption. DDL partial apply/ledger mismatch requires reviewed remediation.
- Future ACO params/study area/sampling/provenance decisions stay OPEN; schema foundation does not settle research precision/hash representation or scientific defaults.
- APP_ENV/database-name guards add checks, but actual instance/credential scope proof belongs human inventory + Phase 0D isolation verification.
- Existing dev advisories/low whole-source coverage/Vite warning remain recorded; no zero-risk/production-ready/security blanket claim.
- No live DB, deployed HTTP, migration, isolation or second-laptop evidence exists from this audit. Readiness connectivity success cannot close migration/schema/CRUD gates.

## AI. Recommended Phase 0C Acceptance Criteria

Separate acceptance groups for future task:

**CODE FOUNDATION COMPLETE**

- [ ] Approved exact runtime/dev dependencies/ADR only; candidate graph installed and fresh security/quality PASS.
- [ ] Pure DB parser, server-only lazy client and schema imports require no real env/network at import/typegen/build.
- [ ] Meaningful unit tests/transport deadlines/redaction; existing APP_ENV + app-only health contract retained.
- [ ] Only accepted depots schema, no CRUD/seed/research/CI/Vercel scope.

**LIVE DEV DB VERIFIED**

- [ ] Human-approved named Starter/database/grants, zero spending and safe credential handling.
- [ ] Application HTTP/Drizzle SELECT succeeds with bounded wait; safe evidence records versions/target logical environment.

**TEST/PROD RESOURCE STATUS**

- [ ] Explicit CREATED/VERIFIED or DEFERRED with owner/next gate; final three-instance ADR retained.
- [ ] Dedicated Testing required before write integration/Preview; Prod before controlled production rollout. Dev-only does not close full DB DoD or Gate 1.

**MIGRATION FOUNDATION VERIFIED**

- [ ] Offline generation/check, committed reviewed SQL/snapshots/journal, correct stable CLI syntax/TLS.
- [ ] Human-approved Dev apply; schema/history independently inspected; repeat apply no pending work under authorization.
- [ ] Destructive/partial-failure/forward-remediation and future promotion policies documented; no push/reset automation.

**READINESS VERIFIED**

- [ ] Local /api/ready exact 200/503 JSON/no-store, explicit awaited SELECT, deadline and generic failures.
- [ ] Health remains app-only; schema/migration status verified separately; no sensitive payload/log.

**DOCUMENTATION SYNC**

- [ ] Actual 0B CLOSED/PR #8 and bounded 0C evidence/status, remaining resources/0D/Gate 1 accurately labelled.
- [ ] Source/derived parity and actual manifest hashes, historical reports/human files preserved; independent verification and human review complete.

## AJ. Scope Verification

Intended and actual audit change: **docs/proses/phase-0/0c/PHASE_0C_BASELINE_AUDIT_REPORT.md only**. Directory 0c exists for this report; no 0d/phase placeholders/gitkeep/loose report. Final Git/hash evidence appended after report creation below.

No package/lock/env template/config/source/test/health/readiness/schema/migration/seed/reset code changes. No existing docs/MASTER/MANIFEST/historical-report edits, skill changes/install or additional project spec. Generated existing-lock install/build/type/coverage outputs remain ignored.

NO NEW DEPENDENCY INSTALL (mandatory existing-lock npm ci only). NO DB CREATION. NO DB QUERY. NO MIGRATION GENERATION/APPLY. NO CLOUD PROVISIONING. NO GIT ADD / COMMIT / PUSH / MERGE / REBASE / RESET / RESTORE / CLEAN / STASH / FORCE-PUSH. No account credentials accessed or printed.

Final post-creation verification, 2026-10-04:

| Check | Actual result |
|---|---|
| git status --short --untracked-files=all | Exit 0; tepat satu untracked path, laporan ini |
| git diff --stat | Exit 0; kosong karena laporan baru belum tracked |
| git diff --check | Exit 0; PASS; whitespace laporan baru juga diperiksa secara terpisah |
| git diff --cached --stat | Exit 0; kosong |
| git rev-parse HEAD / branch --show-current | Exit 0; HEAD 11985b6a3532b3773eebe63d330d84788bbf2be1, branch feature/foundation-database |
| Original byte/SHA-256 comparison | 187/187 identik; 0 modified, 0 missing |
| Original files + new report | 188 project files; generated/ignored dependency/build/coverage outputs excluded |
| skills-lock.json | SHA-256 tetap 7ed5449842773b3bc3fcd23822fa3daad5e94f077f186fe681dad6a1ff547000 |
| Structure/format | Tepat 37 headings A–AK berurutan, balanced fences, no BOM/trailing whitespace, final LF |
| Future process directories | Tidak membuat 0d/phase placeholders atau gitkeep |

TEMP preservation ledger: courier-phase0c-audit-start-20261004.json; pre-final checks courier-phase0c-audit-pre-final-20261004.json. Final checks diulang setelah correction credential-role proposal dan append evidence ini; final ledger courier-phase0c-audit-final-20261004.json. Source quality tidak diulang untuk perubahan report-only karena tidak ada source/config/dependency delta setelah suite PASS.

## AK. Final Recommendation

Human reviews this concrete proposal, then provides bounded implementation task accepting **stable Drizzle/TiDB/Zod + mysql2 dev-only tooling**, **depots-only fields/coordinate choice**, and **Dev-first resource timing with Testing/Prod gates**. Pure offline implementation can precede Dev provisioning; live Dev and migrations wait their explicit checkpoints.

Keep health stable, add separate safe readiness, use Node built-in CLI env loading and reviewed migration history. Do not claim full DB setup/Gate 1 complete from Dev connectivity alone. Phase 0A/0B remain CLOSED; audit verdict is HUMAN DECISION REQUIRED BEFORE IMPLEMENTATION.

## Official Sources Consulted

All access dates **2026-10-04 (Asia/Jakarta)**. Public official docs/registry plus pinned upstream source; no secondary tutorial used for a compatibility decision.

| Source title / URL | Decision supported |
|---|---|
| [npm registry drizzle-orm 0.45.3](https://registry.npmjs.org/drizzle-orm/0.45.3) | Stable version, optional peers, license/size |
| [npm registry drizzle-kit 0.31.11](https://registry.npmjs.org/drizzle-kit/0.31.11) | Stable CLI version, dependencies/bin/size/license |
| [npm registry TiDB driver 0.3.0](https://registry.npmjs.org/@tidbcloud/serverless/0.3.0) | Engines/license/size and gitHead |
| [npm registry Zod 4.6.5](https://registry.npmjs.org/zod/4.6.5) | Current stable candidate/license/size |
| [npm registry mysql2 3.24.5](https://registry.npmjs.org/mysql2/3.24.5) | Conditional extra dev candidate/engines/license/transitives |
| [Drizzle TiDB getting started](https://orm.drizzle.team/docs/get-started/tidb-new) | Native adapter/mysql-core and current tutorial RC distinction |
| [Stable Kit package](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-kit/package.json) | Monorepo tag maps to Kit 0.31.11 |
| [Stable Kit connections](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-kit/src/cli/connections.ts) | No TiDB HTTP CLI selector; mysql2/PlanetScale choices |
| [Stable Kit MySQL credential validation](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-kit/src/cli/validations/mysql.ts) | URL vs object credential branches, TLS options |
| [Stable ORM TiDB driver](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/tidb-serverless/driver.ts) | Stable initialization overloads/no network construction |
| [Stable ORM TiDB session](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/tidb-serverless/session.ts) | HTTP execute and transaction alternative |
| [Stable ORM TiDB migrator](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/tidb-serverless/migrator.ts) | Alternative official HTTP runner, not selected CLI |
| [Stable migration reader](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/migrator.ts) | Stable SQL/journal/breakpoint/hash layout |
| [Stable MySQL dialect](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/mysql-core/dialect.ts) | Ledger name/selection and MySQL schema distinction |
| [Stable bigint column](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/mysql-core/columns/bigint.ts) | bigint vs unsafe number mapping |
| [Stable datetime column](https://raw.githubusercontent.com/drizzle-team/drizzle-orm/0.45.3/drizzle-orm/src/mysql-core/columns/datetime.ts) | UTC date mapping and precision support |
| [Drizzle config](https://orm.drizzle.team/docs/drizzle-config-file) | dialect/schema/out/driver configuration |
| [Drizzle generate](https://orm.drizzle.team/docs/drizzle-kit-generate) | Generation and multiple config syntax |
| [Drizzle check](https://orm.drizzle.team/docs/drizzle-kit-check) | Generated-history validation, not live readiness |
| [Drizzle migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate) | Explicit apply/history workflow |
| [Drizzle push](https://orm.drizzle.team/docs/drizzle-kit-push) | Direct mutation rejected by proposed project policy |
| [Drizzle Studio](https://orm.drizzle.team/docs/drizzle-kit-studio) | Loopback usage and CLI host option |
| [Starter limitations](https://docs.pingcap.com/tidbcloud/serverless-limitations/) | First-five free quota/connections/exhaustion |
| [Create Starter](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/?plan=starter) | Current instance/project terminology, spend/region provisioning |
| [Starter FAQs](https://docs.pingcap.com/tidbcloud/serverless-faqs/) | Product naming/background usage context |
| [Starter scaling](https://docs.pingcap.com/tidbcloud/scale-tidb-cluster/) | Automatic scaling |
| [Official CLI regions](https://docs.pingcap.com/ai/ti-regions-security-and-limitations/) | Documented Starter region options, account availability still unverified |
| [TiDB serverless driver guide](https://docs.pingcap.com/developer/serverless-driver/) | Public-preview HTTP/API/type/limit/URL contract |
| [TiDB driver upstream README](https://github.com/tidbcloud/serverless-js) | Stateless/stateful distinction, experimental transactions |
| [Pinned driver constructor/types](https://raw.githubusercontent.com/tidbcloud/serverless-js/93376e800ed18902da8b90f01a5981e7405e88b6/src/index.ts) | Version-linked construction/query/ID behavior |
| [Pinned driver Config](https://raw.githubusercontent.com/tidbcloud/serverless-js/93376e800ed18902da8b90f01a5981e7405e88b6/src/config.ts) | Injected fetch, no timeout field |
| [Pinned HTTP implementation](https://raw.githubusercontent.com/tidbcloud/serverless-js/93376e800ed18902da8b90f01a5981e7405e88b6/src/serverless.ts) | fetch/body/error boundary |
| [TiDB numeric types](https://docs.pingcap.com/tidb/stable/data-type-numeric/) | BIGINT/BOOLEAN/DOUBLE/DECIMAL distinctions |
| [TiDB date/time types](https://docs.pingcap.com/tidb/stable/data-type-date-and-time/) | DATETIME/TIMESTAMP/default/timezone distinctions |
| [TiDB foreign keys, stable](https://docs.pingcap.com/tidb/stable/foreign-key/) | Current GA/support/restrictions and cascade behavior |
| [TiDB transactions](https://docs.pingcap.com/tidb/stable/transaction-overview/) | DDL auto-commit/no rollback |
| [Zod official docs](https://zod.dev/) | TypeScript strict/version and runtime validation role |
| [Next server/client boundary](https://nextjs.org/docs/app/getting-started/server-and-client-components) | Built-in server-only marker without extra install |
| [Node 24 env-file CLI](https://nodejs.org/download/release/latest-v24.x/docs/api/cli.html#--env-filefile) | Built-in loader, precedence, no --run propagation assumption |
| [MySQL2 SSL](https://sidorares.github.io/node-mysql2/docs/documentation/ssl) | TLS object and rejection verification |

One attempted generic TiDB regions-and-availability-zones URL was inaccessible; no region conclusion drawn from it. Accessible official CLI region table used instead. Raw GitHub paths initially failing in web tool were resolved through official API tree and fetched read-only at exact refs, HTTP 200; unavailable paths were not treated as missing features.
