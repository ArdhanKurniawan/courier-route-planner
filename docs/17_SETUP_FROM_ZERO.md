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

Phase 0A CLOSED/PR #7 dan Phase 0B CLOSED/PR #8; [independent Phase 0B verification PASS](proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md). Phase 0C offline foundation dan independent offline verification PASS; Dev diprovision manusia, first migration applied dan live read-only verification PASS. Final independent Phase 0C review pending. Setelah clone/pull, gunakan lockfile yang tersedia:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run db:check
npm run build
```

`typecheck` menjalankan `next typegen && tsc --noEmit`, sehingga tidak membutuhkan dev/build lebih dahulu. Vitest/RTL/jest-dom/jsdom/V8 tersedia. Current suite: 9 files / 147 tests, termasuk 48 tests lama dan 99 DB/schema/readiness tests tanpa real network; server tests memakai Node per file. Coverage hanya informasi tanpa threshold; output tidak masuk Git. Build/tests tetap PASS tanpa APP_ENV/DATABASE_URL atau real env file.

Install dependency berikutnya hanya pada task phase terkait, setelah audit stack existing:

- Phase 0B — Environment + Health: strict APP_ENV validation, `.env.example` dan app-only health tersedia; tidak menambah dependency.
- Phase 0C Stage 1: Drizzle ORM `0.45.3`, TiDB HTTP driver `0.3.0`, Zod `4.6.5`; Drizzle Kit `0.31.11` + mysql2 `3.24.5` dev-only, pure parser/lazy client/depots/readiness dan offline migration tersedia. Dev live verified; Testing/Production deferred.
- Phase 0D — CI + Vercel Integration: GitHub Actions, main/Preview deployments dan env/DB isolation; belum diimplementasikan.
- Leaflet/map, OSRM, Playwright/E2E dan auth mengikuti phase implementasinya nanti.

Bagian F–Q di bawah adalah panduan pekerjaan lanjutan untuk phase terkait; Dev provisioning/first apply sudah dilakukan manusia; deployment, final independent Phase 0C review dan Gate 1 masih OPEN.

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

Testing resource deferred sebelum integration/Preview Phase 0D; Production sebelum controlled rollout. Target ADR-008 tetap tiga independent Starter resources; tidak memakai shared fallback. Offline Stage 1 tidak provisioning; current Dev kini live verified. Final independent Phase 0C review masih pending.

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

Generated SQL `drizzle/0000_dear_rictor.sql` + stable meta journal/snapshot sudah direview; **APPLIED ONCE ON DEV oleh manusia**. Live ledger berisi satu entry, hash SQL/timestamp journal dan live schema cocok. `db:check` hanya offline consistency. Jangan mengubah generated history sembarangan, atau menggunakan `drizzle-kit push`.

`db:migrate` memakai installed Kit bin via Node 24 `--env-file=.env.migrations.local`, guarded Dev config: APP_ENV exact development, DB exact courier_route_planner_dev, TLS certificate verification aktif. Inherited shell vars override file; mulai dari clean/verified shell tanpa mencetak credential. Initial apply sudah dilakukan manusia; jangan rerun untuk menguji idempotence. Setiap migration berikutnya memerlukan task dan approval manusia tersendiri. Tidak ada migration otomatis pada install/ci/build/start/dev/routes/Actions/Vercel.

## PHASE I — Health check

App-only `GET /api/health` dari Phase 0B tetap unchanged. Separate `GET /api/ready` tersedia Stage 1: satu SELECT 1 connectivity probe, 5000 ms/no retry, 200 ok atau expected failure 503 error, exact minimal JSON + no-store. Unit behavior dan Dev live health/readiness terverifikasi: HTTP 200, exact status JSON + no-store. Final independent Phase 0C review pending; Testing/Production deferred. Lihat [runbook](16_OBSERVABILITY_RUNBOOK.md#separate-db-readiness--phase-0c-stage-1).

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

Tambahkan GitHub Actions quality workflow setelah scripts lint/typecheck/test/build tersedia.

Jangan otomatis deploy dari Actions; Vercel sudah deploy via Git Integration.

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
