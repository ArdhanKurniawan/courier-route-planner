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

Phase 0A Quality Foundation CLOSED dan merged ke `testing` melalui PR #7; [independent verification](proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md) tersedia. Phase 0B Environment + Health diimplementasikan lokal dan menunggu independent verification. Setelah clone/pull, gunakan lockfile yang tersedia:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

`typecheck` menjalankan `next typegen && tsc --noEmit`, sehingga tidak membutuhkan dev/build lebih dahulu. Test stack dev yang tersedia: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, dan `jsdom`. Current suite: 4 files / 48 tests untuk navigation/dashboard, APP_ENV parser dan app-only health; server tests memakai Node per file; `npm run test:watch` untuk development. Coverage hanya baseline informasi tanpa threshold; output tidak masuk Git.

Install dependency berikutnya hanya pada task phase terkait, setelah audit stack existing:

- Phase 0B — Environment + Health: strict APP_ENV validation, `.env.example` dan app-only health tersedia; tidak menambah dependency.
- Phase 0C — Database Foundation: TiDB Dev/Test/Prod, Drizzle ORM, `@tidbcloud/serverless`, migration tooling dan Zod sesuai task; belum diimplementasikan.
- Phase 0D — CI + Vercel Integration: GitHub Actions, main/Preview deployments dan env/DB isolation; belum diimplementasikan.
- Leaflet/map, OSRM, Playwright/E2E dan auth mengikuti phase implementasinya nanti.

Bagian F–Q di bawah adalah panduan pekerjaan lanjutan untuk phase terkait; provisioning/deployment dan Gate 1 masih OPEN.

Jika chart penelitian diperlukan nanti, jangan otomatis mempertahankan ApexCharts hanya karena datang dari template. Gunakan keputusan dependency yang sudah diaudit/di-ADR-kan.

## PHASE 0B — Local env + app-only health

Untuk local runtime, manusia menyalin root `.env.example` menjadi ignored `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Exact template:

```dotenv
APP_ENV=development
```

Set salah satu exact `development/testing/production`; missing/invalid, case variant dan padded value ditolak tanpa default/trim. Jangan commit `.env.local`. NEXT_PUBLIC_APP_NAME tidak diperlukan; DATABASE_URL ditunda ke Phase 0C.

`GET /api/health`: 200 `{"status":"ok"}` dengan APP_ENV valid, atau 503 `{"status":"error"}` untuk missing/invalid config. Keduanya JSON + Cache-Control:no-store; tidak ada env disclosure, DB atau network check. Import/typegen/build tetap PASS tanpa real env file atau inherited APP_ENV/DATABASE_URL. Unit tests memakai scoped vi.stubEnv, tanpa .env.local atau HTTP server. [Implementation report](proses/phase-0/0b/PHASE_0B_IMPLEMENTATION_REPORT.md).

## PHASE F — Create TiDB instances (future Phase 0C)

Di TiDB Cloud:

1. buat Organization;
2. create Starter instance:
   - `route-planner-dev`;
   - `route-planner-testing`;
   - `route-planner-production`;
3. pastikan spending/budget setting tetap pada konfigurasi zero-cost yang diinginkan;
4. generate connection password masing-masing;
5. jangan share screenshot credential.

Current docs saat baseline dibuat menyatakan first five Starter instances per org mendapat free monthly quota; **cek kembali UI/docs saat provisioning**.

## PHASE G — Database env (future Phase 0C)

Setelah task Phase 0C menyetujui DB connection, tambahkan DATABASE_URL TiDB Dev ke `.env.local` yang sudah memakai APP_ENV=development. DATABASE_URL bukan prerequisite Phase 0B dan tidak masuk current `.env.example`.

Pastikan `.gitignore` mencakup `.env*` kecuali `.env.example` sesuai kebijakan project.

Buat `.env.example` tanpa secret.

## PHASE H — Drizzle connection (future Phase 0C)

`src/db/index.ts` konsep:

```ts
import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const client = connect({ url });
export const db = drizzle(client);
```

Buat satu tabel learning/health terlebih dahulu sebelum schema project penuh.

## PHASE I — Health check

App-only `GET /api/health` sudah tersedia pada Phase 0B; contract 200/503 dan env workflow dijelaskan pada bagian Phase 0B di atas. Safe DB readiness check tetap future Phase 0C dan harus mengikuti task/contract tersendiri.

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
