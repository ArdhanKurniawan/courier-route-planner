# 22 — AI PROMPT LIBRARY

Prompt di bawah dirancang untuk coding agent seperti Codex/Claude/Gemini/agent IDE. Sesuaikan nama tool bila perlu.

Semua prompt penelitian tunduk pada [docs/32](32_RESEARCH_DECISIONS.md), [docs/33](33_ALGORITHM_SPECIFICATION.md), [docs/34](34_OSRM_DISTANCE_CONTRACT.md) dan [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md). Approved target berbeda dari current implementation di README. Prompt adalah template untuk task berikutnya, bukan otorisasi menjalankan seluruh fitur pada task documentation sync.

---

# A. MASTER IMPLEMENTATION PROMPT

```text
Anda bekerja pada repository Courier Route Planner.

MANDATORY BEFORE ANY CHANGE:
1. Baca AGENTS.md sepenuhnya.
2. Baca README.md dan dokumentasi yang relevan dengan task; untuk research baca docs/15, docs/32, docs/33, docs/34.
3. Audit state repository, kode existing, tests, dan schema terkait.
4. Jangan mengubah kode sebelum audit singkat selesai.

TASK:
<ISI TASK SPESIFIK>

IN SCOPE:
- <scope 1>
- <scope 2>

OUT OF SCOPE:
- <out 1>
- <out 2>

ACCEPTANCE CRITERIA:
- [ ] <AC 1>
- [ ] <AC 2>

ENGINEERING RULES:
- Ikuti architecture boundary di docs/03_SYSTEM_ARCHITECTURE.md.
- Jangan taruh core algorithm di Route Handler/React component.
- Semua input mutation server-side wajib divalidasi.
- Jangan menambah dependency tanpa justifikasi.
- Jangan mengubah production data.
- Jangan commit/push.
- Jangan mengubah scope penelitian.

AFTER IMPLEMENTATION, WAJIB RUN:
- npm run lint
- npm run typecheck
- npm run test
- npm run build

Jika task menyentuh algorithm, tambahkan invariant tests.
Jika task menyentuh DB, audit migration dan environment safety.

OUTPUT AKHIR:
1. Audit awal.
2. Plan yang benar-benar dikerjakan.
3. Changed files.
4. Design decisions.
5. Test/command evidence dengan PASS/FAIL.
6. Manual checks yang masih diperlukan.
7. Known limitations/risks.
8. Out-of-scope yang sengaja tidak dikerjakan.

Jika ada conflict/ambiguity yang dapat mengubah architecture, schema penting, security, atau research methodology: STOP dan tanya saya.
```

---

# B. MASTER VERIFICATION PROMPT

```text
Lakukan independent verification terhadap pekerjaan terakhir.
Jangan mengasumsikan implementasi benar.

MANDATORY:
1. Baca AGENTS.md.
2. Baca task/acceptance criteria.
3. Inspect git status dan diff.
4. Review hanya perubahan terkait task dan side effect-nya.
5. Cari bug, regression, security issue, architecture violation, schema risk, missing tests, dan scope creep.

WAJIB VALIDATE:
- acceptance criteria satu per satu;
- lint/typecheck/test/build;
- no secret;
- environment safety;
- error handling;
- docs/contract consistency.

Jika algorithm berubah:
- depot start/end;
- customer exactly once;
- no duplicate/missing;
- recomputed distance;
- fixed-seed reproducibility untuk stochastic code;
- same input semantics.

Jika DB berubah:
- migration safety;
- no destructive prod action;
- immutable benchmark history tetap aman;
- rollback/mitigation.

OUTPUT:
A. VERDICT: PASS / PASS WITH FINDINGS / FAIL.
B. Findings berdasarkan severity: BLOCKER/HIGH/MEDIUM/LOW.
C. Evidence: file + line/command.
D. Acceptance Criteria matrix.
E. Commands dan hasil.
F. Manual verification yang masih perlu.
G. Corrective actions minimal.

Jangan memperbaiki kode kecuali saya minta. Ini audit saja.
```

---

# C0. TEMPLATE ADOPTION & CLEANUP PROMPT

