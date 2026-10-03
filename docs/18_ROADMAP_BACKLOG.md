# 18 — ROADMAP & BACKLOG

## Phase 0 — Foundation

### Phase 0A — Quality Foundation

Implemented locally, verified 2026-10-03; independent review dan reproduksi anggota kedua masih pending:

- [x] repo, Next.js + TypeScript strict;
- [x] TailAdmin Next.js Free provenance/license audit, template baseline build dan cleanup (branding/menu/demo-only code/dependencies);
- [x] controlled Next.js + eslint-config-next patch `16.3.6`;
- [x] Node 24 contract (`engines.node = 24.x`, `.nvmrc = 24`);
- [x] explicit typecheck dengan Next type generation;
- [x] Vitest/RTL/jest-dom/jsdom/V8 coverage, 2 regression test files / 11 tests PASS;
- [x] clean install lint/typecheck/test/coverage/build PASS dan audit delta terdokumentasi.

### Phase 0B — Environment + Health

- [ ] env validation dan contoh env tanpa secret;
- [ ] app-only health endpoint.

### Phase 0C — Database Foundation

- [ ] TiDB Dev/Test/Prod;
- [ ] Drizzle connection, Zod validation dan migration foundation;
- [ ] safe DB health verification.

### Phase 0D — CI + Vercel Integration

- [ ] Vercel Production/Preview;
- [ ] env isolation dan Preview DB != Production DB;
- [ ] CI skeleton menjalankan quality scripts;
- [ ] second-member setup reproduction dan Gate 1 review.

Phase 0 dan Gate 1 tetap OPEN. Playwright/E2E foundation mengikuti implementation target pada phase berikutnya; [Phase 0A evidence](proses/PHASE_0A_QUALITY_FOUNDATION_REPORT.md).

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
