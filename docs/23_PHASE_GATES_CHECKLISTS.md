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

Phase 0C **CLOSED/PR #9 merged** ke testing pada `e1c36988e588e397af312a140677c3f71bd451d2`; [final independent verification PASS](proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md) dan [remote closure evidence](proses/phase-0/0d/PHASE_0D_BASELINE_AUDIT_REPORT.md#c-phase-0c-closure-evidence). Pure DB parser, lazy server-only HTTP client, depots-only schema, readiness unit behavior, generated/reviewed SQL + db:check PASS. Historical suite 9 files / 147 tests; runtime audit 0, full 19 (1 low, 6 moderate, 12 high, 0 critical). Dev diprovision dan initial migration applied sekali oleh manusia; [Dev live verification](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md) PASS untuk health/readiness HTTP 200, application read, TCP/TLS, ledger dan depots schema/PK/index. Testing live foundation PASS pada 0D-3B; Production tetap deferred. Target tiga independent resources, tanpa shared fallback.

Phase 0D [quality workflow](../.github/workflows/quality.yml) **REMOTE VERIFIED; TESTING BEHAVIOR VERIFIED, MAIN BEHAVIOR DEFERRED**. [Behavioral evidence](proses/phase-0/0d/PHASE_0D_ENFORCEMENT_BEHAVIOR_PROOF_REPORT.md). PR/push testing/main, Quality Gate, sembilan required commands, no secrets/DB/deploy/migrate; full audit informational dengan invalid/tool-error gate. [Local implementation evidence](proses/phase-0/0d/PHASE_0D_CI_IMPLEMENTATION_REPORT.md).

0D-3A Testing migration tooling merged/PR #14; [report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md). 0D-3B Testing PROVISIONED terpisah dari Dev, migration APPLIED ONCE setelah human approvals, live verification PASS; [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production NOT PROVISIONED; Vercel NOT CONNECTED. Phase 0D/Gate 1 tetap OPEN: main behavioral proof, Production live foundation, Vercel main/Preview, Preview DB isolation dan reproduksi anggota kedua pending:

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
- [x] final independent Phase 0C verification PASS dan PR #9 merged/remote testing verified;
- [x] quality-only CI workflow implemented locally;
- [ ] Vercel main deployment;
- [ ] Vercel feature preview;
- [ ] Preview DB != Production DB;
- [x] CI basic green pada real GitHub Linux runner;
- [x] exact required Quality Gate/app15368 configured pada testing/main dengan strict freshness; testing behavioral proof VERIFIED;
- [ ] main behavior DEFERRED ke actual testing → main promotion;
- [x] local Testing migration tooling: explicit APP_ENV/testing DB/TLS/config/script + offline guard tests;
- [x] dedicated Testing resource/roles/private env/empty-state proof + explicit apply checkpoint; migration APPLIED ONCE, ledger/schema/app read/health/readiness PASS (0D-3B);
- [x] Production TOOLING PREPARED ONLY: exact Production guard/TLS/config/manual script + offline cross-env tests; [Production tooling report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md);
- [ ] Production NOT PROVISIONED / NOT MIGRATED; live foundation needs separate provisioning and migration approvals;
- [x] `.env.local` ignored; `.env.example` exception verified (Phase 0B);
- [ ] second team member can reproduce setup.

Vercel preflight [NOT READY / blocked](proses/phase-0/0d/PHASE_0D_VERCEL_PREVIEW_PREFLIGHT_REPORT.md), no project/deployment. Production tooling does not close Gate 1 or authorize cloud operations/main promotion. Dev established/live dan Testing live, migrated once, verified remain preserved.

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