```text
Kerjakan TEMPLATE ADOPTION / CLEANUP ONLY untuk Courier Route Planner.

MANDATORY BEFORE ANY CHANGE:
1. Baca AGENTS.md.
2. Baca docs/30_UI_TEMPLATE_GUIDE.md.
3. Baca THIRD_PARTY_NOTICES.md.
4. Audit source TailAdmin Free yang ada di repository.
5. Audit package.json dan identify demo-only dependencies.
6. Jangan mengambil asset/component Pro.

GOAL:
- gunakan TailAdmin Next.js Free hanya sebagai UI shell;
- ganti branding dasar menjadi Courier Route Planner;
- ubah sidebar/menu ke domain Route Planner;
- hapus e-commerce/demo content yang tidak relevan secara bertahap;
- preserve working responsive layout;
- preserve license/provenance notice;
- remove unused demo dependencies hanya setelah imports/pages bersih;
- targetkan removal apexcharts/react-apexcharts sesuai project guardrail.

DO NOT:
- implement TiDB/domain schema;
- implement depot/order CRUD;
- implement Leaflet route planner;
- implement algorithms;
- implement auth;
- copy TailAdmin Pro asset;
- add second UI framework/template;
- rewrite entire template in one shot;
- commit/push.

MANDATORY VERIFICATION:
- npm run lint
- npm run typecheck (add baseline script if project requires it)
- npm run test (if baseline exists; otherwise document foundation gap)
- npm run build
- npm ls apexcharts react-apexcharts
- manual responsive sidebar/header check
- browser console check
- verify no paid/Pro asset

OUTPUT:
1. upstream/template provenance inspected;
2. pages/components kept;
3. pages/components removed;
4. dependencies removed/kept + reasons;
5. license/provenance status;
6. command evidence;
7. manual checks remaining;
8. risks/out-of-scope.
```

---

# C. PHASE 0 — FOUNDATION PROMPT

```text
Kerjakan FOUNDATION ONLY untuk project Courier Route Planner.

Goal:
- start from the approved TailAdmin Next.js Free baseline after template adoption;
- preserve Next.js App Router + TypeScript + Tailwind foundation;
- standardize Node 24.x;
- normalize project structure without discarding useful TailAdmin UI shell;
- add /api/health;
- prepare env validation pattern;
- prepare scripts lint/typecheck/test/build;
- no business feature yet.

Do NOT:
- implement depot/order/scenario CRUD;
- implement auth;
- implement map;
- implement algorithms;
- connect production DB;
- deploy unless explicitly requested.

Read AGENTS.md first.
After implementation run all mandatory checks.
Create/update docs only if needed to keep actual setup consistent.
Do not commit/push.
```

---

# D. TiDB CONNECTION PROMPT

```text
Implement TiDB development connection only.

Requirements:
- use Drizzle ORM + @tidbcloud/serverless;
- DATABASE_URL server-only;
- fail clearly if env missing;
- no credential logging;
- use development database only;
- add a safe connectivity test/health path;
- add unit/integration coverage where practical.

Do NOT create full domain schema yet.
Do NOT touch production or testing database.
Do NOT put DATABASE_URL under NEXT_PUBLIC_*.

Audit official integration pattern already present in docs before coding.
Run lint/typecheck/test/build.
No commit/push.
```

---

# E. DATABASE SCHEMA PROMPT

```text
Implement database schema according to docs/08_DATABASE_DESIGN.md.

MANDATORY:
- audit current schema first;
- preserve scenario editable vs benchmark immutable boundary;
- use explicit indexes/constraints only when justified;
- generate migration;
- review generated SQL;
- apply only to DEV environment;
- seed minimal safe dev fixtures;
- add repository/service tests.

Do NOT apply to testing/production.
Do NOT use destructive migration.
Do NOT simplify away benchmark snapshots.

At end show migration SQL summary, changed files, test evidence, and manual next steps.
```

---

# F. DEPOT CRUD PROMPT

```text
Implement Depot Management only.

Acceptance Criteria:
- list/create/edit depot;
- server-side Zod validation;
- latitude [-90,90], longitude [-180,180];
- clear success/error states;
- no direct DB call from Client Component;
- integration tests for create/update validation;
- no delete if deletion contract is not yet approved.

Out of scope:
- scenarios;
- orders;
- map;
- algorithms;
- auth beyond existing guards.
```

---

# G. LEAFLET MAP PROMPT

```text
Implement map visualization for depot/customer data that already exists.

Mandatory:
- Leaflet code isolated in Client Component;
- Server Component fetches/serializes data where appropriate;
- OpenStreetMap attribution visible;
- markers for depot and customers;
- fit bounds safely;
- no geocoding API;
- OSRM Table adapter tidak dikerjakan dalam task marker/map ini; formal benchmark tetap memakai frozen OSRM matrix dari infrastructure task;
- no optimization algorithm in map component.

Add tests for data transformation; manual browser verification documented.
```

