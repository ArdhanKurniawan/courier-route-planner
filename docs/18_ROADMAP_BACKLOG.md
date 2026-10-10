# 18 — ROADMAP & BACKLOG

## Phase 0 — Foundation

### Phase 0A — Quality Foundation

**CLOSED / merged via PR #7** ke `testing` pada `f73834aa4bb38ada5c289fa30a0b6fb6aa608f26`; [independent verification](proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md) tersedia. Reproduksi anggota kedua tetap Phase 0D:

- [x] repo, Next.js + TypeScript strict;
- [x] TailAdmin Next.js Free provenance/license audit, template baseline build dan cleanup (branding/menu/demo-only code/dependencies);
- [x] controlled Next.js + eslint-config-next patch `16.3.6`;
- [x] Node 24 contract (`engines.node = 24.x`, `.nvmrc = 24`);
- [x] explicit typecheck dengan Next type generation;
- [x] Vitest/RTL/jest-dom/jsdom/V8 coverage, 2 regression test files / 11 tests PASS;
- [x] clean install lint/typecheck/test/coverage/build PASS dan audit delta terdokumentasi.

### Phase 0B — Environment + Health

**CLOSED / merged via PR #8**, independent verification PASS. Evidence: [verification report](proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md).

- [x] strict runtime APP_ENV validation dan `.env.example` tanpa secret;
- [x] app-only GET health, 200/503 minimal JSON + no-store, tanpa DB;
- [x] env/health Node unit tests; Phase 0B baseline 4 files / 48 tests PASS.

### Phase 0C — Database Foundation

**CLOSED / merged via PR #9** ke testing pada `e1c36988e588e397af312a140677c3f71bd451d2`; [final independent verification PASS](proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md) dan [remote closure/tree evidence](proses/phase-0/0d/PHASE_0D_BASELINE_AUDIT_REPORT.md#c-phase-0c-closure-evidence). Offline implementation dan [independent offline verification PASS](proses/phase-0/0c/PHASE_0C_OFFLINE_INDEPENDENT_VERIFICATION_REPORT.md); [read-only live report](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md).

- [x] approved exact runtime Drizzle/TiDB HTTP/Zod + dev-only Kit/mysql2;
- [x] pure DB URL parser/Dev CLI guard, lazy server-only client;
- [x] depots-only schema; SQL generated/reviewed/check PASS, initial migration **APPLIED ONCE ON DEV** oleh manusia;
- [x] separate GET /api/ready, 5000 ms/no retry/minimal JSON; offline unit behavior PASS;
- [x] 9 files / 147 tests, coverage dan quality checks offline PASS;
- [x] human Dev provisioning dan first migration apply selesai; dedicated roles/private env tersedia;
- [x] independent offline verification PASS;
- [x] live Dev health/readiness HTTP 200; application read dan migration TCP/TLS SELECT 1 PASS;
- [x] ledger 1 entry + hash/journal match; live depots schema/PK/index sesuai source/SQL;
- [x] final independent Phase 0C verification PASS; PR #9 merged dan remote testing verified;
- [x] Testing resource/evidence: deferred dari Phase 0C, kini PROVISIONED, initial migration APPLIED ONCE dan live verification PASS pada 0D-3B; [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md);
- [ ] Production resource/evidence: deferred sebelum controlled rollout.

Dev-first tetap menargetkan tiga independent Starter resources (ADR-008), tanpa shared fallback.

### Phase 0D — CI + Vercel Integration

**Phase 0D OPEN — CI + TESTING QUALITY GATE BEHAVIOR VERIFIED; MAIN BEHAVIOR DEFERRED.** [Implementation report](proses/phase-0/0d/PHASE_0D_CI_IMPLEMENTATION_REPORT.md); [approved baseline](proses/phase-0/0d/PHASE_0D_BASELINE_AUDIT_REPORT.md). Testing live foundation PASS pada 0D-3B; Vercel integration/Preview isolation, Production foundation dan reproduction masih pending.

