# 17 — SETUP FROM ZERO: GitHub → Next.js → TiDB → Vercel

Dokumen ini ditulis untuk tim yang belum pernah memakai stack ini.

## PHASE A — Persiapan akun

Setiap anggota:

- GitHub account.

Minimal owner/project lead:

- Vercel account (login via GitHub disarankan);
- TiDB Cloud account;
- akses domain/DNS.

## PHASE B — Local prerequisites

Install:

- Git;
- Node.js 24.x;
- npm (bundled dengan Node);
- editor (VS Code dsb.).

Verify:

```bash
git --version
node -v
npm -v
```

Target Node:

```text
v24.x.x
```

## PHASE C — Create repository

Buat repository kosong di GitHub, misalnya:

```text
courier-route-planner
```

Jangan masukkan credential.

Clone:

```bash
git clone <repo-url>
cd courier-route-planner
```

## PHASE D — Adopt TailAdmin Next.js Free

Project **tidak** dimulai dari blank `create-next-app`. Baseline UI yang disepakati adalah TailAdmin Next.js Free.

Baca dulu:

```text
docs/30_UI_TEMPLATE_GUIDE.md
THIRD_PARTY_NOTICES.md
```

### Recommended beginner path — Download ZIP

1. buka repository resmi:

```text
https://github.com/TailAdmin/free-nextjs-admin-dashboard
```

2. pilih `Code → Download ZIP`;
3. extract ke folder sementara;
4. jalankan baseline upstream sebelum modifikasi:

```bash
npm install
npm run lint
npm run build
```

5. record source revision bila Git tersedia:

```bash
git ls-remote https://github.com/TailAdmin/free-nextjs-admin-dashboard.git HEAD
```

6. update `THIRD_PARTY_NOTICES.md` dengan adoption date + SHA;
7. copy source ke repository project;
8. jangan membawa `.git` upstream jika memakai clone;
9. pertahankan license/provenance yang diwajibkan.

### Lock Node major

Pastikan `package.json` project final memiliki:

```json
"engines": {
  "node": "24.x"
}
```

Kontrak Phase 0A sudah tersedia: `.nvmrc` berisi `24`. Gunakan patch Node 24 yang memenuhi engines dependency dalam lockfile; jsdom `30.1.1` membutuhkan Node `24.15.0` atau lebih baru pada major 24. Quality suite diverifikasi pada Node `24.19.0` dan npm `11.6.0`.

### Template cleanup tidak dilakukan sekaligus

Buat task/branch khusus. Hapus hanya demo yang tidak relevan dan dependency yang benar-benar sudah tidak dipakai.

Target sidebar mengikuti Route Planner, bukan e-commerce.

### License dependency guardrail

TailAdmin upstream snapshot dapat membawa `apexcharts` / `react-apexcharts`. Project tidak menganggapnya core dependency. Setelah chart/demo imports dibersihkan, targetkan removal dan verifikasi:

```bash
npm ls apexcharts react-apexcharts
```

Jangan uninstall sebelum imports/pages dependennya dibereskan.

Fallback ke blank `create-next-app` hanya jika template adoption gagal secara teknis dan tim membuat ADR baru.

## PHASE E — Bootstrap bertahap: Phase 0A–0D