---

# H. DUMMY GENERATOR PROMPT

```text
Implement seeded Dummy Order Generator.

Primary pattern: random.
Optional engineering patterns sesuai task: clustered, circular, directional.
Optional patterns bukan mandatory primary experiment atau core novelty.
Main evaluation adalah 10/25/50 customer, 10 independent datasets per ukuran.
N=100 conditional/optional setelah pilot.

Requirements:
- same seed+config => same generated coordinates/order identity;
- coordinate bounds valid;
- generated data editable after save;
- source=dummy;
- overwrite/regenerate requires explicit behavior and tests;
- generator logic pure and unit-tested.

Formal distance input memakai frozen OSRM road-network matrix sesuai docs/34; jangan mengubahnya pada task generator. Coordinate generation tidak menjamin routability; validation dilakukan sebelum freeze matrix.
```

---

# I. DISTANCE ENGINE PROMPT

```text
Implement OSRM road-network matrix infrastructure according to docs/34_OSRM_DISTANCE_CONTRACT.md.

IMPORTANT:
OSRM Table Service is approved core formal input infrastructure. OSRM is NOT the research algorithm. Audit AGENTS.md, docs/03, docs/08, docs/33 and docs/34 first.

Implement:
- DistanceProvider port outside algorithm domain;
- road validation and Table adapter;
- stable node order with depot index 0;
- directed/asymmetric meter matrix validation, no null/unreachable;
- input and matrix hash, provider/profile/provenance;
- immutable matrix builder/storage and tests;
- synthetic matrix fixtures only for unit tests, never substitute formal input.

No OSRM/network/DB in algorithm core or formal timer. Do not claim OSRM distances are mathematical shortest-distance paths. Keep geometry separate. Do not choose open study-area/endpoint methodology silently.
```

---

# I2. OSRM MATRIX PROMPT

```text
Implement only the approved OSRM Table matrix foundation.
Audit AGENTS.md, docs/08, docs/15, docs/32, docs/33, docs/34 and actual code/tests first.

Requirements:
- road coordinate validation/routability and recorded snapping evidence;
- Table Service adapter outside algorithm core; explicitly request distance;
- depot=0 and stable saved customer/node order;
- NxN including depot, unit meter, directed matrix, no symmetry assumption;
- reject null/unreachable, invalid values/shape, no fallback metric;
- reject zero off-diagonal at common ACO eligibility without epsilon substitution;
- canonical input hash and matrix hash with versioned serialization;
- immutable snapshot, provider/profile/options/version provenance;
- same matrix/hash for NN+2-Opt and ACO;
- tests for request/response order, failures, hashing, freeze, and replay;
- no algorithm timing contamination by OSRM/DB/network/serialization.

Do not implement optimizer or geometry UI in this task.
Do not pick final endpoint/study-area/sampling thresholds if still OPEN.
Do not overwrite existing frozen matrices or silently repair unreachable pairs.
No commit/push; follow the task's approved schema/migration scope.
```

---

# J. NEAREST NEIGHBOR PROMPT

```text
Implement Nearest Neighbor as framework-independent domain code.

Input:
- validated directed DistanceMatrix only as geographic input;
- depot fixed index 0; customers inferred as indices 1..n;
- application maps point IDs outside solver.

Output:
- closed route;
- total distance;
- metadata/tie policy.

Mandatory tests:
- 0/1/2 customer contract;
- known small matrix;
- starts/ends depot;
- each customer exactly once;
- choose minimum directed outgoing distance; ties use lowest node index;
- input not mutated.

Do not implement 2-Opt in this task.
```

---

# K. 2-OPT PROMPT

```text
Implement 2-Opt improvement over an existing valid closed route.
Follow docs/33; production pipeline initial route comes from NN.

Mandatory:
- depot remains fixed start/end;
- preserve customer permutation;
- BEST IMPROVEMENT: evaluate all candidate segment reversals before accepting best;
- recompute FULL route distance for each candidate on frozen directed matrix;
- accept strict improvement only; result distance <= NN input distance;
- deterministic candidate order/ties and stop when no strict improvement;
- no UI/DB dependency;
- unit tests including asymmetric cheap-cycle and symmetric-shortcut trap in docs/33;
- reversal must account for directed internal edges as well as boundaries;
- forbid symmetric-only delta shortcut; any later optimization needs mathematical directed-cost proof and contract review.

Do not change NN behavior except integration adapter if necessary.
```

---

# L. ACO PROMPT

