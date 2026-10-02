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

Target tests di atas belum tersedia pada baseline TailAdmin. Audit 2026-10-02 menemukan script lint/build saja; typecheck/test dan Vitest/Playwright adalah foundation gap, bukan PASS. Untuk task documentation-only, periksa diff, internal links, source/derived parity, actual manifest hashes, dan research contract consistency; jalankan lint/build jika environment tersedia tanpa menambah implementation di luar scope.