Phase 0A CLOSED/PR #7 dan Phase 0B CLOSED/PR #8; [independent Phase 0B verification PASS](proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md). Phase 0C CLOSED/PR #9 merged ke testing pada `e1c36988e588e397af312a140677c3f71bd451d2`, [final independent verification PASS](proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md); Dev diprovision manusia, first migration applied dan live verification PASS. Phase 0D CI/required Quality Gate pada testing/main remote verified; testing behavioral proof VERIFIED, main behavior DEFERRED. Tooling 0D-3A merged/PR #14; 0D-3B Testing PROVISIONED, migration APPLIED ONCE, live verification PASS. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production NOT PROVISIONED; Vercel NOT CONNECTED; Phase 0D/Gate 1 OPEN. Setelah clone/pull, gunakan lockfile yang tersedia:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run db:check
npm run build
npm run typecheck
npm audit --omit=dev --json
npm audit --json
```

Sembilan command pertama required quality gates; full audit terakhir informational untuk valid advisory JSON. Tool/transport/invalid JSON failure tetap harus diinvestigasi, bukan diabaikan. Workflow menyediakan handling ini tanpa dependency tambahan. Tidak ada numeric coverage threshold atau DB/cloud secret untuk quality.

`typecheck` menjalankan `next typegen && tsc --noEmit`, sehingga tidak membutuhkan dev/build lebih dahulu. Vitest/RTL/jest-dom/jsdom/V8 tersedia. Historical Phase 0C suite: 9 files / 147 tests, termasuk 48 tests lama dan 99 DB/schema/readiness tests tanpa real network; server tests memakai Node per file. Coverage hanya informasi tanpa threshold; output tidak masuk Git. Build/tests tetap PASS tanpa APP_ENV/DATABASE_URL atau real env file.

Install dependency berikutnya hanya pada task phase terkait, setelah audit stack existing:

- Phase 0B — Environment + Health: strict APP_ENV validation, `.env.example` dan app-only health tersedia; tidak menambah dependency.
- Phase 0C Stage 1: Drizzle ORM `0.45.3`, TiDB HTTP driver `0.3.0`, Zod `4.6.5`; Drizzle Kit `0.31.11` + mysql2 `3.24.5` dev-only, pure parser/lazy client/depots/readiness dan offline migration tersedia. Dev live verified; Testing live verified pada 0D-3B; Production deferred.
- Phase 0D CI/enforcement — remote verified, testing behavioral proof VERIFIED; main behavior DEFERRED. Main/Preview deployment dan env/DB isolation tetap pending.
- Phase 0D-3A merged/PR #14 — Testing migration guard/config/manual script; 0D-3B independent Testing resource, dedicated roles/private env, approved one-time initial apply dan read-only live verification PASS.
- Leaflet/map, OSRM, Playwright/E2E dan auth mengikuti phase implementasinya nanti.

Bagian F–Q di bawah adalah panduan phase terkait; Dev provisioning/first apply dan final Phase 0C verification sudah selesai. Cloud deployment dan Gate 1 tetap pending/OPEN; remote CI dan testing enforcement sudah verified. Sebelum mengikuti panduan cloud lanjutan, gunakan [approved baseline/staging checkpoints](proses/phase-0/0d/PHASE_0D_BASELINE_AUDIT_REPORT.md#ad-proposed-phase-0d-staging-plan); stage 0D-1 tidak mengotorisasi cloud setup atau Git operations.

Jika chart penelitian diperlukan nanti, jangan otomatis mempertahankan ApexCharts hanya karena datang dari template. Gunakan keputusan dependency yang sudah diaudit/di-ADR-kan.

## PHASE 0B — Local env + app-only health

Untuk local runtime, manusia menyalin root `.env.example` menjadi ignored `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Exact template:

```dotenv
APP_ENV=development

# Set a Dev-only TiDB connection URL in .env.local.
# Never commit credentials. Migration credentials use .env.migrations.local.
DATABASE_URL=
```

Set salah satu exact `development/testing/production`; missing/invalid, case variant dan padded value ditolak tanpa default/trim. Jangan commit `.env.local`. NEXT_PUBLIC_APP_NAME tidak diperlukan; URL kosong tetap cukup untuk app-only health, tetapi readiness akan 503 sampai DB credential valid dan koneksi tersedia.

`GET /api/health`: 200 `{"status":"ok"}` dengan APP_ENV valid, atau 503 `{"status":"error"}` untuk missing/invalid config. Keduanya JSON + Cache-Control:no-store; tidak ada env disclosure, DB atau network check. Import/typegen/build tetap PASS tanpa real env file atau inherited APP_ENV/DATABASE_URL. Unit tests memakai scoped vi.stubEnv, tanpa .env.local atau HTTP server. [Implementation report](proses/phase-0/0b/PHASE_0B_IMPLEMENTATION_REPORT.md).

## PHASE F — TiDB Dev-first (Dev live verified)

Current Dev sudah diprovision dan initial migration applied sekali oleh manusia. Read-only verification 2026-10-04 PASS; [live report](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md). Langkah berikut adalah referensi onboarding resource baru yang diotorisasi terpisah; jangan ulang provisioning atau migration pada current Dev. Settings/account/quota tetap tanggung jawab review manusia:

1. buat Organization;
2. create independent Dev Starter resource `route-planner-dev` dan DB `courier_route_planner_dev`;
3. pastikan spending/budget setting tetap pada konfigurasi zero-cost yang diinginkan;
4. generate connection password masing-masing;
5. jangan share screenshot credential.

Testing kini PROVISIONED terpisah dari Dev pada 0D-3B (Starter, AWS Tokyo, spending limit 0); initial migration APPLIED ONCE dan live verification PASS. Production NOT PROVISIONED, deferred sebelum controlled rollout. Target tetap tiga independent Starter resources; tidak memakai shared fallback. Phase 0C CLOSED/final independent PASS; Vercel NOT CONNECTED dan Phase 0D/Gate 1 OPEN. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Panduan provisioning di atas bukan instruksi untuk membuat resource ulang.

