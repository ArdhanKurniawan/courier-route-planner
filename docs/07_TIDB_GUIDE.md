# 07 — TiDB GUIDE FOR A MYSQL-FAMILIAR TEAM

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

Stable Drizzle Kit CLI memakai `mysql2` **dev-only** sesuai [ADR-013](04_TECH_STACK_ADRS.md#adr-013--mysql2-as-drizzle-kit-migration-cli-dev-only-adapter). Tidak ada mysql2 import atau TCP pool aplikasi. Lockfile dapat menandainya devOptional karena optional peer Drizzle; manifest tetap dev-only dan runtime adapter tetap HTTP.

## 3. Environment design

Target tiga instance:

```text
route-planner-dev
route-planner-testing
route-planner-production
```

**Dev-first:** offline foundation dan independent offline verification PASS. Manusia telah membuat Dev dan menerapkan initial migration sekali. Verifikasi read-only 2026-10-04: application HTTP read/readiness, migrator TCP/TLS SELECT 1, ledger 1 entry dan live depots schema PASS. [Live report](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md). Final independent Phase 0C review pending; Gate 1 OPEN. Testing deferred sebelum integration/Preview Phase 0D; Production sebelum controlled rollout. Target akhir tiga independent Starter resources tetap ADR-008, tanpa shared-instance fallback.

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

Scripts tersedia: `npm run db:generate`, `npm run db:check`, serta guarded `db:migrate` untuk apply yang diotorisasi terpisah. Config offline `drizzle.config.ts` tidak memuat env/credential. `drizzle.dev.config.ts` hanya menerima APP_ENV=development dan DB `courier_route_planner_dev`, melalui pure helper yang menghasilkan object credentials dengan TLS `rejectUnauthorized: true`.

Future apply memakai Node 24 `--env-file=.env.migrations.local` dan installed Kit bin; inherited shell variables mengalahkan file. Operator harus mulai dari clean/verified shell tanpa mencetak secret. Stage 1 offline tidak menjalankan apply/provisioning. Sesudah independent offline PASS, manusia menerapkan SQL `drizzle/0000_dear_rictor.sql` pada Dev; read-only verification menemukan tepat satu ledger entry dengan hash SQL dan timestamp journal yang cocok. Task live verification tidak mengulang migration, menulis data atau mengubah credential/grants. `db:check` tetap hanya offline history check; live schema/ledger evidence diperiksa terpisah.

`drizzle-kit push` dilarang. Migration tidak berjalan pada install/ci/build/start/dev/routes/CI/Vercel. TiDB DDL dapat autocommit; sebelum future apply, siapkan mitigation untuk partial failure, periksa history/schema aktual, dan jangan menganggap rollback transaksi atau rerun otomatis aman.

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
