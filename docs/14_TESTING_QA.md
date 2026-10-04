# 14 — TESTING & QA STRATEGY

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

## 10. Current testing foundation — Phase 0A/0B/0C closed + Phase 0D-1 local

Verifikasi lokal 2026-10-03: Vitest adalah unit/component runner; React Testing Library, jest-dom dan jsdom tersedia sebagai dev dependencies. `tests/setup.ts` memuat jest-dom Vitest matchers dan explicit `afterEach(cleanup)` agar render antar test tetap independent tanpa global Vitest APIs. `next/link` diuji langsung tanpa mock.

`tests/unit/navigation.test.ts` memproteksi 12 routes, href valid/unique dan 10 domain placeholders. `tests/unit/dashboard.test.tsx` memproteksi identitas, status shell yang jujur, status Depot/Route Optimization, link `/about`, serta absennya Revenue/Monthly Sales/Monthly Target. Baseline Phase 0A: 2 files, 11 tests PASS; CLOSED/merged via PR #7.

Phase 0B menambah `tests/unit/env.test.ts` (18 tests) dan `tests/unit/health.test.ts` (19 tests), dengan `// @vitest-environment node` per file. Tests memeriksa exact APP_ENV enum/rejections, fixed safe error, pure parser, import safety, GET current-value validation, 200/503 exact minimal JSON, JSON/no-store headers, DATABASE_URL absent, dan unexpected exception propagation. Semua handler/parser diuji langsung; satu scoped parser spy mensimulasikan unexpected exception. Env stubs dipulihkan dengan afterEach; tidak ada HTTP server, DB atau Playwright.

Phase 0B CLOSED/merged via PR #8, [independent verification PASS](proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md). Historical baseline: **4 files / 48 tests PASS**; V8 statements 4.95%, branches 3.68%, functions 6%, lines 5.36%.

Phase 0C Stage 1 offline suite: **9 files / 147 tests PASS**, seluruh 48 tests lama dipertahankan. Lima file baru: `db-env` (53), `db-schema` (1), `db-client` (7), `db-readiness` (27), `ready` (11). TDD RED/GREEN memeriksa pure Zod parser + safe errors + Dev guard/TLS, schema import safety, lazy real ORM/HTTP driver dengan fake transport, fresh 5000 ms signal, abort sebelum headers dan saat body pending, no retry, provider/malformed/unexpected result, serta exact 200/503 JSON/no-store. Route menggunakan real readiness logic dengan scoped acquisition boundary; unexpected acquisition bugs tidak dilaporkan sukses. Tidak ada real network/DB credential.

Vitest membutuhkan test-only alias/fixture untuk Next `server-only` marker; production boundary tetap aktif. Coverage mencakup seluruh src TS/TSX termasuk DB, tanpa threshold/exclusion baru. Metrics aktual dan full/runtime audit delta tercatat pada [Stage 1 report](proses/phase-0/0c/PHASE_0C_IMPLEMENTATION_REPORT.md). `npm run db:check` memeriksa offline migration history, bukan live schema/status. Independent offline verification PASS. [Dev live read-only verification](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md) mencatat health/readiness HTTP 200, application SELECT COUNT(*) FROM depots, migrator SELECT 1/TLS dan ledger/schema/PK/index checks PASS; initial migration diterapkan manusia sebelum verification. DB integration/CRUD tests tetap pending. [Final independent verification PASS](proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md); Phase 0C CLOSED/PR #9 merged ke testing pada `e1c36988e588e397af312a140677c3f71bd451d2`. Fresh quality tetap memakai salinan source dengan lockfile yang sama tanpa env privat.

Scripts aktual: `npm run typecheck` menghasilkan Next route types sebelum `tsc --noEmit`; `npm run test`, `npm run test:watch` dan `npm run test:coverage` tersedia. Clean install lint/typecheck/test/coverage/build PASS. Coverage V8 menghasilkan text, HTML dan JSON summary untuk seluruh `src/**/*.{ts,tsx}`, termasuk modules yang belum diuji; **NO COVERAGE THRESHOLD**, angka hanya baseline informasi. Generated reports di `coverage/` ignored oleh Git dan ESLint. Vite memberi warning future native config loader pada config TypeScript yang ada; current runner PASS.

Playwright/E2E, DB integration tests dan domain algorithm/matrix tests di atas masih pending sampai implementation target tersedia. Detail evidence: [Phase 0A report](proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md). Untuk task documentation-only, periksa diff, internal links, source/derived parity, actual manifest hashes, dan research contract consistency tanpa menambah implementation di luar scope.

## 11. Phase 0D-1 quality-only CI

[Quality workflow](../.github/workflows/quality.yml) IMPLEMENTED LOCALLY; remote Linux run dan required-status-check enforcement PENDING Phase 0D-2. Required order: npm ci → lint → typecheck → test → test:coverage → db:check → build → typecheck → runtime audit. Full audit terakhir informational untuk valid advisories; invalid/tool/transport result gagal, tanpa blanket ignore. [Exact CI contract](12_CI_CD_RELEASE.md) dan [fresh local implementation evidence](proses/phase-0/0d/PHASE_0D_CI_IMPLEMENTATION_REPORT.md).

Coverage tanpa numeric threshold. Workflow tidak memakai secret, real DB, migration, deploy atau live readiness check. YAML/static review dan probe perilaku audit memakai tooling existing/TEMP; tidak menambah dependency atau mengubah application tests. Local reproduction tidak membuktikan GitHub remotely green. Gate 1 tetap OPEN.