Current docs saat baseline dibuat menyatakan first five Starter instances per org mendapat free monthly quota; **cek kembali UI/docs saat provisioning**.

## PHASE G — Private database env (human-managed)

Setelah provisioning/credential approval, manusia mengisi DATABASE_URL TiDB Dev server-only di ignored `.env.local` dengan APP_ENV=development. Template tracked sudah memuat URL kosong. Dedicated migration credential berada di ignored `.env.migrations.local`; kedua file dibuat manusia setelah Stage 1 offline, kini hadir dan ignored, tidak boleh dicetak/di-commit. Jangan memakai NEXT_PUBLIC_DATABASE_URL.

Pastikan `.gitignore` mencakup `.env*` kecuali `.env.example` sesuai kebijakan project.

Buat `.env.example` tanpa secret.

## PHASE H — Current lazy Drizzle foundation + offline migration

`src/config/db-env.ts` pure Zod parser dan Dev credential helper; `src/db/client.ts` lazy server-only `getDatabase()` memakai Drizzle → TiDB HTTP. Tidak ada import-time env validation/I/O atau mysql2 app import. `src/db/schema.ts` hanya depots sesuai [docs/08](08_DATABASE_DESIGN.md); learning/health table tidak ditambahkan.

Offline commands, tanpa credential:

```bash
npm run db:generate
npm run db:check
```

Generated SQL `drizzle/0000_dear_rictor.sql` + stable meta journal/snapshot sudah direview; **APPLIED ONCE ON DEV** oleh manusia dan **APPLIED ONCE ON TESTING** pada 0D-3B setelah approval eksplisit. Masing-masing live ledger berisi satu entry; Testing ledger cocok dengan actual reader raw-byte SQL hash dan timestamp journal, bukan LF-normalized reference. Live schema cocok. `db:check` hanya offline consistency. Jangan mengubah generated history sembarangan, atau menggunakan `drizzle-kit push`.

`db:migrate` memakai installed Kit bin via Node 24 `--env-file=.env.migrations.local`, guarded Dev config: APP_ENV exact development, DB exact courier_route_planner_dev, TLS certificate verification aktif. Inherited shell vars override file; mulai dari clean/verified shell tanpa mencetak credential. Initial apply sudah dilakukan manusia; jangan rerun untuk menguji idempotence. Setiap migration berikutnya memerlukan task dan approval manusia tersendiri. Tidak ada migration otomatis pada install/ci/build/start/dev/routes/Actions/Vercel.

### Testing migration tooling dan live foundation — Phase 0D-3A/3B

Testing migration tooling prepared locally: `getTestingMigrationCredentials`, `drizzle.testing.config.ts`, dan manual `npm run db:migrate:testing`. Exact APP_ENV=testing + parsed DB `courier_route_planner_testing`; TLS `rejectUnauthorized: true`, hardened parser/no fallback. Dev `db:migrate` dan guard tetap unchanged. Same sole initial migration history; tidak membuat migration kedua.

Tooling 0D-3A merged/PR #14. Testing PROVISIONED pada 0D-3B; manusia menyimpan `.env.testing.local` (application) dan `.env.migrations.testing.local` (migrator) secara privat dengan credential berbeda, tanpa paste values ke chat. Kedua file ignored. Node `--env-file` tidak mengalahkan inherited variables; live commands memakai clean child environment yang menghapus inherited APP_ENV/DATABASE_URL sebelum satu file yang dituju dimuat. Migration APPLIED ONCE; live verification PASS. Production NOT PROVISIONED; Vercel NOT CONNECTED; Phase 0D/Gate 1 OPEN.

Urutan 0D-3B yang sudah dijalankan: approval **YES PROVISION TESTING RESOURCE** → independent Testing resource/logical DB → scoped app/migrator roles → human private files → structural/read-only connectivity → empty tables/ledger + exact SQL/history review → approval **YES APPLY TESTING MIGRATION** → apply once → read-only ledger/schema/app read/health/readiness PASS. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Jangan mengulang initial apply untuk verifikasi. DB name sendiri tidak membuktikan resource identity; provider identity dan authenticated role fingerprints membuktikan Testing terpisah dari Dev serta kedua roles satu target. DDL failure pada apply berikutnya membutuhkan inspection ledger/information_schema/partial state dan separate remediation; no blind rerun. [Tooling report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md).

## PHASE I — Health check

