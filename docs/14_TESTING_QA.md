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
- symmetry bila metric simetris;
- no NaN/Infinity;
- known point distances.

### Nearest Neighbor

Test:

- start/end depot;
- every customer exactly once;
- deterministic tie policy documented;
- known small instance.

### 2-Opt

Test:

- route remains permutation;
- depot fixed start/end;
- distance not worse than input route;
- crossing/simple known route improves where expected.

### ACO

Test:

- valid route;
- fixed seed reproducibility;
- parameter validation;
- zero pheromone/division edge prevention;
- known small instance sanity.

## 3. Property/invariant testing mindset

Untuk routing, invariant sering lebih penting daripada exact route karena beberapa route dapat sama jaraknya.

Assert:

```text
valid closed tour
+ same customer set
+ recomputed distance matches
```

## 4. Integration tests

Test service + TiDB Dev/Test database untuk:

- scenario CRUD;
- freeze benchmark case;
- save experiment;
- route history reconstruction.

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
