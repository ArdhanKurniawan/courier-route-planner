# 23 — PHASE GATES & CHECKLISTS

Jangan pindah phase hanya karena “kelihatannya jalan”.

## Gate 0 — Team readiness

- [ ] semua anggota punya Git;
- [ ] Node 24.x;
- [ ] npm;
- [ ] bisa clone/pull/branch/commit/push;
- [ ] paham Preview vs Production;
- [ ] paham TiDB Dev/Test/Prod;
- [ ] membaca `AGENTS.md`;
- [ ] membaca `docs/30_UI_TEMPLATE_GUIDE.md`;
- [ ] paham template Free vs Pro dan third-party provenance.

## Gate 1 — Foundation

**Status: OPEN.** Phase 0A CLOSED/merged via PR #7; evidence pada [quality foundation report](proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md) dan [independent verification](proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md):

- [x] Node 24 contract dalam `package.json` dan `.nvmrc`;
- [x] clean `npm ci` PASS;
- [x] lint PASS;
- [x] typecheck dari generated state bersih PASS;
- [x] unit/component testing foundation PASS (2 files, 11 tests);
- [x] V8 coverage command/report PASS, tanpa threshold;
- [x] build PASS;
- [x] audit runtime-only 0 findings; 15 dev-only findings terdokumentasi.

Phase 0B **CLOSED/merged via PR #8**, [independent verification PASS](proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md): strict APP_ENV parser, safe template, app-only health unchanged; baseline 4 files / 48 tests PASS.

Phase 0C Stage 1 offline foundation implemented locally / verification PASS: pure DB parser, lazy server-only HTTP client, depots-only schema, separate readiness unit behavior, generated/reviewed SQL + db:check PASS (initial migration kini Dev-applied oleh manusia). Current suite 9 files / 147 tests; runtime audit 0, full 19 (1 low, 6 moderate, 12 high, 0 critical), +4 moderate dev-tooling delta. [Stage 1 evidence](proses/phase-0/0c/PHASE_0C_IMPLEMENTATION_REPORT.md). [Independent offline verification PASS](proses/phase-0/0c/PHASE_0C_OFFLINE_INDEPENDENT_VERIFICATION_REPORT.md). Dev sudah diprovision manusia; [live read-only verification](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md) PASS untuk health/readiness HTTP 200, application read, migration TCP/TLS, ledger 1 entry dan depots schema/PK/index. Final independent Phase 0C review pending; Testing deferred sebelum integration/Preview Phase 0D, Production sebelum rollout. Target tiga independent resources tetap ADR-008.

Checklist keseluruhan tetap OPEN: final independent Phase 0C review, Vercel main/Preview, Preview DB isolation, CI dan reproduksi anggota kedua belum diverifikasi:

- [ ] TailAdmin Free provenance + adopted SHA tercatat;
- [ ] no TailAdmin Pro/paid asset;
- [ ] template baseline build pass sebelum cleanup;
- [ ] route-planner menu/branding baseline;
- [ ] ApexCharts tidak menjadi approved core dependency / cleanup status terdokumentasi;
- [ ] Next.js local works;
- [ ] build pass;
- [x] app-only health endpoint (Phase 0B CLOSED/PR #8, independent PASS);
- [x] Phase 0C offline parser/client/depots/migration/readiness + unit evidence;
- [x] human Dev provisioning/first migration apply selesai; account/settings approval adalah human evidence, tidak diaudit ulang oleh task read-only;
- [x] TiDB Dev connection: HTTP application dan TCP/TLS migration roles verified;
- [ ] final independent Phase 0C verification;
- [ ] Vercel main deployment;
- [ ] Vercel feature preview;
- [ ] Preview DB != Production DB;
- [ ] CI basic green;
- [x] `.env.local` ignored; `.env.example` exception verified (Phase 0B);
- [ ] second team member can reproduce setup.

## Gate 2 — CRUD baseline

- [ ] depot CRUD accepted;
- [ ] scenario CRUD accepted;
- [ ] order CRUD accepted;
- [ ] server validation;
- [ ] DB integration tests;
- [ ] error/empty states;
- [ ] no production data used in testing.

## Gate 3 — Dataset + map

- [ ] markers correct;
- [ ] OSM attribution;
- [ ] seeded generator deterministic;
- [ ] edit generated order;
- [ ] primary random generator covered; optional clustered/circular/directional tested if implemented;
- [ ] marker/map component independent of OSRM HTTP client; Table matrix foundation proceeds at Gate 4.

## Gate 4 — Research input foundation

- [ ] scenario freeze;
- [ ] immutable benchmark snapshots;
- [ ] input hash stable;
- [ ] routability validation dan coordinate/snap evidence;
- [ ] OSRM Table road-network matrix produced, unit meter;
- [ ] directed/asymmetric NxN validation, depot index 0, stable node order;
- [ ] no unreachable/null pair, common ACO zero-distance eligibility checked;
- [ ] matrix hash stable and verified against actual values;
- [ ] matrix frozen in immutable storage;
- [ ] matrix validation/hash/freeze/replay tests.

## Gate 5 — NN + 2-Opt

- [ ] known fixture pass;
- [ ] route valid;
- [ ] 2-Opt not worse;
- [ ] no duplicate/missing point;
- [ ] framework-independent.
- [ ] NN deterministic directed minimum, lowest-node-index tie;
- [ ] best-improvement 2-Opt full directed recomputation, asymmetric trap tests;
- [ ] symmetric-only delta shortcut absent.

## Gate 6 — ACO

- [ ] seeded reproducibility;
- [ ] route valid;
- [ ] parameter validation;
- [ ] no NaN;
- [ ] multi-run support;
- [ ] no hidden default claimed scientific.
- [ ] Classical Ant System, directed pheromone, all valid ants deposit, fixed iterations;
- [ ] no 2-Opt after ACO in main comparison.

## Gate 7 — Benchmark engine

- [ ] same frozen OSRM matrix values/order/input hash/matrix hash;
- [ ] timing boundary correct;
- [ ] raw runs stored;
- [ ] summary reproducible;
- [ ] CLI runner;
- [ ] predetermined balanced execution order dan dataset ordinal mapping tersimpan sesuai [protocol bagian 6](15_RESEARCH_BENCHMARK_PROTOCOL.md#6-environment-and-timer-boundary);
- [ ] metadata/commit SHA captured.
- [ ] timer excludes OSRM/DB/network/serialization/geometry/rendering;
- [ ] 5 warm-ups excluded, 30 ACO seeded runs, 30 NN+2-Opt timing samples;
- [ ] calibration separated, global configuration frozen;
- [ ] main 10/25/50 × 10 random datasets; N=100 conditional and other patterns optional;
- [ ] mean/median ACO primary comparison, raw failures retained, dataset-level observations;
- [ ] Phase A verification → B calibration → C pilot → D main evidence per docs/15.

## Gate 8 — Public security

- [ ] auth active;
- [ ] authorization active;
- [ ] no anonymous mutation;
- [ ] resource limits;
- [ ] secrets audit;
- [ ] Preview cannot access Prod DB.

## Gate 9 — Release

- [ ] full CI;
- [ ] E2E critical flow;
- [ ] UAT evidence;
- [ ] DB migration safe;
- [ ] backup/export if needed;
- [ ] release notes;
- [ ] rollback plan;
- [ ] post-deploy smoke plan.