App-only `GET /api/health` dari Phase 0B tetap unchanged. Separate `GET /api/ready` tersedia Stage 1: satu SELECT 1 connectivity probe, 5000 ms/no retry, 200 ok atau expected failure 503 error, exact minimal JSON + no-store. Unit behavior dan Dev live health/readiness terverifikasi; Testing live checks pada 0D-3B juga HTTP 200, exact status JSON + no-store memakai application credential. Final independent Phase 0C verification PASS dan Phase 0C CLOSED; Production deferred. CI hanya menjalankan offline tests/history/build, tanpa memanggil endpoint live. Lihat [runbook](16_OBSERVABILITY_RUNBOOK.md#separate-db-readiness--phase-0c-stage-1).

## PHASE J — First Git commit

Sebelum commit:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

Check:

```bash
git status
git diff --cached
```

Pastikan `.env.local` tidak ikut.

## PHASE K — Create branches and install safety guards

Setelah `main` ada:

```bash
git checkout -b testing
git push -u origin testing
```

Normal feature nanti dibuat dari `testing`.

**Sebelum tim mulai coding**, selesaikan branch safety setup pada:

```text
docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md
```

Minimum gate:

1. protect `main`;
2. protect `testing`;
3. require PR;
4. block force push/deletion;
5. install `.githooks/pre-commit`;
6. install `.githooks/pre-push`;
7. setiap clone menjalankan:

```bash
git config core.hooksPath .githooks
```

8. test bahwa commit/push langsung ke protected branch ditolak.

Jangan onboarding anggota berikutnya sebelum gate ini lulus.

## PHASE L — Vercel import

1. login Vercel via GitHub;
2. Add New → Project;
3. import repository;
4. framework harus terdeteksi Next.js;
5. set Node.js version 24.x;
6. jangan masukkan production DB ke Preview scope.

## PHASE M — Vercel environment variables

Production:

```text
DATABASE_URL = TiDB Production
APP_ENV = production
```

Preview:

```text
DATABASE_URL = TiDB Testing
APP_ENV = testing
```

Development Vercel scope tidak wajib untuk local bila memakai `.env.local`.

## PHASE N — First Production deployment

Deploy `main` skeleton.

Verify:

- page loads;
- health endpoint;
- no secret exposed;
- logs clean.

## PHASE O — Test Preview

Dari `testing`:

```bash
git checkout testing
```

buat perubahan kecil, push, lalu cek Vercel Preview.

Pastikan Preview DB adalah Testing, bukan Production.

Cara verifikasi aman: endpoint debug internal sementara hanya menampilkan `APP_ENV` dan DB logical label yang non-secret, kemudian hapus atau restrict endpoint tersebut.

## PHASE P — Custom domain

Production:

```text
route.domain-kalian.tld
```

Testing branch domain bila digunakan:

```text
testing-route.domain-kalian.tld
```

Ikuti DNS instruction Vercel. Jangan menebak record bila dashboard memberikan target spesifik.

## PHASE Q — CI

[`.github/workflows/quality.yml`](../.github/workflows/quality.yml) tersedia lokal: workflow **Quality**, job **quality / Quality Gate**, PR dan push ke testing/main, ubuntu-latest, Node 24, npm lockfile cache, timeout 10 menit, read-only contents. Approved concurrency membatalkan superseded PR run, bukan running push atau unrelated PR.

Sembilan required commands mengikuti PHASE E; full audit menjalankan parser valid-evidence agar advisories tetap visible/nonblocking dan tool/network failure gagal. Tidak ada secret, migration, deployment, DB network, coverage token/upload atau E2E command. Lihat [exact CI contract](12_CI_CD_RELEASE.md) dan [implementation evidence](proses/phase-0/0d/PHASE_0D_CI_IMPLEMENTATION_REPORT.md).

**REMOTE CI + TESTING BEHAVIOR VERIFIED.** Required Quality Gate/GitHub Actions app15368 dengan strict freshness aktif pada testing/main. Main behavior DEFERRED ke real testing → main promotion. [Evidence](proses/phase-0/0d/PHASE_0D_ENFORCEMENT_BEHAVIOR_PROOF_REPORT.md). Vercel Git Integration tetap target terpisah, belum dibuktikan.

## EXIT CRITERIA FOUNDATION

- [ ] local Next.js works;
- [ ] TiDB Dev works;
- [ ] production deploy works;
- [ ] Preview deploy works;
- [ ] Production uses Prod DB;
- [ ] Preview uses Testing DB;
- [ ] no secret in Git;
- [ ] CI basic works;
- [ ] branch model exists;
- [ ] team can reproduce setup on second laptop.

**Jangan masuk Depot CRUD sebelum gate ini lulus.**
