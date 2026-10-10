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

**Dev-first:** offline foundation dan independent offline verification PASS. Manusia telah membuat Dev dan menerapkan initial migration sekali. Verifikasi read-only 2026-10-04: application HTTP read/readiness, migrator TCP/TLS SELECT 1, ledger 1 entry dan live depots schema PASS. [Dev live report](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md). Phase 0C CLOSED/PR #9, final independent verification PASS. Pada 0D-3B (2026-10-10), independent Testing Starter `route-planner-testing` di AWS Tokyo diprovision dengan spending limit 0; migration APPLIED ONCE dan live verification PASS. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production NOT PROVISIONED; Vercel NOT CONNECTED; Phase 0D/Gate 1 OPEN. Target akhir tiga independent Starter resources tetap ADR-008, tanpa shared-instance fallback.

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

### Testing migration tooling — Phase 0D-3A

Testing migration tooling prepared locally. `drizzle.testing.config.ts` reuse offline config dan pure `getTestingMigrationCredentials`; exact APP_ENV=testing, parsed DB `courier_route_planner_testing`, TLS `rejectUnauthorized: true`. Parser hardened yang sama menolak invalid authority/path/encoding/query/fragment; error generic tanpa credential. Tidak ada trim/default/fallback. Dev helper/config/script tetap Dev-only.

Manual command `npm run db:migrate:testing` memakai Node 24 `--env-file=.env.migrations.testing.local`; application credential terpisah pada `.env.testing.local`. Kedua file sudah disimpan manusia secara privat pada 0D-3B dan tetap ignored. Inherited shell variables mengalahkan env-file; hapus inherited APP_ENV/DATABASE_URL pada child environment sebelum memuat satu file yang dituju. DB name sendiri tidak membuktikan resource identity.

0D-3A tooling sudah merged melalui PR #14. Pada 0D-3B, provider identity + authenticated role fingerprints membuktikan Testing berbeda dari Dev dan kedua roles menunjuk Testing yang sama. App mendapat SELECT/INSERT/UPDATE/DELETE; migrator CREATE/SELECT/INSERT, hanya pada exact Testing DB (underscore pada grant pattern di-escape), tanpa elevated global privileges atau GRANT OPTION. Human approvals **YES PROVISION TESTING RESOURCE** dan **YES APPLY TESTING MIGRATION** tercatat; database kosong diverifikasi sebelum satu kali apply. Ledger berisi satu raw SQL hash/timestamp journal; sole application table `depots` sesuai source/SQL/snapshot, read aplikasi dan health/readiness PASS. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production NOT PROVISIONED; Vercel NOT CONNECTED; Phase 0D/Gate 1 OPEN. Jangan menjalankan migration ulang untuk idempotence test. Saat error pada apply berikutnya, inspect ledger/information_schema/partial DDL dan tentukan remediation dengan approval terpisah. [Tooling evidence](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md).

### Production migration tooling — Phase 0D

**Production TOOLING PREPARED ONLY; NOT PROVISIONED; NOT MIGRATED.** Dev established/live dan Testing live, migrated once, verified tetap dipertahankan. Vercel preflight **NOT READY**, no project/deployment; Gate 1 **OPEN**. [Production tooling report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md).

Manual `npm run db:migrate:production` memakai Node 24, `.env.migrations.production.local`, installed Kit bin dan `drizzle.production.config.ts`. Pure `getProductionMigrationCredentials` hanya menerima exact `APP_ENV=production` dan parsed DB `courier_route_planner_production`, dengan TLS `rejectUnauthorized: true`. Shared hardened parser/error generic dipertahankan; tidak ada trim/default/fallback atau arbitrary environment switch. Dev dan Testing guards/configs/scripts tetap unchanged; `db:check` / `drizzle.config.ts` tetap tanpa credential. Command belum pernah dijalankan pada task ini.

Future apply wajib memakai exact command/argv yang direview, tanpa appended arguments atau config override. npm dapat meneruskan extra arguments; installed Kit memakai nilai terakhir untuk duplicate `--config`. Nama script saja tidak membuktikan config/environment yang akhirnya dipilih. Verifikasi resolved argv/config bersama clean environment dan physical target sebelum approval; mengganti config pada Dev/Testing script bukan approved invocation.

Future application file `.env.production.local` dan migrator file `.env.migrations.production.local` belum dibuat/diisi; keduanya ignored. Manusia menyimpan application dan migrator credential berbeda secara privat setelah approval. Inherited APP_ENV/DATABASE_URL mengalahkan Node env-file: gunakan clean, verified child environment dan hapus TLS bypass/preload variables sebelum memuat satu file yang dituju. Jangan mencetak URL/user/password atau memakai root/admin untuk app/migrator.

Future Production resource wajib independent dari Dev dan Testing. Exact APP_ENV/logical DB tidak membuktikan physical resource atau SQL privilege. Provider identity dan authenticated role evidence kelak harus membuktikan Production berbeda dari keduanya, app/migrator menuju Production yang sama, dan tidak menuju Dev/Testing.

Future roles: application hanya SELECT/INSERT/UPDATE/DELETE pada Production DB; migrator terpisah dengan minimum reviewed history/ledger privileges (current candidate CREATE/SELECT/INSERT, wajib direview lagi terhadap installed runner/exact history). Grant scope hanya exact Production DB, underscore grant patterns di-escape; tanpa global privileges/GRANT OPTION/schema administration untuk app. Root/admin human provisioning only; helper tidak dapat mengidentifikasi effective admin privileges dari URL syntax.

Future sequence, **tidak dieksekusi sekarang**:

1. Read-only provider/account/plan/quota/spending/region preflight, kemudian **YES PROVISION PRODUCTION RESOURCE** sebelum resource/database/users/grants.
2. Independent Production resource → exact logical DB → dedicated app dan migrator → private env setup.
3. Read-only app/migrator connectivity dan TLS/identity/grants; inspect empty schema/ledger; review dan freeze exact migration bytes/hash. History tetap satu initial migration; jangan membuat migration kedua hanya karena environment baru.
4. Minta **YES APPLY PRODUCTION MIGRATION**. Provisioning approval tidak mencakup apply.
5. Setelah approval, manual Production command **exactly ONCE** → ledger/schema → application read → health/readiness → STOP. Tidak ada automatic retry.

Jika apply kelak gagal, STOP dan inspect read-only ledger, information_schema, tables dan partial DDL state; obtain separate remediation decision. TiDB DDL dapat autocommit; jangan mengasumsikan transaction rollback atau langsung rerun. Migration tetap dilarang pada install/build/dev/start/test/CI/Vercel. Production DB readiness merupakan prerequisite sebelum meninjau ulang Vercel first-deployment/bootstrap issue; tooling ini tidak mengotorisasi Vercel, provisioning atau main promotion.

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
