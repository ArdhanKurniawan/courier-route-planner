# 07 — TiDB GUIDE FOR A MYSQL-FAMILIAR TEAM

**Promotion evidence 2026-10-11:** [PR #20 closure](proses/phase-0/0d/PHASE_0D_MAIN_FOUNDATION_PROMOTION_REPORT.md); current-candidate PR Quality and post-merge main Quality PASS. Vercel NOT integrated; public Production/Preview NOT deployed; Phase 0D/Gate 1 OPEN.

## 1. Cara berpikir

TiDB adalah relational distributed SQL database yang kompatibel dengan banyak pola/protokol MySQL, tetapi **bukan MySQL 100% identik**.

Gunakan pengetahuan MySQL kalian untuk:

- schema relational;
- PK/FK concept;
- indexes;
- SELECT/INSERT/UPDATE/DELETE;
- JOIN;
- transactions.

Jangan berasumsi semua MySQL-specific feature tersedia.

## 2. Connection

Untuk app, baseline memakai:

```text
Next.js server
→ Drizzle ORM
→ @tidbcloud/serverless (HTTP)
→ TiDB Cloud Starter
```

Credential disimpan pada `DATABASE_URL` server-side.

Stage 1 lokal menyediakan pure Zod parser, lazy `src/db/client.ts` dengan `server-only`, schema `depots`, dan readiness. Import/typegen/build tidak membaca URL atau menjalankan query. Setiap HTTP operation mendapat fresh abort signal 5000 ms, termasuk pembacaan body; no retry, logger/debug nonaktif.

Stable Drizzle Kit CLI memakai `mysql2` sesuai [ADR-013](04_TECH_STACK_ADRS.md#adr-013--mysql2-as-drizzle-kit-migration-cli-dev-only-adapter). Runtime CRUD memakai adapter HTTP. [Addendum Phase 2B Part C](04_TECH_STACK_ADRS.md#addendum-phase-2b-part-c--koneksi-transaksi-khusus-dummy-generator) menambahkan pengecualian untuk preflight Preview sementara dan writer batch Dummy Generator.

### Preflight TCP Preview sementara Phase 2B Part C

1. Setelah owner menyetujui deploy, gunakan hanya branch `feature/gate-2-phase-2b-save-regenerate` dan Vercel Authentication. Pastikan system environment variables Vercel tersedia di runtime, termasuk project ID, deployment ID, dan metadata Git. Siapkan dua environment variable server-side khusus branch Preview sebelum build. Isi `TIDB_DIAGNOSTIC_APPROVAL` dengan JSON berisi `sha`, `projectId`, `host`, `port` (angka), `username`, dan `principal` (`CURRENT_USER()` lengkap). Ambil identitas Testing APPLICATION dari bukti owner, secara independen dari `DATABASE_URL` yang diuji. Siapkan `TIDB_DIAGNOSTIC_PERMIT_KEY` sebagai 32 byte acak dalam base64url. Simpan key dan nilai binding secara privat. Pertahankan guard aplikasi dan pastikan `AUTH_ORIGIN` khusus branch cocok dengan URL HTTPS yang akan dipakai untuk login dan request. Periksa bahwa URL tersebut menuju deployment yang dipilih.
2. Verifikasi project, commit, dan deployment ID pada Vercel setelah Preview `READY`. Buat permit secara lokal menggunakan HMAC-SHA256 dari key yang didekode base64url. Pesannya adalah hasil `JSON.stringify(["tidb-testing-diagnostic", projectId, sha, deploymentId, expires, host, port, username, principal])`. `expires` adalah Unix seconds dengan masa berlaku paling lama 900 detik. Nilai permit berbentuk `<expires>.<signature base64url>`. Gunakan permit secara privat dan jalankan sekali sebagai admin melalui `POST /api/diagnostics/tidb-testing` dari origin yang sama dengan header `x-tidb-diagnostic-permit`. Permit bisa dipakai kembali hingga kedaluwarsa dan hanya berlaku pada deployment serta binding yang ditandatangani.
3. Catat hanya status HTTP dan kategori hasil. HTTP 200 dengan `data.status = "ok"` membuktikan target yang cocok, TLS, pembacaan terverifikasi, dan penutupan socket. Untuk 503, berhenti pada kategori yang dilaporkan. Jangan membuka transaksi atau menjalankan mutasi. Pengecekan atomicity Testing memerlukan persetujuan terpisah.
4. Setelah probe, hapus kedua environment variable sementara dan hapus deployment diagnosis. Hapus route, modul, dan tes khusus probe sebelum PR Part C di-merge. Pertahankan mysql2 sebagai runtime dependency hanya jika writer yang telah direview mengimpornya. Verifikasi route hilang dari build, mengembalikan 404 pada Preview bersih, dan deployment diagnosis lama sudah tidak dapat diakses.

## 3. Environment design

Target tiga instance:

```text
route-planner-dev
route-planner-testing
route-planner-production
```

**Dev-first:** offline foundation dan independent offline verification PASS. Manusia telah membuat Dev dan menerapkan initial migration sekali. Verifikasi read-only 2026-10-04: application HTTP read/readiness, migrator TCP/TLS SELECT 1, ledger 1 entry dan live depots schema PASS. [Dev live report](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md). Phase 0C CLOSED/PR #9, final independent verification PASS. Pada 0D-3B (2026-10-10), independent Testing Starter `route-planner-testing` di AWS Tokyo diprovision dengan spending limit 0; migration APPLIED ONCE dan live verification PASS. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production LIVE pada independent Starter, migration exactly once dan schema/ledger verified; Vercel NOT integrated; public Production/Preview NOT deployed; historical Preview preflight NOT READY; main FOUNDATION PROMOTED (PR #20), main Quality Gate VERIFIED, main required-check behavioral proof CLOSED/VERIFIED; Phase 0D/Gate 1 OPEN. [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md). Target akhir tiga independent Starter resources tetap ADR-008, tanpa shared-instance fallback.

Alasan pemisahan:

- migration dev tidak merusak testing;
- testing tidak merusak production;
- preview tidak membaca data production;
- reset data dev/testing aman.

Current TiDB Starter free quota saat baseline dibuat mendukung hingga lima free instances per organization; **cek ulang sebelum provisioning**.

## 4. SQL design rule

Pilih portable MySQL-like subset.

Hindari dependency pada feature vendor-specific tanpa ADR.

## 5. ID strategy

Depot Stage 1 memakai BIGINT AUTO_INCREMENT primary key dan Drizzle `mode: bigint`. Future API/client boundary wajib decimal string, bukan arbitrary JS number conversion.

Untuk public IDs, jangan expose assumption bahwa sequential ID = authorization. Authorization tetap server-side.

## 6. Money/time/coordinate types

- koordinat depot: required DOUBLE latitude/longitude, tanpa arbitrary rounding; future mutation Zod validation memeriksa range;
- execution time: integer micro/nanosecond representation atau double ms dengan definisi konsisten;
- distance: simpan unit eksplisit (mis. meter) untuk menghindari ambiguity;
- timestamp depot: DATETIME(3), UTC-by-convention, supplied explicitly oleh future aplikasi; tanpa CURRENT_TIMESTAMP/default/on-update. Format display lokal di UI.

## 7. Migration policy

Tidak boleh edit schema production manual lewat console tanpa migration record kecuali emergency documented.

Flow:

```text
schema.ts change
→ offline migration generate/check + SQL review
→ explicit human approval
→ apply Dev
→ tests
→ apply testing
→ QA
→ production window
```

Scripts tersedia: `npm run db:generate`, `npm run db:check`, serta guarded `db:migrate` untuk apply yang diotorisasi terpisah. Config offline `drizzle.config.ts` tidak memuat env/credential. Sejak koreksi lokal TLS 2026-11-03, Development apply memakai `scripts/migrate-development.mjs`: pure helper tetap membutuhkan APP_ENV=development dan DB `courier_route_planner_dev`, lalu credentials diteruskan langsung ke existing mysql2 dengan TLS `rejectUnauthorized: true` dan `verifyIdentity: true`. Runner juga memeriksa TLS socket/certificate hostname sebelum memanggil migrator resmi Drizzle ORM. `drizzle.dev.config.ts` dipertahankan sebagai legacy Kit config; bukan jalur apply Development aktif karena validator Kit terpasang membuang opsi `verifyIdentity`. Tooling Testing/Production tidak diubah oleh koreksi ini.

Future apply memakai `npm run db:migrate`, Node 24 `--env-file=.env.migrations.local` dan runner Development tersebut; inherited shell variables mengalahkan file. Operator harus mulai dari clean/verified shell tanpa mencetak secret. Historical Stage 1 offline tidak menjalankan apply/provisioning. Sesudah independent offline PASS, manusia menerapkan SQL `drizzle/0000_dear_rictor.sql` pada Dev; read-only verification menemukan tepat satu ledger entry dengan hash SQL dan timestamp journal yang cocok. Task live verification tidak mengulang migration, menulis data atau mengubah credential/grants. `db:check` tetap hanya offline history check; live schema/ledger evidence diperiksa terpisah.

Runner tidak mengimplementasikan migration engine: installed Drizzle ORM tetap membaca folder `drizzle`, journal, SHA-256 dari teks SQL tanpa normalisasi line ending, breakpoint, urutan timestamp, serta ledger default `__drizzle_migrations`. Drizzle memilih pending migration dari `created_at` terakhir; runner tidak menggantikan preflight hash seluruh ledger, target/resource/principal, least privilege, dan absence/partial-schema checks. Import runner tidak membuka koneksi; hanya explicit manual command setelah approval yang boleh menerapkan migration. Task koreksi TLS sendiri LOCAL/OFFLINE ONLY, tanpa SQL atau apply.

Satu invocation membuat satu koneksi tanpa retry. Kegagalan TLS terjadi sebelum query migrasi; driver/Drizzle errors tidak dicetak karena dapat mengandung credential/SQL. Error atau gagal mengamati graceful socket close menghasilkan exit nonzero dengan pesan tetap; outcome apply bisa ambigu dan harus direkonsiliasi sebelum invocation lain. Migrator resmi Drizzle memakai BEGIN/COMMIT/ROLLBACK, tetapi TiDB DDL autocommit tetap dapat meninggalkan partial schema: tidak ada janji atomic rollback, custom repair, atau automatic re-apply.

`drizzle-kit push` dilarang. Migration tidak berjalan pada install/ci/build/start/dev/routes/CI/Vercel. TiDB DDL dapat autocommit; sebelum future apply, siapkan mitigation untuk partial failure, periksa history/schema aktual, dan jangan menganggap rollback transaksi atau rerun otomatis aman.

### Testing migration tooling — Phase 0D-3A

**Current Phase 1C path:** `npm run db:migrate:testing` memakai `scripts/migrate-testing.mjs` dan runner mysql2/Drizzle bersama. Runner memverifikasi chain dan hostname TLS sebelum query migrasi. `drizzle.testing.config.ts` kini khusus tooling offline. Migration `0002` dan post-apply verification Testing telah PASS. [Evidence dan status integrasi](14_TESTING_QA.md#21-phase-1c-verification-and-draft-pr-readiness-2026-11-07).

**Snapshot historis Phase 0D-3A/3B:**

Testing migration tooling prepared locally. `drizzle.testing.config.ts` reuse offline config dan pure `getTestingMigrationCredentials`; exact APP_ENV=testing, parsed DB `courier_route_planner_testing`, TLS `rejectUnauthorized: true`. Parser hardened yang sama menolak invalid authority/path/encoding/query/fragment; error generic tanpa credential. Tidak ada trim/default/fallback. Dev helper/config/script tetap Dev-only.

Manual command `npm run db:migrate:testing` memakai Node 24 `--env-file=.env.migrations.testing.local`; application credential terpisah pada `.env.testing.local`. Kedua file sudah disimpan manusia secara privat pada 0D-3B dan tetap ignored. Inherited shell variables mengalahkan env-file; hapus inherited APP_ENV/DATABASE_URL pada child environment sebelum memuat satu file yang dituju. DB name sendiri tidak membuktikan resource identity.

0D-3A tooling sudah merged melalui PR #14. Pada 0D-3B, provider identity + authenticated role fingerprints membuktikan Testing berbeda dari Dev dan kedua roles menunjuk Testing yang sama. App mendapat SELECT/INSERT/UPDATE/DELETE; migrator CREATE/SELECT/INSERT, hanya pada exact Testing DB (underscore pada grant pattern di-escape), tanpa elevated global privileges atau GRANT OPTION. Human approvals **YES PROVISION TESTING RESOURCE** dan **YES APPLY TESTING MIGRATION** tercatat; database kosong diverifikasi sebelum satu kali apply. Ledger berisi satu raw SQL hash/timestamp journal; sole application table `depots` sesuai source/SQL/snapshot, read aplikasi dan health/readiness PASS. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production LIVE pada independent Starter, migration exactly once dan schema/ledger verified; Vercel NOT integrated; public Production/Preview NOT deployed; historical Preview preflight NOT READY; main FOUNDATION PROMOTED (PR #20), main Quality Gate VERIFIED, main required-check behavioral proof CLOSED/VERIFIED; Phase 0D/Gate 1 OPEN. [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md). Jangan menjalankan migration ulang untuk idempotence test. Saat error pada apply berikutnya, inspect ledger/information_schema/partial DDL dan tentukan remediation dengan approval terpisah. [Tooling evidence](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md).

### Production migration tooling — Phase 0D

**Production LIVE; independent Starter; migration APPLIED EXACTLY ONCE; schema/ledger VERIFIED.** Dev LIVE/established dan Testing LIVE/migrated once/verified. Vercel NOT integrated; public Production/Preview NOT deployed; historical Preview preflight **NOT READY**; main FOUNDATION PROMOTED (PR #20), main Quality Gate VERIFIED, main required-check behavioral proof CLOSED/VERIFIED; Phase 0D/Gate 1 **OPEN**. [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md). [Tooling history](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md) dan [preflight](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_PREFLIGHT_REPORT.md) tetap dated evidence.

Manual `npm run db:migrate:production` memakai Node 24, `.env.migrations.production.local`, installed Kit bin dan `drizzle.production.config.ts`. Pure `getProductionMigrationCredentials` hanya menerima exact `APP_ENV=production` dan parsed DB `courier_route_planner_production`, TLS `rejectUnauthorized: true`. Shared hardened parser/error generic, Dev/Testing guards dan offline config dipertahankan.

Checkpoint A: **YES PROVISION PRODUCTION RESOURCE** → independent `route-planner-production` Starter AWS Tokyo / ap-northeast-1, submitted spending limit 0 → logical DB → dedicated application/migrator → private human credential handoff. Ignored `.env.production.local` dan `.env.migrations.production.local` sudah disimpan manusia; usernames/passwords berbeda, admin tidak dipakai untuk app/migrator.

Read-only provider mapping dan authenticated sessions membuktikan tiga resource berbeda, kedua Production roles satu target, exact DATABASE(), TLS dan effective grants PASS. Application SELECT/INSERT/UPDATE/DELETE; migrator CREATE/SELECT/INSERT, hanya exact Production DB dengan escaped underscores pada grant pattern, tanpa operational global privilege, GRANT OPTION atau inherited role. Bare USAGE marker memberi no operational access; DB-wide app CRUD mencakup ledger DML, sehingga ledger immutability tidak diklaim.

Checkpoint B terpisah: **YES APPLY PRODUCTION MIGRATION**, setelah empty schema/ledger dan exact byte review PASS. Exact command dijalankan **1 kali**, retry **0**, exit **0**, tanpa appended arguments. Ledger tepat **1** row: raw SQL SHA-256 `64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577`, journal timestamp `1791072707266`. Tepat dua tabel `depots` / `__drizzle_migrations`; delapan kolom depots/PK id sesuai source/SQL, row count 0, source ORM read PASS.

Local unchanged `/api/health` dan `/api/ready` handlers dipanggil sukses memakai Production application credential, 200/status ok/no-store. Health app-only; readiness SELECT 1. Public deployed HTTP belum diverifikasi. Closure tidak membuka koneksi atau menjalankan SQL baru.

Jangan mengulang initial migration untuk verification/idempotence. Future migration membutuhkan task/review/approval baru. Exact argv/config, trusted runtime dan clean child environment wajib: inherited APP_ENV/DATABASE_URL mengalahkan env-file, preload/TLS overrides ditolak; script name saja tidak membuktikan physical target dan duplicate config argument dapat override.

Jika future apply gagal/ambigu, STOP tanpa automatic retry; inspect read-only ledger/information_schema/partial DDL dan minta separate remediation. TiDB DDL dapat autocommit; jangan mengasumsikan transaction rollback. Migration tetap dilarang pada install/build/dev/start/test/CI/Vercel. Recommendation closure **READY FOR FRESH VERCEL BOOTSTRAP PREFLIGHT**; tidak mengotorisasi promosi atau deployment.

## 8. Destructive changes

Contoh berisiko:

- DROP COLUMN;
- change type yang narrowing;
- rename column tanpa compatibility layer;
- mass UPDATE;
- DELETE tanpa filter.

Wajib approval manusia + backup/export/rollback plan.

## 9. Query performance

Untuk <=100 customer, algorithm data volume kecil. Jangan premature optimization.

Index minimal berdasarkan query nyata:

- foreign key lookup;
- scenario_id;
- benchmark_case_id;
- experiment_id;
- created_at bila list sort/filter.

Gunakan explain hanya saat ada evidence query lambat.

## 10. Free-tier guardrail

- no background polling agresif;
- no unnecessary analytics query tiap render;
- pagination result history;
- simpan frozen OSRM distance matrix sekali sebagai immutable snapshot dan referensikan dari experiments; jangan request/recompute matrix untuk setiap run karena road network dapat berubah (lihat [docs/34](34_OSRM_DISTANCE_CONTRACT.md));
- batasi export/run abuse dengan auth dan server validation.