- [x] satu quality-only workflow Quality / quality / Quality Gate, PR dan push testing/main;
- [x] Node 24/npm cache, read-only permissions, approved concurrency, timeout 10 menit;
- [x] existing required commands, coverage tanpa threshold, offline db:check, runtime hard audit/full informational parser;
- [x] real remote Linux Actions verification dan exact Quality Gate/GitHub Actions app15368 required pada testing/main; strict freshness;
- [x] testing behavioral enforcement proof (PR #12); [report](proses/phase-0/0d/PHASE_0D_ENFORCEMENT_BEHAVIOR_PROOF_REPORT.md);
- [ ] main behavioral proof pada future real testing → main promotion;
- [x] 0D-3A Testing migration tooling prepared locally: exact guard/TLS/config/script + offline tests; [report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md);
- [x] 0D-3B dedicated Testing resource/roles/private env/read-only verification + separately approved one-time apply; Testing PROVISIONED, migration APPLIED ONCE, live verification PASS; [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md);
- [x] Production TOOLING PREPARED ONLY: explicit exact guard/TLS/config/manual command + offline cross-env tests; [Production tooling report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md);
- [ ] Production NOT PROVISIONED / NOT MIGRATED; independent live foundation memerlukan separate provisioning dan apply approvals;
- [ ] Vercel preflight NOT READY / blocked; no project/deployment; Production live readiness dan first-deployment/bootstrap design pending; [preflight report](proses/phase-0/0d/PHASE_0D_VERCEL_PREVIEW_PREFLIGHT_REPORT.md);
- [ ] env isolation dan Preview DB != Production DB;
- [ ] second-member setup reproduction dan Gate 1 review.

Phase 0 dan Gate 1 tetap OPEN. Playwright/E2E foundation mengikuti implementation target pada phase berikutnya; [Phase 0A evidence](proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md).

## Phase 1 — Admin baseline

- app shell/navigation dari TailAdmin yang sudah dibersihkan;
- depot CRUD;
- scenario CRUD;
- order CRUD;
- validation;
- basic tests.

## Phase 2 — Map & dataset

- Leaflet client component;
- depot/customer marker;
- edit marker/coordinates;
- dummy generator;
- seeded random primary generator; clustered/circular/directional optional additional support;
- scenario data QA.

## Phase 3 — Benchmark Input Foundation

- freeze scenario;
- benchmark case snapshots;
- canonical input hash;
- road routability validation;
- OSRM Table adapter / DistanceProvider infrastructure sesuai [docs/34](34_OSRM_DISTANCE_CONTRACT.md);
- directed/asymmetric road-network matrix, meter, stable node order;
- no null/unreachable pair, ACO common eligibility;
- matrix hash + immutable distance_matrices storage/freeze;
- validation and freeze/replay tests.

## Phase 4 — Algorithm A

- deterministic Nearest Neighbor (depot=0, lowest-index tie);
- route validator;
- best-improvement 2-Opt, full directed recomputation;
- distance recomputation;
- tests.

## Phase 5 — Algorithm B

- seeded RNG;
- Classical Ant System explicit parameters (numerical final values tetap OPEN);
- directed pheromone evaporation/deposit semua valid ants;
- fixed iterations, tanpa post-ACO 2-Opt;
- route validation;
- reproducibility tests.

## Phase 6 — Experiment engine

- benchmark runner;
- experiment runs;
- summary stats;
- result comparison UI;
- route visualization;
- CSV export.

## Phase 7 — Research runner

- CLI benchmark;
- hardware/environment metadata;
- Phase A verification → B separate calibration + global config freeze → C pilot → D main sesuai [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md);
- main 10/25/50 customer × 10 independent random datasets = 30 datasets;
- 5 warm-ups, 30 independent seeded ACO runs, satu NN quality + 30 timing repetitions;
- output dataset;
- verification script.

## Phase 8 — Security & public demo

- Auth.js integration;
- GitHub OAuth allowlist;
- mutation authorization;
- resource limits;
- security audit.

## Phase 9 — QA & release

- E2E;
- UAT;
- regression fixes;
- docs;
- final release;
- demo script.

## P2 / Future

- OSRM road geometry;
- N=100 conditional setelah pilot, serta clustered/circular/directional additional experiments bila dipilih;
- courier-facing app;
- realtime tracking;
- multi-depot/VRP.

OSRM **Table matrix** ada di Phase 3 dan merupakan core formal research input. Item OSRM road geometry di atas hanya visualisasi. Roadmap adalah target; [README](../README.md#current-implementation-status) mencatat baseline aktual.

## Backlog priority convention

- P0: blocks core project/research.
- P1: required before public/final demo.
- P2: useful but optional.
- P3: future.
