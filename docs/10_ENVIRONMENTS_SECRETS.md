# 10 — ENVIRONMENTS & SECRETS

## 1. Environment matrix

Target DB/deployment matrix untuk Phase 0C/0D; belum menjadi requirement atau provisioning Phase 0B.

Phase 0B CLOSED/PR #8, independent verification PASS. Phase 0C offline foundation + independent offline verification PASS; Dev diprovision manusia, initial migration applied sekali, application HTTP dan migrator TCP/TLS connectivity diverifikasi read-only. Final independent Phase 0C review pending; Gate 1 OPEN. **Dev-first**: Testing deferred sebelum integration/Preview Phase 0D, Production sebelum controlled rollout; target akhir ADR-008 tetap tiga independent resources, tanpa shared fallback.

| Environment | Code | DB | Tujuan |
|---|---|---|---|
| Local | developer branch | TiDB Dev | coding |
| Preview | feature/fix/testing | TiDB Testing | review/integration |
| Production | main | TiDB Production | demo/live |

## 2. Environment variables menurut phase

**Phase 0B current:** hanya `APP_ENV`, required ketika server membaca runtime config. Exact values: `development`, `testing`, `production`. Missing, empty, whitespace-only, case variant, padded value dan nilai lain ditolak. Tidak ada implicit default, trimming atau normalisasi.

`src/config/env.ts` menyediakan typed pure `parseAppEnv(rawValue)` dan safe `AppEnvValidationError`. Parser tidak membaca process.env. Route health membaca `process.env.APP_ENV` ketika GET dipanggil; tidak ada validation saat import/typegen/build. APP_ENV server-side dan tidak dikirim ke health payload/client.

**Phase 0C Stage 1:** `DATABASE_URL` server-only untuk DB connection. Pure Zod `parseDatabaseConfig(raw)` menerima input eksplisit, tanpa ambient env/default/trim, dan menghasilkan fixed safe DatabaseConfigError. Lazy getter baru membaca URL saat dipanggil; import/typegen/build tidak memerlukan DB env. Parser menerima mysql scheme, explicit user/password, hostname DNS/IPv4, optional valid port dan satu nama database (letters/digits/underscore/hyphen); query/fragment, kontrol, malformed encoding dan ambiguous authority/path ditolak. Secret tidak dicetak atau dikirim ke response.

**Auth phase future:** `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`.

`NEXT_PUBLIC_APP_NAME` optional secara konsep, tidak diperkenalkan atau diperlukan saat ini. `NODE_ENV` dikelola framework (`development/test/production`), terpisah dari APP_ENV; jangan memakai NODE_ENV=testing.

## 3. Rules

- `.env.local` never commit.
- `.env.migrations.local` never commit; dedicated Dev migration credential, tidak otomatis disalin dari application credential.
- `.env.example` commit, **tanpa nilai secret**.
- `DATABASE_URL` tidak pernah prefix `NEXT_PUBLIC_`.
- production credential hanya Production scope.
- Preview menggunakan testing DB credential.
- dev laptop menggunakan dev DB credential.

## 4. `.env.example` — Phase 0C Stage 1

Exact current template, dengan trailing newline:

```dotenv
APP_ENV=development

# Set a Dev-only TiDB connection URL in .env.local.
# Never commit credentials. Migration credentials use .env.migrations.local.
DATABASE_URL=
```

Manusia dapat menyalin template ini ke `.env.local` untuk local runtime. `.env` dan `.env.*` ignored, dengan exception `!.env.example`; `.env.local` tidak boleh di-commit. Tests memakai scoped env fixtures, bukan file secret; build/tests tidak memerlukan DB credential.

Stage 1 tidak membuat real env file atau credential. Explicit Dev apply memakai Node 24 `--env-file=.env.migrations.local`; inherited shell variables override file values. Operator wajib clean/verified shell tanpa mencetak secret. Guard membutuhkan APP_ENV exact development, DB exact `courier_route_planner_dev`, object credentials dengan TLS certificate verification aktif. Ini logical-name guard, bukan bukti resource identity; manusia tetap harus memverifikasi Dev resource sebelum apply. Tidak ada dotenv/env loader tambahan, atau migration otomatis pada aplikasi/CI/deployment.

GET /api/health memvalidasi APP_ENV: 200 `{"status":"ok"}` atau 503 `{"status":"error"}` untuk konfigurasi invalid/missing; JSON dan `Cache-Control: no-store`. Payload tidak memuat env, version, timestamp atau detail error. Lihat [runbook](16_OBSERVABILITY_RUNBOOK.md#4-health-endpoint).

`GET /api/ready` terpisah: SELECT 1 connectivity-only, 5000 ms/no retry, exact 200/503 status JSON + no-store. Unit behavior tersedia; live Dev health/readiness HTTP 200 exact status JSON + no-store terverifikasi 2026-10-04. [Read-only live evidence](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md). Dedicated application/migration role berbeda dan target Dev sama; task tidak mencoba write privilege atau mengubah grants. Missing/invalid DB URL → 503, tanpa mempengaruhi app-only health.

## 5. Secret rotation

Rotate jika:

- tercommit;
- muncul di screenshot/public chat;
- anggota tim keluar;
- device hilang;
- dicurigai bocor.

Setelah rotate:

1. update TiDB credential;
2. update Vercel env;
3. update local developer secrets;
4. redeploy;
5. revoke old credential;
6. document incident.

## 6. Prevent accidental production access

Phase 0B health memvalidasi APP_ENV pada invocation, bukan global startup. Nilai env dan raw validation input tidak diekspos dalam response. Deployment env scope/isolation masih Phase 0D; label APP_ENV sendiri tidak membuktikan DB isolation.

Tambahkan guard pada script destructive seed/reset:

```text
if APP_ENV === production → ABORT
```

Script reset database production harus tidak tersedia atau membutuhkan explicit double confirmation.

## 7. Preview DB collision

Semua feature Preview memakai TiDB Testing secara default. Untuk menghindari collision:

- gunakan test data dengan prefix/owner;
- jangan truncate global table dari preview;
- migration coordinated via testing branch;
- feature yang butuh incompatible schema harus ditunda merge atau memakai temporary TiDB instance bila quota memungkinkan.
