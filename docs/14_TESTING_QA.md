# 14 — TESTING & QA STRATEGY

**Promotion evidence 2026-10-11:** [PR #20 closure](proses/phase-0/0d/PHASE_0D_MAIN_FOUNDATION_PROMOTION_REPORT.md); current-candidate PR Quality and post-merge main Quality PASS. Vercel NOT integrated; public Production/Preview NOT deployed; Phase 0D/Gate 1 OPEN.

## 1. Testing pyramid

```text
          E2E
       Integration
     Unit / Domain
```

Core algorithms harus memiliki unit tests kuat.

## 2. Unit tests

### Distance matrix

Test:

- NxN shape;
- diagonal zero;
- finite nonnegative values; no NaN/Infinity/negative;
- asymmetric matrix accepted; tidak mengasumsikan d(i,j)==d(j,i);
- null/unreachable/missing pair rejected;
- stable node order, canonical meter, input/matrix hashes;
- ACO preflight zero off-diagonal rejection sesuai [docs/33](33_ALGORITHM_SPECIFICATION.md), tanpa mengganti nilai matrix.

### Nearest Neighbor

Test:

- start/end depot;
- every customer exactly once;
- deterministic route;
- directed nearest cost;
- lowest-node-index tie break;
- known small instance.

### 2-Opt

Test:

- route remains permutation;
- depot fixed start/end;
- distance not worse than input route;
- best improvement dipilih setelah seluruh candidates dievaluasi;
- full route recomputation mencakup directed internal edges saat reversal;
- asymmetric cheap-cycle dan shortcut trap fixtures di docs/33;
- symmetric-only delta shortcut tidak boleh lolos tests;
- equal/worse candidate tidak diterima, hasil <= NN input.

### ACO

Test:

- valid route;
- fixed seed reproducibility;
- parameter validation;
- zero pheromone/division edge prevention;
- known small instance sanity;
- Classical Ant System: semua valid ants deposit setelah evaporation, termasuk return edge;
- directed pheromone: i→j tidak otomatis update j→i;
- fixed iteration stopping, reset state per seed/run;
- roulette-wheel probabilities finite, no NaN/Infinity;
- tidak ada post-ACO 2-Opt, elitist-only update, atau numeric research defaults tersembunyi.

## 3. Property/invariant testing mindset

Untuk routing, invariant sering lebih penting daripada exact route karena beberapa route dapat sama jaraknya.

Assert:

```text
valid closed tour
+ same customer set
+ recomputed distance matches
```

Tambahkan 0/1/2 customer sesuai contract, known small instances, input immutability, fixed-seed reproducibility, dan generated directed matrices. ACO tidak diwajibkan selalu menang atas NN. Fixtures adalah test data, bukan final scientific defaults atau main datasets.

## 4. Integration tests

Test service + TiDB Dev/Test database untuk:

- scenario CRUD;
- freeze benchmark case;
- save experiment;
- route history reconstruction.
- frozen matrix persistence, immutable setelah order edit;
- same matrix hash/values/node order untuk kedua algorithms;
- timer excludes OSRM/DB/HTTP/network/serialization/geometry/rendering;
- raw run persistence sebelum summary; failed/poor runs tidak cherry-picked away;
- 5 warm-ups dikecualikan, 30 seeded ACO runs dan 30 NN+2-Opt timing samples per dataset;
- calibration/main identities terpisah, satu global config, dataset-level aggregation;
- failed run tetap tersimpan dan incomplete dataset tidak dianggap complete.

OSRM adapter tests memakai mocked responses untuk timeout/provider/null/shape/hash errors; live routability/provider verification terpisah sebelum freeze data formal. Unit algorithms tidak bergantung network.

Jangan menjalankan integration tests destructive ke Production.

## 5. E2E

Playwright critical flows:

1. create scenario;
2. add/edit customer;
3. open map;
4. run small optimization;
5. view result;
6. compare algorithms.

## 6. Manual QA

Checklist UI:

- desktop/mobile basic;
- loading state;
- empty state;
- error state;
- invalid form;
- duplicate order code;
- map markers;
- route numbering;
- browser console no critical error.

## 7. UAT

Untuk mata kuliah, dokumentasikan:

- test case ID;
- actor;
- precondition;
- steps;
- expected;
- actual;
- status;
- evidence screenshot;
- bug link.

## 8. Regression

Bug yang pernah ditemukan harus sebisa mungkin mendapatkan regression test sebelum ditutup.

## 9. Performance testing

Bedakan:

- application responsiveness test;
- scientific algorithm benchmark.

Jangan campur keduanya.

## 10. Current testing foundation — Phase 0A/0B/0C closed + Phase 0D tooling

Verifikasi lokal 2026-10-03: Vitest adalah unit/component runner; React Testing Library, jest-dom dan jsdom tersedia sebagai dev dependencies. `tests/setup.ts` memuat jest-dom Vitest matchers dan explicit `afterEach(cleanup)` agar render antar test tetap independent tanpa global Vitest APIs. `next/link` diuji langsung tanpa mock.

`tests/unit/navigation.test.ts` memproteksi 12 routes, href valid/unique dan 10 domain placeholders. `tests/unit/dashboard.test.tsx` memproteksi identitas, status shell yang jujur, status Depot/Route Optimization, link `/about`, serta absennya Revenue/Monthly Sales/Monthly Target. Baseline Phase 0A: 2 files, 11 tests PASS; CLOSED/merged via PR #7.

Phase 0B menambah `tests/unit/env.test.ts` (18 tests) dan `tests/unit/health.test.ts` (19 tests), dengan `// @vitest-environment node` per file. Tests memeriksa exact APP_ENV enum/rejections, fixed safe error, pure parser, import safety, GET current-value validation, 200/503 exact minimal JSON, JSON/no-store headers, DATABASE_URL absent, dan unexpected exception propagation. Semua handler/parser diuji langsung; satu scoped parser spy mensimulasikan unexpected exception. Env stubs dipulihkan dengan afterEach; tidak ada HTTP server, DB atau Playwright.

Phase 0B CLOSED/merged via PR #8, [independent verification PASS](proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md). Historical baseline: **4 files / 48 tests PASS**; V8 statements 4.95%, branches 3.68%, functions 6%, lines 5.36%.

Phase 0C Stage 1 offline suite: **9 files / 147 tests PASS**, seluruh 48 tests lama dipertahankan. Lima file baru: `db-env` (53), `db-schema` (1), `db-client` (7), `db-readiness` (27), `ready` (11). TDD RED/GREEN memeriksa pure Zod parser + safe errors + Dev guard/TLS, schema import safety, lazy real ORM/HTTP driver dengan fake transport, fresh 5000 ms signal, abort sebelum headers dan saat body pending, no retry, provider/malformed/unexpected result, serta exact 200/503 JSON/no-store. Route menggunakan real readiness logic dengan scoped acquisition boundary; unexpected acquisition bugs tidak dilaporkan sukses. Tidak ada real network/DB credential.

Vitest membutuhkan test-only alias/fixture untuk Next `server-only` marker; production boundary tetap aktif. Coverage mencakup seluruh src TS/TSX termasuk DB, tanpa threshold/exclusion baru. Metrics aktual dan full/runtime audit delta tercatat pada [Stage 1 report](proses/phase-0/0c/PHASE_0C_IMPLEMENTATION_REPORT.md). `npm run db:check` memeriksa offline migration history, bukan live schema/status. Independent offline verification PASS. [Dev live read-only verification](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md) mencatat health/readiness HTTP 200, application SELECT COUNT(*) FROM depots, migrator SELECT 1/TLS dan ledger/schema/PK/index checks PASS; initial migration diterapkan manusia sebelum verification. DB integration/CRUD tests tetap pending. [Final independent verification PASS](proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md); Phase 0C CLOSED/PR #9 merged ke testing pada `e1c36988e588e397af312a140677c3f71bd451d2`. Fresh quality tetap memakai salinan source dengan lockfile yang sama tanpa env privat.

Scripts aktual: `npm run typecheck` menghasilkan Next route types sebelum `tsc --noEmit`; `npm run test`, `npm run test:watch` dan `npm run test:coverage` tersedia. Clean install lint/typecheck/test/coverage/build PASS. Coverage V8 menghasilkan text, HTML dan JSON summary untuk seluruh `src/**/*.{ts,tsx}`, termasuk modules yang belum diuji; **NO COVERAGE THRESHOLD**, angka hanya baseline informasi. Generated reports di `coverage/` ignored oleh Git dan ESLint. Vite memberi warning future native config loader pada config TypeScript yang ada; current runner PASS.

Playwright/E2E, DB integration tests dan domain algorithm/matrix tests di atas masih pending sampai implementation target tersedia. Detail evidence: [Phase 0A report](proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md). Untuk task documentation-only, periksa diff, internal links, source/derived parity, actual manifest hashes, dan research contract consistency tanpa menambah implementation di luar scope.

## 11. Phase 0D-1 quality-only CI

[Quality workflow](../.github/workflows/quality.yml) implemented dan remote Linux verified; required Quality Gate configuration verified pada testing/main. Testing behavioral enforcement VERIFIED, main required-check behavioral proof CLOSED/VERIFIED. [Behavioral proof](proses/phase-0/0d/PHASE_0D_ENFORCEMENT_BEHAVIOR_PROOF_REPORT.md). Required order: npm ci → lint → typecheck → test → test:coverage → db:check → build → typecheck → runtime audit. Full audit terakhir informational untuk valid advisories; invalid/tool/transport result gagal, tanpa blanket ignore. [Exact CI contract](12_CI_CD_RELEASE.md) dan [fresh local implementation evidence](proses/phase-0/0d/PHASE_0D_CI_IMPLEMENTATION_REPORT.md).

Coverage tanpa numeric threshold. Workflow tidak memakai secret, real DB, migration, deploy atau live readiness check. YAML/static review dan probe perilaku audit memakai tooling existing/TEMP; tidak menambah dependency atau mengubah application tests. Local reproduction tidak membuktikan GitHub remotely green. Gate 1 tetap OPEN.

## 12. Testing migration guard — Phase 0D-3A

`tests/unit/db-migration.test.ts` menguji pure Testing credential output, TLS verification, default/explicit port, exact APP_ENV dan database, safe malformed-URL rejection, explicit-input purity, serta Dev/Testing/Production cross-env matrix. Dev guard dan semua tests lama dipertahankan; no real network/URL/private env. TDD RED sebelum helper tersedia, GREEN setelah implementasi. Fresh count/coverage/quality ada pada [tooling report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md). Coverage tanpa threshold tetap berlaku.

Fresh local quality 0D-3A memakai byte-identical candidate source di TEMP tanpa ignored private env dan tanpa inherited APP_ENV/DATABASE_URL. `db:check` hanya history consistency; tidak ada apply/config-migrate command dalam suite. Tooling merged melalui PR #14. Pada 0D-3B, Testing PROVISIONED terpisah, migration APPLIED ONCE setelah human approval; read-only ledger/schema/application read dan GET health/readiness (200, exact JSON, no-store) PASS. Tidak ada DML test, second migration/idempotence test atau live DB dalam CI. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production LIVE pada independent Starter, migration exactly once dan schema/ledger verified; Vercel NOT integrated; public Production/Preview NOT deployed; historical Preview preflight NOT READY; main FOUNDATION PROMOTED (PR #20), main Quality Gate VERIFIED, main required-check behavioral proof CLOSED/VERIFIED; Phase 0D/Gate 1 OPEN. [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md).

## 13. Production migration guard — Phase 0D

**Production LIVE; independent Starter; migration APPLIED EXACTLY ONCE; schema/ledger VERIFIED.** Dev LIVE/established dan Testing LIVE/migrated once/verified. Vercel NOT integrated; public Production/Preview NOT deployed; historical Preview preflight **NOT READY**; main FOUNDATION PROMOTED (PR #20), main Quality Gate VERIFIED, main required-check behavioral proof CLOSED/VERIFIED; Phase 0D/Gate 1 **OPEN**. `tests/unit/db-production-migration.test.ts` menambah offline credential/TLS/default-port/encoding tests, exact env/database rejection, generic safe errors, explicit-input purity, 27 combinations untuk tiga helpers × tiga environments × tiga databases, serta actual config import/rejection. Fixtures hanya `.invalid`, tanpa real DB/DNS/private env; tidak menjalankan migration CLI. Existing tests dipertahankan. TDD RED/GREEN dan fresh full suite/coverage/audits dicatat pada [Production tooling report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md).

Quality menggunakan salinan public source byte-identical dengan lockfile yang sama, tanpa ignored env atau inherited target/TLS bypass env. `db:check` tetap offline. Production live Checkpoint B sudah verified: invocation 1/retry 0/exit 0, exact scoped grants/TLS, ledger satu row, delapan kolom depots/PK parity dan source ORM read PASS. Local unchanged health/readiness handlers PASS memakai app credential; public deployed HTTP belum diverifikasi. [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md). Coverage tetap informational tanpa perubahan threshold/exclusion.

Untuk verification task yang melarang private env reads, jalankan TDD juga dari public isolated copy: default Vite loader dapat membaca `.env` / `.env.local` / mode-specific env meskipun fixtures memakai explicit input. Initial root TDD pada task ini memiliki procedural deviation; RED/GREEN diulang tanpa private files dan dicatat transparan pada report. Existing Vitest config unchanged.

Closure 0D-5B hanya dokumentasi: diff/internal links/MASTER-MANIFEST parity, bounded secret scan dan public source/config/migration preservation. Docs-only lint/build dilakukan pada isolated public copy tanpa ignored private env. Hasil fresh closure dicatat pada live report; historical suite/tooling evidence tidak dianggap fresh full-suite PASS. Tidak ada DB connection, SQL atau second migration.

## 14. Historical Gate 2 Phase 1A — Depot and single-admin scope (2026-10-25)

Gate 1 is CLOSED; older dated sections above remain historical snapshots. This local candidate implements only Depot plus single-admin authentication; Gate 2 remains OPEN for Scenario/Order and actual feature acceptance.

Offline unit/component tests use synthetic usernames/passwords/Argon2 hashes, secrets/cookies, Redis transport, TiDB HTTP replies and run records. Coverage includes auth configuration and zero-TiDB denials, exact 12-hour boundary/non-renewal/logout, Origin/body guards, limiter timeout fail-closed behavior, lossless BIGINT, coordinate bounds, repository metadata and FK-code projection, unchanged PUT, unknown write outcomes, UI pending/empty/error/confirmation and legacy health/readiness regressions. A real SDK test with a fake store is not live distributed-enforcement evidence.

Standard local checks remain npm ci, lint, typecheck, test, test:coverage, db:check, build, post-build typecheck and existing runtime/full-audit policy. Runtime/private configuration is not required for these commands; missing config prevents login. Default test/coverage excludes tests/integration/** while keeping existing default exclusions and all-source coverage policy. No threshold is weakened.

A separate `npm run test:db` exists outside CI and the default offline suite. It rejects before collection unless RUN_DB_INTEGRATION=1, APP_ENV=testing, a valid URL targeting exactly courier_route_planner_testing, and local/non-Vercel invocation. Each run requires its own bounded owner authorization and a private APPLICATION Testing handoff; never supply admin/root/migrator/Dev/Production credentials. No real values belong in chat or test fixtures.

That runner covers one run-tagged Depot through create/read/edit/deactivate/reactivate/no-op/delete/404. A test wrapper records validated insert IDs before readback; finally cleanup uses only recorded run-owned IDs. Unknown insert/delete outcomes stop without retry/broad name deletion and report the run tag for human resolution. No migration, DDL, reset/truncate, fake Scenario FK or Production operation is performed. Live FK proof belongs to a future actual Scenario RESTRICT relation.

### Historical verification evidence — 2026-10-25

- [DONE] Authentication and protected Depot CRUD are implemented locally. Existing offline evidence records 426/426 tests PASS; independent source review has no unresolved Critical or Important findings. This documentation correction does not rerun those checks.
- [DONE] Owner observed successful Development login/logout, main CRUD operations, deactivation and removal of the deleted QA fixture. Owner also observed server invalid-coordinate rejection: HTTP 400 INVALID_INPUT. These are owner observations, not agent browser testing.
- [DONE] One separately authorized TiDB Testing integration run passed 1/1, with fixture cleanup PASS, 12 observed SQL requests and zero retries. The existing runner exercised create/read/edit/deactivate/reactivate/no-op/delete/not-found using its own tagged fixture only. Target/process guards passed for APP_ENV=testing and courier_route_planner_testing; APPLICATION role/resource mapping was owner-attested. This verifies the service/repository round-trip, not HTTP login, UI behavior or direct physical SQL identity.
- [PENDING] Explicit owner confirmation of Development browser reactivation and delete cancellation; actual Preview authentication/limiter QA; final publication and release approval. Existing manual QA scope for denied anonymous mutation, session expiry/non-renewal, Origin/cookie protections, actual shared limiting, list pagination, keyboard/mobile behavior and unknown-outcome refresh remains applicable; those results are not implied by the CRUD integration result.
- [RESIDUAL RISK] One historical intermittent login HTTP 503 remains unexplained; subsequent login requests succeeded. No root-cause correction or permanent fix is claimed.
- [BOUNDARY] Gate 1 remains CLOSED and Gate 2 OPEN. Order and Scenario CRUD are not implemented. Development/Testing verification is not Production acceptance. Physical runtime SQL identity remains NOT VERIFIED; neither these results nor /api/ready establish it. Historical evidence above remains unchanged.

## 15. Gate 2 Phase 1B — Scenario offline scope (2026-10-31)

Snapshot implementasi offline awal berikut dipertahankan; perkembangan migration/browser dan source integration setelahnya dicatat pada bagian 16, bukan dianggap sudah terjadi saat snapshot ini dibuat.

Phase 1A telah merged melalui PR #30; owner melaporkan Development/Preview login dan Depot CRUD berhasil. Evidence tersebut tidak dianggap Scenario runtime acceptance. Source Scenario memakai admin/session yang sama tanpa perubahan autentikasi atau limiter. Order/freeze/generator tetap di luar scope; Gate 1 CLOSED dan Gate 2 OPEN.

TDD RED→GREEN direkam untuk validation (31 assertion failures sebelum implementasi), backend/schema (29), API (10 failures dari 12 tes), UI (8), protected page (1), dan same-ID stale editor (1). Full offline suite kini 25 files / 511 tests PASS, termasuk 426 tests baseline. Test memakai synthetic principals, IDs/seed di luar safe Number range, dates, TiDB HTTP metadata/errors dan browser fetch; tidak ada private env atau real SQL. Loader/cache failure sebelum tes bukan evidence RED.

Coverage Scenario mencakup strict inputs, bounds/radii/patterns, nullable seed dan lossless BIGINT; configured count terpisah dari Order aktual; server-only draft; conditional active-parent insert/update; FK errors, row/insert identity/malformed replies; 404/no-op/unknown outcome tanpa automatic retry; auth/Origin/body/environment denial tanpa DB acquisition; pagination, inactive stored Depot, loading/empty/read retry, validation errors, delete cancellation/double submit dan uncertain-write lock. Legacy auth 12-hour/session/limiter, Depot, health/readiness tests tetap berjalan. Coverage tetap informational dan all-source, tanpa mengubah threshold/exclusions.

Offline lint (0 warnings), typecheck, full unit/component tests, coverage, `db:check`, default Turbopack build dan post-build typecheck PASS pada salinan public source (bukan worktree Git) dengan installed dependencies existing dan tanpa private env; Node child invocation eksplisit, target env dibersihkan. Junction dependencies lintas drive menyebabkan build awal gagal; salinan dependency files existing pada snapshot mengatasi batas filesystem tersebut tanpa mengubah dependency/config aplikasi. Vite future native-config-loader warning tetap informational. Migration `0001_scenarios` hanya generated/reviewed; `db:check` bukan live migration. Initial migration/history dan dependency versions dipertahankan.

Fresh-context independent review menemukan satu Important (form same-ID tetap stale setelah list reload), dibuktikan RED lalu diperbaiki dengan reset edit snapshot setelah read berhasil. Focused re-review: 0 Critical, 0 Important, 0 Minor tersisa pada scope code/source documentation yang diperiksa; ini bukan live acceptance.

### Runtime acceptance yang masih memerlukan approval

1. Review migration target/history/grants dan apply terpisah per environment. Jangan menjalankan migration saat install/build/CI/deploy. Jika DDL parsial/ambigu, STOP tanpa retry atau drop/reset otomatis.
2. Setelah Testing schema disetujui, bounded Scenario integration memakai APPLICATION Testing dengan synthetic run-tagged fixtures: create/read/update/no-op/delete, create/switch ke inactive/missing Depot ditolak, retained inactive reference boleh diedit, dan FK Depot delete conflict. Record IDs sebelum readback, cleanup hanya fixture run sendiri; unknown outcome STOP tanpa broad cleanup/retry. Existing `test:db` saat ini hanya menguji Depot dan belum menjadi runner Scenario.
3. Browser Dev/Preview: authenticated entry; anonymous/expired denial; form/list/pagination, aktif/nonaktif Depot, radius/count/seed, validation, cancel/delete, responsive/keyboard, clear error dan unknown-write reload. Gunakan fixture baru; jangan mengubah pre-existing data tanpa approval. Actual session/limiter QA tidak dibuktikan oleh mocked UI tests.

Belum ada Scenario live SQL, migration apply, browser QA, cloud change atau release pada implementasi lokal ini. Historical intermittent login 503 tetap unresolved; tidak ada klaim root cause/permanent fix. Physical runtime SQL identity tetap NOT VERIFIED.

## 16. Scenario integration source dan checkpoint Testing (2026-10-31)

Historical snapshot sebelum run Scenario pertama; status PENDING dan rencana pengujian di bagian ini dipertahankan. Perkembangan run, cleanup, dan koreksi source sesudahnya dicatat pada bagian 17.

Evidence lanjutan yang telah diterima sebelum task source test: Development migration 0001 PASS; Development browser QA 8/8 PASS berdasarkan observasi owner; Testing migration 0001 PASS dengan satu invocation. Testing ledger berisi 0000/0001, schema Scenario/PK/FK RESTRICT/index/status draft readback PASS. Historical CRLF hash 0000 Testing tetap utuh. Ini memakai evidence sebelumnya, bukan koneksi atau apply ulang pada task ini. Phase 1A merged; Gate 1 CLOSED dan Gate 2 OPEN.

### Source dan verifikasi offline

- `tests/integration/scenario-crud.integration.test.ts`: satu bounded flow melalui actual Depot/Scenario services dan repositories, tanpa database acquisition saat module import. Dua Depot (aktif/nonaktif), satu Scenario valid dengan UUID tag; create/read/list/update/persistence/no-op/delete, lossless string ID dan seed di luar safe Number range, status draft read-only, inactive-parent create/switch rejection, retained inactive reference edit, serta actual FK RESTRICT dan parent delete setelah child dihapus.
- `tests/fixtures/scenario-integration-fixtures.ts` dan unit test-nya: record actual insert ID sebelum service readback, registry Scenario/Depot terpisah, cleanup exact-ID child-first dengan ownership tag dan readback absence. Tidak ada broad deletion. Unknown mutation/insert identity/readback atau cleanup yang tidak dapat dikonfirmasi menghentikan subsequent writes/cleanup; laporkan UUID tag, known IDs dan kategori unrecorded insert untuk rekonsiliasi manual, tanpa retry otomatis atau raw provider error. Assertion failure tanpa uncertain write tetap boleh cleanup fixture yang ownership-nya terbukti.
- TDD helper: 14 assertion failures sebelum implementasi → 14/14 PASS. Targeted Scenario backend/validation/API/UI, existing target guards dan helper: total 7 files / 132 tests PASS. Typecheck dan lint PASS pada public snapshot tanpa private env. Vite future native-config-loader warning tetap informational. Full 511-test evidence pada bagian 15 tetap historical; full suite tidak dijalankan ulang untuk penambahan test ini.
- `vitest list --filesOnly` dengan synthetic `.invalid` target memastikan config integration memilih file Scenario saja saat difilter; default config mengecualikan integration dan menyertakan safety unit tests. Mode ini tidak mengeksekusi test bodies. Config runner tidak diubah. **Source/selection/offline PASS bukan live integration PASS; Scenario integration execution masih PENDING.**
- Focused fresh-context review atas test/helper dan dokumentasi terkait selesai: 0 Critical, 0 Important, 0 Minor tersisa setelah memperbaiki privacy assertion list, status README dan assertion persistence enum. Review menilai source/ownership/cleanup, bukan actual SQL, current grants, physical target atau release readiness.

### Application privilege dan guard sebelum run terpisah

Kontrak historis [Testing live foundation, bagian H](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md#h-application-role) telah memverifikasi dedicated APPLICATION dengan SELECT/INSERT/UPDATE/DELETE pada exact escaped database scope `courier_route_planner_testing`. Scope ini mencakup tabel Scenario baru; flow tidak memerlukan CREATE/ALTER/INDEX/REFERENCES, grants baru atau credential migrator. Tidak ada missing privilege yang terbukti dari kontrak tersebut; current credential validity/effective access belum diuji pada task ini.

Run berikut hanya setelah approval eksplisit untuk satu attempt:

1. Owner menyediakan existing APPLICATION Testing secara privat melalui prosedur isolated launcher; bukan Dev/Production/admin/migrator. Target physical resource/role memakai accepted independent mapping dan attestation owner, tidak disimpulkan dari URL/database name.
2. Child process bersih dari inherited target overrides dan Vercel context; inject hanya intended Testing application config, tanpa mencetak nilai. Guard existing wajib `RUN_DB_INTEGRATION=1`, `APP_ENV=testing`, exact logical database `courier_route_planner_testing`, local/non-Vercel dan TLS yang berlaku. Jangan fallback atau membuka private files pada task source/offline ini.
3. Gunakan **existing runner dengan exact file filter**, bukan seluruh integration directory:

   ```bash
   npm run test:db -- tests/integration/scenario-crud.integration.test.ts
   ```

   Command ini tidak otomatis memuat credential privat; isolated setup di atas wajib terlebih dahulu. Maksimal satu invocation, tanpa watch/retry. Expected mutation terbatas pada create dua Depot/satu Scenario, update/no-op/deactivate serta delete fixture run sendiri; negative validation/FK cases tidak boleh mengubah shared records. List memakai bounded cursor/limit dan hanya mengassert fixture sendiri; repository dapat membaca satu extra row untuk pagination, tanpa mengubah atau mencatat row tersebut.
4. Keberhasilan wajib mencakup Scenario absent setelah delete, parent delete setelah child removal, dan cleanup receipt `pending` kosong untuk kedua jenis fixture. Jika error/timeout/outcome ambiguous: STOP, simpan safe tag/recorded IDs/status; jangan rerun, broad cleanup, migration atau asumsi rollback. Actual run/result/cleanup tetap PENDING sampai checkpoint tersebut dilakukan.

Task ini tidak memanggil `test:db`, SQL, database, migration, cloud atau HTTP aplikasi. Preview authentication/session/limiter QA dan release approval tetap terpisah; historical intermittent login 503 unresolved. Physical runtime SQL identity tetap NOT VERIFIED.

## 17. Depot delete precondition correction (2026-10-31)

Snapshot koreksi lokal/offline sebelum rerun; verdict dan rencana run pada bagian ini tetap historis. Hasil rerun aktual berikutnya tercatat pada [bagian 18](#18-scenario-integration-rerun--actual-evidence-2026-10-31).

Evidence terdahulu yang diterima: live Scenario integration pertama 1 FAIL karena DELETE Depot referenced mengembalikan HTTP 400 dan menjadi `MUTATION_OUTCOME_UNKNOWN`. Probe terpisah mengonfirmasi JSON terbaca, `details.code` numerik `61100002` dipertahankan SDK/Drizzle, tetapi errno/SQLSTATE FK belum terbukti. Ini bukan dasar memetakan seluruh HTTP 400 atau `61100002` menjadi FK. Semua fixture dari run dan probe kemudian cleanup PASS dengan approval terpisah; tidak ada fixture unresolved. Task koreksi ini hanya lokal/offline, tidak mengulang SQL, probe, migration atau cleanup.

`DepotRepository.remove` kini memakai satu query EXISTS berparameter pada `scenarios.depot_id`, inner `LIMIT 1`, tanpa filter status Scenario/Depot. Predicate didukung index existing `scenarios_depot_id_idx`; tidak ada schema/migration baru. Validasi full-result Drizzle mewajibkan tepat satu row dengan flag string `0` atau `1`: empty/null/malformed result bukan bukti ketiadaan referensi. Failed read menghasilkan `UNAVAILABLE` dan tidak melakukan DELETE. Referensi terkonfirmasi menghasilkan `DEPOT_IN_USE` di luar wrapper read/mutation, sehingga service/API mempertahankan 409. Absence terkonfirmasi melanjutkan DELETE existing sekali, termasuk 404 bila row sudah tidak ada.

Precondition dan DELETE **tidak atomik**. FK RESTRICT tetap wajib; concurrent child insert setelah precheck dapat menyebabkan unknown/503 bila provider error tidak dikenali. Tidak ada retry atau forced 409. Positive precheck dapat menghasilkan 409 konservatif bila child dihapus sesaat sesudah read. Query/error/credential tidak dibuka pada response. Penolakan auth/Origin/body/environment tetap tidak memperoleh database.

TDD RED merekam **27 failed / 19 passed** pada dua file sebelum perubahan production. Percobaan awal koreksi menunjukkan perlunya membaca `rows` dari full-result driver; validasi diperbaiki tanpa melonggarkan kontrak. GREEN akhir **46/46 PASS**. Cases: referenced active/inactive tanpa DELETE, absence lalu satu DELETE, failed/malformed/indeterminate precheck tanpa DELETE, known native FK tetap conflict, serta generic `61100002`, FK lain dan transport timeout setelah precheck tetap unknown/no-retry. API 409/503/404/204 dan zero-DB authorization guards ikut diverifikasi dengan transport sintetis dan SDK/Drizzle existing.

Full offline suite **26 files / 548 tests PASS**; coverage menjalankan 548 tests PASS dengan all-source scope/threshold informational existing. Depot repository: lines **95.83%**, branches **96.29%**, functions **100%**. Lint, typecheck, build Turbopack dan post-build typecheck PASS pada public snapshot dengan installed dependencies existing tanpa private env. Warning future native-config-loader Vite tetap informational. Source review independen: **0 Critical / 0 Important / 0 Minor** tersisa. Tidak ada perubahan service/API contract, auth/session/limiter, driver/dependency version, migration SQL atau journal.

Nama/komentar integration diselaraskan: `DEPOT_IN_USE` memverifikasi **guard aplikasi**, bukan membuktikan langsung rejection FK di SQL live. Existing schema/migration FK evidence tetap terpisah. Flow sukses memiliki hingga 38 query dengan current prechecks; query timeout 5 detik, overall test timeout 240 detik dan no-retry/unknown-write STOP tidak diubah. UUID ownership, registry ID, cleanup exact-ID child-first dan receipt absence tetap utuh.

**READY FOR SEPARATELY AUTHORIZED SCENARIO INTEGRATION RERUN** hanya untuk source/offline readiness. Gunakan existing `npm run test:db -- tests/integration/scenario-crud.integration.test.ts` dalam isolated local process setelah approval baru, fresh source/target/history/role guards, `APP_ENV=testing`, `RUN_DB_INTEGRATION=1`, exact `courier_route_planner_testing`, dan owner-supplied APPLICATION Testing; tidak ada fallback Dev/Production/admin/migrator. Scope tetap dua Depot/satu Scenario valid, operasi run sendiri dan cleanup terverifikasi; tanpa automatic retry. Jangan memakai approval atau snapshot source lama untuk menjalankan kode yang sudah berubah.

Live integration tetap **NOT PASS** sampai rerun aktual; Preview/release dan schema readiness Production tetap memerlukan checkpoint yang berlaku. Precondition membutuhkan tabel Scenario existing; Development/Testing migration sudah diterima, bukan izin apply Production. Physical runtime SQL identity **NOT VERIFIED**; Gate 1 CLOSED, Gate 2 OPEN. Order dan fitur lain tetap di luar scope.

## 18. Scenario integration rerun — actual evidence (2026-10-31)

Snapshot evidence rerun sebelum publikasi; status aplikasi belum published pada bagian ini tetap historis. Perkembangan setelah PR #31 dan laporan owner ada pada bagian 19.

Evidence berikut berasal dari satu eksekusi Testing yang diotorisasi setelah koreksi precondition, bukan pengujian ulang pada task dokumentasi ini. Historical NOT PASS di bagian 17 dan hasil probe/cleanup sebelumnya tetap dipertahankan.

- [DONE] Scenario CRUD selesai lokal. Migration 0001 Development/Testing dan schema/FK RESTRICT/index readback telah PASS pada checkpoint masing-masing. Development browser QA **8/8 PASS** adalah observasi owner. Existing offline suite **26 files / 548 tests PASS**, coverage, lint, typecheck, build dan post-build typecheck berlaku untuk source yang tidak berubah; tidak dijalankan ulang karena koreksi dokumentasi.
- [DONE] Tepat **1 invocation**, **1/1 test PASS**, exit **0**, hanya file Scenario melalui command existing di bawah. Isolated launcher memakai `APP_ENV=testing`, `RUN_DB_INTEGRATION=1`, exact database `courier_route_planner_testing` dan existing APPLICATION Testing. Tiga preflight read-only memverifikasi logical database/current account/TLS, dua ledger entries sesuai accepted history, dan ketiadaan fixture lama. Resource/role mapping memakai accepted independent owner records dan private-source metadata yang tidak berubah; bukan physical runtime SQL identity proof.

  ```bash
  npm run test:db -- tests/integration/scenario-crud.integration.test.ts
  ```

- [DONE] Test mengassert create/read/list/update/persistence/no-op/delete, lossless BIGINT ID/seed, default read-only `draft`, active-Depot acceptance, inactive-Depot create/switch rejection, dan retained inactive reference edit. Precondition reference flags **1, 0, 0**; flag positif menghasilkan `DEPOT_IN_USE` tanpa DELETE Depot. Dua DELETE Depot sesudah absence precheck berhasil. Ini bukti guard aplikasi; FK RESTRICT tetap safeguard database, sedangkan concurrency race **tidak diuji**.
- [DONE] Metadata mencatat **38 SQL operations**: **26 SELECT, 4 INSERT, 5 UPDATE, 3 DELETE**; semuanya HTTP 200, tanpa transport failure atau retry. Dua Depot dan satu Scenario valid dibuat; satu negative Scenario INSERT tidak membuat row. DELETE terdiri dari satu Scenario lalu dua Depot melalui flow dan cleanup exact-ID milik run.
- [DONE / LIMITATION] Assertion akhir test yang lulus memastikan `cleanupComplete=true` dan kedua `pending` kosong. Helper mencatat ID sebelum readback, memverifikasi ownership UUID, membersihkan child-first dan mengonfirmasi readback absence sebelum melupakan ID. Ini **cleanup evidence dari test yang berjalan**, bukan independent post-run absence verification berbasis ID tersimpan.
- [LIMITATION] Persisted wrapper tidak menangkap console receipt fixture: `fixture=null`, `cleanupVerified=false`, verdict **`STOP_NOT_PASS`** tetap dipertahankan. ID rerun tidak tersedia dari artefak tersimpan; raw stdout/stderr sengaja tidak disimpan. Jangan menebak atau mengganti dengan ID historis. Gap ini adalah reporting limitation, bukan bukti test/mutation gagal atau fixture tersisa. Tidak ada unresolved mutation yang teramati; tidak ada retry, SQL tambahan atau cleanup spekulatif untuk melengkapi receipt.
- [BOUNDARY] Physical runtime SQL identity tetap **NOT VERIFIED**. Generic `61100002` dan timeout pada mutation setelah precheck tetap unknown/503, tanpa klaim seluruhnya FK atau perbaikan historical intermittent login 503. Bagian 15–17 tetap snapshot historis; hasil PASS terbaru tidak menulis ulang kegagalan terdahulu.
- [PENDING] Phase 1B belum committed/published. Remote Quality Gate kandidat, actual Scenario Preview QA beserta auth/session/Origin/cookie/shared-limiter checks dan owner merge/release approval tetap terpisah. Production migration 0001 memerlukan review/approval sendiri sebelum release yang memakai tabel Scenario; tidak ada migration saat install/build/CI/deploy. Gate 1 CLOSED; Gate 2 OPEN. Order, freeze, generator dan algoritma tetap di luar scope.

## 19. Phase 1B Testing post-merge closure assessment (2026-11-01)

### Target dan provenance

Aplikasi sudah merged melalui [PR #31](https://github.com/ArdhanKurniawan/courier-route-planner/pull/31), bukan lagi kandidat aplikasi yang belum dipublikasikan. Accepted Testing SHA: `0beb0642b39bdb7194a25a9e72c340fbd07d4a40`. [Quality run 41269900374](https://github.com/ArdhanKurniawan/courier-route-planner/actions/runs/41269900374), event push/testing, completed SUCCESS untuk exact SHA. Metadata Vercel mengikat [stable Testing alias](https://courier-route-planner-git-testing-ardhankurniawans-projects.vercel.app) ke `dpl_96DD4QwZsw27ETQQa98fDSjuVwzz`, Preview/testing, SHA yang sama, READY 1 November 2026 pukul 10.37.46 WIB. Tree merge identik dengan feature commit `51489bee552c88723a130ea019b0d47ca00d125c`, sehingga existing source/test evidence dapat dipakai kembali.

Laporan owner diterima **1 November 2026**: Browser QA Scenario CRUD pada stable Testing Preview telah dilakukan dan hasilnya aman. Labelnya **OWNER-OBSERVED**, bukan automated atau independently verified. Environment/alias dan SHA di atas adalah konteks laporan dan target yang cocok pada metadata, bukan capture binding per HTTP request. **Tanggal/jam pelaksanaan QA aktual, browser, status/body per case dan screenshot/log terpisah belum diberikan (UNKNOWN).** Tanggal pelaporan maupun waktu READY deployment bukan waktu QA.

### Rekonsiliasi evidence

| Area | Evidence yang tersedia | Status dan batas pembuktian |
| --- | --- | --- |
| Scenario Create/Read/Update/Delete | Owner menyatakan Browser QA core CRUD pada stable Preview aman | **PASS — OWNER-OBSERVED agregat**; tidak mengarang hasil/status per endpoint |
| Persistence dan status draft | Existing Testing integration 1/1 dan offline assertions; belum ada rincian Browser QA baru | **PENDING — detail Browser QA**; existing service/DB evidence tetap berlaku |
| Validasi input server | Existing Zod/API unit tests; belum ada transkripsi negative Scenario HTTP pada stable Preview | **PENDING — detail Browser QA**; bukan klaim server validation belum diimplementasikan |
| Depot aktif/nonaktif | Existing integration menguji active create, inactive create/switch rejection, dan retained-inactive edit | **PENDING — detail Browser QA**; tidak mengubah layer integration menjadi owner browser evidence |
| FK RESTRICT / DEPOT_IN_USE | Existing schema/FK readback dan live application precondition proof | **PENDING — detail Browser QA**; concurrency race belum diuji |
| Authentication dan logout | Phase 1A historical owner observations serta existing guards/tests; laporan terbaru tidak merinci login/logout | **PENDING — detail post-merge Browser QA**; tidak menganggap semua auth checks PASS dari CRUD saja |
| Session/cookie | Existing absolute 12-hour/no-rolling contract dan synthetic tests | **PENDING — live expiry/non-renewal/cookie observations** |
| Origin protection dan shared limiter | Existing source/offline tests; belum ada rincian runtime negative-Origin/429 pada target ini | **PENDING — runtime detail**; tidak mengubah env, melemahkan limiter, atau menjalankan probe untuk mengisi tabel |
| Post-merge Quality Gate | GitHub run exact accepted SHA completed SUCCESS | **PASS — provider read**, bukan local rerun |
| Deployment/alias identity | Vercel READY, testing branch/SHA dan stable alias cocok | **PASS — control-plane metadata**, bukan Browser/DB isolation verification |

Existing 548/548 offline tests, Development browser QA 8/8 OWNER-OBSERVED, migration 0001 Development/Testing PASS dan live Testing integration 1/1 PASS tetap evidence bertanggal sebelumnya. Post-merge CI memverifikasi job quality; tidak menjalankan live DB integration. Tidak ada SQL, migration, integration, application HTTP atau Browser QA baru pada task dokumentasi ini.

### Readiness administratif dan pekerjaan yang tetap terbuka

**READY FOR ADMINISTRATIVE CLOSURE — Testing core Scenario CRUD**, dengan scope owner-observed agregat di atas bersama implementation/review, integration dan exact-commit CI/deployment evidence. Ini penilaian milestone core CRUD Testing, **bukan** klaim semua baris Browser QA PASS, seluruh Full Feature/Release DoD terpenuhi, Production-ready, atau Gate 2 CLOSED. Detail PENDING tetap terlihat untuk rekonsiliasi QA lanjutan; tidak menambah endpoint/verifier, SQL ulang atau syarat Gate 1 baru.

Residual evidence tetap: persisted integration fixture IDs/receipt tidak lengkap; wrapper `STOP_NOT_PASS`, `fixture=null`, `cleanupVerified=false` dipertahankan, meskipun test cleanup assertions lulus. Tidak tersedia independent post-run absence verification berbasis ID tersimpan. Physical runtime SQL identity **NOT VERIFIED**; FK concurrency race belum diuji; generic provider error tetap unknown/503 tanpa retry. Insiden login HTTP 503 historis belum memiliki root cause terkonfirmasi. Historical FAIL/PARTIAL serta snapshot bagian 15–18 tidak ditulis ulang menjadi PASS.

Revisi closure documentation ini masih lokal; branch/commit/push/PR memerlukan approval tersendiri. Production/main, env, credentials, migrations dan database tidak diubah. Gate 1 CLOSED; Gate 2 OPEN. Persiapan Phase 1C Order CRUD dapat diusulkan terpisah, tanpa implementasi pada task ini.

## 20. Phase 1C Order local implementation (2026-11-01)

Baseline: accepted Testing PR #32 merge 815485b3beca80cee105c49aca9acdb123042653. This is LOCAL SOURCE/OFFLINE evidence, not migration, runtime, Preview or Production acceptance. Gate 1 CLOSED; Gate 2 OPEN.

Owner approved canonical uppercase, max 64 Unicode characters, scoped case-insensitive uniqueness and then explicitly accepted accent-insensitivity. Tests exercise normalization/expansion, finite coordinates, nullable address, BIGINT string boundaries, strict source/Scenario immutability, scoped reads/mutations, actual-count independence, no-op update, duplicate/parent conflicts, malformed replies and fail-closed unknown outcomes. Protected API/page tests retain session/Origin/environment/body boundaries and zero DB acquisition for rejected requests. UI tests cover Scenario selection, manual create/edit/delete, dummy-source preservation, cancellation, pagination, expired access, stale edit reset, bounded errors and uncertain-write lock.

TDD: validation/schema RED 32 assertion failures -> 34/34 GREEN including the existing schema checks; backend/precondition RED 31 -> 31/31 GREEN; API RED 15 -> 15/15 GREEN; UI RED 11 and page/navigation RED 2 -> combined 24/24 GREEN; integration safety helper RED 6 -> 6/6 GREEN. Full regression: 34 files / 644 tests PASS at this checkpoint. Initial sandbox cache EPERM occurred before collection and is not RED evidence; a test-case BigInt-name formatter failure was corrected before the validation RED. A parallel-read fixture ordering issue and POST status fixture were corrected without weakening production behavior. TypeScript uses the existing target and lossless BigInt constructor, not newly unsupported literal syntax.

Final verification after focused review corrections: 34 files / 649 tests PASS; coverage, ESLint (zero warnings), Next route type generation + TypeScript, offline db:check, Turbopack build and post-build typecheck PASS. Documentation validation PASS: 430 internal links/anchors, 45 MASTER_GUIDE source parity checks and 47 MANIFEST byte/hash entries; git diff --check PASS. Historical/private source preservation is checked separately without credential reads. Initial typecheck rejected new BigInt literal syntax under the existing compiler target; lossless BigInt constructors corrected this without changing compiler config. Independent fresh-context review found 0 Critical, 1 Important (unrecognized JSON mutation errors did not lock writes), and 1 Minor (explicit Scenario reload kept stale selected configuration). Both were reproduced by four failing UI assertions and corrected: component suite 16/16 GREEN, then the final whole suite/quality checks above. The UI now accepts only known definitive status/code rejection pairs as recoverable; malformed/unrecognized responses stay uncertain until explicit successful reload. Selected Scenario metadata refreshes without changing Order count. No second independent re-review is claimed; the fixes are verified by regression tests. Tests/build run against a byte-matched public source copy with existing installed dependencies and no private env, clean child target environment, no new dependency install. The existing Vite native-config-loader warning is informational; file-only integration discovery also reports the existing mixed-export config warning. The initial public build's no-cache notice concerns build caching, not functional correctness. File-only discovery selected exactly the new Order integration file and executed no test body. No claim of live SQL or independent physical runtime SQL identity is made.

### Prepared Testing integration — NOT RUN

A separate exact-file flow is prepared for a later, explicitly authorized Testing APPLICATION run after migration 0002 and schema/collation/grants verification. Existing RUN_DB_INTEGRATION=1, APP_ENV=testing, exact logical database and local/non-Vercel guards remain unchanged; physical target/role use independent evidence, never only the logical name. This task reads no private credential.

Proposed invocation after approval and isolated private setup: npm run test:db -- tests/integration/order-crud.integration.test.ts. Maximum one invocation/no retry, 100 transport queries and a 600-second test bound; existing individual DB requests retain their 5-second timeout. Fixtures: one Depot, two Scenarios, three Orders (including a test-only dummy row), all tagged by UUID. The flow covers case/accent duplicate rejection, same code in another Scenario, cross-Scenario denial, configured-count independence, retained dummy source, no-op update and Scenario deletion restriction.

Record insert IDs before service readback; cleanup uses only recorded IDs and ownership markers in Order -> Scenario -> Depot order, with absence reads and a structured receipt even on failure. Unknown mutation/unrecorded ownership blocks further writes/cleanup. No broad query/delete, reset, seed, truncate, mutation retry or Production SQL. The live collation/FK and cleanup result remain PENDING until actually executed. Historical Phase 1B receipt STOP_NOT_PASS, physical identity NOT VERIFIED, untested FK concurrency and unresolved historical login 503 remain unchanged.

### Development migration TLS correction — LOCAL/OFFLINE ONLY, 2026-11-03

`db:migrate` now uses `scripts/migrate-development.mjs` with the installed mysql2 and official Drizzle ORM migrator. The Dev credential helper requires both TLS flags; the runner checks the authorized TLS socket and hostname before Drizzle queries. Kit's SSL validator no longer sits between these flags and mysql2. Testing/Production tooling, SQL 0000/0001/0002 and the journal are unchanged.

TDD regression first failed on missing hostname verification; the initial runner scaffold then failed behavior assertions before implementation. `tests/unit/dev-migration-runner.test.ts` mocks only mysql2 transport and keeps installed Drizzle hashing/splitting/migration code real. Offline coverage includes native hostname mismatch, unauthorized certificate and handshake failures, non-Dev zero acquisition, pending 0002 only after 0000/0001, already-recorded skip, historical ledger/hash parity, DDL failure, lost ledger acknowledgement, credential-free output, import safety and graceful/forced closure timeouts. Synthetic peer metadata is not a live TLS handshake or provider integration PASS.

No migration or live SQL was executed for this correction. Drizzle's timestamp-based selection still requires explicit preflight of all ledger hashes and schema state. Its transaction rollback does not promise atomic TiDB DDL rollback. Failure/ambiguous completion is STOP without retry or repair. Historical 649-test evidence and previous live/preflight verdicts are retained as dated evidence, not rewritten by these new offline checks. Actual corrected-path apply remains separately authorized work; Gate 1 CLOSED, Gate 2 OPEN.

Local verification 2026-11-03: 21 runner cases plus 53 DB environment cases PASS; full coverage run 35 files / 670 tests PASS. Lint, typecheck, offline `db:check`, build and post-build typecheck PASS. A clean-environment native Node 24 import also PASS without invoking the entrypoint. Existing Vite future-loader and Node typeless-ESM warnings are informational; no global module/PATH policy was changed to suppress them. Independent focused review closed with 0 Critical / 0 Important / 0 unresolved Minor findings. These are offline outcomes, not live migration/TLS or Production acceptance.

### Remaining human checkpoints

1. Separately authorize Development migration preflight; verify existing migration hashes/formatting history, exact target/resource/role/TLS, reviewed grants, live collation framework, and Scenario FK compatibility. Then review one-time apply and partial-failure mitigation separately.
2. After approved Dev apply, Browser QA with new owned fixtures: selection/counts, CRUD, invalid input, duplicate/cross-Scenario/source protections, cancellation and Scenario-in-use response. No automated claim from component tests.
3. Separately approve Testing migration and one bounded exact-file integration run with persisted cleanup receipt.
4. Pre-commit review and exact allowlist, then separate Git/PR authorization, required CI and actual Preview auth/cookie/Origin/limiter/Order QA. Owner release approval remains separate; no Production release is authorized here.

## 21. Phase 1C verification and Draft PR readiness (2026-11-07)

Sections 18–20 remain historical evidence. Phase 1C implements protected, Scenario-scoped Order CRUD and rejects incomplete TiDB SELECT responses before they can appear as empty lists. An empty first page that contradicts a positive count returns HTTP 503. The UI keeps writes locked until a successful reload. Valid empty results and exhausted cursor pages remain supported.

- **Accepted PASS** — migration `0002` in Development and Testing, Testing post-apply verification, and Development core Browser QA based on owner evidence. The previous reviewed snapshot passed 703/703 offline tests. The focused correction reproduced nine failures before the fix and passed 11/11 focused cases afterward. Final offline regression passed 714/714 tests across 35 files, including 25/25 receipt tests. ESLint, typecheck, offline db:check, build and post-build typecheck passed. Independent focused review found no unresolved findings.
- **PENDING / NOT EXECUTED** — live Order CRUD integration against Testing. Additional Browser/security QA is **PARTIAL**. Physical runtime SQL identity remains NOT VERIFIED, the FK concurrency race is untested, and the historical login 503 remains unresolved.
- **Receipt storage** — use an existing private local directory outside Git for `ORDER_INTEGRATION_RECEIPT_DIR`. On the verified Windows host, the existing user profile can be used from a normal local shell after the guard passes. Custom ACL provisioning and a dedicated receipt root are deferred. The runner rejects unsafe access, verifies the UUID run directory before storing a receipt, and retains durable tracking, scoped cleanup, and stop-on-ambiguity behavior. Reconciliation stays read-only.
- **Draft and merge** — a Draft PR to `testing` can be opened with pending QA recorded. [Quality Gate](../.github/workflows/quality.yml) is offline and required on the current PR candidate. Before merge, satisfy applicable acceptance criteria, verify Preview access and required QA, and obtain a green check on a current base. Live DB integration remains part of [Feature DoD](19_DEFINITION_OF_DONE.md#2-feature-dod). Production apply and release require separate approval.

Gate 1 CLOSED. Gate 2 OPEN.

## 22. UAT Testing Phase 1C dan 2A (2026-11-08)

Baseline Testing `5696902` mencakup Order CRUD Phase 1C (#33–#35), Map Phase 2A (#36), dan koreksi HTTP 503 pada Scenario kosong serta tes ResizeObserver (#37). [Quality Gate pada SHA Testing](https://github.com/ArdhanKurniawan/courier-route-planner/actions/runs/42475718520) dan [deployment Preview terkait](https://vercel.com/ardhankurniawans-projects/courier-route-planner/DHxc2tKYcPynRcnR2ccgqSwGWbKk) sudah diverifikasi.

| Status | Cakupan bukti |
|---|---|
| PASS — owner-observed Browser UAT | Login admin dan akses Map di Testing Preview. Owner membuat Order sintetis `QA-MAP-001`, melihat marker Depot dan Order, mengubah koordinat melalui CRUD, lalu melihat marker berpindah sesuai perubahan. |
| PASS — owner-observed penghapusan Order | Owner menghapus `QA-MAP-001` dan melihat daftar Order kembali kosong dengan jumlah aktual 0. Bukti ini mencakup Order tersebut dan daftar yang diamati. |
| PASS — bukti integrasi terpisah | Migrasi `0002` Development dan Testing, Testing Order CRUD live integration 1/1 termasuk isolasi Scenario dan cleanup terverifikasi dengan 0 fixture tersisa. |
| PENDING — Browser/security QA | Logout, akses dan mutasi tanpa sesi, atribut cookie dan perilaku sesi, penolakan Origin, limiter, dan detail Browser QA di luar alur yang dilaporkan owner. |

Temuan UX owner: `/login` masih dapat menampilkan form pada sesi admin aktif. Perbaikan redirect dicatat untuk setelah release ke `main`. [Roadmap](18_ROADMAP_BACKLOG.md#phase-1--admin-baseline)
