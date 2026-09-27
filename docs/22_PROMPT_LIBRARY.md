# 22 — AI PROMPT LIBRARY

Prompt di bawah dirancang untuk coding agent seperti Codex/Claude/Gemini/agent IDE. Sesuaikan nama tool bila perlu.

---

# A. MASTER IMPLEMENTATION PROMPT

```text
Anda bekerja pada repository Courier Route Planner.

MANDATORY BEFORE ANY CHANGE:
1. Baca AGENTS.md sepenuhnya.
2. Baca README.md dan dokumentasi yang relevan dengan task.
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
- no OSRM;
- no optimization algorithm in map component.

Add tests for data transformation; manual browser verification documented.
```

---

# H. DUMMY GENERATOR PROMPT

```text
Implement seeded Dummy Order Generator.

Patterns in scope:
- random
- clustered
- circular
- directional

Requirements:
- same seed+config => same generated coordinates/order identity;
- coordinate bounds valid;
- generated data editable after save;
- source=dummy;
- overwrite/regenerate requires explicit behavior and tests;
- generator logic pure and unit-tested.

Do NOT decide formal research distance formula here.
```

---

# I. DISTANCE ENGINE PROMPT

```text
Implement DistanceProvider abstraction and distance matrix infrastructure.

IMPORTANT:
The final geographic-to-Euclidean method is a research decision. Do not invent/finalize it unless docs explicitly mark it approved.

Implement:
- DistanceProvider interface;
- matrix builder;
- matrix validation;
- unit/metadata support;
- test doubles/fixture provider if needed;
- known synthetic Cartesian provider for algorithm unit tests.

Do NOT claim geographic distance correctness without approved methodology.
```

---

# J. NEAREST NEIGHBOR PROMPT

```text
Implement Nearest Neighbor as framework-independent domain code.

Input:
- validated distance matrix;
- depot index;
- customer point IDs.

Output:
- closed route;
- total distance;
- metadata/tie policy.

Mandatory tests:
- 0/1/2 customer contract;
- known small matrix;
- starts/ends depot;
- each customer exactly once;
- deterministic tie-breaking documented;
- input not mutated.

Do not implement 2-Opt in this task.
```

---

# K. 2-OPT PROMPT

```text
Implement 2-Opt improvement over an existing valid closed route.

Mandatory:
- depot remains fixed start/end;
- preserve customer permutation;
- result distance <= input distance within numeric tolerance;
- termination rule explicit;
- no UI/DB dependency;
- unit tests including a route with a known improvable crossing.

Do not change NN behavior except integration adapter if necessary.
```

---

# L. ACO PROMPT

```text
Implement Ant Colony Optimization domain module only.

Requirements:
- typed parameter object;
- parameter validation;
- seeded RNG injectable;
- pheromone matrix initialization;
- probabilistic route construction;
- pheromone evaporation/update;
- best observed route tracking;
- valid closed tour;
- no framework/DB dependency.

Mandatory tests:
- same seed same result on fixture;
- route invariants;
- invalid parameter rejection;
- no NaN/Infinity probabilities;
- small matrix sanity.

Do NOT invent final research default parameters. Use clearly labeled engineering defaults/fixtures only or require explicit params.
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
```

---

# N. BENCHMARK RUNNER PROMPT

```text
Implement benchmark orchestration according to docs/15_RESEARCH_BENCHMARK_PROTOCOL.md.

Requirements:
- one frozen case -> one distance matrix;
- run NN+2Opt and ACO against same matrix;
- timing only around algorithm execution;
- DB/network excluded from execution timer;
- seed/run metadata saved;
- invalid route rejected;
- raw run results saved before summary;
- summary computed from raw runs.

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
