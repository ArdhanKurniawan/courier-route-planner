# 18 — ROADMAP & BACKLOG

## Phase 0 — Foundation

- repo;
- TailAdmin Next.js Free provenance/license audit;
- template baseline build;
- template cleanup (branding/menu/demo-only code/dependencies);
- Next.js TS;
- Node 24 standardization;
- TiDB Dev/Test/Prod;
- Drizzle connection;
- Vercel Production/Preview;
- env isolation;
- CI skeleton;
- health endpoint.

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
- seeded patterns;
- scenario data QA.

## Phase 3 — Benchmark foundation

- freeze scenario;
- benchmark case snapshots;
- canonical input hash;
- distance provider interface;
- research distance method after approval;
- matrix tests.

## Phase 4 — Algorithm A

- Nearest Neighbor;
- route validator;
- 2-Opt;
- distance recomputation;
- tests.

## Phase 5 — Algorithm B

- seeded RNG;
- ACO parameters;
- pheromone update;
- iteration;
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
- scenario matrix;
- repetitions;
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
- road-network distance comparison;
- courier-facing app;
- realtime tracking;
- multi-depot/VRP.

## Backlog priority convention

- P0: blocks core project/research.
- P1: required before public/final demo.
- P2: useful but optional.
- P3: future.