```text
Implement Ant Colony Optimization domain module only, variant = Classical Ant System according to docs/33.

Requirements:
- typed parameter object;
- parameter validation;
- seeded deterministic PRNG injectable/versioned, reset for every run;
- directed pheromone initialization with explicit tau0;
- eta_ij=1/d_ij and roulette-wheel probabilistic selection;
- explicit alpha, beta, rho, Q, tau0, antCount, maxIterations;
- evaporation followed by deposit from ALL valid ants, directed return edge included;
- fixed iteration stopping criterion;
- best observed route tracking;
- valid closed tour;
- no framework/DB dependency.

Mandatory tests:
- same seed same result on fixture;
- route invariants;
- invalid parameter rejection;
- no NaN/Infinity probabilities;
- small matrix sanity.

Do NOT add 2-Opt after ACO in main comparison or substitute another ACO variant.
Require explicit parameters; do NOT hardcode final scientific numeric defaults.
Fixture values are tests only. Final research values require literature/calibration evidence and one global configuration frozen separately from main evaluation datasets.
```

---

# M. BENCHMARK CASE FREEZE PROMPT

```text
Implement scenario -> immutable benchmark case freeze.

Requirements:
- snapshot depot/customer values;
- canonical serialization;
- SHA-256 input hash;
- metric+version metadata;
- git commit SHA when available;
- transactional creation;
- immutable repository API (no update method for frozen points);
- tests showing later order edits do not alter old benchmark case.
- stable node order, depot index 0, case ready for OSRM matrix foundation in docs/34;
- immutable distance_matrices reference after validated matrix freeze; do not merge editable scenario and immutable snapshot into one dataset table.
```

---

# N. BENCHMARK RUNNER PROMPT

```text
Implement benchmark orchestration according to docs/15_RESEARCH_BENCHMARK_PROTOCOL.md.

Requirements:
- one frozen case -> frozen OSRM directed meter matrix with verified input/matrix hash;
- run NN+2Opt and Classical Ant System against exact same matrix/order/hash;
- main 10/25/50 x 10 independent random datasets; 100 optional after pilot;
- separate calibration/evaluation, one frozen global ACO configuration;
- 5 warmups per algorithm/dataset, excluded from measured statistics;
- 30 independent seeded ACO runs with predetermined saved seeds;
- NN+2Opt one deterministic quality output plus 30 timing repetitions;
- timing only around algorithm execution;
- OSRM/DB/HTTP/network/serialization/geometry/rendering excluded from execution timer;
- seed/run metadata saved;
- invalid route rejected;
- raw run results saved before summary;
- summary computed from raw runs.
- keep all poor valid/failed run records, no silent replacements/cherry-picking;
- primary quality comparison ACO mean/median, best additional; report SD/range/CV;
- dataset-level summaries are independent observations, not 30 runs as 30 datasets;
- mark incomplete planned run sets, preserve attempt identities and failure causes.

Do NOT use Vercel timing as formal scientific benchmark result.
```

---

# O. SECURITY AUDIT PROMPT

```text
Audit the repository security without modifying code.

Check:
- secret exposure;
- NEXT_PUBLIC misuse;
- auth/authorization gaps;
- SQL injection/raw SQL;
- XSS/dangerouslySetInnerHTML;
- unbounded ACO parameters/resource abuse;
- destructive endpoints;
- production DB reachable from preview;
- error leakage;
- unsafe dependencies/config.

Return severity-ranked findings with evidence and minimal remediations.
Do not make fixes yet.
```

---

# P. RELEASE READINESS PROMPT

```text
Perform release-readiness audit for testing -> main.

Do not change code.

Verify:
- branch diff;
- CI status/equivalent local commands;
- migrations;
- env separation;
- security baseline;
- critical E2E;
- route algorithm invariants;
- preview smoke test evidence;
- docs consistency;
- rollback plan.

Output:
GO / NO-GO / CONDITIONAL GO
with blockers, evidence, and exact human actions before merge.
```

---

# Q. TROUBLESHOOTING PROMPT

```text
Troubleshoot only; do not make broad changes.

Symptom:
<PASTE ERROR>

Context:
- branch:
- environment: local/preview/production
- last known working commit:
- recent changes:

Process:
1. Reproduce/inspect evidence.
2. Classify: code / env / dependency / DB / Vercel / TiDB / data.
3. Give top hypotheses ranked by evidence.
4. Perform lowest-risk diagnostic checks first.
5. Propose minimal fix.
6. State what evidence would falsify each hypothesis.

Do not rotate/delete/redeploy production resources without asking.
```
