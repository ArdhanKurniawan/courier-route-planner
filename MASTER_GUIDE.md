# MASTER GUIDE - Courier Route Planner

> **GENERATED / DERIVED DOCUMENT**
> **DO NOT EDIT AS PRIMARY SOURCE**
> If conflict exists, AGENTS.md + individual source documents + latest accepted ADR/human decision win. Follow the precedence and STOP rule in AGENTS.md for unresolved conflicts.

Derived from the source list below, in order. Regenerated 2026-10-04. Read source files for canonical headings and context. Relative Markdown links are rebased to this repository root; fragment-only links point back to their source file. Source content otherwise remains unchanged (line endings normalized to LF).


---

# SOURCE: README.md

# Courier Route Planner — Engineering & Research Documentation Pack

**Status:** Research contract sync v1, Route Planner application shell; Phase 0A CLOSED/merged via PR #7; Phase 0B Environment + Health implemented locally
**Tanggal sinkronisasi:** 2026-10-03
**Tujuan:** menjadi source-of-truth teknis, proses kerja tim, panduan onboarding, panduan penggunaan AI coding agent, dan protokol verifikasi untuk project **Sistem Optimasi Rute Pengiriman Paket Berbasis Web**.

> Dokumen ini dirancang dengan standar engineering yang ketat, tetapi tetap disesuaikan dengan konteks project mahasiswa S1, tim kecil, dan target biaya **Rp0**. Istilah “production” di dokumen ini berarti environment live/demo yang stabil; bukan klaim SLA enterprise/commercial production.

## Approved Target Architecture

Daftar berikut adalah target yang disetujui. Status implementasi aktual dijelaskan terpisah di bawah.

- Scope: **Web Admin Route Planner**, bukan aplikasi kurir realtime.
- Arsitektur: full-stack **Next.js App Router + TypeScript**.
- Hosting: **Vercel**.
- Database: **TiDB Cloud Starter**.
- Data access: **Drizzle ORM + `@tidbcloud/serverless`**.
- Styling: **Tailwind CSS**.
- UI template baseline: **TailAdmin Next.js Free (MIT)**; Free edition only.
- Map: **Leaflet + OpenStreetMap**.
- Git: **GitHub**.
- Branch: `main`, `testing`, `feature/*`, `fix/*`, `hotfix/*`, `chore/*`.
- CI: **GitHub Actions** untuk lint/typecheck/test/build.
- Deploy: **Vercel Git Integration**.
- Algoritma penelitian:
  - Hybrid **Nearest Neighbor + 2-Opt**.
  - **Ant Colony Optimization (ACO) / Classical Ant System**, tanpa 2-Opt sesudah ACO pada main comparison.
- Fokus pengujian: total distance, execution time, scalability, consistency/stability.
- OSRM Table Service: **approved core infrastructure** untuk frozen road-network distance matrix formal, unit meter, directed/asymmetric. OSRM bukan algoritma penelitian; Route/geometry terpisah untuk visualisasi.
- NN deterministic: depot=0, nearest directed cost, tie-break lowest node index. 2-Opt best improvement memakai full directed route recomputation.
- Main experiment: **10/25/50 customer × 10 independent random datasets = 30 datasets**. N=100 conditional setelah pilot; clustered/circular/directional optional tambahan.
- Calibration terpisah dari evaluation; satu global ACO configuration dibekukan. ACO 30 independent seeded runs per dataset; NN+2-Opt satu quality result dan 30 timing repetitions; 5 warm-ups per algoritma/dataset.
- Kedua metode memakai input dan matrix hash identik. Timer hanya algoritma, tanpa OSRM/DB/network/serialization/geometry/rendering, pada environment terkontrol di luar runtime Vercel.

## Current Implementation Status

Verifikasi branch `feature/foundation-environment-health`, 2026-10-03. Phase 0A CLOSED dan merged melalui PR #7 ke `testing` pada `f73834aa4bb38ada5c289fa30a0b6fb6aa608f26`; shell UI berasal dari cleanup terverifikasi 2026-10-02:

| Status | Evidence / kondisi aktual |
|---|---|
| Tersedia | Repository documentation dan local branch guard files `.githooks/pre-commit`, `.githooks/pre-push`; ini bukan bukti GitHub protections sudah aktif |
| Tersedia | Shell dan reusable UI primitives dari TailAdmin Free 2.4.0 di `src/`; provenance SHA tercatat di `THIRD_PARTY_NOTICES.md`, license di `licenses/TAILADMIN-MIT.txt` |
| Tersedia | Next.js App Router, React, TypeScript strict, Tailwind; Node `24.x` dalam `engines.node` dan `.nvmrc` berisi `24` |
| Current | UI Template Cleanup terverifikasi lokal; branding Courier Route Planner, dashboard status kesiapan fitur tanpa data palsu, sidebar sesuai mapping project, header dan tema light/dark |
| Tersedia | Routing sederhana tanpa locale: `/`, `/about`, dan 10 route modul dengan status **Belum diimplementasikan**; seluruh link sidebar dan refresh route diuji melalui browser |
| Dibersihkan | Demo e-commerce, charts, demographic map, calendar, profile/auth, showcase, mock data dan assets; `apexcharts`, `react-apexcharts`, `next-intl`, JVectorMap, FullCalendar, Swiper, DnD, Dropzone dan SimpleBar dihapus setelah audit usage |
| Dipertahankan | Form controls, date picker (`flatpickr`), table primitives, modal, badge, alert, dropdown, pagination, cards, breadcrumbs dan generic icons |
| Belum | TiDB/Drizzle, Zod, Leaflet, OSRM adapter, domain algorithms, immutable matrix storage, benchmark engine, CRUD domain |
| Belum | Auth/authorization aktual; halaman sign-in/sign-up demo telah dihapus |
| Phase 0A CLOSED | Scripts lint/typecheck/test/test:watch/test:coverage/build; typecheck menjalankan `next typegen && tsc --noEmit` untuk generated route types |
| Phase 0A CLOSED | Vitest, V8 coverage, React Testing Library, jest-dom dan jsdom sebagai dev dependencies; navigation/dashboard regression tests: 2 files, 11 tests PASS |
| Security audit | Next.js dan eslint-config-next dipatch ke `16.3.6`; audit 2026-10-03: runtime-only 0 findings, full 15 dev-only findings (1 low, 2 moderate, 12 high), tercatat di laporan Phase 0A |
| Phase 0B lokal | `.env.example` berisi `APP_ENV=development`; pure typed parser di `src/config/env.ts`, exact enum `development/testing/production`, required saat runtime read, tanpa default/trim/import-time validation |
| Phase 0B lokal | `GET /api/health`: app-only, 200 `{"status":"ok"}` atau 503 `{"status":"error"}` untuk missing/invalid APP_ENV; `Cache-Control: no-store`, tanpa env disclosure atau DB |
| Tests current | 4 files / 48 tests PASS: navigation/dashboard + env parser (18) dan health (19); server tests memakai Node per file |
| Foundation gap | Phase 0B independent verification; Phase 0C TiDB/Drizzle/Zod; Phase 0D GitHub Actions + Vercel/Preview/env isolation; Playwright/E2E masih pending |

Validasi Phase 0A pada Node `24.19.0`, npm `11.6.0`: `npm ci`, lint, typecheck dari generated state bersih, test, test:coverage dan build PASS. Coverage mencakup seluruh source TypeScript/TSX sebagai baseline informasi, tanpa threshold. Vite mengeluarkan warning tentang config loader pada future major; tests saat ini PASS. Evidence dan audit delta: [Phase 0A Quality Foundation Report](docs/proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md).

Phase 0A independent verification: [report](docs/proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md). Phase 0B local implementation: [report](docs/proses/phase-0/0b/PHASE_0B_IMPLEMENTATION_REPORT.md). Fresh lint/typecheck/test/coverage/build PASS tanpa `.env.local`, APP_ENV inherited, atau DATABASE_URL. Health memerlukan APP_ENV saat GET dipanggil; developer dapat menyalin `.env.example` ke ignored `.env.local`. DATABASE_URL ditunda ke Phase 0C; NEXT_PUBLIC_APP_NAME tidak diperkenalkan. Tidak ada dependency baru.

Jalankan quality gates lokal setelah clone/pull:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

`npm run test:watch` tersedia untuk development. Browser checks pada cleanup 2026-10-02 mencakup desktop/mobile/tablet, keyboard drawer, route refresh, tema light/dark dan persistensi refresh; console tanpa error/warning pada flow shell yang diuji saat itu.

Deployment/env/remote branch protections belum diverifikasi. Phase 0 Foundation dan seluruh gate adopsi template belum selesai; Phase 0B independent verification, Phase 0C/0D, Vercel Preview dan reproduksi anggota kedua masih diperlukan. Kontrak penelitian tetap sama.

Kontrak utama: [research decisions](docs/32_RESEARCH_DECISIONS.md), [algorithm specification](docs/33_ALGORITHM_SPECIFICATION.md), [OSRM distance contract](docs/34_OSRM_DISTANCE_CONTRACT.md), dan [benchmark protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md).

## Urutan baca wajib

1. [`docs/00_START_HERE.md`](docs/00_START_HERE.md)
2. [`docs/01_PROJECT_CHARTER.md`](docs/01_PROJECT_CHARTER.md)
3. [`docs/02_PRODUCT_REQUIREMENTS.md`](docs/02_PRODUCT_REQUIREMENTS.md)
4. [`docs/03_SYSTEM_ARCHITECTURE.md`](docs/03_SYSTEM_ARCHITECTURE.md)
5. [`docs/30_UI_TEMPLATE_GUIDE.md`](docs/30_UI_TEMPLATE_GUIDE.md)
6. [`docs/17_SETUP_FROM_ZERO.md`](docs/17_SETUP_FROM_ZERO.md)
7. [`docs/11_GIT_WORKFLOW.md`](docs/11_GIT_WORKFLOW.md)
8. [`docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md`](docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md)
9. [`docs/21_AI_OPERATING_MODEL.md`](docs/21_AI_OPERATING_MODEL.md)
10. [`docs/22_PROMPT_LIBRARY.md`](docs/22_PROMPT_LIBRARY.md)
11. [`docs/23_PHASE_GATES_CHECKLISTS.md`](docs/23_PHASE_GATES_CHECKLISTS.md)

Setelah itu baca dokumen spesifik sesuai pekerjaan.

## Peta dokumen

| Dokumen | Fungsi |
|---|---|
| `AGENTS.md` | Aturan wajib AI coding agent |
| `CONTRIBUTING.md` | Aturan kontribusi anggota tim |
| `00_START_HERE.md` | Cara memakai seluruh pack |
| `01_PROJECT_CHARTER.md` | Visi, scope, constraint, success criteria |
| `02_PRODUCT_REQUIREMENTS.md` | Requirement fungsional/nonfungsional |
| `03_SYSTEM_ARCHITECTURE.md` | Arsitektur sistem & data flow |
| `04_TECH_STACK_ADRS.md` | Keputusan stack dan alasan |
| `05_NEXTJS_FOR_PHP_DEVS.md` | Jembatan konsep PHP → Next.js |
| `06_VERCEL_GUIDE.md` | Konsep Vercel, preview, production, domain |
| `07_TIDB_GUIDE.md` | Konsep TiDB dan cara tim MySQL beradaptasi |
| `08_DATABASE_DESIGN.md` | ERD konseptual, tabel, constraint, snapshot eksperimen |
| `09_REPO_STRUCTURE.md` | Struktur folder repo yang disepakati |
| `10_ENVIRONMENTS_SECRETS.md` | dev/testing/prod dan secret management |
| `11_GIT_WORKFLOW.md` | Branching, PR, hotfix, release |
| `12_CI_CD_RELEASE.md` | CI, Vercel deployment, rollback |
| `13_SECURITY.md` | Security baseline |
| `14_TESTING_QA.md` | Unit/integration/E2E/UAT/QA |
| `15_RESEARCH_BENCHMARK_PROTOCOL.md` | Protokol eksperimen ilmiah |
| `16_OBSERVABILITY_RUNBOOK.md` | Logging, error handling, operational checks |
| `17_SETUP_FROM_ZERO.md` | Tutorial dari nol sampai online |
| `18_ROADMAP_BACKLOG.md` | Phase/sprint/backlog |
| `19_DEFINITION_OF_DONE.md` | Definition of Done per level |
| `20_TEAM_LEARNING_PLAN.md` | Kurikulum onboarding tim |
| `21_AI_OPERATING_MODEL.md` | Cara bekerja dengan AI secara aman |
| `22_PROMPT_LIBRARY.md` | Prompt siap pakai implementasi & verifikasi |
| `23_PHASE_GATES_CHECKLISTS.md` | Checklist exit gate tiap phase |
| `24_TROUBLESHOOTING.md` | Troubleshooting umum |
| `25_COST_GUARDRAILS.md` | Zero-budget guardrails |
| `26_GLOSSARY.md` | Istilah teknis |
| `27_SOURCE_REFERENCES.md` | Sumber resmi & source-of-truth |
| `28_COACHING_SEQUENCE.md` | Urutan bimbingan checkpoint tim |
| `29_HUMAN_REVIEW_GUIDE.md` | Cara manusia mengecek output AI |
| `30_UI_TEMPLATE_GUIDE.md` | Keputusan TailAdmin, download, cleanup, license & UI adoption |
| `31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md` | Pencegahan commit/push tidak sengaja ke main/testing, GitHub protection, local hooks & recovery |
| [32_RESEARCH_DECISIONS.md](docs/32_RESEARCH_DECISIONS.md) | RQ, scope, design eksperimen, metrics, dan keputusan OPEN |
| [33_ALGORITHM_SPECIFICATION.md](docs/33_ALGORITHM_SPECIFICATION.md) | NN, directed best-improvement 2-Opt, Classical Ant System, validator dan fixtures |
| [34_OSRM_DISTANCE_CONTRACT.md](docs/34_OSRM_DISTANCE_CONTRACT.md) | OSRM Table matrix, hashing/freeze, fairness dan reproducibility |
| `THIRD_PARTY_NOTICES.md` | Provenance/license third-party penting |

## Template tim

- [`templates/PULL_REQUEST_TEMPLATE.md`](templates/PULL_REQUEST_TEMPLATE.md)
- [`templates/FEATURE_TASK_TEMPLATE.md`](templates/FEATURE_TASK_TEMPLATE.md)
- [`templates/BUG_REPORT_TEMPLATE.md`](templates/BUG_REPORT_TEMPLATE.md)
- [`templates/ADR_TEMPLATE.md`](templates/ADR_TEMPLATE.md)
- [`templates/WORKLOG_TEMPLATE.md`](templates/WORKLOG_TEMPLATE.md)
- [`templates/VERIFICATION_REPORT_TEMPLATE.md`](templates/VERIFICATION_REPORT_TEMPLATE.md)

## Prinsip perubahan

Dokumen ini bukan “sekali jadi”. Jika ada keputusan arsitektur berubah:

1. buat ADR;
2. update dokumen terkait;
3. update `README.md` bila keputusan utama berubah;
4. jangan mengubah project invariant diam-diam melalui prompt AI;
5. perubahan scope penelitian harus melalui diskusi tim/dosen.


---

# SOURCE: AGENTS.md

# AGENTS.md — Mandatory AI Coding Agent Instructions

Dokumen ini **WAJIB dibaca AI coding agent sebelum mengubah kode**.

## 1. Project identity

Project: **Web Admin Courier Route Planner / Sistem Optimasi Rute Pengiriman Paket Berbasis Web**.

Problem utama:

```text
Depot → Customer → Customer → ... → Depot
```

Core problem adalah **multi-stop route sequencing / TSP-like closed tour**, bukan shortest-path A→B.

## 2. Hard invariants — jangan diubah tanpa persetujuan manusia

1. Scope saat ini adalah **Web Admin**, bukan aplikasi kurir realtime.
2. Depot adalah titik awal dan titik akhir.
3. Order/customer memiliki latitude dan longitude.
4. Dummy order harus dapat diedit.
5. Algoritma penelitian utama:
   - Nearest Neighbor + 2-Opt.
   - Ant Colony Optimization.
6. Kedua algoritma harus menerima **input dan distance matrix yang sama** pada benchmark yang sama.
7. OSRM bukan algoritma penelitian utama. OSRM Table Service adalah approved core input infrastructure untuk formal road-network distance matrix; Route/geometry terpisah dari optimizer.
8. Jangan mengganti problem menjadi Dijkstra/A* source-to-destination.
9. Formal research benchmark **tidak boleh bergantung pada runtime Vercel**; benchmark resmi dijalankan pada environment terkontrol dan dicatat.
10. Jangan memperlakukan latitude/longitude mentah sebagai Cartesian kilometer tanpa metode yang disetujui penelitian.
11. Formal matrix frozen dalam meter, directed/asymmetric, stable node order, tanpa unreachable pair, dengan input hash dan matrix hash. Jangan mengasumsikan symmetry atau membangun matrix berbeda per algoritma.
12. NN deterministic: depot index 0, minimum directed cost, tie-break lowest node index. 2-Opt best improvement wajib full route recomputation pada reversal dan hanya menerima strict improvement; hasil tidak lebih buruk dari NN.
13. ACO = Classical Ant System, seeded PRNG, directed pheromone, fixed iterations, deposit semua valid ants. Jangan menambah 2-Opt setelah ACO pada main comparison atau mengarang final numeric parameters.
14. Main: 10/25/50 customer, masing-masing 10 independent random datasets (30 total). N=100 conditional setelah pilot; clustered/circular/directional hanya optional/additional experiment.
15. Calibration terpisah dari evaluation; satu global ACO configuration frozen. ACO 30 independent seeded runs per dataset, NN+2-Opt satu quality result + 30 measured timing repetitions; 5 warm-ups per algoritma/dataset, dikecualikan dari statistik.
16. Algorithm timer mengecualikan OSRM, DB, HTTP/network, serialization, geometry generation, dan rendering. Raw failed/poor runs dipertahankan; ACO mean/median pembanding utama, best tambahan.

Kontrak penelitian wajib: [32 — Research Decisions](docs/32_RESEARCH_DECISIONS.md), [33 — Algorithm Specification](docs/33_ALGORITHM_SPECIFICATION.md), [34 — OSRM Distance Contract](docs/34_OSRM_DISTANCE_CONTRACT.md), serta [15 — Protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md). Perubahan ini mencatat keputusan manusia 2026-10-02; parameter numerik ACO dan keputusan OPEN tetap memerlukan evidence/keputusan lanjutan.

## 3. Locked engineering stack

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- TailAdmin Next.js Free sebagai baseline UI shell (Free/MIT source only)
- Leaflet + OpenStreetMap
- TiDB Cloud Starter
- Drizzle ORM
- `@tidbcloud/serverless`
- Zod validation
- Vitest
- Playwright
- GitHub + GitHub Actions
- Vercel Git Integration

Jika agent ingin menambah dependency, WAJIB jelaskan:

- masalah yang diselesaikan;
- mengapa built-in/stack existing tidak cukup;
- maintenance/security impact;
- size/runtime impact;
- apakah gratis/open-source.

Jangan menambah dependency hanya karena “lebih mudah”.


## 3A. UI template rules

- Baseline UI template adalah **TailAdmin Next.js Free** sesuai `docs/30_UI_TEMPLATE_GUIDE.md`.
- Gunakan hanya source Free/open-source; jangan mengambil TailAdmin Pro/paid asset.
- Template hanya presentation shell. Jangan mengubah domain architecture agar mengikuti demo template.
- Jangan menambah UI framework/template kedua tanpa approval manusia + ADR.
- Jangan menghapus third-party license/provenance notice.
- `apexcharts` / `react-apexcharts` dari upstream template **bukan approved core dependency**. Target cleanup adalah menghapusnya kecuali manusia menyetujui melalui ADR/license review.
- Jika chart dibutuhkan, prefer library berlisensi sederhana (mis. Recharts MIT) setelah task/ADR eksplisit.

## 4. Source-of-truth order

Jika ada konflik, gunakan prioritas:

1. `AGENTS.md`
2. keputusan eksplisit terbaru dari manusia
3. ADR yang accepted
4. `docs/02_PRODUCT_REQUIREMENTS.md`
5. `docs/03_SYSTEM_ARCHITECTURE.md`
6. `docs/08_DATABASE_DESIGN.md`
7. dokumen lain
8. asumsi agent

Jika masih konflik, **STOP dan laporkan konflik**. Jangan memilih diam-diam.

## 5. Mandatory pre-work audit

### Protected-branch safety gate

Sebelum membaca/merencanakan perubahan kode, jalankan:

```bash
git branch --show-current
git status --short
```

Jika current branch adalah `main` atau `testing` dan task membutuhkan perubahan kode: **STOP dan laporkan kepada manusia**. Jangan mengubah file, commit, atau push. Feature work harus dilakukan pada `feature/*`, `fix/*`, `hotfix/*`, atau `chore/*` sesuai task.

Lihat `docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md`.

Sebelum coding:

1. baca `AGENTS.md`;
2. baca task/issue;
3. baca file dokumentasi relevan;
4. inspect kode existing yang relevan;
5. inspect tests existing;
6. inspect schema/migration jika menyentuh DB;
7. tulis plan singkat;
8. identifikasi risk dan out-of-scope.

## 6. Change discipline

- Kerjakan **hanya scope task**.
- Jangan refactor besar tanpa kebutuhan task.
- Jangan rename massal tanpa alasan.
- Jangan mengubah format/API publik diam-diam.
- Jangan commit secret.
- Jangan hardcode credential.
- Jangan mengubah production data.
- Jangan menjalankan destructive migration tanpa approval manusia.
- Jangan push/merge/force-push kecuali manusia secara eksplisit meminta.

## 7. Code boundaries

Algoritma harus framework-independent.

**Benar:**

```text
Route Handler / Server Action
        ↓
Application Service
        ↓
Algorithm Module
        ↓
Pure input → pure-ish result
```

**Dilarang:**

```text
route.ts berisi 500 baris ACO + DB + UI concern
```

Algorithm module tidak boleh tahu tentang:

- React;
- Leaflet;
- HTTP request/response;
- Vercel;
- TiDB query;
- cookies/session.
- OSRM HTTP client;
- Drizzle/TiDB imports.

Algorithm domain menerima DistanceMatrix saja sebagai input geografis, ditambah parameter/seed. Matrix building/storage dan OSRM adapter ada di application/infrastructure, di luar core algorithm.

## 8. Algorithm correctness invariants

Setiap hasil closed tour harus memenuhi:

- mulai dari depot;
- berakhir di depot;
- setiap customer muncul tepat satu kali;
- tidak ada customer hilang;
- tidak ada customer duplikat;
- total distance dapat direkomputasi dari route + matrix;
- input tidak dimutasi secara tak terduga;
- ACO dapat diberi random seed untuk reproducibility testing.
- directed cost digunakan pada seluruh edges termasuk return ke depot;
- 2-Opt asymmetric fixture dan best-improvement diuji;
- NN+2-Opt distance <= NN distance.

## 9. Database rules

- Semua mutation server-side divalidasi dengan Zod.
- Gunakan ORM/query parameterization; jangan concat SQL dari input user.
- Migration harus forward-safe.
- Eksperimen harus memakai immutable snapshot input (`benchmark_cases`/points).
- Frozen matrix disimpan konseptual pada `distance_matrices`; experiments mereferensikan snapshot/hash yang sama sesuai docs/08 dan docs/34. Jangan mengganti snapshot history dengan recomputation OSRM dari live orders.
- Edit order setelah benchmark tidak boleh mengubah sejarah eksperimen lama.
- Production migration harus punya rollback/mitigation plan.

## 10. Required checks after implementation

Sebelum validation, inspect scripts aktual di `package.json` dan status Phase 0 Foundation. Jangan mengarang command/script yang belum tersedia.

**SETELAH Phase 0 Foundation selesai**, normal contract mewajibkan:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

**SEBELUM Phase 0 Foundation selesai**, jika `typecheck` atau `test` belum tersedia:

- jalankan hanya scripts aktual yang tersedia dan relevan;
- laporkan missing scripts sebagai **FOUNDATION PREREQUISITE / GAP**, bukan PASS/FAIL command;
- jangan membuat script/dependency baru kecuali task memang Phase 0 Foundation atau secara eksplisit meminta setup testing/typecheck;
- jangan mengklaim typecheck/test PASS bila command belum tersedia.

Phase 0 tetap bertanggung jawab menyediakan lint/typecheck/test/build. Jika Phase 0 Foundation sudah dinyatakan selesai tetapi required script hilang, **STOP** dan laporkan sebagai **regression** atau **unmet prerequisite**.

Untuk perubahan algoritma, tambah:

- invariant tests;
- deterministic seed test;
- known small instance test;
- edge cases 0/1/2 customer sesuai contract;
- distance recomputation assertion.

Untuk DB:

- migration dry review;
- schema consistency;
- no production credential exposure.

## 11. Required completion report

Agent harus mengakhiri task dengan:

1. ringkasan pekerjaan;
2. daftar file berubah;
3. alasan desain penting;
4. command checks yang dijalankan;
5. hasil check PASS/FAIL;
6. manual verification yang masih perlu manusia lakukan;
7. risk/known limitation;
8. hal yang **tidak** dikerjakan.

Jangan mengatakan “selesai” bila build/test gagal.

## 12. Forbidden claims

Agent dilarang menyatakan:

- “production-ready” tanpa evidence checklist;
- “secure” tanpa security checks relevan;
- “optimal route” untuk heuristic/metaheuristic kecuali ada bukti optimum;
- “lebih cepat” tanpa benchmark;
- “lebih akurat” tanpa metric;
- “research gap belum pernah diteliti” tanpa literature evidence.


---

# SOURCE: CONTRIBUTING.md

# CONTRIBUTING.md

## Branch policy

- `main`: live/production-demo.
- `testing`: integration/testing branch.
- `feature/*`: fitur baru, dibuat dari `testing`.
- `fix/*`: bug non-production, dibuat dari `testing`.
- `hotfix/*`: bug kritis production, dibuat dari `main`.
- `chore/*`: tooling/docs/maintenance.

## Normal flow

```text
testing
  ↓
feature/* / fix/* / chore/*
  ↓
Pull Request
  ↓
testing
  ↓
integration test / QA
  ↓
Pull Request
  ↓
1 human approval
  ↓
main
```

## Aturan commit

Gunakan commit kecil dan fokus. Format yang dianjurkan:

```text
feat: add depot CRUD
fix: prevent duplicated route customer
refactor: extract distance matrix service
test: add two-opt invariant tests
docs: update TiDB setup guide
chore: configure lint script
```

## PR minimum

PR wajib memiliki:

- tujuan;
- scope;
- perubahan utama;
- screenshot untuk UI;
- evidence test;
- migration note jika DB berubah;
- risk;
- rollback note jika relevan.

Gunakan `templates/PULL_REQUEST_TEMPLATE.md`.

## Sebelum buka PR

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Jangan mengandalkan “jalan di laptop saya”.

## Review rule

Reviewer mengecek:

1. correctness;
2. scope creep;
3. security;
4. test coverage yang masuk akal;
5. schema/migration safety;
6. UX regression;
7. algorithm invariants jika menyentuh routing;
8. tidak ada secret.

## Approval policy

### Pull Request ke `testing`

Tujuan `testing` adalah integration/testing branch.

Ketentuan:

- Pull Request wajib;
- human approval tidak diwajibkan;
- author tetap wajib melakukan self-review pada tab **Files changed** sebelum merge;
- seluruh automated CI checks wajib lulus setelah workflow CI tersedia;
- PR tidak boleh mengandung secret, credential, `.env`, atau perubahan di luar scope.

### Pull Request ke `main`

`main` adalah production/release branch.

Ketentuan:

- Pull Request wajib;
- minimal **1 human approval** wajib;
- author Pull Request tidak boleh menggantikan approval reviewer lain;
- approval lama harus dianggap tidak berlaku ketika terdapat commit baru yang mengubah PR;
- push terbaru harus sudah termasuk dalam review;
- seluruh unresolved review conversations harus diselesaikan sebelum merge;
- automated CI checks wajib lulus setelah workflow CI tersedia;
- merge hanya dilakukan setelah QA/release verification selesai.

## Merge strategy

Gunakan strategi berdasarkan jenis Pull Request:

### Feature / fix / chore → `testing`

Gunakan **Squash and Merge** sebagai default.

Tujuan:

- menjaga history `testing` tetap ringkas;
- beberapa commit kecil dari satu pekerjaan menjadi satu logical change;
- mempermudah rollback per fitur.

### `testing` → `main`

Gunakan **Merge Commit**, bukan Squash and Merge.

Tujuan:

- mempertahankan hubungan ancestry antara long-lived branch `testing` dan `main`;
- mencegah perubahan release lama muncul kembali sebagai diff pada release berikutnya;
- menjaga riwayat release mudah ditelusuri.

### Hotfix

Hotfix masuk ke `main` melalui Pull Request, kemudian perubahan wajib disinkronkan kembali ke `testing`.


## Protected branch safety

- Jangan commit/push langsung ke `main` atau `testing`.
- Aktifkan repository hooks dengan `git config core.hooksPath .githooks` setelah hooks tersedia.
- Semua perubahan masuk melalui PR sesuai `docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md`.


---

# SOURCE: THIRD_PARTY_NOTICES.md

# THIRD-PARTY NOTICES

Dokumen ini mencatat third-party source/template yang menjadi baseline atau dependency penting project.

## TailAdmin Next.js Free

- Product: TailAdmin Next.js Free Admin Dashboard
- Upstream repository: `https://github.com/TailAdmin/free-nextjs-admin-dashboard`
- Upstream version: `2.4.0`
- Upstream commit: `4fba02489c93171220c13cd2b44cc0161ff6d2a1`
- Upstream commit date: `2026-09-13 15:49:09 +0600`
- License: MIT
- Local license copy: `licenses/TAILADMIN-MIT.txt`
- Purpose: UI/admin dashboard baseline
- Adoption status: Free edition only

### Adoption notes

The upstream template is used as a presentation/UI baseline only.

Project architecture, domain model, routing algorithms, database design, Git workflow, and research methodology remain governed by this repository's own documentation.

UI template cleanup was verified locally on 2026-10-02. The application retains the Free edition shell patterns and reusable UI primitives. Ecommerce, chart, demographic map, calendar, profile/auth and showcase demos, their mock data and unused public demo assets were removed. The original source revision and MIT notice above remain applicable to retained template source.

## ApexCharts

Historical provenance: the adopted TailAdmin snapshot included `apexcharts` / `react-apexcharts`. Both packages and their demo source usage were removed during UI template cleanup on 2026-10-02; `package.json`, `package-lock.json`, and `npm ls` confirm their absence from the current application.

Project decision:

- **NOT APPROVED sebagai core dependency**;
- current application: removed, no replacement chart library installed;
- jika penggunaan diusulkan, lakukan license review + ADR terlebih dahulu.

Reason: current ApexCharts uses a revenue-based/community licensing model; project memilih dependency licensing yang lebih sederhana untuk baseline Rp0.

## Recharts

- Status: optional/future; belum otomatis dipasang.
- Upstream: https://github.com/recharts/recharts
- License: MIT according to upstream repository.
- Intended use: possible charts for research/benchmark result visualization after explicit task/ADR.


---

# SOURCE: docs/00_START_HERE.md

# 00 — START HERE

Dokumen ini untuk anggota tim yang **belum paham Next.js, Vercel, dan TiDB**.

## Jangan mulai dengan coding algoritma

Urutan aman project:

```text
Pahami konsep
→ pilih/adopsi TailAdmin Free baseline
→ setup local
→ repo & branch
→ Vercel skeleton
→ TiDB dev/testing/prod
→ CRUD kecil end-to-end
→ map
→ freeze snapshot + road validation + OSRM Table matrix + hash/freeze
→ NN
→ 2-Opt
→ ACO
→ benchmark
→ QA
→ production demo
```

Jika langsung mengerjakan ACO sebelum foundation stabil, debugging akan tercampur antara framework, database, deployment, dan algoritma.

## Pembagian pemahaman

Kalian hanya perlu memahami empat lapisan:

### 1. Next.js

Aplikasi web full-stack.

```text
Browser
  ↓
Next.js UI
  ↓
Next.js server code
  ↓
TiDB
```

### 2. Vercel

Tempat aplikasi Next.js di-build dan dijalankan online.

```text
GitHub push
   ↓
Vercel build
   ↓
Preview / Production URL
```

### 3. TiDB

Database SQL terkelola yang kompatibel dengan banyak pola MySQL.

```text
Next.js server
   ↓
Drizzle
   ↓
TiDB
```

### 4. GitHub

Source control dan workflow kolaborasi.

```text
feature/* → testing → main
```

## Tiga environment

Target kita:

| Environment | Fungsi | Database |
|---|---|---|
| Local Development | coding di laptop | TiDB Dev |
| Preview/Testing | integrasi & review | TiDB Testing |
| Production | demo/live stabil | TiDB Production |

Jika free quota TiDB berubah, lihat fallback di `25_COST_GUARDRAILS.md`.

## Cara memakai AI

AI tidak boleh langsung diberi prompt “buat semua project”.

Gunakan pola:

```text
AUDIT → PLAN → IMPLEMENT → VERIFY → HUMAN CHECK → MERGE
```

Lihat:

- `21_AI_OPERATING_MODEL.md`
- `22_PROMPT_LIBRARY.md`
- `23_PHASE_GATES_CHECKLISTS.md`

## Daily workflow anggota tim

1. tarik branch `testing` terbaru;
2. buat branch fitur;
3. baca task dan AC;
4. minta AI audit bila perlu;
5. coding kecil bertahap;
6. jalankan checks;
7. push feature branch;
8. cek Vercel Preview;
9. buka PR ke `testing`;
10. review;
11. merge bila gate lulus.

## Research contract yang wajib dibaca

- [32 — Research Decisions](docs/32_RESEARCH_DECISIONS.md): working RQ, main experiment dan OPEN decisions.
- [33 — Algorithm Specification](docs/33_ALGORITHM_SPECIFICATION.md): NN deterministic, 2-Opt asymmetric-safe, ACO Classical Ant System.
- [34 — OSRM Distance Contract](docs/34_OSRM_DISTANCE_CONTRACT.md): formal input memakai frozen directed OSRM road-network matrix dalam meter.
- [15 — Protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md): 10/25/50 customer × 10 random datasets; 30 ACO seeded runs; 30 NN+2-Opt timing repetitions; 5 warm-ups.

Calibration/evaluation wajib terpisah dan satu ACO configuration global dibekukan. N=100 serta clustered/circular/directional optional setelah review/pilot. OPEN: nilai numerik ACO, depot/study area, endpoint public/local OSRM, dan eksperimen tambahan; jumlah run/main datasets serta peran OSRM bukan keputusan yang masih pending.

Status implementasi aktual ada di [README](README.md#current-implementation-status). Target arsitektur dan checklist bukan evidence implementasi selesai.


## UI template baseline

Sebelum bootstrap UI, baca `docs/30_UI_TEMPLATE_GUIDE.md`. Project memakai **TailAdmin Next.js Free** sebagai baseline shell; Free edition only.


---

# SOURCE: docs/01_PROJECT_CHARTER.md

# 01 — PROJECT CHARTER

## 1. Nama sementara

**Sistem Optimasi Rute Pengiriman Paket Berbasis Web**

## 2. Problem statement

Admin yang harus mengatur banyak tujuan pengiriman dapat menghasilkan urutan kunjungan yang zig-zag, bolak-balik, atau memiliki total perjalanan lebih panjang jika penentuan urutan dilakukan manual. Sistem ditujukan untuk membantu admin menghasilkan dan membandingkan urutan kunjungan customer dari satu depot, mengunjungi seluruh customer, lalu kembali ke depot.

## 3. Model masalah

```text
DEPOT
  ↓
Customer ?
  ↓
Customer ?
  ↓
...
  ↓
DEPOT
```

Fokus adalah **sequence of visits**, bukan shortest path satu pasangan node.

## 4. In-scope MVP

- konfigurasi depot;
- generate dummy order;
- CRUD/edit dummy order;
- latitude/longitude customer;
- map marker depot/customer;
- scenario dataset;
- seeded dummy generation;
- frozen directed OSRM Table road-network distance matrix, meter, input/matrix hash;
- Nearest Neighbor;
- best-improvement 2-Opt dengan full directed route recomputation;
- ACO / Classical Ant System tanpa post-ACO 2-Opt;
- benchmark pada input yang sama;
- total distance;
- execution time;
- route sequence;
- result history;
- map polyline titik-ke-titik;
- export hasil eksperimen minimal CSV;
- testing dan production environment.

## 5. Out-of-scope MVP

- aplikasi/mobile kurir;
- GPS realtime;
- turn-by-turn navigation;
- live traffic;
- proof of delivery;
- chat/WhatsApp customer;
- pembayaran;
- fleet payroll;
- multi-depot VRP;
- dynamic vehicle capacity;
- optimization menggunakan paid map API.

## 6. Constraints

- tim paling familiar PHP/MySQL, tetapi stack dipilih Next.js + TiDB;
- tim masih pemula Next.js/Vercel/TiDB;
- budget infrastruktur: **Rp0**;
- domain sendiri tersedia;
- project akademik S1;
- waktu dan maintainability lebih penting daripada arsitektur kompleks;
- teknologi harus sebisa mungkin free/open-source.

## 7. Technical success criteria

MVP dianggap berhasil bila:

1. aplikasi dapat diakses pada environment testing dan production;
2. data dev/testing/prod tidak tercampur;
3. dummy order dapat dibuat dan diedit;
4. map menampilkan depot dan customer;
5. NN+2-Opt menghasilkan closed tour valid;
6. ACO menghasilkan closed tour valid;
7. kedua metode menerima benchmark input yang identik;
8. hasil jarak dapat diverifikasi ulang;
9. execution time tercatat;
10. ACO mendukung seeded run;
11. CI lulus sebelum release;
12. tidak ada secret di Git;
13. production DB tidak digunakan oleh preview branch.

## 8. Research success criteria

- eksperimen reproducible;
- input snapshot immutable;
- seed dicatat;
- algorithm parameter dicatat;
- git commit SHA dicatat;
- environment benchmark dicatat;
- hasil ACO multi-run dapat dianalisis;
- hasil route dapat direkonstruksi.

Main design: 10/25/50 customer, masing-masing 10 independent random datasets. N=100 conditional setelah pilot; clustered/circular/directional optional tambahan. ACO 30 independent seeded runs, NN+2-Opt satu quality result dan 30 timing repetitions, 5 warm-ups per algoritma/dataset. Calibration datasets terpisah dan satu global ACO configuration dibekukan. RQ/metrics mengikuti [research decisions](docs/32_RESEARCH_DECISIONS.md) dan [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md).

OSRM adalah input infrastructure, bukan algoritma penelitian. Geometry terpisah; timer formal hanya algorithm execution pada environment terkontrol, tanpa OSRM/DB/network/serialization/geometry/rendering.

## 9. Non-goals

Project ini tidak mencoba membuktikan heuristic/metaheuristic menghasilkan optimum global kecuali ada benchmark exact/best-known yang mendukung klaim tersebut.

Gunakan istilah:

- “rute yang dihasilkan”;
- “lebih pendek pada skenario X”;
- “best observed solution”;

bukan “rute paling optimal” tanpa bukti optimum.


---

# SOURCE: docs/02_PRODUCT_REQUIREMENTS.md

# 02 — PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 1. Persona utama

**Admin Route Planner**: pengguna yang menyiapkan data order/customer, menentukan scenario, menjalankan optimasi, membandingkan hasil, dan melihat route pada map.

## 2. Core user journey

```text
Admin buka dashboard
→ pilih/atur depot
→ buat scenario
→ generate/import/edit customer
→ validasi titik
→ freeze benchmark snapshot + OSRM Table directed matrix + hash/freeze
→ run NN+2Opt
→ run ACO
→ lihat comparison
→ lihat route di map
→ simpan/export hasil
```

## 3. Functional requirements

### FR-001 Depot management

Admin dapat:

- membuat depot;
- mengubah nama/alamat/lat/lng;
- memilih depot aktif untuk scenario;
- menampilkan marker depot.

**Acceptance criteria:**

- latitude [-90, 90];
- longitude [-180, 180];
- perubahan tervalidasi server-side;
- depot tidak dapat dihapus jika melanggar referential rule yang disepakati.

### FR-002 Scenario management

Scenario memiliki minimal:

- nama;
- depot;
- distribution pattern;
- customer count;
- min/max radius;
- generation seed;
- status draft/frozen bila diperlukan.

### FR-003 Dummy generator

Primary generation pattern untuk main experiment adalah random. Engineering generator boleh mendukung pattern berikut; clustered/circular/directional hanya optional/additional experiment, bukan mandatory primary experiment atau core novelty:

- random;
- clustered;
- circular;
- directional.

Requirement:

- seed sama → dataset sama;
- hasil dapat diedit setelah dibuat;
- generator tidak boleh membuat koordinat invalid;
- regenerate harus meminta konfirmasi jika menimpa data.

### FR-004 Order/customer CRUD

Minimal field:

- order code;
- customer name;
- address;
- latitude;
- longitude;
- source (`dummy`/`manual`).

### FR-005 Map

Map harus:

- menampilkan depot;
- menampilkan customer;
- membedakan marker depot/customer;
- menampilkan sequence number setelah optimasi;
- menampilkan polyline route;
- menampilkan attribution OpenStreetMap.

### FR-006 Distance matrix

- matrix dibentuk dari frozen benchmark case melalui road validation + OSRM Table Service sesuai [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md);
- unit meter, NxN termasuk depot index 0, directed/asymmetric diterima tanpa asumsi symmetry;
- diagonal 0, finite nonnegative values, null/unreachable ditolak; ACO eligibility untuk zero off-diagonal mengikuti docs/33;
- stable node order, input hash, matrix hash, provider/profile/version metadata;
- freeze immutable matrix sebelum formal run; kedua algoritma memakai snapshot/hash identik.

### FR-007 NN + 2-Opt

- NN deterministic menghasilkan initial closed tour dari depot=0, minimum directed cost, tie-break lowest node index;
- 2-Opt hanya menerima route valid;
- 2-Opt tidak boleh menghilangkan customer;
- best-improvement 2-Opt reverse candidate segment dan recompute FULL directed route distance; symmetric-only delta shortcut dilarang;
- accept strict improvement saja, depot fixed, hasil final distance <= NN initial distance, sesuai [docs/33](docs/33_ALGORITHM_SPECIFICATION.md).

### FR-008 ACO

Varian = Classical Ant System, seeded deterministic PRNG, directed pheromone, roulette-wheel selection, fixed iterations, semua valid ants deposit, best observed route tracked. Tidak menambahkan 2-Opt setelah ACO pada main comparison. Parameter typed explicit:

- ant count;
- iterations;
- alpha;
- beta;
- evaporation;
- Q;
- tau0;
- seed.

Nilai default final **belum dikunci** sampai didukung metodologi.

### FR-009 Benchmark comparison

Satu benchmark case dan frozen OSRM matrix/hash harus digunakan oleh kedua algoritma. Main: 10/25/50 customer × 10 independent random datasets = 30 datasets; N=100 optional setelah pilot. Calibration wajib terpisah dan satu global ACO configuration frozen.

ACO: 30 independent seeded runs per dataset. NN+2-Opt: satu deterministic quality result + 30 measured timing repetitions. Lakukan 5 warm-ups per algoritma/dataset; timer mengecualikan OSRM/DB/HTTP/network/serialization/geometry/rendering. Raw failed/poor runs dipertahankan. Detail [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md).

Sistem menyimpan:

- input hash;
- distance matrix ID/hash dan node order;
- distance metric/version;
- algorithm name/version;
- parameters;
- run number;
- seed;
- route;
- total distance;
- execution time.

### FR-010 Result comparison

Minimal tampil:

- algorithm;
- deterministic NN+2-Opt distance;
- mean dan median ACO sebagai primary descriptive comparison;
- ACO best dan worst sebagai tambahan, bukan best-of-30 sebagai satu-satunya primary comparison;
- standard deviation;
- runtime;
- route sequence;
- improvement terhadap baseline bila dihitung.

RQ3 menambahkan range dan CV ACO tanpa threshold baik/buruk yang tidak bersumber. Runtime: mean, median, SD dari measured repetitions. Dataset-level summaries adalah observasi scenario; 30 runs dalam satu dataset bukan 30 independent datasets.

### FR-011 Export

Minimal CSV untuk hasil benchmark.

## 4. Non-functional requirements

### NFR-001 Security

- no secret in browser bundle;
- no production DB credential on Preview;
- server-side validation;
- parameterized DB access;
- auth required sebelum aplikasi public mutation digunakan secara terbuka.

### NFR-002 Reproducibility

- dataset seed;
- ACO seed;
- input snapshot;
- commit SHA;
- parameter snapshot.

### NFR-003 Maintainability

- algoritma terpisah dari Next.js/DB/UI;
- TypeScript strict;
- small modules;
- migration tracked.

### NFR-004 Performance

Tidak menetapkan SLA enterprise. Target MVP:

- UI CRUD responsif untuk <= 100 customer;
- algoritma tidak memblok UI client karena dijalankan server/benchmark runner;
- formal benchmark dilakukan terkontrol.

### NFR-005 Accessibility

- form label jelas;
- keyboard usable;
- color bukan satu-satunya indikator;
- table comparison memiliki header semantik.

## 5. Requirement traceability

Setiap feature task harus mencantumkan FR/NFR yang disentuh agar review tidak menjadi “feeling-based”.


---

# SOURCE: docs/03_SYSTEM_ARCHITECTURE.md

# 03 — SYSTEM ARCHITECTURE

## 1. Architecture style

**Modular monolith full-stack Next.js**.

Kita sengaja tidak memakai microservice pada MVP.

```text
Browser
  │
  ▼
Next.js App Router
  ├─ Server Components
  ├─ Client Components (hanya bila interaktif/browser API)
  ├─ Route Handlers / Server Actions
  ├─ Application Services
  ├─ Routing Algorithms
  └─ Data Access (Drizzle)
             │
             ▼
        TiDB Cloud
```

## 2. Key architectural boundaries

### UI layer

Tanggung jawab:

- rendering;
- form UX;
- map interaction;
- client state lokal yang benar-benar perlu.

Tidak boleh:

- menyimpan DB credential;
- menjalankan formal research benchmark;
- berisi core ACO implementation.

### Server/API layer

Tanggung jawab:

- validation;
- authorization;
- orchestration;
- database mutation;
- memanggil services.

### Domain/application layer

Tanggung jawab:

- scenario freeze;
- benchmark orchestration;
- route validation;
- statistics;
- business rules.

### Algorithm layer

Tanggung jawab:

- distance matrix operation;
- NN;
- 2-Opt;
- ACO.

Input/output harus plain typed structures. Algorithm domain menerima DistanceMatrix sebagai satu-satunya input geografis, ditambah params/seed; tidak boleh import `next/*`, React, Leaflet, Drizzle/TiDB, atau OSRM HTTP client. Road validation, matrix construction/storage, dan hashing ditangani application/infrastructure.

## 3. Core flow — create scenario

```text
Form
→ Zod validation
→ Scenario service
→ Drizzle
→ TiDB
→ revalidate UI
```

## 4. Core flow — benchmark

```text
Editable Scenario
      ↓ FREEZE
Immutable Benchmark Case
      ↓
Road-network validation + OSRM Table adapter (infrastructure)
      ↓
Validated frozen directed matrix (meter, input hash, matrix hash)
      ├───────────────┐
      ↓               ↓
  NN → 2-Opt         Classical Ant System x 30 seeded runs
      ↓               ↓
 Route result       Run results
      └───────┬───────┘
              ↓
       Experiment summary
              ↓
            TiDB
```

## 5. Research reproducibility boundary

Scenario adalah **editable working dataset**.

Benchmark case adalah **immutable scientific snapshot**.

Jangan menjalankan formal comparison langsung dari mutable `orders` lalu menganggap hasil dapat direproduksi.

```text
Scenario #12 (editable)
      ↓ Freeze
Benchmark Case #37 (immutable)
      ├─ depot snapshot
      ├─ customer snapshots
      ├─ input_hash
      ├─ provider/profile/version
      └─ distance_matrices snapshot + matrix_hash + stable node order
```

## 6. Map architecture

Leaflet adalah client-side dependency.

Recommended:

```text
Server Component page
  ↓ pass serializable data
Client Map Component (`'use client'`)
  ↓
Leaflet
```

Jangan import Leaflet langsung dari Server Component karena bergantung pada browser DOM.

## 7. OSRM infrastructure and optimizer boundary

Gunakan abstraction:

```text
UI/API → Application → Algorithm Domain (matrix + params/seed → result)
              │
              └→ Matrix Builder / Storage → OSRM Table adapter
```

dan terpisah:

```text
Optimizer sequence → RouteGeometryProvider → OSRM Route geometry → Leaflet
```

DistanceProvider adalah port infrastructure untuk produksi matrix, bukan dependency algoritma. OSRM Table merupakan core formal input sesuai [ADR-012](docs/04_TECH_STACK_ADRS.md#adr-012--osrm-road-network-distance-matrix-for-formal-research-benchmark). Geometry boleh menyusul sebagai pekerjaan visualisasi terpisah.

Kedua algoritma memakai matrix hash/values/node order identik. NN deterministic (depot=0, lowest-index tie); 2-Opt best improvement full recomputation untuk directed costs; ACO Classical Ant System tanpa post-ACO 2-Opt. Detail [docs/33](docs/33_ALGORITHM_SPECIFICATION.md) dan [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md).

Formal runner terkontrol mengukur hanya solver call, termasuk initialisasi state algoritma. OSRM/DB/HTTP/network/serialization/geometry/rendering, external validation, dan hash verification di luar timer. Main design dan repetitions mengikuti [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md). Diagram adalah target architecture; current implementation ada di [README](README.md#current-implementation-status).

## 8. Failure boundaries

- DB failure → tampilkan error yang aman; jangan kehilangan form state bila memungkinkan.
- algorithm validation failure → fail closed; jangan simpan route invalid.
- ACO one-run failure → tandai run failed; summary tidak boleh diam-diam menganggap sukses.
- migration failure → stop deployment path, jangan coba “fix otomatis” di production.

## 9. Architecture quality attributes

Prioritas:

1. correctness;
2. reproducibility;
3. maintainability;
4. security;
5. simplicity;
6. performance;
7. extensibility.

Bukan prioritas:

- distributed system sophistication;
- premature caching;
- microservices;
- event bus;
- Kubernetes.


---

# SOURCE: docs/04_TECH_STACK_ADRS.md

# 04 — TECH STACK & ARCHITECTURE DECISION RECORDS

## ADR-001 — Next.js App Router + TypeScript

**Status:** Accepted

### Context

Tim belum berpengalaman dengan Next.js tetapi memilih Vercel + TiDB. Next.js memiliki integrasi first-class di Vercel dan dapat menangani UI + server-side code dalam satu repository.

### Decision

Gunakan **Next.js App Router + TypeScript strict**.

### Consequences

Positive:

- satu full-stack repo;
- preview deployment mudah;
- type safety;
- cocok Vercel.

Negative:

- learning curve React/Server Components;
- tim PHP perlu mengubah mental model.

Mitigation: `05_NEXTJS_FOR_PHP_DEVS.md` + learning plan.

---

## ADR-002 — Vercel sebagai hosting

**Status:** Accepted

### Decision

Gunakan Vercel Git Integration.

- `main` → Production.
- non-production branches → Preview.
- `testing` diperlakukan sebagai stable Preview branch dan diberi branch-specific env/domain jika tersedia.

### Important

Formal research benchmark tidak boleh bergantung pada runtime Vercel; jalankan pada environment terkontrol yang dicatat. Vercel tetap untuk aplikasi/demo.

---

## ADR-003 — TiDB Cloud Starter

**Status:** Accepted

Alasan:

- SQL relational;
- familiar bagi tim MySQL;
- serverless driver untuk environment modern;
- current free quota cocok project akademik;
- integrasi dengan Vercel tersedia.

Constraint:

- TiDB bukan MySQL identik 100%; gunakan supported SQL subset dan uji compatibility.

---

## ADR-004 — Drizzle ORM + TiDB serverless driver

**Status:** Accepted

Alasan:

- typed schema;
- dekat dengan SQL;
- official TiDB tutorial tersedia;
- tidak terlalu “magic”.

---

## ADR-005 — npm, bukan menambah package manager baru

**Status:** Accepted

Next.js docs merekomendasikan pnpm pada tutorial, tetapi untuk tim yang sedang belajar banyak teknologi baru, baseline project menggunakan **npm** untuk mengurangi cognitive overhead.

Semua developer harus menggunakan lockfile yang sama (`package-lock.json`) dan `npm ci` pada CI.

---

## ADR-006 — Node.js 24.x

**Status:** Accepted, review annually

Per 2026-09-26, Vercel mendukung dan menjadikan Node 24 LTS default untuk project baru. Project pin major Node `24.x` agar local dan Vercel konsisten.

Jika environment kampus/laptop tidak mendukung, jangan downgrade sepihak; buat ADR baru.

---

## ADR-007 — Modular monolith

**Status:** Accepted

Tidak ada microservice algorithm/database pada MVP.

---

## ADR-008 — Three data environments

Target:

- TiDB Dev;
- TiDB Testing;
- TiDB Production.

Saat current free quota memungkinkan, gunakan tiga instance terpisah. Jika free-tier berubah, fallback boleh menjadi satu instance dengan database terpisah, tetapi perlu ADR karena isolation menurun.

---

## ADR-009 — Auth sebelum public mutation

Auth bukan bagian penelitian, tetapi Web Admin yang exposed ke internet tidak boleh membiarkan mutation anonim.

Rencana P1: Auth.js + provider yang disepakati tim; alternatif paling sederhana adalah GitHub OAuth dengan allowlist anggota.

Boleh defer saat local-only foundation. Wajib sebelum custom production domain dibuka untuk mutation publik.

---

## ADR-010 — OSRM bukan MVP core

**Status:** Superseded oleh [ADR-012](docs/04_TECH_STACK_ADRS.md#adr-012--osrm-road-network-distance-matrix-for-formal-research-benchmark), 2026-10-02.

**Historical decision (tidak berlaku sebagai instruksi aktif):** OSRM hanya future/supporting untuk road geometry atau road-network distance experiment bila penelitian membutuhkannya.

Alasan supersession: keputusan manusia terbaru menetapkan OSRM Table sebagai core infrastructure input formal. Geometry tetap concern terpisah dan OSRM tetap bukan research algorithm. History ini dipertahankan untuk audit.


## ADR-011 — TailAdmin Next.js Free sebagai UI template baseline

**Status:** Accepted

### Context

Tim belum familiar dengan Next.js dan membutuhkan admin shell yang dapat di-download, gratis, dan cocok dengan Next.js + TypeScript + Tailwind.

### Decision

Gunakan **TailAdmin Next.js Free** dari repository resmi sebagai baseline presentation/UI.

Rules:

- Free edition only;
- upstream repository menyatakan MIT License;
- provenance/source revision dicatat;
- template tidak boleh menentukan domain architecture;
- e-commerce/demo content dibersihkan;
- Pro/paid assets dilarang;
- jangan menambah template kedua.

### Dependency licensing guardrail

TailAdmin upstream dapat membawa ApexCharts. Current ApexCharts menggunakan community/revenue-based licensing. Agar baseline project Rp0 dan legal model sederhana, `apexcharts`/`react-apexcharts` **tidak menjadi core dependency** dan ditargetkan dihapus saat template cleanup.

Jika chart diperlukan untuk hasil penelitian, kandidat awal adalah **Recharts (MIT)** melalui task/ADR terpisah.

Detail: `docs/30_UI_TEMPLATE_GUIDE.md`.

---

## ADR-012 — OSRM Road-Network Distance Matrix for Formal Research Benchmark

**Status:** Accepted
**Date:** 2026-10-02
**Authority:** Keputusan eksplisit manusia pada task corrective documentation + research contract sync.

### Context

ADR-010 menunda OSRM dan dokumen sebelumnya mengarahkan formal input pada distance methodology yang belum dikunci. Penelitian sekarang memerlukan identical road-network input untuk comparison NN+2-Opt vs ACO, serta input yang bisa diaudit ulang meski layanan jalan berubah.

### Decision

Gunakan OSRM Table Service sebagai approved core input infrastructure untuk membuat **frozen directed/asymmetric distance matrix dalam meter**. Validate routability, stable node order, values dan no unreachable pair; simpan input hash serta matrix hash sebelum formal run. Kedua algoritma harus menerima exact matrix snapshot yang sama.

### Scope and distinctions

- OSRM Table adapter + matrix builder/storage adalah infrastructure, bukan research algorithm.
- Algorithm domain menerima matrix + params/seed saja: deterministic NN → best-improvement asymmetric-safe 2-Opt vs Classical Ant System.
- OSRM Route/geometry menerima optimizer sequence untuk Leaflet; visualisasi tidak mengubah matrix/cost penelitian dan boleh dikerjakan kemudian.
- Formal timer hanya algoritma pada environment terkontrol; mengecualikan OSRM request, DB, HTTP/network, serialization, geometry, dan rendering.
- ADR ini tidak memilih public vs local/self-hosted endpoint, final numeric ACO parameters, atau mengimplementasikan adapter/migration.

### Consequences

Directed costs mengharuskan full route recomputation untuk reversal 2-Opt dan directed pheromone ACO. Matrix harus disimpan immutable; koordinat saja tidak cukup untuk mereproduksi input jika road network/profile berubah. Storage/provenance dan provider failure handling bertambah. Null/unreachable tidak boleh diganti metric lain.

OSRM distance bukan otomatis mathematical shortest-distance path. Provider/profile/version harus dicatat beserta keterbatasan endpoint. Lihat [OSRM contract](docs/34_OSRM_DISTANCE_CONTRACT.md).

### Why ADR-010 was superseded

Framing OSRM sebagai future untuk seluruh fungsi tidak lagi sesuai approved formal research input. Pemisahan input infrastructure, optimization algorithm, dan geometry membuat peran baru ini jelas tanpa mengganti core TSP-like problem.

### Implementation follow-up

Matrix foundation berada sebelum algorithm integration pada Phase 3. Conceptual storage ada di [database design](docs/08_DATABASE_DESIGN.md); protocol di [docs/15](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md); specification di [docs/33](docs/33_ALGORITHM_SPECIFICATION.md). Tidak ada actual DB migration dalam sinkronisasi dokumentasi ini.


---

# SOURCE: docs/05_NEXTJS_FOR_PHP_DEVS.md

# 05 — NEXT.JS FOR PHP DEVELOPERS

Dokumen ini menerjemahkan konsep yang familiar dari PHP ke Next.js.

## 1. Mental model

PHP klasik:

```text
Request → index.php/controller → query DB → render HTML → response
```

Next.js App Router:

```text
Request/navigation
→ route/page/layout
→ Server Component / Route Handler / Server Action
→ DB/service
→ React output/JSON
```

## 2. Perbandingan konsep

| PHP/MVC | Next.js App Router |
|---|---|
| route config | folder/file routing di `src/app` |
| controller | Route Handler / Server Action / server function |
| view/template | React Server/Client Component |
| model/repository | `src/db` + service/repository functions |
| middleware | `proxy.ts`/framework middleware pattern sesuai versi + auth guards |
| `.env` | `.env.local` + Vercel Environment Variables |
| composer | npm |
| `vendor/` | `node_modules/` |
| `composer.lock` | `package-lock.json` |
| session | cookies/Auth.js/server session |

## 3. Server Component vs Client Component

### Server Component — default

Gunakan untuk:

- fetch DB;
- render list/table;
- logic yang tidak butuh browser API;
- menjaga secret di server.

### Client Component

Tambahkan `'use client'` hanya jika perlu:

- event handler kompleks;
- `window`/DOM;
- Leaflet;
- interactive local state.

**Anti-pattern:** membuat seluruh halaman `'use client'` karena terasa lebih mudah.

## 4. Route Handlers

Mirip endpoint controller:

```text
src/app/api/scenarios/route.ts
```

Bisa memiliki `GET`, `POST`, dsb.

Gunakan bila butuh API HTTP jelas, integration, atau client fetch.

## 5. Server Actions

Cocok untuk mutation dari form React tanpa membuat endpoint manual untuk semua hal. Namun jangan memasukkan business logic langsung ke action. Action tetap memanggil service.

## 6. Data fetching

Default thinking:

- bila data hanya perlu untuk render server → fetch di Server Component;
- bila mutation form → Server Action atau Route Handler;
- bila map interaktif butuh data → server fetch lalu pass typed props ke Client Component.

## 7. Error handling

Gunakan boundary Next.js seperti:

- `error.tsx`;
- `not-found.tsx`;
- validation errors yang eksplisit;
- server logs untuk unexpected exception.

Jangan `catch` semua error lalu return “success=false” tanpa log/trace.

## 8. TypeScript yang wajib dipahami dulu

Tim tidak perlu langsung ahli semua TS. Fokus:

1. primitive types;
2. `type` dan `interface`;
3. union type;
4. optional property;
5. generics dasar;
6. async/Promise;
7. narrowing;
8. `unknown` vs `any`.

Rule: `any` bukan solusi default.

## 9. React minimal yang wajib

- component;
- props;
- state;
- event handler;
- conditional rendering;
- list rendering + key;
- controlled form hanya bila perlu;
- effect hanya bila ada side-effect client.

## 10. Anti-pattern untuk tim baru

- semua komponen client;
- fetch DB dari browser;
- expose `DATABASE_URL` via `NEXT_PUBLIC_*`;
- business logic di JSX;
- `useEffect` untuk data yang bisa server-fetch;
- global state library sebelum benar-benar perlu;
- route handler berisi algorithm core;
- mengabaikan TypeScript error dengan `as any`.

## 11. Latihan onboarding

Sebelum core project, setiap anggota idealnya mampu:

1. buat page `/hello`;
2. buat Server Component;
3. buat Client Component counter;
4. buat Route Handler `/api/health`;
5. buat satu table TiDB `learning_notes`;
6. insert/select via Drizzle;
7. deploy feature branch dan buka Preview URL.

Baru kemudian mengambil task core.


---

# SOURCE: docs/06_VERCEL_GUIDE.md

# 06 — VERCEL GUIDE FOR BEGINNERS

## 1. Apa itu Vercel?

Vercel adalah platform deployment yang sangat terintegrasi dengan Next.js.

Dalam project ini, Vercel bertugas:

- build Next.js;
- menjalankan server-side functions;
- melayani static assets;
- memberi Preview URL per branch/PR;
- production deployment dari `main`;
- menyimpan environment variables;
- custom domain.

## 2. Apa yang terjadi saat push?

```text
git push origin feature/map
        ↓
GitHub
        ↓
Vercel Git Integration
        ↓
Build
        ↓
Preview deployment
```

Merge `testing` → `main`:

```text
main updated
   ↓
Production deployment
```

## 3. Production vs Preview

- Production: branch `main`.
- Preview: branch selain production, termasuk `testing` dan `feature/*`.

Kita menggunakan `testing` sebagai stable integration Preview branch.

## 4. Branch-specific configuration

Vercel mendukung Preview Environment Variables dan override per Git branch. Gunakan agar `testing` dapat diarahkan ke TiDB Testing tanpa menyentuh production.

Policy:

- Production env `DATABASE_URL` → TiDB Production.
- Preview default `DATABASE_URL` → TiDB Testing.
- Local Development → TiDB Dev via `.env.local`.

## 5. Domain

Rencana:

```text
route.example.com          → Production/main
testing-route.example.com  → branch testing
```

Jangan gunakan domain production untuk testing.

## 6. Preview branch feature

Feature preview memakai TiDB Testing secara default. Karena beberapa feature preview bisa hidup bersamaan, gunakan data scenario yang diberi owner/tag dan jangan mengandalkan satu row global mutable.

Untuk schema migration besar, koordinasikan terlebih dahulu.

## 7. Environment variable rule

Secret:

- `DATABASE_URL`
- `AUTH_SECRET` bila auth aktif
- OAuth credentials bila digunakan

Tidak boleh memakai prefix `NEXT_PUBLIC_` kecuali nilainya memang aman untuk browser.

Setelah mengubah env var di Vercel, lakukan redeploy bila diperlukan.

## 8. Logs

Jika Preview gagal:

1. buka Deployment;
2. cek build logs;
3. cek missing environment variables;
4. cek Node version;
5. cek build command;
6. cek runtime exception logs bila build sukses tetapi request gagal.

## 9. Node version

Baseline project: **Node 24.x**.

Set:

- `package.json` engines;
- Vercel Project Settings Node.js Version = 24.x.

Jangan biarkan laptop satu anggota 20.x, CI 22.x, dan Vercel 24.x tanpa alasan.

## 10. Vercel is not the research benchmark machine

Vercel bagus untuk application behavior. Tetapi formal comparison execution time harus dijalankan pada environment terkontrol, karena serverless environment dapat memiliki variasi cold/warm state dan resource scheduling.

## 11. Minimum Vercel verification

Setelah setup:

- [ ] main deploy sukses;
- [ ] feature branch menghasilkan Preview;
- [ ] Preview tidak terhubung production DB;
- [ ] main terhubung production DB;
- [ ] health endpoint sukses;
- [ ] custom domain production valid;
- [ ] testing branch/domain valid bila dikonfigurasi;
- [ ] env secret tidak tampil di browser bundle.


---

# SOURCE: docs/07_TIDB_GUIDE.md

# 07 — TiDB GUIDE FOR A MYSQL-FAMILIAR TEAM

## 1. Cara berpikir

TiDB adalah relational distributed SQL database yang kompatibel dengan banyak pola/protokol MySQL, tetapi **bukan MySQL 100% identik**.

Gunakan pengetahuan MySQL kalian untuk:

- schema relational;
- PK/FK concept;
- indexes;
- SELECT/INSERT/UPDATE/DELETE;
- JOIN;
- transactions.

Jangan berasumsi semua MySQL-specific feature tersedia.

## 2. Connection

Untuk app, baseline memakai:

```text
Next.js server
→ @tidbcloud/serverless
→ Drizzle
→ TiDB Cloud Starter
```

Credential disimpan pada `DATABASE_URL` server-side.

## 3. Environment design

Target tiga instance:

```text
route-planner-dev
route-planner-testing
route-planner-production
```

Alasan pemisahan:

- migration dev tidak merusak testing;
- testing tidak merusak production;
- preview tidak membaca data production;
- reset data dev/testing aman.

Current TiDB Starter free quota saat baseline dibuat mendukung hingga lima free instances per organization; **cek ulang sebelum provisioning**.

## 4. SQL design rule

Pilih portable MySQL-like subset.

Hindari dependency pada feature vendor-specific tanpa ADR.

## 5. ID strategy

Gunakan `BIGINT` auto increment atau UUID/ULID secara konsisten. Untuk MVP, `BIGINT` auto increment sederhana dan cukup.

Untuk public IDs, jangan expose assumption bahwa sequential ID = authorization. Authorization tetap server-side.

## 6. Money/time/coordinate types

- koordinat: `DECIMAL`/double sesuai design final, tetapi pahami precision;
- execution time: integer micro/nanosecond representation atau double ms dengan definisi konsisten;
- distance: simpan unit eksplisit (mis. meter) untuk menghindari ambiguity;
- timestamp: UTC di database; format display lokal di UI.

## 7. Migration policy

Tidak boleh edit schema production manual lewat console tanpa migration record kecuali emergency documented.

Flow:

```text
schema.ts change
→ migration generate/review
→ apply dev
→ tests
→ apply testing
→ QA
→ production window
```

## 8. Destructive changes

Contoh berisiko:

- DROP COLUMN;
- change type yang narrowing;
- rename column tanpa compatibility layer;
- mass UPDATE;
- DELETE tanpa filter.

Wajib approval manusia + backup/export/rollback plan.

## 9. Query performance

Untuk <=100 customer, algorithm data volume kecil. Jangan premature optimization.

Index minimal berdasarkan query nyata:

- foreign key lookup;
- scenario_id;
- benchmark_case_id;
- experiment_id;
- created_at bila list sort/filter.

Gunakan explain hanya saat ada evidence query lambat.

## 10. Free-tier guardrail

- no background polling agresif;
- no unnecessary analytics query tiap render;
- pagination result history;
- simpan frozen OSRM distance matrix sekali sebagai immutable snapshot dan referensikan dari experiments; jangan request/recompute matrix untuk setiap run karena road network dapat berubah (lihat [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md));
- batasi export/run abuse dengan auth dan server validation.


---

# SOURCE: docs/08_DATABASE_DESIGN.md

# 08 — DATABASE DESIGN

**Conceptual target design only.** Tabel/kolom di bawah belum merupakan schema/migration terimplementasi. Sinkronisasi 2026-10-02 menambahkan frozen matrix storage; Editable Scenario → Immutable Benchmark Case tetap dipertahankan.

## 1. Design goals

- simple untuk tim S1;
- menjaga history eksperimen;
- editable operational scenario;
- immutable benchmark snapshot;
- reproducible research;
- tidak over-normalized.

## 2. Conceptual ERD

```text
depots
  │
  └──< scenarios
          │
          └──< orders
          │
          └──< benchmark_cases
                  │
                  └──< benchmark_case_points
                  │
                  └──< distance_matrices (immutable; referenced by experiments)
                  │
                  └──< experiments
                          │
                          └──< experiment_runs
                                  │
                                  └──< experiment_route_points
```

## 3. `depots`

```text
id BIGINT PK
name VARCHAR
address TEXT NULL
latitude DECIMAL/DOUBLE
longitude DECIMAL/DOUBLE
is_active BOOLEAN
created_at DATETIME
updated_at DATETIME
```

Constraints:

- valid coordinate range;
- name non-empty.

## 4. `scenarios`

Editable working dataset.

```text
id BIGINT PK
depot_id BIGINT FK
name VARCHAR
distribution_pattern VARCHAR
customer_count INT
radius_min_m INT NULL
radius_max_m INT NULL
generation_seed BIGINT NULL
status VARCHAR
created_at
updated_at
```

`customer_count` dapat dihitung dari orders, tetapi disimpan hanya jika diperlukan untuk config generator; actual count harus tetap diverifikasi dari rows.

## 5. `orders`

```text
id BIGINT PK
scenario_id BIGINT FK
order_code VARCHAR
customer_name VARCHAR
address TEXT NULL
latitude DECIMAL/DOUBLE
longitude DECIMAL/DOUBLE
source VARCHAR  -- dummy/manual
created_at
updated_at
```

Unique recommendation:

```text
UNIQUE(scenario_id, order_code)
```

## 6. `benchmark_cases`

Immutable snapshot metadata.

```text
id BIGINT PK
scenario_id BIGINT FK
name VARCHAR
input_hash CHAR(64)
distance_metric VARCHAR
distance_metric_version VARCHAR
coordinate_method VARCHAR
point_count INT
created_by BIGINT NULL
frozen_at DATETIME
git_commit_sha VARCHAR NULL
notes TEXT NULL
```

`input_hash` dibuat dari canonical serialized ordered depot+customer snapshots + relevant input configuration sesuai [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md). Formal distance_metric adalah OSRM road-network distance, canonical meter; coordinate_method mencatat input geographic coordinates dan routability procedure, bukan raw-degree Cartesian distance.

## 7. `benchmark_case_points`

Snapshot input, tidak berubah walau order diedit.

```text
id BIGINT PK
benchmark_case_id BIGINT FK
source_order_id BIGINT NULL
point_role VARCHAR  -- depot/customer
point_key VARCHAR
customer_name_snapshot VARCHAR NULL
address_snapshot TEXT NULL
latitude_snapshot DECIMAL/DOUBLE
longitude_snapshot DECIMAL/DOUBLE
sort_key INT
```

Rules:

- tepat satu depot snapshot;
- customer snapshot unik berdasarkan point key;
- row tidak diedit setelah freeze.
- sort_key/node order menetapkan depot index 0 dan customer indices 1..n secara stabil.

## 7A. `distance_matrices`

Frozen road-network matrix milik satu benchmark case:

```text
id BIGINT PK
benchmark_case_id BIGINT FK
provider VARCHAR
profile VARCHAR
node_order_json JSON
distance_matrix_json JSON
input_hash CHAR(64)  -- coordinate/input hash, sama dengan benchmark case
matrix_hash CHAR(64)
generated_at DATETIME
```

Metadata pendamping perlu merekam unit=meter, directed semantics, serialization/contract version, provider request options, original/snapped-coordinate evidence, serta OSRM/network version/extract provenance bila tersedia. Detail penyimpanan metadata ditetapkan saat task schema; jangan menganggap informasi unavailable sebagai known.

Rules: NxN termasuk depot, diagonal zero, finite nonnegative values, no null/unreachable; no symmetry requirement. Common ACO eligibility mengikuti docs/33. Snapshot/hash bersifat immutable. Matrix regeneration menciptakan row/snapshot baru, tidak mengubah history. Jangan menghitung ulang matrix lama lewat OSRM pada saat replay benchmark.

## 8. `experiments`

Satu konfigurasi algoritma terhadap satu benchmark case.

```text
id BIGINT PK
benchmark_case_id BIGINT FK
algorithm VARCHAR
distance_matrix_id BIGINT FK
matrix_hash CHAR(64)
algorithm_version VARCHAR
parameters_json JSON
planned_run_count INT
status VARCHAR
best_distance_m DOUBLE NULL
mean_distance_m DOUBLE NULL
median_distance_m DOUBLE NULL
stddev_distance_m DOUBLE NULL
mean_execution_time_ms DOUBLE NULL
created_at
completed_at NULL
```

Algorithm initial values:

```text
NN_2OPT
ACO
```

Application wajib memastikan distance_matrix_id milik benchmark_case_id yang sama dan recorded matrix_hash sesuai content. Experiments NN_2OPT dan ACO yang dibandingkan mereferensikan matrix snapshot/hash yang sama. Node mapping diperiksa terhadap benchmark_case_points; FK ID saja tidak membuktikan fairness.

parameters_json menyimpan seluruh explicit ACO configuration, PRNG/version dan run policy. Calibration/evaluation case identities harus terpisah pada experiment metadata. Planned formal counts: 30 ACO measured runs dan 30 NN_2OPT timing repetitions; satu deterministic route quality NN cukup. Catat 5 warm-ups secara terpisah dari measured results dan tandai run role bila disimpan. Jangan menghitung warm-up sebagai measured run.

## 9. `experiment_runs`

```text
id BIGINT PK
experiment_id BIGINT FK
run_number INT
run_role VARCHAR  -- measured/warmup
attempt INT  -- starts at 1; append on retry, never overwrite
random_seed BIGINT NULL
status VARCHAR
total_distance_m DOUBLE NULL
execution_time_ms DOUBLE NULL
iteration_count INT NULL
route_hash CHAR(64) NULL
error_code VARCHAR NULL
error_message TEXT NULL
started_at
completed_at NULL
```

`iteration_count` adalah optional diagnostic ACO yang memetakan `diagnostics.iterationsCompleted` sesuai [docs/33](docs/33_ALGORITHM_SPECIFICATION.md#6-output-and-routevalidator); untuk NN_2OPT tetap NULL. Jangan menyimpan twoOptPasses atau acceptedImprovements sebagai iteration_count. Penyimpanan diagnostic lain ditetapkan hanya bila diperlukan pada task schema.

Unique:

```text
UNIQUE(experiment_id, run_role, run_number, attempt)
```

run_number mengidentifikasi planned run dalam role-nya. Retry run measured #7 tetap memakai run_number=7 dan predetermined seed yang sama, dengan attempt baru; record failed sebelumnya dipertahankan. Export menyertakan role/attempt, dan summary hanya memakai satu resolved successful attempt per planned measured run, bukan menghitung retries sebagai tambahan sample. Attempt selection/resolution dan alasan rerun dicatat. Warm-up memakai role tersendiri jika dipersist; tidak masuk planned measured count atau statistik. Ini klarifikasi conceptual storage untuk retention policy, bukan migration aktual atau schema benchmark_batches baru.

Simpan semua successful, poor-valid, failed/interrupted run records beserta predetermined seed dan failure reason. Failure tidak diberi distance/time nol palsu. Ringkasan dapat direkomputasi dari raw runs: quality mean/median/best/worst/SD/range/CV dan timing mean/median/SD. Field ringkasan tambahan boleh dihitung dari raw data; tidak memerlukan pemaksaan tabel besar baru.

## 10. `experiment_route_points`

```text
id BIGINT PK
experiment_run_id BIGINT FK
sequence_number INT
benchmark_case_point_id BIGINT FK
distance_from_previous_m DOUBLE NULL
created_at
```

Closed tour dapat direkonstruksi dari sequence.

## 11. Optional `users`

Tambahkan saat auth diaktifkan.

Jangan implement custom password auth asal-asalan hanya untuk mengejar fitur.

## 12. Immutable research rule

Dilarang:

```text
update benchmark_case_points set latitude = ...
```

Jika input berubah, buat **benchmark case baru**.

Frozen distance_matrices juga tidak boleh di-update atau cascade-delete bersama editable orders. Experiment harus tetap dapat merekonstruksi route + exact directed matrix, termasuk return edge.

## 13. Cascade behavior

Jangan asal `ON DELETE CASCADE` pada history eksperimen.

Rekomendasi:

- deleting scenario yang sudah memiliki benchmark history → soft delete/archive atau block;
- benchmark cases → preserve;
- experiment results → preserve.

## 14. Data retention

Dev/testing boleh reset. Production research history jangan dihapus tanpa backup/export dan approval.

## 15. Optional future consideration

`benchmark_batches` boleh dievaluasi nanti untuk pengelompokan eksperimen. Bukan schema wajib yang telah disetujui dan tidak menggantikan scenario/case/matrix/experiment boundaries. Tidak ada actual migration pada task documentation sync.


---

# SOURCE: docs/09_REPO_STRUCTURE.md

# 09 — REPOSITORY STRUCTURE

Target struktur (belum seluruhnya tersedia; lihat [current implementation](README.md#current-implementation-status)). Ini panduan dokumentasi, bukan instruksi membuat folder/source pada task sync:

```text
.
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.*
├── drizzle.config.ts
├── .env.example
├── .gitignore
├── src/
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── dashboard/
│   │   │   ├── depots/
│   │   │   ├── scenarios/
│   │   │   ├── experiments/
│   │   │   └── results/
│   │   ├── api/
│   │   │   ├── health/
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── config/
│   │   ├── navigation.ts
│   │   └── env.ts          # pure APP_ENV parser; server call-site pada health
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── map/
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   ├── repositories/
│   │   └── migrations/
│   ├── domain/
│   │   ├── routing/
│   │   └── experiments/
│   ├── lib/
│   │   ├── validation/
│   │   ├── security/
│   │   └── utils/
│   └── types/
├── scripts/
│   ├── seed-dev.ts
│   ├── benchmark.ts
│   └── verify-env.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── e2e/
├── docs/
└── .github/
    ├── workflows/
    └── pull_request_template.md
```

## Domain routing structure

```text
src/domain/routing/
├── types.ts
├── route-validator.ts
├── distance/
│   ├── types.ts
│   └── matrix-validator.ts
├── nn/
│   └── nearest-neighbor.ts
├── two-opt/
│   └── two-opt.ts
└── aco/
    ├── ant-colony.ts
    ├── rng.ts
    └── types.ts
```

## Rule of dependency direction

```text
UI/API → application → algorithm domain (DistanceMatrix + params/seed)
             └→ infrastructure adapters / repositories
```

Algorithm domain tidak boleh import dari:

```text
next/*
react
leaflet
@tidbcloud/*
drizzle-orm
OSRM HTTP client
```

## Application and OSRM infrastructure target

```text
src/
├── application/
│   ├── scenarios/       # editable scenario → immutable benchmark case
│   └── benchmark/       # matrix builder/storage orchestration, hash checks, runner
└── infrastructure/
    └── routing/
        └── osrm/
            ├── osrm-client.ts
            ├── osrm-table-provider.ts
            └── osrm-geometry-provider.ts
```

DistanceProvider port dan OSRM HTTP implementation berada di luar algorithm core. Table provider menghasilkan frozen directed road-network matrix dalam meter; geometry provider menangani visualisasi setelah sequence tersedia. Matrix validator dan route validator di domain adalah pure operations. Storage implementation boleh menggunakan repository `src/db/` melalui application; domain tidak import DB. Kontrak: [docs/33](docs/33_ALGORITHM_SPECIFICATION.md), [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md).

## Naming

- file TS: `kebab-case.ts`;
- React component: file konsisten `kebab-case.tsx`, exported component PascalCase;
- database: `snake_case`;
- TS properties: `camelCase`;
- constants: `UPPER_SNAKE_CASE` bila benar-benar constant.


---

# SOURCE: docs/10_ENVIRONMENTS_SECRETS.md

# 10 — ENVIRONMENTS & SECRETS

## 1. Environment matrix

Target DB/deployment matrix untuk Phase 0C/0D; belum menjadi requirement atau provisioning Phase 0B.

| Environment | Code | DB | Tujuan |
|---|---|---|---|
| Local | developer branch | TiDB Dev | coding |
| Preview | feature/fix/testing | TiDB Testing | review/integration |
| Production | main | TiDB Production | demo/live |

## 2. Environment variables menurut phase

**Phase 0B current:** hanya `APP_ENV`, required ketika server membaca runtime config. Exact values: `development`, `testing`, `production`. Missing, empty, whitespace-only, case variant, padded value dan nilai lain ditolak. Tidak ada implicit default, trimming atau normalisasi.

`src/config/env.ts` menyediakan typed pure `parseAppEnv(rawValue)` dan safe `AppEnvValidationError`. Parser tidak membaca process.env. Route health membaca `process.env.APP_ENV` ketika GET dipanggil; tidak ada validation saat import/typegen/build. APP_ENV server-side dan tidak dikirim ke health payload/client.

**Phase 0C future:** `DATABASE_URL` untuk DB connection; belum dibaca, divalidasi atau diwajibkan pada Phase 0B.

**Auth phase future:** `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`.

`NEXT_PUBLIC_APP_NAME` optional secara konsep, tidak diperkenalkan atau diperlukan saat ini. `NODE_ENV` dikelola framework (`development/test/production`), terpisah dari APP_ENV; jangan memakai NODE_ENV=testing.

## 3. Rules

- `.env.local` never commit.
- `.env.example` commit, **tanpa nilai secret**.
- `DATABASE_URL` tidak pernah prefix `NEXT_PUBLIC_`.
- production credential hanya Production scope.
- Preview menggunakan testing DB credential.
- dev laptop menggunakan dev DB credential.

## 4. `.env.example` — Phase 0B

Exact current template, dengan trailing newline:

```dotenv
APP_ENV=development
```

Manusia dapat menyalin template ini ke `.env.local` untuk local runtime. `.env` dan `.env.*` ignored, dengan exception `!.env.example`; `.env.local` tidak boleh di-commit. Tests memakai scoped env fixtures, bukan file secret; build/tests tidak memerlukan DB credential.

GET /api/health memvalidasi APP_ENV: 200 `{"status":"ok"}` atau 503 `{"status":"error"}` untuk konfigurasi invalid/missing; JSON dan `Cache-Control: no-store`. Payload tidak memuat env, version, timestamp atau detail error. Lihat [runbook](docs/16_OBSERVABILITY_RUNBOOK.md#4-health-endpoint).

## 5. Secret rotation

Rotate jika:

- tercommit;
- muncul di screenshot/public chat;
- anggota tim keluar;
- device hilang;
- dicurigai bocor.

Setelah rotate:

1. update TiDB credential;
2. update Vercel env;
3. update local developer secrets;
4. redeploy;
5. revoke old credential;
6. document incident.

## 6. Prevent accidental production access

Phase 0B health memvalidasi APP_ENV pada invocation, bukan global startup. Nilai env dan raw validation input tidak diekspos dalam response. Deployment env scope/isolation masih Phase 0D; label APP_ENV sendiri tidak membuktikan DB isolation.

Tambahkan guard pada script destructive seed/reset:

```text
if APP_ENV === production → ABORT
```

Script reset database production harus tidak tersedia atau membutuhkan explicit double confirmation.

## 7. Preview DB collision

Semua feature Preview memakai TiDB Testing secara default. Untuk menghindari collision:

- gunakan test data dengan prefix/owner;
- jangan truncate global table dari preview;
- migration coordinated via testing branch;
- feature yang butuh incompatible schema harus ditunda merge atau memakai temporary TiDB instance bila quota memungkinkan.


---

# SOURCE: docs/11_GIT_WORKFLOW.md

# 11 — GIT WORKFLOW

## 1. Branch model

```text
main        = production
 testing    = integration/staging-like preview
 feature/*  = fitur
 fix/*      = bug biasa
 hotfix/*   = bug production kritis
 chore/*    = tooling/docs
```

## 2. Create feature

```bash
git checkout testing
git pull origin testing
git checkout -b feature/depot-crud
```

## 3. Daily sync

Jika `testing` berubah banyak:

```bash
git fetch origin
git rebase origin/testing
```

atau merge sesuai kemampuan tim. Tim harus memilih satu gaya dan konsisten. Untuk pemula, merge `origin/testing` ke feature lebih mudah dipahami tetapi history lebih ramai.

## 4. Feature flow

```text
feature/x
→ push feature branch
→ Vercel Preview
→ Pull Request ke testing
→ automated CI checks
→ author self-review
→ merge
→ testing integration/QA
```

## 5. Release flow

```text
testing
→ freeze release candidate
→ full QA/UAT
→ Pull Request testing → main
→ automated CI checks
→ minimum 1 human approval
→ resolve all review conversations
→ merge
→ Vercel Production
→ production smoke test
```

## 6. Hotfix

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-name
```

Setelah merge ke main, sinkronkan hotfix ke testing.

## 7. Branch naming examples

```text
feature/dummy-generator
feature/leaflet-map
feature/nearest-neighbor
feature/two-opt
feature/aco
fix/route-duplicate-customer
hotfix/prod-env-misconfiguration
chore/update-docs
```

## 8. No direct push policy

**Mandatory:**

- `main`: no direct commit / no direct push;
- `testing`: no direct commit / no direct push;
- feature/fix/hotfix/chore branches: direct push allowed;
- protected branches hanya berubah melalui Pull Request.

Perlindungan tidak boleh hanya menjadi aturan lisan. Wajib gunakan layered protection:

1. GitHub branch protection/ruleset jika tersedia pada plan;
2. local `pre-commit` guard untuk memblok commit pada `main`/`testing`;
3. local `pre-push` guard untuk memblok push yang menargetkan `main`/`testing`;
4. CI required checks;
5. Vercel Production Branch hanya `main`.

Panduan implementasi, recovery, dan acceptance test lengkap:

```text
docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md
```

## 8.1 Branch review policy

| Target branch | Pull Request | Human approval | Direct push | CI |
|---|---|---:|---|---|
| `testing` | Required | Not required | Prohibited | Required setelah CI tersedia |
| `main` | Required | Minimum 1 | Prohibited | Required setelah CI tersedia |

Tujuan kebijakan ini:

- `testing` tetap cepat sebagai integration branch;
- setiap perubahan tetap memiliki jejak Pull Request;
- `main` memiliki human gate sebelum perubahan menjadi production release;
- automated checks tidak menggantikan human review pada `main`.

## 9. Commit policy

Commit harus menjawab satu ide perubahan.

Bad:

```text
update project
fix all
final
```

Good:

```text
feat: add scenario creation validation
test: cover closed-tour route invariants
fix: prevent production DB usage in preview
```

## 9.1 Merge strategy

Gunakan strategi berikut:

| Source | Target | Strategy |
|---|---|---|
| `feature/*` | `testing` | Squash and Merge |
| `fix/*` | `testing` | Squash and Merge |
| `chore/*` | `testing` | Squash and Merge |
| `testing` | `main` | Merge Commit |
| `hotfix/*` | `main` | Merge Commit atau strategi yang menjaga sinkronisasi dengan `testing` |

Untuk long-lived branch `testing` dan `main`, hindari Squash and Merge pada release PR `testing → main`, karena ancestry branch perlu dipertahankan agar release berikutnya tetap bersih.

## 10. Pull request rule

Tidak merge bila:

- CI merah setelah CI workflow tersedia;
- migration yang berisiko belum diperiksa;
- preview tidak bisa dibuka untuk perubahan yang membutuhkan preview;
- acceptance criteria belum lulus;
- terdapat secret atau credential;
- algorithm tests gagal pada perubahan routing;
- scope PR bercampur dengan pekerjaan lain yang tidak relevan.

Tambahan khusus PR menuju `main`:

- belum memperoleh minimal **1 human approval**;
- terdapat unresolved review conversation;
- latest reviewable push belum memperoleh review yang dipersyaratkan.


---

# SOURCE: docs/12_CI_CD_RELEASE.md

# 12 — CI/CD & RELEASE

## 1. Separation of responsibility

**GitHub Actions:** quality gate.  
**Vercel Git Integration:** deployment.

Jangan duplikasi deployment melalui Actions tanpa kebutuhan khusus.

## 2. CI triggers

Minimal:

- pull request ke `testing`;
- pull request ke `main`.

Optional push check pada `testing`/`main`.

## 3. CI stages

```text
checkout
→ setup Node 24
→ npm ci
→ lint
→ typecheck
→ unit/integration tests
→ build
```

Tambahkan Playwright terpisah ketika E2E stabil.

## 4. Required npm scripts

Target:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "e2e": "playwright test"
  }
}
```

Sesuaikan dengan tooling actual hasil bootstrap.

## 5. Deploy model

```text
feature branch → Vercel Preview
 testing       → Vercel Preview stable branch
 main          → Vercel Production
```

## 6. Database migration in deploy

Jangan otomatis menjalankan destructive migration pada setiap Preview build.

Policy awal:

- dev migrations manual/controlled;
- testing migration setelah review;
- production migration sebagai release step terencana.

Setelah tim matang, automation dapat ditambah dengan ADR.

## 7. Release checklist

Sebelum testing → main:

- [ ] CI green;
- [ ] QA checklist green;
- [ ] migration applied to testing;
- [ ] UAT/smoke testing selesai;
- [ ] no open blocker;
- [ ] backup/export bila migration risky;
- [ ] environment variables verified;
- [ ] production domain known;
- [ ] rollback path known.

## 8. Post-deploy smoke

Minimal:

1. home/dashboard load;
2. health endpoint;
3. DB read;
4. safe write/read/delete on production demo data bila sesuai;
5. map render;
6. run small NN+2Opt scenario;
7. run small ACO scenario;
8. verify no console/server critical error.

## 9. Rollback principle

Code rollback di Vercel relatif mudah melalui previous deployment/revert commit. Database rollback **tidak otomatis**.

Karena itu schema change harus backward-compatible sebisa mungkin.

Recommended expand/contract:

```text
add new column
→ deploy code supporting both
→ migrate data
→ switch reads
→ later remove old column
```


---

# SOURCE: docs/13_SECURITY.md

# 13 — SECURITY BASELINE

## 1. Threat model sederhana

Assets:

- database credential;
- environment secrets;
- research data/history;
- admin mutation capability;
- deployment integrity.

Threats:

- secret leak;
- unauthorized mutation;
- SQL injection;
- XSS dari customer/address input;
- destructive operation salah environment;
- dependency vulnerability;
- accidental production DB use from Preview.

## 2. Authentication

Sebelum public mutation dibuka, gunakan authentication.

Preferred initial approach:

- Auth.js;
- GitHub OAuth;
- allowlist team/admin account.

Keuntungan: tidak menyimpan password sendiri.

Auth dapat ditunda pada local foundation tetapi **bukan** pada public production admin.

## 3. Authorization

“Sudah login” belum cukup. Semua mutation harus server-side memverifikasi user/role yang diizinkan.

## 4. Input validation

Gunakan Zod pada server boundary.

Validate:

- string length;
- coordinate bounds;
- counts;
- algorithm parameter range;
- run count limit;
- IDs;
- enums.

Client validation hanya UX, bukan security control.

## 5. XSS

React escape text by default. Hindari `dangerouslySetInnerHTML` kecuali ada sanitization dan alasan terdokumentasi.

## 6. SQL injection

Gunakan Drizzle/parameterized query. Raw SQL harus memakai parameter binding dan review ekstra.

## 7. Secrets

- no secrets in Git;
- no secret in `NEXT_PUBLIC_*`;
- no screenshot credential;
- rotate leaked key immediately.

## 8. Destructive actions

- confirmation dialog;
- server authorization;
- environment guard;
- no “delete all” tanpa explicit elevated flow;
- production seed/reset disabled.

## 9. Rate/resource abuse

ACO dapat menjadi compute-heavy. Batasi input di server:

- max customer for web-triggered run;
- max iterations;
- max ants;
- max run count;
- auth required.

Formal benchmark besar dijalankan melalui controlled CLI, bukan public endpoint.

## 10. Dependency security

Rutin:

```bash
npm audit
```

Jangan auto-upgrade major dependency tanpa test. Dependabot/Renovate boleh ditambah kemudian.

## 11. Security release gate

- [ ] no secret in diff;
- [ ] no production DB on Preview;
- [ ] server-side validation;
- [ ] auth for public mutation;
- [ ] no raw input SQL;
- [ ] no unsafe HTML;
- [ ] resource limits enforced;
- [ ] error message tidak expose secret/stack sensitif ke user.


---

# SOURCE: docs/14_TESTING_QA.md

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
- ACO preflight zero off-diagonal rejection sesuai [docs/33](docs/33_ALGORITHM_SPECIFICATION.md), tanpa mengganti nilai matrix.

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

## 10. Current testing foundation — Phase 0A + Phase 0B

Verifikasi lokal 2026-10-03: Vitest adalah unit/component runner; React Testing Library, jest-dom dan jsdom tersedia sebagai dev dependencies. `tests/setup.ts` memuat jest-dom Vitest matchers dan explicit `afterEach(cleanup)` agar render antar test tetap independent tanpa global Vitest APIs. `next/link` diuji langsung tanpa mock.

`tests/unit/navigation.test.ts` memproteksi 12 routes, href valid/unique dan 10 domain placeholders. `tests/unit/dashboard.test.tsx` memproteksi identitas, status shell yang jujur, status Depot/Route Optimization, link `/about`, serta absennya Revenue/Monthly Sales/Monthly Target. Baseline Phase 0A: 2 files, 11 tests PASS; CLOSED/merged via PR #7.

Phase 0B menambah `tests/unit/env.test.ts` (18 tests) dan `tests/unit/health.test.ts` (19 tests), dengan `// @vitest-environment node` per file. Tests memeriksa exact APP_ENV enum/rejections, fixed safe error, pure parser, import safety, GET current-value validation, 200/503 exact minimal JSON, JSON/no-store headers, DATABASE_URL absent, dan unexpected exception propagation. Semua handler/parser diuji langsung; satu scoped parser spy mensimulasikan unexpected exception. Env stubs dipulihkan dengan afterEach; tidak ada HTTP server, DB atau Playwright.

Current fresh suite: **4 files / 48 tests PASS**, termasuk 11 tests lama dan 37 tests baru. Coverage V8: statements 4.95% (22/444), branches 3.68% (13/353), functions 6% (9/150), lines 5.36% (22/410); tanpa threshold atau exclusion tambahan. [Phase 0B implementation evidence](docs/proses/phase-0/0b/PHASE_0B_IMPLEMENTATION_REPORT.md).

Scripts aktual: `npm run typecheck` menghasilkan Next route types sebelum `tsc --noEmit`; `npm run test`, `npm run test:watch` dan `npm run test:coverage` tersedia. Clean install lint/typecheck/test/coverage/build PASS. Coverage V8 menghasilkan text, HTML dan JSON summary untuk seluruh `src/**/*.{ts,tsx}`, termasuk modules yang belum diuji; **NO COVERAGE THRESHOLD**, angka hanya baseline informasi. Generated reports di `coverage/` ignored oleh Git dan ESLint. Vite memberi warning future native config loader pada config TypeScript yang ada; current runner PASS.

Playwright/E2E, DB integration tests dan domain algorithm/matrix tests di atas masih pending sampai implementation target tersedia. Detail evidence: [Phase 0A report](docs/proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md). Untuk task documentation-only, periksa diff, internal links, source/derived parity, actual manifest hashes, dan research contract consistency tanpa menambah implementation di luar scope.


---

# SOURCE: docs/15_RESEARCH_BENCHMARK_PROTOCOL.md

# 15 — RESEARCH BENCHMARK PROTOCOL v1

**Status:** Accepted working protocol, 2026-10-02.
Authority: [research decisions](docs/32_RESEARCH_DECISIONS.md). Solver contract: [docs/33](docs/33_ALGORITHM_SPECIFICATION.md). Formal input: [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md). Pelaksanaan formal menunggu implementasi, verification, dan penyelesaian keputusan OPEN; dokumen ini bukan hasil eksperimen.

## 1. Research comparison and RQ

Bandingkan Hybrid Nearest Neighbor → best-improvement 2-Opt dengan ACO / Classical Ant System. Tidak menambah 2-Opt setelah ACO pada main comparison.

- **RQ1:** Bagaimana perbandingan total jarak rute yang dihasilkan Hybrid Nearest Neighbor–2-Opt dan Ant Colony Optimization pada jumlah customer yang berbeda?
- **RQ2:** Bagaimana perbandingan waktu komputasi Hybrid Nearest Neighbor–2-Opt dan Ant Colony Optimization ketika jumlah customer meningkat?
- **RQ3:** Seberapa besar variasi hasil Ant Colony Optimization pada pengujian berulang, dengan hasil Hybrid Nearest Neighbor–2-Opt sebagai referensi deterministik?

## 2. Four phases and exit evidence

### Phase A — Algorithm Verification

Sebelum mengukur performa ilmiah, buktikan matrix/route invariants, NN directed minimum + lowest-index tie, best-improvement 2-Opt full directed recomputation, dan Classical Ant System seeded behavior. Jalankan 0/1/2 customer, known small instances, asymmetric fixtures dan tests dalam docs/14 serta docs/33. Tidak menafsirkan test fixtures sebagai evaluation datasets.

Exit: semua correctness checks pass, versi implementasi/PRNG dicatat, independent route-distance recomputation tersedia.

### Phase B — ACO Calibration

Gunakan relevant literature atau small calibration experiment untuk nilai numerik ACO; jangan mengarang final defaults. Calibration cases **wajib terpisah** dari main evaluation: identitas, generation seeds, coordinates/input hashes, matrix hashes dan tujuan split dicatat.

Dokumentasikan candidate configurations, selection criterion dan anggaran calibration sebelum membandingkan hasil. Setelah calibration, **freeze satu global configuration** (alpha, beta, rho, Q, tau0, antCount, maxIterations). Jangan memilih konfigurasi berbeda agar N10/N25/N50 menang. Calibration results dan alasan pemilihan disimpan.

Exit: global configuration, sumber/hasil calibration, serta pemisahan calibration/evaluation dapat diaudit.

### Phase C — Pilot

Periksa kemampuan provider menghasilkan N+1 node matrix, routability, correctness, durasi keseluruhan runner, memory, timer resolution, dan raw export. Gunakan pilot cases yang diidentifikasi terpisah dari main evaluation; jika pilot memicu retuning, kembali ke Phase B sebelum main dibekukan.

Pilot menentukan apakah **N=100 / 100 customers** feasible sebagai conditional/optional experiment. Ini tidak menjadikan N=100 mandatory main experiment. clustered/circular/directional dapat dipilih sebagai additional experiments dengan rencana terpisah; jangan menyebutnya core novelty.

Exit: pipeline dapat menyimpan/replay exact matrix, hardware/runtime tercatat, seed lists dan run schedule ditetapkan, pilihan eksperimen tambahan dicatat sebelum dijalankan.

### Phase D — Main Experiment

| Jumlah customer (tanpa depot) | Independent random datasets |
|---|---:|
| 10 | 10 |
| 25 | 10 |
| 50 | 10 |
| Total | 30 |

Primary generation pattern **random**. clustered, circular, directional adalah optional engineering/additional support. Jangan menjadikan semua pattern atau N=100 sebagai mandatory primary design.

Per dataset: ACO **30 independent seeded runs**; NN+2-Opt **satu deterministic quality output + 30 measured timing repetitions**; **5 warm-up executions per algoritma** sebelum measured runtime. Main mencakup 900 ACO measured runs dan 900 NN+2-Opt timing samples ketika semua run berhasil. Repetitions dalam satu dataset tidak menambah jumlah independent datasets.

## 3. Dataset generation and split

Setiap dataset memiliki generation seed dan generator version. Catat depot/study area, pattern=random, radius/bounds/config, customer identities dan original coordinates. Main datasets dibuat independen sesuai generation procedure yang dibekukan; jangan menyeleksi dataset berdasarkan algoritma mana yang menang.

Same generator/version + seed + depot/config harus mereproduksi points. Latitude/longitude mentah tidak dipakai sebagai Cartesian kilometer. Coordinate/routability checks dan penanganan rejected/zero-distance points ditetapkan sebelum generation; log setiap rejection/replacement. Perubahan titik pada snapshot frozen membuat case baru.

Calibration, pilot, dan main case lists disimpan secara terpisah dan diperiksa agar evaluation input tidak dipakai untuk tuning. Generator pattern tambahan tidak otomatis masuk main list.

## 4. Freeze and same-matrix fairness

```text
Editable Scenario
→ Immutable Benchmark Case + ordered point snapshots + input_hash
→ road validation + OSRM Table Service
→ validated frozen directed road-network matrix + matrix_hash
→ exact same matrix → NN+2-Opt / Classical Ant System
```

Canonical unit **meter**, depot index=0, stable customer indices, NxN termasuk depot, diagonal zero, finite valid values, no null/unreachable. Tidak ada asumsi symmetry. Common ACO preflight menolak zero off-diagonal tanpa mengganti metric.

Simpan provider/profile/options/version, node order, original/snapped-coordinate evidence, matrix values dan generation timestamp/provenance yang tersedia. Matrix sudah frozen sebelum formal execution; matrix/input hashes harus cocok pada kedua algoritma. Jangan request ulang OSRM per algoritma/run. Geometry terpisah dari hasil distance matrix.

## 5. Seed and state policy

Seed list predetermined dan disimpan sebelum measured runs. Contoh konseptual 10001..10030 bukan final seed list otomatis. Timestamp seeds dilarang. Generation seeds, warm-up seeds, calibration seeds dan measured ACO seeds diberi role jelas.

Setiap measured ACO run menginisialisasi PRNG/pheromone baru dari seed yang tercatat, dengan configuration global yang sama. Tidak carry-over state dari run/warm-up lain. Simpan PRNG algorithm/version; ulangi seed list yang sama untuk reproduction. Jangan hanya memilih seed yang menghasilkan jarak pendek.

NN+2-Opt deterministik dengan depot=0, directed nearest distance dan lowest-index tie-break; best-improvement 2-Opt memakai enumerasi deterministik dan full distance recomputation. Semua timing repetitions harus memberi quality result yang sama.

## 6. Environment and timer boundary

Formal benchmark dijalankan pada machine/runtime terkontrol, tidak bergantung pada runtime Vercel. Catat OS, CPU, RAM, Node/runtime version, code commit SHA, PRNG version, power/performance mode, process/load condition, timer unit/resolution, dan execution schedule. Gunakan kondisi dan machine yang sama untuk comparison; jangan menjalankan workloads paralel yang mengganggu timing.

```text
load + validate frozen matrix / verify hashes / prepare params
start high-resolution monotonic timer
algorithm(matrix, params, seed) → result
stop timer
independent RouteValidator + persistence + summaries/export
```

NN+2-Opt diukur sebagai satu pipeline. ACO timing mencakup initialisasi PRNG/pheromone, ant construction, iteration updates dan best tracking. Core internal checks tetap bagian solver execution.

Formal timer **mengecualikan** OSRM request, DB, HTTP/network, serialization, external preflight/hash checks, independent post-run validation, route geometry generation, Leaflet/rendering, serta aggregation. Jangan mengambil timing HTTP endpoint sebagai algorithm time.

Tetapkan dan simpan urutan eksekusi sebelum measured runs; catat gangguan machine. Jangan memilih sampel tercepat saja.

### Predetermined balanced execution order

Untuk **MAIN evaluation datasets**, bekukan urutan dataset dan pemetaan ordinal 1..30 ke benchmark_case_id sebelum measured runs. Simpan pemetaan ini beserta urutan algorithm blocks dalam experiment manifest / execution schedule agar dapat direproduksi.

| Ordinal dataset | Urutan measured blocks |
|---|---|
| Ganjil | NN+2-Opt → ACO |
| Genap | ACO → NN+2-Opt |

Contoh: D01 menjalankan NN+2-Opt → ACO, D02 ACO → NN+2-Opt, D03 NN+2-Opt → ACO, dan seterusnya; D01/D02/D03 adalah label ordinal pada daftar yang dibekukan. Jalankan **5 warm-ups untuk algorithm block terkait tepat sebelum measured block-nya**, sesuai bagian 7. Selesaikan measured block (30 repetitions/runs) sebelum beralih ke algoritma berikutnya. Jangan interleave individual runs atau randomize execution order saat runtime.

Balancing ini mengurangi systematic execution-order / thermal/runtime bias pada RQ2, tanpa menjamin seluruh environmental noise hilang. Aturan machine/environment, state reset dan pencatatan gangguan tetap berlaku.

## 7. Warm-up and repetitions

Lakukan **5 warm-up executions** untuk setiap algoritma pada setiap dataset sebelum measured block. Simpan warm-up policy dan role/seed bila stochastic. Hasil/timing warm-up tidak masuk statistical research results.

- NN+2-Opt: satu quality output (dapat berasal dari measured run pertama yang valid) dan 30 measured timing samples; verifikasi route/cost konsisten.
- ACO: 30 independent seeded runs, masing-masing menyumbang quality dan runtime.
- Reset seluruh per-run algorithm state. Pembacaan snapshot sekali ke memory boleh; reuse hasil solver atau pheromone antar runs dilarang.

## 8. Metrics and aggregation

Hitung per dataset terlebih dahulu; dataset-level summaries adalah independent scenario-level observations. **Jangan memperlakukan 30 ACO runs sebagai 30 independent datasets.** Laporkan per ukuran masalah dari 10 dataset, tanpa menyembunyikan variasi antar dataset dengan pooling seluruh runs.

| RQ | Primary descriptive output per dataset |
|---|---|
| RQ1 quality | NN+2-Opt distance; ACO mean, median, best, worst, SD |
| RQ2 time | NN+2-Opt 30 samples dan ACO 30 runtimes: mean, median, SD; min/max optional |
| RQ3 stability | ACO mean, median, best, worst, range, SD, CV |

**Primary comparison menggunakan ACO median dan/atau mean.** Best-of-30 tetap dilaporkan sebagai additional result, bukan satu-satunya pembanding dengan satu deterministic NN result.

Untuk m successful samples, mean=sum(x)/m, median=nilai tengah (rata-rata dua tengah bila m genap), sample SD=sqrt(sum((x-mean)^2)/(m-1)), range=max-min, CV=SD/mean (tulis sebagai rasio atau ×100% secara eksplisit). SD undefined bila m<2; CV undefined bila mean=0. Nilai undefined dilaporkan demikian, bukan diubah menjadi nol. Tidak ada threshold CV baik/buruk tanpa scientific source.

Inferential testing tidak dikunci di protocol ini. Jika ditambahkan, tetapkan metode/asumsi dan unit dataset dengan review metodologi; jangan menjadikan within-dataset runs sebagai observasi independen untuk memperbesar sample size.

## 9. Formal failed-run and poor-run policy

- Valid tetapi poor result wajib dipertahankan. Dilarang mengganti seed/run untuk memperbaiki hasil.
- Simpan planned run identity, params, seed, matrix hash, status, failure reason dan timestamp untuk semua attempt.
- Invalid route, non-finite output, interrupted run atau exception ditandai failed; tidak diberi distance/time nol palsu dan tidak dianggap success.
- Investigasi kegagalan correctness/input sebelum meneruskan main. Jika perlu rerun, simpan attempt asli, alasan dan versi; jangan overwrite. Dataset dengan kurang dari 30 successful planned measured runs ditandai incomplete, tidak diam-diam diklaim memenuhi desain lengkap.
- Summary sementara boleh atas successful samples jika sample count, planned count dan failure count ditampilkan jelas. Final formal comparison menunggu resolusi atau laporan keterbatasan yang eksplisit.
- Failure infrastruktur sebelum freeze adalah data-generation failure; tidak dicampur sebagai measured algorithm result.

## 10. Raw persistence and export

Raw results disimpan sebelum summaries. Simpan matrix snapshot terpisah dan referensikan secara immutable; lihat [database design](docs/08_DATABASE_DESIGN.md).

Minimal export:

```text
benchmark_case_id, distance_matrix_id, input_hash, matrix_hash
dataset_role, pattern, customer_count, generation_seed
algorithm, algorithm_version, prng_version, parameters_json
run_number, attempt, seed, run_role, status, error_code
route, total_distance_m, execution_time_ms
git_commit_sha, environment_reference
```

Format exact physical columns ditetapkan pada task implementation; semua informasi di atas harus dapat diambil tanpa live orders. Preserve raw run data, route indices/point mapping, failure records, configuration, seed lists, machine metadata, dan frozen matrices. Recompute route distance secara independen dan cocokkan hash sebelum analisis.

## 11. Scientific reporting and open decisions

Laporkan hasil berdasarkan evidence, misalnya “median ACO lebih rendah pada dataset ...”. Jangan klaim optimum tanpa bukti, superiority universal, atau gap “belum pernah dibandingkan”. Working gap dan RQ tetap sesuai docs/32.

OPEN sebelum generation/main: numeric ACO config dan evidence, exact depot/study area/sampling-routability acceptance, public vs local/self-hosted OSRM final provenance, N=100 feasibility, dan pilihan additional scenarios. Main counts, 30 seeded runs, 30 timing repetitions, 5 warm-ups, directed frozen matrix, serta Classical Ant System sudah dikunci.


---

# SOURCE: docs/16_OBSERVABILITY_RUNBOOK.md

# 16 — OBSERVABILITY & RUNBOOK

## 1. Goals

Saat error, tim harus dapat menjawab:

- request apa gagal?
- environment mana?
- commit/deployment mana?
- operasi apa?
- apakah DB/algorithm/UI?
- user-safe impact apa?

## 2. Logging baseline

Gunakan structured logging di server.

Recommended fields:

```text
timestamp
environment
event
request_id
user_id (jika ada, non-sensitive)
scenario_id
benchmark_case_id
experiment_id
algorithm
error_code
```

Jangan log:

- DATABASE_URL;
- OAuth secret;
- full auth token;
- password;
- sensitive cookies.

## 3. Error taxonomy

Contoh:

```text
VALIDATION_ERROR
AUTH_REQUIRED
NOT_FOUND
DB_ERROR
ALGORITHM_INVALID_ROUTE
ALGORITHM_PARAMETER_ERROR
BENCHMARK_INPUT_MISMATCH
RESOURCE_LIMIT_EXCEEDED
```

## 4. Health endpoint

Phase 0B menyediakan app-only `GET /api/health`; APP_ENV dibaca dan divalidasi saat invocation. Import/typegen/build tidak membutuhkan APP_ENV atau DB credential.

| Kondisi | HTTP | Exact JSON |
|---|---:|---|
| APP_ENV exact development/testing/production | 200 | `{"status":"ok"}` |
| APP_ENV missing/invalid | 503 | `{"status":"error"}` |

Keduanya application/json dan `Cache-Control: no-store`. Hanya AppEnvValidationError yang dipetakan ke 503; unexpected exception diteruskan ke framework. Route memakai native Response.json dan default request-time GET behavior Next 16.3.6, tanpa dynamic/revalidate/runtime exports atau custom HEAD/OPTIONS.

Health menunjukkan app liveness + config validity lokal. Tidak mengecek DB, network/provider, filesystem, auth/session atau deployment. Tidak mengirim env, app name, timestamp/version, credential, host/path, error detail atau stack. DB readiness tetap pekerjaan Phase 0C; deployment/isolation evidence Phase 0D. Local env workflow: [setup Phase 0B](docs/17_SETUP_FROM_ZERO.md#phase-0b--local-env--app-only-health).

## 5. Incident response

Jika production gagal:

1. jangan panik-edit production langsung;
2. identifikasi deployment terakhir;
3. cek logs;
4. tentukan code issue vs DB issue vs env issue;
5. rollback code bila aman;
6. jangan rollback DB sembarang;
7. buat hotfix branch bila diperlukan;
8. dokumentasikan cause dan prevention.

## 6. Common incidents

### Deployment build fails

- dependency lock mismatch;
- Node mismatch;
- type error;
- env needed at build missing.

### Runtime DB error

- wrong environment variable;
- credential expired/reset;
- instance unavailable/quota;
- unsupported SQL/migration mismatch.

### Algorithm returns invalid route

Immediately fail request/run and keep evidence. Do not “repair” silently unless repair algorithm is explicit part of method.


---

# SOURCE: docs/17_SETUP_FROM_ZERO.md

# 17 — SETUP FROM ZERO: GitHub → Next.js → TiDB → Vercel

Dokumen ini ditulis untuk tim yang belum pernah memakai stack ini.

## PHASE A — Persiapan akun

Setiap anggota:

- GitHub account.

Minimal owner/project lead:

- Vercel account (login via GitHub disarankan);
- TiDB Cloud account;
- akses domain/DNS.

## PHASE B — Local prerequisites

Install:

- Git;
- Node.js 24.x;
- npm (bundled dengan Node);
- editor (VS Code dsb.).

Verify:

```bash
git --version
node -v
npm -v
```

Target Node:

```text
v24.x.x
```

## PHASE C — Create repository

Buat repository kosong di GitHub, misalnya:

```text
courier-route-planner
```

Jangan masukkan credential.

Clone:

```bash
git clone <repo-url>
cd courier-route-planner
```

## PHASE D — Adopt TailAdmin Next.js Free

Project **tidak** dimulai dari blank `create-next-app`. Baseline UI yang disepakati adalah TailAdmin Next.js Free.

Baca dulu:

```text
docs/30_UI_TEMPLATE_GUIDE.md
THIRD_PARTY_NOTICES.md
```

### Recommended beginner path — Download ZIP

1. buka repository resmi:

```text
https://github.com/TailAdmin/free-nextjs-admin-dashboard
```

2. pilih `Code → Download ZIP`;
3. extract ke folder sementara;
4. jalankan baseline upstream sebelum modifikasi:

```bash
npm install
npm run lint
npm run build
```

5. record source revision bila Git tersedia:

```bash
git ls-remote https://github.com/TailAdmin/free-nextjs-admin-dashboard.git HEAD
```

6. update `THIRD_PARTY_NOTICES.md` dengan adoption date + SHA;
7. copy source ke repository project;
8. jangan membawa `.git` upstream jika memakai clone;
9. pertahankan license/provenance yang diwajibkan.

### Lock Node major

Pastikan `package.json` project final memiliki:

```json
"engines": {
  "node": "24.x"
}
```

Kontrak Phase 0A sudah tersedia: `.nvmrc` berisi `24`. Gunakan patch Node 24 yang memenuhi engines dependency dalam lockfile; jsdom `30.1.1` membutuhkan Node `24.15.0` atau lebih baru pada major 24. Quality suite diverifikasi pada Node `24.19.0` dan npm `11.6.0`.

### Template cleanup tidak dilakukan sekaligus

Buat task/branch khusus. Hapus hanya demo yang tidak relevan dan dependency yang benar-benar sudah tidak dipakai.

Target sidebar mengikuti Route Planner, bukan e-commerce.

### License dependency guardrail

TailAdmin upstream snapshot dapat membawa `apexcharts` / `react-apexcharts`. Project tidak menganggapnya core dependency. Setelah chart/demo imports dibersihkan, targetkan removal dan verifikasi:

```bash
npm ls apexcharts react-apexcharts
```

Jangan uninstall sebelum imports/pages dependennya dibereskan.

Fallback ke blank `create-next-app` hanya jika template adoption gagal secara teknis dan tim membuat ADR baru.

## PHASE E — Bootstrap bertahap: Phase 0A–0D

Phase 0A Quality Foundation CLOSED dan merged ke `testing` melalui PR #7; [independent verification](docs/proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md) tersedia. Phase 0B Environment + Health diimplementasikan lokal dan menunggu independent verification. Setelah clone/pull, gunakan lockfile yang tersedia:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

`typecheck` menjalankan `next typegen && tsc --noEmit`, sehingga tidak membutuhkan dev/build lebih dahulu. Test stack dev yang tersedia: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, dan `jsdom`. Current suite: 4 files / 48 tests untuk navigation/dashboard, APP_ENV parser dan app-only health; server tests memakai Node per file; `npm run test:watch` untuk development. Coverage hanya baseline informasi tanpa threshold; output tidak masuk Git.

Install dependency berikutnya hanya pada task phase terkait, setelah audit stack existing:

- Phase 0B — Environment + Health: strict APP_ENV validation, `.env.example` dan app-only health tersedia; tidak menambah dependency.
- Phase 0C — Database Foundation: TiDB Dev/Test/Prod, Drizzle ORM, `@tidbcloud/serverless`, migration tooling dan Zod sesuai task; belum diimplementasikan.
- Phase 0D — CI + Vercel Integration: GitHub Actions, main/Preview deployments dan env/DB isolation; belum diimplementasikan.
- Leaflet/map, OSRM, Playwright/E2E dan auth mengikuti phase implementasinya nanti.

Bagian F–Q di bawah adalah panduan pekerjaan lanjutan untuk phase terkait; provisioning/deployment dan Gate 1 masih OPEN.

Jika chart penelitian diperlukan nanti, jangan otomatis mempertahankan ApexCharts hanya karena datang dari template. Gunakan keputusan dependency yang sudah diaudit/di-ADR-kan.

## PHASE 0B — Local env + app-only health

Untuk local runtime, manusia menyalin root `.env.example` menjadi ignored `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Exact template:

```dotenv
APP_ENV=development
```

Set salah satu exact `development/testing/production`; missing/invalid, case variant dan padded value ditolak tanpa default/trim. Jangan commit `.env.local`. NEXT_PUBLIC_APP_NAME tidak diperlukan; DATABASE_URL ditunda ke Phase 0C.

`GET /api/health`: 200 `{"status":"ok"}` dengan APP_ENV valid, atau 503 `{"status":"error"}` untuk missing/invalid config. Keduanya JSON + Cache-Control:no-store; tidak ada env disclosure, DB atau network check. Import/typegen/build tetap PASS tanpa real env file atau inherited APP_ENV/DATABASE_URL. Unit tests memakai scoped vi.stubEnv, tanpa .env.local atau HTTP server. [Implementation report](docs/proses/phase-0/0b/PHASE_0B_IMPLEMENTATION_REPORT.md).

## PHASE F — Create TiDB instances (future Phase 0C)

Di TiDB Cloud:

1. buat Organization;
2. create Starter instance:
   - `route-planner-dev`;
   - `route-planner-testing`;
   - `route-planner-production`;
3. pastikan spending/budget setting tetap pada konfigurasi zero-cost yang diinginkan;
4. generate connection password masing-masing;
5. jangan share screenshot credential.

Current docs saat baseline dibuat menyatakan first five Starter instances per org mendapat free monthly quota; **cek kembali UI/docs saat provisioning**.

## PHASE G — Database env (future Phase 0C)

Setelah task Phase 0C menyetujui DB connection, tambahkan DATABASE_URL TiDB Dev ke `.env.local` yang sudah memakai APP_ENV=development. DATABASE_URL bukan prerequisite Phase 0B dan tidak masuk current `.env.example`.

Pastikan `.gitignore` mencakup `.env*` kecuali `.env.example` sesuai kebijakan project.

Buat `.env.example` tanpa secret.

## PHASE H — Drizzle connection (future Phase 0C)

`src/db/index.ts` konsep:

```ts
import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const client = connect({ url });
export const db = drizzle(client);
```

Buat satu tabel learning/health terlebih dahulu sebelum schema project penuh.

## PHASE I — Health check

App-only `GET /api/health` sudah tersedia pada Phase 0B; contract 200/503 dan env workflow dijelaskan pada bagian Phase 0B di atas. Safe DB readiness check tetap future Phase 0C dan harus mengikuti task/contract tersendiri.

## PHASE J — First Git commit

Sebelum commit:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

Check:

```bash
git status
git diff --cached
```

Pastikan `.env.local` tidak ikut.

## PHASE K — Create branches and install safety guards

Setelah `main` ada:

```bash
git checkout -b testing
git push -u origin testing
```

Normal feature nanti dibuat dari `testing`.

**Sebelum tim mulai coding**, selesaikan branch safety setup pada:

```text
docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md
```

Minimum gate:

1. protect `main`;
2. protect `testing`;
3. require PR;
4. block force push/deletion;
5. install `.githooks/pre-commit`;
6. install `.githooks/pre-push`;
7. setiap clone menjalankan:

```bash
git config core.hooksPath .githooks
```

8. test bahwa commit/push langsung ke protected branch ditolak.

Jangan onboarding anggota berikutnya sebelum gate ini lulus.

## PHASE L — Vercel import

1. login Vercel via GitHub;
2. Add New → Project;
3. import repository;
4. framework harus terdeteksi Next.js;
5. set Node.js version 24.x;
6. jangan masukkan production DB ke Preview scope.

## PHASE M — Vercel environment variables

Production:

```text
DATABASE_URL = TiDB Production
APP_ENV = production
```

Preview:

```text
DATABASE_URL = TiDB Testing
APP_ENV = testing
```

Development Vercel scope tidak wajib untuk local bila memakai `.env.local`.

## PHASE N — First Production deployment

Deploy `main` skeleton.

Verify:

- page loads;
- health endpoint;
- no secret exposed;
- logs clean.

## PHASE O — Test Preview

Dari `testing`:

```bash
git checkout testing
```

buat perubahan kecil, push, lalu cek Vercel Preview.

Pastikan Preview DB adalah Testing, bukan Production.

Cara verifikasi aman: endpoint debug internal sementara hanya menampilkan `APP_ENV` dan DB logical label yang non-secret, kemudian hapus atau restrict endpoint tersebut.

## PHASE P — Custom domain

Production:

```text
route.domain-kalian.tld
```

Testing branch domain bila digunakan:

```text
testing-route.domain-kalian.tld
```

Ikuti DNS instruction Vercel. Jangan menebak record bila dashboard memberikan target spesifik.

## PHASE Q — CI

Tambahkan GitHub Actions quality workflow setelah scripts lint/typecheck/test/build tersedia.

Jangan otomatis deploy dari Actions; Vercel sudah deploy via Git Integration.

## EXIT CRITERIA FOUNDATION

- [ ] local Next.js works;
- [ ] TiDB Dev works;
- [ ] production deploy works;
- [ ] Preview deploy works;
- [ ] Production uses Prod DB;
- [ ] Preview uses Testing DB;
- [ ] no secret in Git;
- [ ] CI basic works;
- [ ] branch model exists;
- [ ] team can reproduce setup on second laptop.

**Jangan masuk Depot CRUD sebelum gate ini lulus.**


---

# SOURCE: docs/18_ROADMAP_BACKLOG.md

# 18 — ROADMAP & BACKLOG

## Phase 0 — Foundation

### Phase 0A — Quality Foundation

**CLOSED / merged via PR #7** ke `testing` pada `f73834aa4bb38ada5c289fa30a0b6fb6aa608f26`; [independent verification](docs/proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md) tersedia. Reproduksi anggota kedua tetap Phase 0D:

- [x] repo, Next.js + TypeScript strict;
- [x] TailAdmin Next.js Free provenance/license audit, template baseline build dan cleanup (branding/menu/demo-only code/dependencies);
- [x] controlled Next.js + eslint-config-next patch `16.3.6`;
- [x] Node 24 contract (`engines.node = 24.x`, `.nvmrc = 24`);
- [x] explicit typecheck dengan Next type generation;
- [x] Vitest/RTL/jest-dom/jsdom/V8 coverage, 2 regression test files / 11 tests PASS;
- [x] clean install lint/typecheck/test/coverage/build PASS dan audit delta terdokumentasi.

### Phase 0B — Environment + Health

Implemented locally, fresh verification PASS 2026-10-03; **independent Phase 0B verification masih pending**. Evidence: [implementation report](docs/proses/phase-0/0b/PHASE_0B_IMPLEMENTATION_REPORT.md).

- [x] strict runtime APP_ENV validation dan `.env.example` tanpa secret;
- [x] app-only GET health, 200/503 minimal JSON + no-store, tanpa DB;
- [x] env/health Node unit tests; current full suite 4 files / 48 tests PASS.

### Phase 0C — Database Foundation

- [ ] TiDB Dev/Test/Prod;
- [ ] Drizzle connection, Zod validation dan migration foundation;
- [ ] safe DB health verification.

### Phase 0D — CI + Vercel Integration

- [ ] Vercel Production/Preview;
- [ ] env isolation dan Preview DB != Production DB;
- [ ] CI skeleton menjalankan quality scripts;
- [ ] second-member setup reproduction dan Gate 1 review.

Phase 0 dan Gate 1 tetap OPEN. Playwright/E2E foundation mengikuti implementation target pada phase berikutnya; [Phase 0A evidence](docs/proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md).

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
- OSRM Table adapter / DistanceProvider infrastructure sesuai [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md);
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
- Phase A verification → B separate calibration + global config freeze → C pilot → D main sesuai [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md);
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

OSRM **Table matrix** ada di Phase 3 dan merupakan core formal research input. Item OSRM road geometry di atas hanya visualisasi. Roadmap adalah target; [README](README.md#current-implementation-status) mencatat baseline aktual.

## Backlog priority convention

- P0: blocks core project/research.
- P1: required before public/final demo.
- P2: useful but optional.
- P3: future.


---

# SOURCE: docs/19_DEFINITION_OF_DONE.md

# 19 — DEFINITION OF DONE

## 1. Task DoD

Task selesai bila:

- [ ] Acceptance Criteria terpenuhi;
- [ ] code reviewed sendiri (`git diff`);
- [ ] lint pass;
- [ ] typecheck pass;
- [ ] relevant tests pass;
- [ ] build pass;
- [ ] docs updated bila contract berubah;
- [ ] no secret;
- [ ] manual check dilakukan;
- [ ] known limitation dicatat.

## 2. Feature DoD

Tambahkan:

- [ ] Preview deployment dapat diuji;
- [ ] error/empty/loading state;
- [ ] security boundary checked;
- [ ] integration test bila menyentuh DB;
- [ ] screenshot/evidence PR;
- [ ] migration reviewed bila ada.

## 3. Algorithm DoD

- [ ] valid closed tour;
- [ ] customer exactly once;
- [ ] depot start/end;
- [ ] recomputed distance same;
- [ ] edge cases;
- [ ] deterministic seed test where applicable;
- [ ] no framework dependency;
- [ ] complexity/risk documented;
- [ ] parameter contract documented.
- [ ] NN directed minimum, depot=0, lowest-index tie;
- [ ] 2-Opt best improvement, full directed recomputation, asymmetric fixtures pass, <= NN distance;
- [ ] ACO Classical Ant System, directed pheromone, seeded reset, all-ant deposit, fixed iterations;
- [ ] tidak ada post-ACO 2-Opt atau invented final numeric defaults.

## 4. Database DoD

- [ ] schema migration documented;
- [ ] dev applied;
- [ ] testing applied;
- [ ] no destructive prod action;
- [ ] indexes justified;
- [ ] rollback/mitigation known.

## 5. Release DoD

- [ ] CI green;
- [ ] testing QA green;
- [ ] UAT evidence;
- [ ] prod env checked;
- [ ] prod migration executed safely;
- [ ] smoke test after deploy;
- [ ] release note;
- [ ] no blocker.

## 6. Research benchmark DoD

- [ ] case frozen;
- [ ] input hash;
- [ ] same matrix both algorithms;
- [ ] OSRM road validation dan Table matrix frozen, meter, directed, no unreachable pair;
- [ ] stable node order dan exact matrix hash cocok di kedua experiments;
- [ ] seeds saved;
- [ ] algorithm parameters saved;
- [ ] machine info saved;
- [ ] dataset ordinal mapping dan balanced execution schedule disimpan sesuai [protocol bagian 6](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md#6-environment-and-timer-boundary);
- [ ] commit SHA saved;
- [ ] invalid routes rejected;
- [ ] raw results exported;
- [ ] summary reproducible from raw results.
- [ ] calibration terpisah dan satu global ACO config frozen;
- [ ] main 10/25/50 × 10 random datasets; N=100 conditional, other patterns optional;
- [ ] 30 independent seeded ACO runs dan 30 NN+2-Opt timing samples per dataset;
- [ ] 5 warm-ups per algoritma/dataset dikeluarkan dari statistik;
- [ ] timer hanya algoritma, tanpa OSRM/DB/network/serialization/geometry/rendering;
- [ ] ACO median/mean comparison utama, best tambahan; RQ3 range/SD/CV;
- [ ] dataset adalah unit observasi, repetitions tidak dihitung sebagai independent datasets;
- [ ] failure/poor valid runs disimpan, incomplete datasets dilabeli.

Detail contract: [docs/32](docs/32_RESEARCH_DECISIONS.md), [docs/33](docs/33_ALGORITHM_SPECIFICATION.md), [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md), [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md).

## 7. Documentation-only DoD

Untuk perubahan yang tidak menyentuh source/package: audit initial branch/status, review changed docs, diff --check, internal links, contradictions, MASTER_GUIDE parity, dan MANIFEST actual bytes/SHA-256. Jalankan existing lint/build bila environment memungkinkan; missing typecheck/test dilaporkan sebagai foundation gap, bukan hasil PASS. Jangan membuat scripts/dependencies hanya untuk menyatakan documentation task lolos application tests.


---

# SOURCE: docs/20_TEAM_LEARNING_PLAN.md

# 20 — TEAM LEARNING PLAN

Tujuan: tim dapat memahami stack cukup untuk review, bukan hanya copy-paste AI.

## Week/Learning Block 1 — JavaScript/TypeScript bridge

Target:

- `const/let`;
- object/array;
- destructuring;
- modules;
- async/await;
- TypeScript types;
- Promise;
- npm/package.json.

Mini-task: ubah fungsi PHP sederhana ke TypeScript.

## Block 2 — React

Target:

- component;
- props;
- state;
- events;
- render lists;
- form basic.

Mini-task: customer list static + add row local.

## Block 3 — Next.js App Router

Target:

- `app/` routing;
- layout/page;
- Server vs Client Component;
- Route Handler;
- environment variables.

Mini-task: `/learning` page + `/api/health`.

## Block 3A — TailAdmin template literacy

Target:

- bedakan UI template dengan domain architecture;
- tahu lokasi sidebar/layout/form/table components;
- bisa menghapus demo content tanpa merusak app shell;
- paham Free vs Pro asset;
- paham third-party license/provenance;
- tahu kenapa dependency template tetap harus diaudit.

Mini-task: ubah satu menu demo menjadi menu `Depot` tanpa mengimplementasikan CRUD.

## Block 4 — TiDB + Drizzle

Target:

- instance;
- `DATABASE_URL`;
- schema;
- insert/select/update/delete;
- migration concept.

Mini-task: `learning_notes` CRUD.

## Block 5 — Vercel

Target:

- project import;
- Preview;
- Production;
- env scopes;
- logs;
- custom domain.

Mini-task: branch `feature/learning-preview` dan buka Preview URL.

## Block 6 — Project workflow

Target:

- `testing` branch;
- feature branch;
- PR;
- CI;
- review;
- merge.

## Knowledge checkpoint

Setiap anggota harus bisa menjawab tanpa AI:

1. kenapa DB query tidak dilakukan di Client Component?
2. beda Preview dan Production?
3. mengapa `.env.local` tidak boleh commit?
4. apa fungsi Drizzle?
5. mengapa benchmark formal tidak mengandalkan Vercel timing?
6. apa beda scenario editable vs benchmark case immutable?
7. mengapa feature dibuat dari testing?
8. mengapa template gratis tetap harus diaudit dependency dan lisensinya?
9. mengapa TailAdmin hanya UI shell, bukan domain architecture?

Jika belum bisa, jangan memberikan task sensitif production kepada anggota tersebut tanpa pairing.


---

# SOURCE: docs/21_AI_OPERATING_MODEL.md

# 21 — AI OPERATING MODEL

AI boleh membantu coding, tetapi **manusia tetap pemilik keputusan dan verification gate**.

## 1. Golden workflow

```text
CONTEXT
→ AUDIT
→ PLAN
→ IMPLEMENT SMALL
→ AUTOMATED CHECKS
→ AI VERIFICATION
→ HUMAN VERIFICATION
→ PR
→ REVIEW
→ MERGE
```

## 2. Jangan gunakan one-shot mega prompt

Bad:

> “Buat website route planner production grade lengkap.”

Risiko:

- scope drift;
- dependency berlebihan;
- schema salah;
- code sulit direview;
- AI menyelesaikan masalah yang belum disepakati.

## 3. Satu prompt = satu bounded task

Contoh:

> “Implement foundation DB connection only. Jangan membuat CRUD, auth, map, atau algorithm.”

## 4. Mandatory AI prompt clauses

Setiap implementation prompt sebaiknya berisi:

- inspect `AGENTS.md` dulu;
- untuk research: baca docs/32, docs/33, docs/34 dan protocol v1 docs/15; gunakan README untuk membedakan approved target dari implemented state;
- audit existing state dulu;
- scope dan out-of-scope;
- acceptance criteria;
- mandatory checks;
- no commit/push;
- jangan mengubah docs/source-of-truth tanpa alasan;
- laporkan changed files;
- laporkan test results.

## 5. Separate implementer vs verifier

Ideal:

1. AI/model A implement.
2. AI/model B atau sesi baru audit hasil tanpa asumsi implementer.

Verifier harus diminta mencari kegagalan, bukan memuji.

## 6. Evidence, not confidence

Jangan percaya output:

> “Semua sudah benar.”

Percaya evidence:

```text
npm run lint → exit 0
npm run typecheck → exit 0
npm test → 42 passed
npm run build → exit 0
preview smoke → PASS
```

## 7. Ask AI to inspect diff

Prompt reviewer harus meminta:

```bash
git status
git diff --stat
git diff
```

Dan fokus pada perubahan task saja.

## 8. Stop conditions

AI harus berhenti dan meminta manusia jika:

- source-of-truth conflict;
- destructive migration;
- production credential/action;
- requirement ambiguous yang mengubah scope;
- dependency besar baru;
- security design choice;
- research method decision yang belum disetujui;
- test gagal dan fix memerlukan perubahan contract.

## 9. AI-generated docs

AI boleh membuat walkthrough/verification, tetapi data claim harus berasal dari actual commands/files.

## 10. Standard task artifacts

Untuk task besar, simpan:

```text
docs/worklogs/<task>/task.md
docs/worklogs/<task>/walkthrough.md
docs/worklogs/<task>/verification.md
```

Minimal isi:

- requirement;
- changed files;
- decisions;
- tests;
- manual checks;
- unresolved issues.


---

# SOURCE: docs/22_PROMPT_LIBRARY.md

# 22 — AI PROMPT LIBRARY

Prompt di bawah dirancang untuk coding agent seperti Codex/Claude/Gemini/agent IDE. Sesuaikan nama tool bila perlu.

Semua prompt penelitian tunduk pada [docs/32](docs/32_RESEARCH_DECISIONS.md), [docs/33](docs/33_ALGORITHM_SPECIFICATION.md), [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md) dan [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md). Approved target berbeda dari current implementation di README. Prompt adalah template untuk task berikutnya, bukan otorisasi menjalankan seluruh fitur pada task documentation sync.

Semua prompt yang meminta validation commands mengikuti Foundation guard pada master prompts A/B: inspect script aktual sebelum menjalankan command. Phase 0 tetap wajib menyediakan lint/typecheck/test/build; missing scripts sesudah Foundation bukan pengecualian terhadap contract.

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

VALIDATION FOUNDATION GUARD:
- Sebelum validation, inspect scripts actual di package.json dan status Phase 0 Foundation.
- Jangan mengarang command/script yang belum tersedia.
- SEBELUM Phase 0 menyediakan typecheck/test: jalankan hanya scripts actual yang tersedia dan relevan; laporkan missing scripts sebagai FOUNDATION PREREQUISITE / GAP.
- Jangan membuat script/dependency baru kecuali task memang Phase 0 Foundation atau secara eksplisit meminta setup testing/typecheck.
- Jangan mengklaim typecheck/test PASS bila command belum tersedia.
- SETELAH Foundation, jika contract mengharuskan scripts tersebut tetapi script hilang: STOP dan laporkan regression atau unmet prerequisite.

AFTER IMPLEMENTATION, WAJIB RUN SESUAI FOUNDATION GUARD:
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
5. Test/command evidence dengan PASS/FAIL untuk command yang dijalankan; missing script dilaporkan FOUNDATION PREREQUISITE / GAP.
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

VALIDATION FOUNDATION GUARD:
- Inspect scripts actual di package.json dan status Phase 0 Foundation sebelum menjalankan validation commands; jangan mengarang command/script.
- SEBELUM Phase 0 menyediakan typecheck/test: jalankan hanya scripts actual yang tersedia dan relevan; laporkan missing scripts sebagai FOUNDATION PREREQUISITE / GAP, bukan PASS/FAIL command.
- Jangan mengklaim typecheck/test PASS bila command belum tersedia.
- Jangan membuat script/dependency baru dalam verification. Setup hanya boleh pada task implementasi Phase 0 atau task setup testing/typecheck yang eksplisit.
- SETELAH Foundation, jika contract mewajibkan scripts yang hilang: STOP dan laporkan regression atau unmet prerequisite.

WAJIB VALIDATE SESUAI FOUNDATION GUARD:
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
- inspect package.json scripts actual dan terapkan Foundation guard pada master prompt A; sesudah Foundation, missing required script berarti STOP/report regression atau unmet prerequisite
- npm run lint
- npm run typecheck (bila script tersedia; sebelum Foundation, missing script dilaporkan FOUNDATION PREREQUISITE / GAP)
- npm run test (bila script tersedia; sebelum Foundation, missing script dilaporkan FOUNDATION PREREQUISITE / GAP)
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


---

# SOURCE: docs/23_PHASE_GATES_CHECKLISTS.md

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

**Status: OPEN.** Phase 0A CLOSED/merged via PR #7; evidence pada [quality foundation report](docs/proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md) dan [independent verification](docs/proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md):

- [x] Node 24 contract dalam `package.json` dan `.nvmrc`;
- [x] clean `npm ci` PASS;
- [x] lint PASS;
- [x] typecheck dari generated state bersih PASS;
- [x] unit/component testing foundation PASS (2 files, 11 tests);
- [x] V8 coverage command/report PASS, tanpa threshold;
- [x] build PASS;
- [x] audit runtime-only 0 findings; 15 dev-only findings terdokumentasi.

Phase 0B implemented locally: strict APP_ENV parser, safe template, app-only GET health 200/503 JSON + no-store, dan current full suite 4 files / 48 tests PASS. [Implementation evidence](docs/proses/phase-0/0b/PHASE_0B_IMPLEMENTATION_REPORT.md); independent Phase 0B verification masih pending. Checklist keseluruhan tetap OPEN: TiDB Dev, Vercel main/Preview, Preview DB isolation, CI dan reproduksi anggota kedua belum diverifikasi:

- [ ] TailAdmin Free provenance + adopted SHA tercatat;
- [ ] no TailAdmin Pro/paid asset;
- [ ] template baseline build pass sebelum cleanup;
- [ ] route-planner menu/branding baseline;
- [ ] ApexCharts tidak menjadi approved core dependency / cleanup status terdokumentasi;
- [ ] Next.js local works;
- [ ] build pass;
- [x] app-only health endpoint (Phase 0B local evidence; independent verification pending);
- [ ] TiDB Dev connection;
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
- [ ] predetermined balanced execution order dan dataset ordinal mapping tersimpan sesuai [protocol bagian 6](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md#6-environment-and-timer-boundary);
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


---

# SOURCE: docs/24_TROUBLESHOOTING.md

# 24 — TROUBLESHOOTING GUIDE

## Next.js local tidak jalan

Check:

```bash
node -v
npm -v
npm ci
npm run dev
```

Jika `node_modules` corrupt:

```bash
rm -rf node_modules
npm ci
```

Pada Windows, gunakan command equivalent dengan hati-hati; jangan hapus folder project.

## Build lokal sukses, Vercel gagal

Check:

- Node version setting;
- env variables;
- case-sensitive import path;
- dependency ada di `package.json`;
- code yang bergantung filesystem/local-only.

## Preview membaca production data

**BLOCKER.**

1. stop testing mutation;
2. cek Vercel Preview `DATABASE_URL` scope;
3. rotate production credential bila exposure dicurigai;
4. verify branch-specific overrides;
5. document incident.

## TiDB connection error

Check:

- connection string;
- generated password;
- database name;
- serverless driver connection mode;
- quota/status instance;
- env formatting/quotes.

Jangan log full `DATABASE_URL`.

## Leaflet error `window is not defined`

Kemungkinan Leaflet diimport pada server context.

Solusi architecture:

- isolate into Client Component;
- dynamic import if necessary;
- jangan mengubah seluruh page menjadi client tanpa alasan.

## Migration mismatch

Symptoms:

- column not found;
- table missing;
- preview works for one branch only.

Check migration history dan DB environment. Jangan manually patch production dulu.

## ACO NaN

Check:

- zero distance handling;
- probability denominator;
- pheromone initialization/evaporation dan numerical validity sesuai Classical Ant System; jangan menambah clipping/minimum yang mengubah varian diam-diam;
- invalid alpha/beta;
- duplicate coordinates;
- random selection edge cases.

Fail run instead of silently substituting value.

## Route duplicate/missing customer

Treat as correctness blocker.

Run route validator and smallest reproducible fixture. Jangan “dedupe hasil” setelah algorithm karena itu menyembunyikan bug.

## Formal benchmark inconsistent

Check:

- seed;
- input hash;
- frozen matrix hash, stable node order, provider/profile provenance (jangan request ulang OSRM untuk mereproduksi run);
- Node version;
- machine load;
- warm-up policy;
- parameter JSON;
- commit SHA;
- apakah timer memasukkan DB/network.


---

# SOURCE: docs/25_COST_GUARDRAILS.md

# 25 — ZERO-BUDGET COST GUARDRAILS

## Goal

Project tidak boleh menghasilkan biaya tak terduga.

## 1. Vercel

- gunakan Hobby/free selama memenuhi kebutuhan akademik;
- jangan mengaktifkan paid feature tanpa persetujuan tim;
- monitor usage dashboard;
- hindari endpoint polling terus-menerus;
- batasi compute-heavy web-triggered ACO.

## 2. TiDB

Per baseline 2026-09-26, docs TiDB menyatakan hingga lima Starter instance pertama per organization mendapat monthly free quota. **Free tier dapat berubah**.

Checklist provisioning:

- [ ] baca pricing/free quota terbaru;
- [ ] no card/paid spending bila target zero-cost;
- [ ] spending limit sesuai target Rp0;
- [ ] monitor RU/storage;
- [ ] jangan load-test production free instance.

## 3. GitHub

CI harus hemat:

- trigger pada PR, bukan setiap event tidak penting;
- cache npm bila sesuai;
- jangan menjalankan full E2E berkali-kali untuk docs-only change jika workflow bisa path-filter dengan aman.

## 4. OpenStreetMap

Leaflet library gratis, OSM data terbuka. Tetapi public tile server bukan unlimited commercial CDN.

Untuk project akademik low traffic:

- attribution wajib;
- jangan tile scraping;
- jangan prefetch massal;
- monitor usage.

Jika trafik besar, evaluasi tile provider sesuai policy/budget.

## 5. No paid map API

Jangan menambahkan Google Maps/Mapbox paid dependency tanpa ADR + budget approval.

## 6. Resource limits

Web endpoint algorithm harus punya cap agar user tidak mengirim:

```text
10,000 customers × 50,000 iterations × 5,000 ants
```

Formal heavy benchmark dilakukan controlled local runner.


## 7. UI template & dependency licensing

- gunakan **TailAdmin Next.js Free** saja; jangan copy Pro/paid asset;
- preserve license/provenance;
- dependency bawaan template tetap harus diaudit; “template free” tidak otomatis berarti seluruh transitive/dependency policy cocok untuk project;
- ApexCharts bukan core dependency yang disetujui karena current licensing menggunakan community/revenue-based model; targetkan removal saat cleanup;
- bila perlu chart penelitian, pilih dependency berlisensi sederhana/open-source yang disetujui (preferensi awal Recharts MIT) melalui task/ADR.


---

# SOURCE: docs/26_GLOSSARY.md

# 26 — GLOSSARY

**App Router** — routing model modern Next.js berbasis folder `app/`.

**Server Component** — React component yang dirender server-side dan dapat mengakses server resources tanpa dikirim seluruh logic-nya ke browser.

**Client Component** — component dengan `'use client'`, diperlukan untuk browser API/interactivity tertentu.

**Route Handler** — HTTP endpoint pada Next.js App Router.

**Vercel Preview** — deployment non-production untuk branch/PR.

**Production Deployment** — deployment branch production (`main`).

**TiDB Cloud Starter** — managed TiDB entry tier dengan free quota sesuai kebijakan saat ini.

**Drizzle ORM** — typed TypeScript data access/schema tooling.

**Distance Matrix** — formal input optimizer berupa frozen OSRM road-network costs dalam meter, NxN termasuk depot, stable node order.

**Directed / Asymmetric** — d(i,j) dapat berbeda dari d(j,i); jangan mengasumsikan symmetric costs pada road network.

**Closed Tour** — route yang mulai dan berakhir di depot.

**Nearest Neighbor (NN)** — deterministic greedy heuristic dari depot index 0, memilih minimum directed distance; tie memakai lowest node index.

**2-Opt** — local search segment reversal; project memakai best improvement dengan full directed route recomputation, depot fixed, strict improvement saja.

**ACO** — Ant Colony Optimization, metaheuristic stochastic berbasis pheromone/heuristic information.

**Classical Ant System** — varian ACO main comparison: directed pheromone, roulette-wheel selection, fixed iterations, evaporation dan deposit dari semua valid ants, tanpa post-ACO 2-Opt.

**Seed** — nilai awal RNG agar data/run stochastic dapat direproduksi.

**Benchmark Case** — snapshot input immutable untuk eksperimen.

**Input Hash** — fingerprint dataset/config untuk memastikan input sama.

**Matrix Hash** — SHA-256 canonical content yang mengikat input hash, node order, provider/config/unit dan matrix values; dipakai untuk memverifikasi same-matrix fairness.

**Calibration Dataset** — input tuning yang terpisah dari main evaluation; menghasilkan satu global ACO configuration frozen.

**CV** — coefficient of variation, SD/mean (atau persen bila dilabeli); tidak ada threshold baik/buruk tanpa source.

**CI** — Continuous Integration; automated quality checks.

**CD** — Continuous Delivery/Deployment.

**ADR** — Architecture Decision Record.

**DoD** — Definition of Done.

**UAT** — User Acceptance Testing.

**OSRM** — Open Source Routing Machine. Table Service adalah core input infrastructure formal road-network matrix, bukan research algorithm. Route Service/geometry adalah concern visualisasi terpisah.

Kontrak lengkap: [docs/32](docs/32_RESEARCH_DECISIONS.md), [docs/33](docs/33_ALGORITHM_SPECIFICATION.md), [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md).


---

# SOURCE: docs/27_SOURCE_REFERENCES.md

# 27 — SOURCE REFERENCES & VERIFICATION BASELINE

**Platform baseline web verification:** 2026-09-26 (historical, tidak diperiksa ulang oleh documentation sync).
**OSRM API contract verification:** 2026-10-02, versioned official API v5.24.0; ini bukan klaim versi server yang nanti dipakai.

Dokumen project harus diperbarui bila platform mengubah plan/feature/runtime.

## Internal project sources

Current source-of-truth:

- [Research Decisions](docs/32_RESEARCH_DECISIONS.md): accepted human decisions 2026-10-02, working RQ/gap dan OPEN decisions.
- [Algorithm Specification](docs/33_ALGORITHM_SPECIFICATION.md): NN, directed 2-Opt, Classical Ant System.
- [OSRM Distance Contract](docs/34_OSRM_DISTANCE_CONTRACT.md): frozen directed matrix dan infrastructure boundary.
- [Benchmark Protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md): experiment procedure.
- [ADR-012](docs/04_TECH_STACK_ADRS.md#adr-012--osrm-road-network-distance-matrix-for-formal-research-benchmark): supersedes historical ADR-010.

Legacy external/workspace source names (tidak ditemukan sebagai file tracked pada audit branch 2026-10-02; jangan menganggap isinya tersedia atau sudah diverifikasi):

- `HANDOFF_RISET_WEB_KURIR_ROUTE_PLANNER(1).md`
- `PROMPT_PENCARIAN_20_JURNAL_ROUTE_PLANNER_4_TAHUN_BAHASA_INDONESIA(1).md`
- `Proyek Informatika.pdf` (RPS)
- materi metodologi/literature review project USM yang tersedia di workspace.

### Research literature TODO

TODO-LIT-01: tambahkan bibliografi studi NN/NN+2-Opt vs ACO yang benar-benar diperiksa, dengan evidence untuk wording gap “masih terbatas”. TODO-LIT-02: simpan sumber nilai parameter Classical Ant System atau laporan calibration terpisah. Tidak ada numerical final ACO defaults atau referensi jurnal baru yang dibuat pada task ini. Official platform/API docs di bawah bukan pengganti literature evidence penelitian.

## OSRM technical sources

- [Versioned Table Service API](https://project-osrm.org/docs/v5.24.0/api/#table-service): distance annotation, meter units dan semantics jarak pada fastest routes, bukan otomatis shortest-distance path.
- [Route Service API](https://project-osrm.org/docs/v5.24.0/api/#route-service): geometry sesuai supplied coordinate order.
- [General request format](https://project-osrm.org/docs/v5.24.0/api/#general-options): longitude,latitude dan profile/options.

Endpoint capabilities, usage policy, network extract/profile/version dan public vs local/self-hosted choice tetap perlu diverifikasi sebelum final generation. Referensi API ini membatasi engineering claims, tidak menetapkan scientific ACO parameters.

## Official Next.js sources

- Next.js Docs: https://nextjs.org/docs
- App Router Learn: https://nextjs.org/learn/dashboard-app
- Installation / Node minimum: https://nextjs.org/learn/react-foundations/installation

Key verified facts used:

- Next.js adalah full-stack React framework.
- App Router adalah router modern.
- official learning path assumes React/JavaScript foundations.
- current minimum Node documented >=20.9 for modern course/docs.

## Official Vercel sources

- Preview Deployments: https://vercel.com/academy/svelte-on-vercel/preview-deployments
- Environment Variables: https://vercel.com/academy/vercel-foundations/vercel-settings
- Branch-specific env vars: https://vercel.com/changelog/environments-variables-per-git-branch
- Branch Domains: https://vercel.com/blog/branch-domains
- Node 24 support: https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions

Key verified facts used:

- non-production branches can receive Preview deployments;
- Preview variables can be scoped/overridden by branch;
- branch domains exist;
- Node 24 is supported and default for new Vercel projects as of late 2025.

## Official TiDB sources

- Starter FAQ: https://docs.pingcap.com/tidbcloud/serverless-faqs/
- Select plan: https://docs.pingcap.com/tidbcloud/select-cluster-tier/
- TiDB + Vercel: https://docs.pingcap.com/tidbcloud/integrate-tidbcloud-with-vercel/
- Drizzle tutorial: https://docs.pingcap.com/developer/serverless-driver-drizzle-example/
- Starter limitations: https://docs.pingcap.com/tidbcloud/serverless-limitations/

Key verified facts used:

- TiDB Starter current free allowance applies to up to five instances per organization;
- each current free quota includes row/columnar storage and RUs per documented policy;
- `@tidbcloud/serverless` + Drizzle is officially documented;
- connection URL uses MySQL-style format;
- Vercel integration is officially documented.

## Drizzle

- TiDB connector: https://orm.drizzle.team/docs/mysql/connect-tidb

## GitHub

- Rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets

## OpenStreetMap

Sebelum public traffic besar, verifikasi tile usage policy terbaru:

- https://operations.osmfoundation.org/policies/tiles/

## Verification rule

Jika AI membuat claim tentang:

- free tier quota;
- Vercel plan feature;
- Node runtime;
- framework requirement;
- TiDB limitation;

AI wajib memeriksa official source terbaru sebelum mengubah architecture/cost assumption.


## UI template baseline — TailAdmin

- Official Next.js page: https://tailadmin.com/nextjs
- Free download page: https://tailadmin.com/download
- Official GitHub: https://github.com/TailAdmin/free-nextjs-admin-dashboard
- GitHub package snapshot: https://raw.githubusercontent.com/TailAdmin/free-nextjs-admin-dashboard/main/package.json

Verified baseline facts:

- free/open-source Next.js admin template;
- upstream free repository declares MIT License;
- current stack is Next.js + React + TypeScript + Tailwind;
- downloadable via GitHub/official download page;
- upstream dependency snapshot includes ApexCharts, therefore project performs separate dependency/license cleanup.

## Chart licensing references

- ApexCharts license: https://apexcharts.com/license/
- ApexCharts GitHub LICENSE: https://github.com/apexcharts/apexcharts.js/blob/main/LICENSE
- Recharts GitHub: https://github.com/recharts/recharts

Project policy:

- ApexCharts current license is community/revenue-based; not approved as core baseline dependency.
- Recharts upstream declares MIT and is the preferred future candidate if chart visualization is needed.


---

# SOURCE: docs/28_COACHING_SEQUENCE.md

# 28 — COACHING SEQUENCE: Cara Saya Membimbing Tim Langkah demi Langkah

Dokumen ini bukan sekadar referensi. Ini urutan kerja yang disarankan ketika tim meminta bantuan AI/ChatGPT.

## Prinsip utama

Jangan meminta 10 langkah sekaligus lalu menjalankan semuanya tanpa verifikasi.

Pola sesi:

```text
Saya jelaskan 1 checkpoint
→ tim menjalankan
→ tim kirim output/screenshot
→ saya verifikasi
→ baru lanjut checkpoint berikutnya
```

## Session 0 — Readiness

Tim kirim:

```text
node -v
npm -v
git --version
```

Lalu konfirmasi:

- siapa repo owner;
- repo public/private;
- domain yang akan dipakai (tidak perlu credential);
- apakah akun Vercel sudah dibuat;
- apakah akun TiDB sudah dibuat.

**Jangan kirim password/token/connection string ke chat.**

### Prompt ke saya

```text
Kita mulai Phase 0 Courier Route Planner.
Bimbing saya satu checkpoint per satu checkpoint.
Jangan lanjut sebelum saya kirim hasil command/checkpoint sebelumnya.

Environment saya:
node -v: <hasil>
npm -v: <hasil>
git --version: <hasil>

Repo: belum/sudah dibuat
Vercel: belum/sudah
TiDB: belum/sudah
```

## Session 1 — GitHub + Next.js local

Goal:

- repo ada;
- Next.js local berjalan;
- `npm run build` berhasil.

Human evidence:

```text
npm run dev
npm run build
```

Kirim:

- terminal output error bila ada;
- screenshot browser halaman awal;
- `git status`.

Jangan kirim seluruh `node_modules` atau secret.

## Session 2 — TiDB Dev only

Goal:

- create TiDB Dev;
- local app dapat melakukan safe select;
- `.env.local` tidak tracked.

Human checks:

```bash
git status
```

Pastikan `.env.local` tidak muncul sebagai staged/tracked.

Kirim ke saya hanya:

```text
TiDB instance status: Active
DB connection test: PASS/FAIL
```

Jika error, redaksi username/host/token bila perlu.

## Session 3 — Git branches + Vercel Preview

Goal:

```text
main
└── testing
    └── feature/test-preview
```

Verify:

- main Production URL;
- feature Preview URL;
- deployment logs clean.

## Session 4 — Environment isolation

Ini **checkpoint paling penting sebelum coding bisnis**.

Buat safe environment marker, misalnya app menampilkan:

```text
APP_ENV = development/testing/production
```

Tidak menampilkan DB URL.

Verify:

- Local = development.
- Preview = testing.
- Production = production.

Kemudian lakukan controlled data marker:

- insert `ENV_TEST_PREVIEW` pada Testing DB;
- pastikan tidak muncul di Production;
- hapus marker setelah verifikasi.

## Session 5 — CI

Goal:

PR ke testing menunjukkan quality check.

Kirim:

- screenshot PR checks;
- command local;
- error log jika gagal.

## Session 6 — First real feature: Depot

Baru setelah foundation gate PASS.

Gunakan prompt `DEPOT CRUD` dari `22_PROMPT_LIBRARY.md`.

Setelah AI implement:

1. jangan langsung merge;
2. gunakan MASTER VERIFICATION PROMPT;
3. cek Preview manual;
4. buka PR.

## Session 7 onward

Ikuti roadmap:

```text
Scenario
→ Orders
→ Map
→ Dummy generator
→ Freeze benchmark
→ Road routability validation
→ OSRM Table directed matrix (meter) + hash + freeze
→ deterministic NN (depot=0, lowest-index tie)
→ best-improvement 2-Opt (full directed recomputation)
→ ACO Classical Ant System
→ Verification → separate calibration → pilot → main experiment
```

Sebelum algorithm checkpoint, baca [docs/32](docs/32_RESEARCH_DECISIONS.md), [docs/33](docs/33_ALGORITHM_SPECIFICATION.md), dan [docs/34](docs/34_OSRM_DISTANCE_CONTRACT.md). Evidence input sebelum integrasi algoritma: immutable case/matrix, stable node order, no unreachable pair, input/matrix hashes. Saat checkpoint 2-Opt selesai, tunjukkan symmetric-shortcut trap fixture PASS.

Benchmark checkpoint mengikuti [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md): 10/25/50 customer × 10 independent random datasets, 30 seeded ACO runs, satu NN+2-Opt quality output + 30 timing repetitions, 5 warm-ups. Satu global ACO config frozen sesudah calibration terpisah. N=100 conditional setelah pilot; clustered/circular/directional optional tambahan.

Verifikasi timer mengecualikan OSRM/DB/network/serialization/geometry/rendering. Review raw failure retention dan dataset-level summaries, bukan hanya best ACO result. Current UI Template Baseline belum berarti checkpoint riset ini sudah dikerjakan.

## Bagaimana bertanya saat bingung

Berikan **state**, bukan hanya “kok error?”.

Template:

```text
Saya sedang di Phase <x>, checkpoint <y>.
Goal checkpoint: <goal>.

Command yang saya jalankan:
<command>

Output:
<output>

Yang saya harapkan:
<expected>

Yang terjadi:
<actual>

Perubahan terakhir:
<apa yang berubah>

Jangan kasih saya 20 langkah sekaligus. Bimbing diagnosis satu per satu.
```

## Kapan perlu screenshot?

Screenshot berguna untuk:

- Vercel Settings;
- Vercel Deployment error;
- TiDB UI;
- GitHub branch rules;
- browser UI bug.

Terminal error sebaiknya **copy-paste text**, bukan screenshot, agar dapat dianalisis akurat.

## Kapan STOP

Stop dan minta review sebelum:

- membuat production DB;
- memasukkan production `DATABASE_URL`;
- membuat custom domain production;
- menjalankan migration production;
- merge testing → main;
- mengubah distance methodology;
- mengubah ACO parameter penelitian final;
- mengaktifkan paid/billing setting.


---

# SOURCE: docs/29_HUMAN_REVIEW_GUIDE.md

# 29 — HUMAN REVIEW GUIDE: Cara Mengecek Pekerjaan AI

AI verification penting, tetapi reviewer manusia tetap perlu melakukan pemeriksaan sederhana yang konsisten.

## 1. Jangan mulai dari membaca 1.000 baris code

Mulai dari scope:

1. task meminta apa?
2. file apa yang berubah?
3. apakah ada file yang tidak semestinya berubah?

Command:

```bash
git status
git diff --stat
git diff
```

Red flags:

- package besar baru tanpa alasan;
- config deployment berubah padahal task UI;
- schema berubah padahal task map;
- `.env` muncul;
- ribuan baris generated file tidak dijelaskan.

## 2. Check acceptance criteria satu per satu

Jangan menerima kalimat “semua AC terpenuhi”.

Buat tabel:

| AC | Cara check | Hasil |
|---|---|---|
| depot can create | manual form + DB | PASS |
| invalid lat rejected | input 100 | PASS |

## 3. Automated evidence

Jalankan sendiri minimal sebelum merge penting:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Jika AI hanya mengklaim command run tanpa output/evidence, ulangi di mesin kalian atau CI.

## 4. Preview test

Test URL Vercel Preview:

- buka incognito bila relevan;
- cek browser console;
- lakukan happy path;
- lakukan invalid input;
- reload page;
- cek empty/error state.

## 5. Database change review

Tanya:

- tabel/column apa berubah?
- data existing aman?
- migration reversible/mitigatable?
- apakah migration hanya Dev/Test?
- apakah benchmark history immutable tetap terjaga?

Jangan pernah “coba saja migration ke prod” untuk mengetahui aman atau tidak.

## 6. Security review sederhana

Search:

```bash
git grep -n "DATABASE_URL"
git grep -n "NEXT_PUBLIC_"
git grep -n "dangerouslySetInnerHTML"
```

Tujuannya bukan bahwa kata-kata ini selalu salah; reviewer memeriksa penggunaan.

Check GitHub staged diff untuk secret.

## 7. Algorithm review

Tidak perlu membaca formula dulu. Mulai dari behavioral checks:

### Route validity

Input:

```text
Depot D
Customers A B C D
```

Output harus seperti:

```text
Depot → A/C/... → ... → Depot
```

Dan set customer output = set customer input.

### Distance

Recompute route distance secara fungsi terpisah. Jangan mempercayai `totalDistance` yang dikembalikan algoritma sendiri.

Gunakan frozen OSRM directed matrix dalam meter; cocokkan input hash, node order dan matrix hash di kedua metode. Jangan hanya mencocokkan coordinates atau nama scenario. Matrix/benchmark case tetap immutable setelah orders diedit.

### NN and 2-Opt

NN: depot=0, nearest directed cost, tie-break lowest node index. 2-Opt: best improvement setelah semua candidates, reverse segment dan full directed recomputation. Jalankan asymmetric fixtures di [docs/33](docs/33_ALGORITHM_SPECIFICATION.md); jangan menerima symmetric-only two-boundary-edge delta. Hasil final harus <= NN distance.

### ACO reproducibility

Run dua kali dengan same seed + same matrix + same params.

Expected untuk test deterministic RNG path:

```text
same result
```

Pastikan varian Classical Ant System: directed pheromone, semua valid ants deposit, fixed iterations, state reset per run, tidak ada post-ACO 2-Opt. Parameter numerik ilmiah harus berasal dari literature/calibration, bukan tebakan AI.

### Benchmark evidence

Periksa [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md): 10/25/50 × 10 random datasets; N=100 conditional, other patterns optional; calibration terpisah dan satu global configuration frozen. Per dataset ada 30 independent seeded ACO runs, 30 NN+2-Opt timing samples, dan 5 warm-ups yang dikeluarkan. ACO mean/median pembanding utama, best tambahan. Dataset-level observations tidak diganti dengan jumlah runs. Raw poor-valid/failed runs tetap ada.

Timer harus mengecualikan OSRM/DB/network/serialization/geometry/rendering dan dijalankan terkontrol di luar runtime Vercel. Untuk task dokumentasi, periksa keselarasan sumber dengan MASTER_GUIDE/MANIFEST; application lint/build tidak membuktikan metodologi penelitian.

Periksa dataset ordinal mapping dan balanced execution schedule yang disimpan terhadap [protocol bagian 6](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md#6-environment-and-timer-boundary), termasuk warm-up tepat sebelum masing-masing measured block.

## 8. AI review trap

Jangan bertanya:

> “Apakah kode ini sudah bagus?”

Tanya:

> “Cari minimal 5 cara implementasi ini bisa gagal. Buktikan dengan code path/test. Jangan berikan pujian.”

## 9. Merge decision

### PASS

Semua blocker/high resolved, CI green, AC green.

### PASS WITH FINDINGS

Hanya low/known limitation yang disepakati dan tidak mengganggu release.

### FAIL

- correctness issue;
- production safety issue;
- secret exposure;
- migration unsafe;
- core test gagal;
- scope tidak terpenuhi.

## 10. Reviewer sign-off text

```text
Reviewed by: <nama>
Scope checked: yes
Diff checked: yes
Automated checks: green
Preview manual test: pass
DB impact: none/reviewed
Security quick check: pass
Known limitations: ...
Decision: APPROVE / REQUEST CHANGES
```


## 11. UI template review

Jika task menyentuh TailAdmin/template:

- pastikan hanya Free/open-source source yang dipakai;
- cek tidak ada asset/component Pro;
- cek `THIRD_PARTY_NOTICES.md` tetap ada dan benar;
- cek menu/demo e-commerce yang tidak relevan tidak kembali masuk;
- cek dependency baru punya alasan dan license jelas;
- jalankan `npm ls apexcharts react-apexcharts`; target normal setelah cleanup adalah tidak ada;
- cek sidebar desktop/mobile, header, empty state, console, dan Vercel Preview;
- jangan approve hanya karena UI “terlihat bagus” jika build/test/license/dependency review gagal.


---

# SOURCE: docs/30_UI_TEMPLATE_GUIDE.md

# 30 — UI TEMPLATE GUIDE: TailAdmin Next.js Free

**Status:** Accepted baseline UI template  
**Decision date:** 2026-09-26  
**Scope:** presentation/UI shell only; business logic, database, algorithms, research protocol, and architecture remain governed by this project's own docs.

## 1. Decision

Gunakan **TailAdmin Next.js Free** sebagai baseline admin template.

Official sources:

- Website: https://tailadmin.com/nextjs
- Free download page: https://tailadmin.com/download
- GitHub: https://github.com/TailAdmin/free-nextjs-admin-dashboard
- Direct GitHub ZIP pattern: https://github.com/TailAdmin/free-nextjs-admin-dashboard/archive/refs/heads/main.zip

Alasan dipilih:

- free dan open-source;
- repository menyatakan **MIT License**;
- stack sangat dekat dengan project: Next.js, React, TypeScript, Tailwind CSS;
- tersedia sidebar, forms, tables, alerts, modal, dark mode, dashboard shell;
- source code bisa di-download/clone sehingga tidak membuat project tergantung builder/proprietary runtime;
- cocok untuk Web Admin Route Planner yang butuh dashboard, CRUD, table, form, status card, dan layout konsisten.

## 2. Kandidat yang dibandingkan

| Template | Stack | Lisensi | Download | Kelebihan | Kenapa bukan baseline |
|---|---|---|---|---|---|
| **TailAdmin Next.js Free** | Next.js + TS + Tailwind | MIT | GitHub/ZIP | sederhana, exact fit, banyak komponen dasar | **SELECTED** |
| NextAdmin | Next.js + Tailwind | open-source | GitHub | AI-friendly, modern | membawa Prisma/PostgreSQL/auth assumptions yang bertabrakan dengan TiDB + Drizzle baseline |
| next-shadcn-dashboard-starter | Next.js 16 + shadcn + TS + Tailwind | MIT | GitHub | sangat lengkap dan production-oriented | dependency jauh lebih banyak; Clerk/Sentry/AI/billing bukan kebutuhan project dan menambah cognitive overhead |
| Mosaic Lite | React + Tailwind | open-source | GitHub | ringan dan rapi | bukan baseline Next.js App Router |

## 3. Template bukan arsitektur aplikasi

TailAdmin hanya menjadi **visual/UI starting point**.

Jangan biarkan struktur demo template menentukan domain architecture.

Tetap ikuti:

```text
UI / React Components
        ↓
Route Handler / Server Action
        ↓
Application Service
        ↓
Repository / DB
        ↓
TiDB
```

Untuk algoritma:

```text
UI
 ↓
Benchmark/Application Service
 ↓
Algorithm Module
 ↓
Pure input → result
```

Core algorithm tidak boleh ditempatkan di komponen TailAdmin.

## 4. Komponen TailAdmin yang boleh dipertahankan

Prioritas reuse:

- app shell;
- sidebar;
- header/top navigation;
- breadcrumbs;
- cards/stat cards;
- table presentation;
- form controls;
- badges/status indicators;
- alerts;
- modal/dialog patterns;
- pagination pattern;
- loading/skeleton patterns bila tersedia;
- error/404 layout;
- dark mode bila tidak menambah bug/complexity.

## 5. Demo yang harus dibersihkan

Template gratis memiliki konten contoh. Jangan biarkan project akhir tampak seperti template e-commerce.

Hapus/replace secara bertahap:

- e-commerce mock data;
- fake revenue/sales metrics;
- product examples;
- customer demographic examples;
- demo pages yang tidak digunakan;
- sample images yang tidak relevan;
- authentication demo sebelum auth phase diputuskan;
- calendar/chat/mail/demo app yang tidak relevan;
- dependency yang hanya dipakai halaman demo yang sudah dihapus.

Jangan melakukan mass delete sebelum `npm run build` baseline berhasil.

## 6. License & third-party rule

### TailAdmin

Repository free TailAdmin menyatakan MIT License.

WAJIB:

- jangan mengambil komponen Pro/paid;
- jangan copy asset dari demo Pro;
- pertahankan license/copyright notice yang diwajibkan;
- catat provenance pada `THIRD_PARTY_NOTICES.md`;
- record source revision/commit saat template benar-benar diadopsi.

### ApexCharts warning

Snapshot dependency TailAdmin saat dokumen ini diverifikasi memiliki `apexcharts` dan `react-apexcharts`.

ApexCharts 2026 menggunakan **revenue-based/community license**, bukan MIT sederhana. Walaupun educational use dapat memenuhi Community License, project ini memilih guardrail yang lebih sederhana:

> **ApexCharts tidak menjadi dependency core project.**

Pada cleanup template:

1. identifikasi semua page/component yang membutuhkan ApexCharts;
2. hapus demo charts yang tidak diperlukan;
3. remove `apexcharts` dan `react-apexcharts` setelah tidak ada import;
4. jika visualisasi chart dibutuhkan pada Results/Benchmark, gunakan library MIT yang disetujui melalui task/ADR, preferensi awal **Recharts**.

Jangan sekadar `npm uninstall` sebelum source import dibersihkan dan build diverifikasi.

## 7. Recommended adoption strategy

Karena tim masih belajar Git/Next.js, gunakan **Download ZIP**, bukan fork template sebagai repository utama.

### Step 1 — download

Buka official GitHub repository:

```text
https://github.com/TailAdmin/free-nextjs-admin-dashboard
```

Pilih:

```text
Code → Download ZIP
```

Atau gunakan official TailAdmin download page.

### Step 2 — extract

Extract ke folder sementara, contoh:

```text
C:\projects\tailadmin-source
```

Jangan langsung rename repo upstream menjadi repo kelompok sebelum audit.

### Step 3 — audit source sebelum copy

Check:

```bash
node -v
npm -v
npm install
npm run build
```

Expected: build template upstream berhasil sebelum kita modifikasi.

### Step 4 — record provenance

Jika Git tersedia:

```bash
git ls-remote https://github.com/TailAdmin/free-nextjs-admin-dashboard.git HEAD
```

Simpan SHA hasilnya ke `THIRD_PARTY_NOTICES.md` saat adoption.

Catat juga tanggal download.

### Step 5 — copy ke project repository

Copy source template ke repository project kosong.

Jangan membawa `.git` upstream jika menggunakan clone.

Pastikan source license ikut tercatat.

### Step 6 — project bootstrap commit

Sebelum cleanup besar:

```bash
npm install
npm run lint
npm run build
```

Commit pertama project sebaiknya merepresentasikan **unmodified/minimally modified template baseline** agar diff cleanup mudah diaudit.

### Step 7 — cleanup branch

Buat dari `testing` atau foundation branch sesuai Git workflow:

```text
feature/template-cleanup
```

Cleanup satu kelompok concern per commit/PR jika memungkinkan.

## 8. Route Planner menu mapping

Sidebar final tidak memakai menu e-commerce.

Target awal:

```text
Dashboard

Master Data
├── Depot
└── Orders

Simulation
├── Scenarios
├── Dummy Generator
└── Map

Optimization
├── Run Optimization
├── Experiments
└── Results

Research
├── Benchmark Batches
└── Export Results

System
└── About / Environment Info
```

`Auth/User Management` tidak muncul sampai phase auth disetujui.

`Benchmark Batches` pada contoh menu adalah optional/future design consideration, bukan kewajiban membuat tabel `benchmark_batches`. Main experiment dan comparison mengikuti [docs/32](docs/32_RESEARCH_DECISIONS.md) dan [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md); jangan menurunkan schema penelitian dari contoh menu.

## 9. Dashboard mapping

Contoh widget yang relevan:

```text
Total Orders
Active Scenario
Customer Count
Latest Benchmark
```

Chart/visual yang mungkin dipakai nanti:

- distance NN+2Opt vs ACO;
- execution time vs customer count;
- mean ± standard deviation ACO;
- distribution pattern comparison bila optional/additional experiment dipilih; primary pattern tetap random.

Jangan tampilkan statistik palsu hanya agar dashboard terlihat penuh.

## 10. Design principles

- Admin-first, bukan marketing site.
- Desktop/tablet priority; tetap responsive.
- Map mendapatkan ruang besar.
- Tables harus nyaman untuk data eksperimen.
- Semua status memakai text + icon/badge, jangan warna saja.
- Hindari animasi dekoratif berat.
- Jangan custom branding besar sebelum workflow utama stabil.
- Accessibility dasar: labels, keyboard focus, contrast, semantic HTML.

## 11. Required checks after template adoption

Automated:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Jika `typecheck`/`test` belum tersedia pada upstream template, tambahkan sesuai project foundation sebelum template adoption dianggap selesai.

Manual:

- sidebar desktop;
- sidebar mobile;
- header;
- light/dark mode bila dipertahankan;
- no broken image;
- no dead menu;
- no TailAdmin Pro-only component;
- no e-commerce mock metric tersisa pada route-planner dashboard;
- browser console clean;
- responsive basic check;
- Vercel Preview build succeeds.

Dependency/license:

```bash
npm ls apexcharts react-apexcharts
```

Final target setelah cleanup:

```text
(no ApexCharts dependency)
```

kecuali manusia secara eksplisit mengubah keputusan melalui ADR.

## 12. AI prompt untuk template adoption

Gunakan prompt dedicated di `docs/22_PROMPT_LIBRARY.md`.

AI tidak boleh:

- mengganti template sendiri;
- menarik Pro assets;
- menambahkan UI framework kedua;
- rewrite semua component sekaligus;
- menghapus license notice;
- mengubah research architecture karena struktur TailAdmin.

## 13. Exit criteria

Template phase PASS jika:

- [ ] TailAdmin Free source origin tercatat;
- [ ] license/provenance tercatat;
- [ ] baseline build berhasil;
- [ ] project branding dasar sudah diganti;
- [ ] menu sudah cocok Route Planner;
- [ ] demo page tidak relevan dibersihkan;
- [ ] unused dependency penting dibersihkan;
- [ ] ApexCharts tidak menjadi dependency core;
- [ ] lint/typecheck/test/build green;
- [ ] preview deployment sukses;
- [ ] tidak ada Pro/paid asset;
- [ ] human review PASS.

## 14. Change policy

Mengganti TailAdmin dengan template lain setelah development dimulai membutuhkan:

1. alasan konkret;
2. impact analysis;
3. migration cost;
4. dependency/license audit;
5. ADR baru;
6. approval tim.

Jangan mengganti template hanya karena menemukan desain yang “lebih keren”.


---

# SOURCE: docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md

# 31 — BRANCH PROTECTION & ACCIDENTAL PUSH GUARDS

**Status:** Required baseline control  
**Goal:** mencegah anggota tim, maintainer, atau AI agent tidak sengaja mengubah dan mendorong perubahan langsung ke `main` atau `testing`.

> Prinsip: perlindungan tidak boleh hanya mengandalkan ingatan manusia. Gunakan beberapa lapisan: GitHub server-side protection, local Git guards, AI guardrails, CI, dan deployment isolation.

---

## 1. Threat model

Skenario yang harus dicegah:

1. developer lupa masih berada di `main`;
2. developer mengedit file dan melakukan commit;
3. developer menjalankan `git push` tanpa mengecek branch;
4. developer salah target, misalnya `git push origin HEAD:main`;
5. AI coding agent mengubah file saat current branch adalah `main` atau `testing`;
6. force-push merusak history branch penting;
7. feature yang belum direview masuk production.

Target kita:

```text
feature/* / fix/* / chore/*
        ↓
     Pull Request
        ↓
      testing
 (no approval required)
        ↓
 integration / QA / UAT
        ↓
     Pull Request
        ↓
 minimum 1 human approval
        ↓
       main
```

Tidak ada direct code change ke `main` atau `testing`.

---

## 2. Protection layers

Kita memakai minimum lima lapisan.

### Layer A — GitHub server-side branch protection (authoritative)

Protected branch:

```text
main
testing
```

### Important GitHub plan note

Pada GitHub saat ini, protected branches/rulesets tersedia untuk public repository pada GitHub Free. Untuk private repository, enforcement branch protection/ruleset tersedia pada GitHub Pro/Team/Enterprise.

Untuk mahasiswa terverifikasi, GitHub Student Developer Pack menyediakan GitHub Pro secara gratis selama status mahasiswa memenuhi syarat. Karena project ini adalah project mahasiswa, tim sebaiknya mengecek GitHub Education lebih dulu bila repository ingin tetap private tanpa biaya.

Jika repository private + GitHub Free tanpa Pro, local guards di bawah tetap wajib tetapi **bukan pengganti sempurna** server-side enforcement.

---

## 3. Local guard 1 — block commits on protected branches

Git hooks tidak otomatis ikut aktif hanya karena file hook ada di repository. Setelah repository siap, tim akan menyimpan hooks pada:

```text
.githooks/
├── pre-commit
└── pre-push
```

Lalu setiap clone harus mengaktifkan:

```bash
git config core.hooksPath .githooks
```

### `.githooks/pre-commit`

```sh
#!/bin/sh

branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"

case "$branch" in
  main|testing)
    echo ""
    echo "BLOCKED: commit langsung pada branch '$branch' tidak diizinkan."
    echo "Buat feature/fix/hotfix/chore branch terlebih dahulu."
    echo "Contoh: git switch -c feature/nama-fitur"
    echo ""
    exit 1
    ;;
esac

exit 0
```

Hasilnya:

```text
main + git commit
        ↓
      BLOCKED
```

Ini mencegah kesalahan lebih awal sebelum push terjadi.

> Hook dapat dilewati secara sengaja dengan opsi Git tertentu. Karena itu server-side GitHub protection tetap menjadi otoritas utama.

---

## 4. Local guard 2 — block any push targeting main/testing

### `.githooks/pre-push`

```sh
#!/bin/sh

while read local_ref local_sha remote_ref remote_sha
do
  case "$remote_ref" in
    refs/heads/main|refs/heads/testing)
      echo ""
      echo "BLOCKED: direct push ke '$remote_ref' tidak diizinkan."
      echo "Gunakan Pull Request."
      echo ""
      exit 1
      ;;
  esac
done

exit 0
```

Guard ini tidak hanya menangkap:

```bash
git push origin main
```

melainkan juga salah target seperti:

```bash
git push origin HEAD:main
```

Normal push yang diizinkan:

```bash
git push -u origin feature/depot-crud
```

---

## 5. Required developer setup command

Setelah hooks dibuat di repository, setiap anggota menjalankan satu kali per clone:

```bash
git config core.hooksPath .githooks
```

Verify:

```bash
git config --get core.hooksPath
```

Expected:

```text
.githooks
```

Sebelum anggota dianggap onboarding-complete, tes berikut wajib dilakukan:

```bash
git switch main
# buat perubahan dummy yang aman atau gunakan dry-run test procedure
```

Jangan meninggalkan perubahan dummy di history.

Tim harus membuktikan bahwa commit/push protected branch diblokir.

---

## 6. Optional automated setup

Setelah `package.json` stabil, buat script repository misalnya:

```json
{
  "scripts": {
    "setup:git-hooks": "git config core.hooksPath .githooks"
  }
}
```

Developer baru cukup menjalankan:

```bash
npm run setup:git-hooks
```

Boleh juga digabung ke onboarding/bootstrap script, tetapi jangan membuat install dependency diam-diam mengubah Git global config.

---

## 7. AI agent guard

Sebelum AI mengubah file, AI wajib menjalankan:

```bash
git branch --show-current
git status --short
```

Rules:

- jika branch = `main`: **STOP**;
- jika branch = `testing`: **STOP** untuk coding biasa;
- AI hanya boleh melanjutkan setelah manusia membuat branch kerja;
- AI tidak boleh otomatis membuat branch jika task tidak mengizinkannya;
- AI tidak boleh push, merge, force-push, atau mengubah protections tanpa instruksi eksplisit manusia.

Recommended first line pada prompt implementasi:

```text
MANDATORY SAFETY CHECK:
Sebelum mengubah file apa pun, jalankan `git branch --show-current` dan `git status --short`.
Jika current branch adalah `main` atau `testing`, STOP dan laporkan. Jangan lakukan perubahan kode.
```

---

## 8. Vercel deployment isolation

Git safety diperkuat deployment safety:

```text
main       → Vercel Production
testing    → persistent Preview/Testing
feature/*  → Preview Deployment
```

Feature branch tidak boleh menjadi Production Branch.

Dengan demikian feature push normal tidak langsung menjadi production release.

Tetapi Vercel **bukan pengganti Git protection**. Jika seseorang berhasil memasukkan commit ke `main`, deployment production dapat berjalan. Karena itu `main` harus dilindungi dari sumbernya.

---

## 9. Recovery — lupa branch tetapi belum commit

Misalnya sedang di:

```text
main
```

dan sudah mengedit beberapa file tetapi belum commit.

JANGAN hapus perubahan.

Langsung buat branch baru:

```bash
git switch -c feature/nama-fitur
```

Working tree biasanya ikut pindah ke branch baru.

Kemudian:

```bash
git status
git add ...
git commit ...
git push -u origin feature/nama-fitur
```

---

## 10. Recovery — sudah commit di main, push ditolak

Misalnya:

```text
main
A -- B -- C
          ^ accidental local commit
```

Jangan langsung `reset --hard`.

Pertama selamatkan commit:

```bash
git switch -c feature/nama-fitur
```

Pastikan commit terlihat:

```bash
git log --oneline -5
```

Kemudian kembalikan local `main` ke remote:

```bash
git switch main
git fetch origin
git reset --hard origin/main
```

Lalu lanjutkan pekerjaan di feature branch.

**Warning:** `git reset --hard` destructive. Jalankan hanya setelah memastikan perubahan penting sudah tersimpan pada branch/commit lain.

---

## 11. Recovery — accidental push benar-benar sudah masuk main

Jika server-side protection belum aktif dan direct push terlanjur berhasil:

1. **STOP** deployment/change berikutnya;
2. jangan force-push untuk “menghapus jejak”;
3. catat commit SHA yang salah;
4. review apakah sudah terdeploy production;
5. gunakan `git revert <sha>` melalui recovery branch + PR bila memungkinkan;
6. smoke-test production;
7. aktifkan/fix branch protection;
8. tulis incident note singkat agar tidak berulang.

Default recovery adalah **revert**, bukan rewrite history.

---

## 12. Daily branch sanity habit

Sebelum coding:

```bash
git branch --show-current
git status --short
git fetch origin
```

Expected branch untuk feature work:

```text
feature/*
fix/*
hotfix/*
chore/*
```

Bukan:

```text
main
testing
```

Optional: tampilkan current Git branch pada terminal prompt agar branch selalu terlihat.

---

## 13. Pre-PR checklist

Sebelum PR:

- [ ] current branch bukan `main`/`testing`;
- [ ] branch berasal dari base yang benar;
- [ ] `git status` bersih;
- [ ] tidak ada `.env*` atau secret;
- [ ] diff sudah dibaca;
- [ ] lint lulus;
- [ ] typecheck lulus;
- [ ] tests lulus;
- [ ] build lulus;
- [ ] PR target benar (`feature/* → testing` atau `testing → main`).

---

## 14. Repository admin checklist

Sebelum coding tim dimulai:

- [ ] repository visibility ditentukan;
- [ ] jika private, eligibility GitHub Pro/Student dicek;
- [ ] `main` protected;
- [ ] `testing` protected;
- [ ] PR required;
- [ ] required status checks configured;
- [ ] force-push blocked;
- [ ] deletion blocked;
- [ ] bypass seminimal mungkin;
- [ ] Vercel Production Branch = `main`;
- [ ] local hooks masuk repository;
- [ ] seluruh anggota telah mengaktifkan `core.hooksPath`;
- [ ] test accidental commit/push sudah dilakukan;
- [ ] AI instructions memiliki branch safety check.

---

## 15. Acceptance criteria

Protection dianggap benar jika:

1. commit langsung di local `main` ditolak hook;
2. commit langsung di local `testing` ditolak hook;
3. push yang menargetkan remote `main` ditolak local hook;
4. push yang menargetkan remote `testing` ditolak local hook;
5. jika hook dilewati/missing, GitHub tetap menolak direct protected-branch push bila server-side protection tersedia;
6. feature push berhasil;
7. perubahan ke protected branch hanya melalui PR;
8. CI wajib hijau sebelum merge;
9. production deployment hanya berasal dari `main`;
10. tim tahu recovery procedure jika salah branch.

---

## 16. Final policy

Kita tidak menggunakan model keamanan:

> “Ingat ya, jangan push ke main.”

Kita menggunakan model:

```text
Human habit
    +
Local pre-commit guard
    +
Local pre-push guard
    +
GitHub branch protection
    +
CI required checks
    +
Vercel production isolation
```

Human error diasumsikan **akan terjadi**. Sistem harus membuat human error sulit berubah menjadi production incident.


---

# SOURCE: docs/32_RESEARCH_DECISIONS.md

# 32 — RESEARCH DECISIONS

**Status:** Accepted working research contract, keputusan manusia 2026-10-02.
Dokumen ini menetapkan arah penelitian; prosedur eksekusi ada di [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md), kontrak algoritma di [specification](docs/33_ALGORITHM_SPECIFICATION.md), dan input jalan di [OSRM contract](docs/34_OSRM_DISTANCE_CONTRACT.md). Ini target yang disetujui, bukan klaim fitur sudah diimplementasikan.

## 1. Research context

Web Admin Courier Route Planner membantu admin menyiapkan customer, menghasilkan urutan kunjungan, dan membandingkan Hybrid Nearest Neighbor → 2-Opt dengan Ant Colony Optimization (ACO), varian Classical Ant System.

## 2. Problem statement

Satu depot menjadi awal dan akhir: Depot → Customer → ... → Customer → Depot. Setiap customer dikunjungi tepat sekali. Problem adalah multi-stop route sequencing / TSP-like closed tour. Jumlah customer tidak termasuk depot.

## 3. Why the problem matters / urgency

Admin perlu menentukan urutan banyak tujuan dan menilai jarak serta waktu komputasi metode yang dipakai. Perbandingan terkontrol memberi dasar pemilihan metode pada konteks studi. Pengurangan biaya, jarak, atau waktu operasional belum boleh diklaim sebelum ada pengukuran.

## 4. Existing research position

Studi terdahulu telah membandingkan NN/NN+2-Opt dan ACO pada TSP dan konteks optimasi lain. Posisi ini tidak mengklaim pasangan metode sebagai penemuan baru.

**TODO-LIT-01:** petakan studi pembanding yang benar-benar dibaca: sitasi, problem, input jarak, ukuran, varian, parameter, repetitions, dan metrics. Daftar bibliografi yang memadai belum tersedia di repository; lihat [source references](docs/27_SOURCE_REFERENCES.md). Jangan membuat sitasi fiktif.

## 5. Research gap

Working gap: bukti perbandingan empiris terkontrol dalam konteks pengiriman multi-customer dengan input road-network identik, beberapa ukuran masalah, route quality, computation time, repeated stochastic stability, dan implementasi Web Admin masih terbatas. Frasa **masih terbatas** adalah posisi kerja yang harus dibuktikan melalui TODO-LIT-01, bukan hasil systematic review yang sudah selesai. Hindari klaim universal “belum pernah ada”.

## 6. Research questions

- **RQ1:** Bagaimana perbandingan total jarak rute yang dihasilkan Hybrid Nearest Neighbor–2-Opt dan Ant Colony Optimization pada jumlah customer yang berbeda?
- **RQ2:** Bagaimana perbandingan waktu komputasi Hybrid Nearest Neighbor–2-Opt dan Ant Colony Optimization ketika jumlah customer meningkat?
- **RQ3:** Seberapa besar variasi hasil Ant Colony Optimization pada pengujian berulang, dengan hasil Hybrid Nearest Neighbor–2-Opt sebagai referensi deterministik?

RQ ini tidak boleh diganti diam-diam oleh agent implementasi.

## 7. Research objectives

1. Membandingkan total jarak NN+2-Opt dengan mean/median ACO pada tiap ukuran customer.
2. Membandingkan distribusi waktu eksekusi algoritma pada environment terkontrol.
3. Mengukur variasi hasil ACO antar seed dengan NN+2-Opt sebagai referensi deterministik.

## 8. Contribution

Kontribusi yang ditargetkan adalah evidence empiris terkontrol, snapshot input/matrix dan raw results yang dapat diaudit, serta Web Admin untuk menyiapkan dan menampilkan eksperimen. Pattern generator tambahan dan penggunaan dua algoritma bukan klaim novelty dengan sendirinya.

## 9. Independent, dependent, and control variables

| Jenis | Variabel |
|---|---|
| Independent | Metode (NN+2-Opt vs Classical Ant System), jumlah customer (10/25/50) |
| Dependent | Total distance meter, algorithm execution time, variasi jarak ACO antar run |
| Control | Depot/study area dan generation procedure yang dibekukan; node order, input dan matrix hash identik dalam tiap comparison; satu konfigurasi ACO global; daftar seed predetermined; versi algoritma/PRNG; hardware/runtime dan timing policy |

Dataset adalah unit observasi scenario. Tiga puluh run ACO pada satu dataset adalah pengulangan stochastic, bukan tiga puluh dataset independen.

## 10. Primary experiment design

| Customer count | Independent evaluation datasets | Pattern |
|---|---:|---|
| 10 | 10 | random |
| 25 | 10 | random |
| 50 | 10 | random |
| Total | 30 | Main evaluation |

- N=100 / **100 customers** conditional/optional setelah pilot feasibility; tidak wajib main experiment.
- clustered, circular, directional boleh didukung engineering generator, tetapi optional/additional experiments dan bukan core novelty.
- Calibration datasets wajib terpisah dari main evaluation. Freeze satu global ACO configuration setelah calibration; jangan memilih configuration berbeda untuk memenangkan N10/N25/N50.
- ACO: **30 independent seeded runs per main dataset**, seed list ditentukan dan disimpan sebelum measured runs. Timestamp seed dilarang.
- NN+2-Opt: satu deterministic quality result dan **30 measured timing repetitions** per dataset.
- **5 warm-up executions** per algoritma per dataset sebelum measured runtime; hasil warm-up tidak masuk statistik penelitian.
- Formal input adalah satu frozen OSRM road-network distance matrix per comparison, dalam meter dan berpotensi directed/asymmetric. Tidak ada asumsi global d(i,j)=d(j,i).
- Formal benchmark dijalankan pada environment terkontrol yang dicatat, tidak bergantung pada runtime Vercel.

## 11. Primary metrics

| RQ | Laporan per dataset |
|---|---|
| RQ1: quality | NN+2-Opt total distance; ACO mean, median, best, worst, SD |
| RQ2: time | Mean, median, SD dari 30 NN+2-Opt timing samples dan runtime 30 ACO runs; min/max optional |
| RQ3: stability | ACO mean, median, best, worst, range, SD, coefficient of variation (CV) |

Primary descriptive comparison memakai ACO median dan/atau mean. Best-of-30 adalah hasil tambahan, tidak dijadikan satu-satunya pembanding terhadap NN+2-Opt. Jangan menetapkan threshold CV baik/buruk tanpa sumber ilmiah. Definisi statistik dan failed-run policy ada di protocol v1.

## 12. Main scope

Web Admin, satu depot, customer dengan latitude/longitude, editable dummy orders/scenarios, immutable benchmark snapshots, frozen OSRM Table matrix, deterministic NN, best-improvement 2-Opt dengan full directed route recomputation, dan seeded Classical Ant System tanpa 2-Opt sesudah ACO pada main comparison.

OSRM adalah core input infrastructure, bukan research algorithm. OSRM Route/geometry untuk Leaflet adalah concern terpisah. Timer formal mengecualikan OSRM request, DB, HTTP/network, serialization, route geometry generation, dan rendering.

## 13. Out of scope

Shortest-path A→B sebagai problem utama, Dijkstra/A* sebagai metode penelitian, VRP multi-vehicle/multi-depot, realtime courier navigation, live traffic, dan klaim optimum global. Task sinkronisasi ini tidak mengimplementasikan produk atau menjalankan eksperimen.

## 14. Claims that MUST NOT be made

- “NN+2-Opt vs ACO belum pernah dibandingkan” tanpa literature evidence yang mendukung.
- Heuristic menghasilkan “optimal route” tanpa bukti optimum.
- Lebih cepat/pendek/stabil tanpa metric dan benchmark yang sah.
- OSRM Table distance otomatis mathematical shortest-distance route.
- Best-of-30 sebagai typical ACO performance, atau run dalam satu dataset sebagai dataset independen.
- ACO numeric defaults sudah final ketika belum ada literature/calibration record.

## 15. Decisions still OPEN

- Numerical ACO parameters, dengan justifikasi relevant literature atau small calibration experiment.
- Exact depot, study area, batas generator dan kriteria sampling/routability sebelum data final dibentuk.
- Public OSRM vs local/self-hosted untuk final data generation, berikut profile/network provenance yang akan dibekukan.
- Apakah N=100 masuk eksperimen akhir setelah pilot.
- Apakah clustered/additional scenarios dijalankan dan dilaporkan terpisah.
- TODO-LIT-01: evidence bibliografi untuk posisi/gap. Tidak boleh dianggap sudah dipenuhi oleh dokumentasi teknis platform.

Keputusan yang sudah dikunci (main counts, jumlah dataset, repetitions, warm-up, varian algoritma, input formal, dan RQ) tidak termasuk OPEN.


---

# SOURCE: docs/33_ALGORITHM_SPECIFICATION.md

# 33 — ALGORITHM SPECIFICATION

**Status:** Approved implementation contract, 2026-10-02; belum merupakan implementasi.
Rujukan: [research decisions](docs/32_RESEARCH_DECISIONS.md), [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md), [matrix contract](docs/34_OSRM_DISTANCE_CONTRACT.md).

## 1. Common optimizer input contract

Input geografi optimizer hanya **DistanceMatrix** yang sudah divalidasi, ditambah parameter algoritma/seed bila diperlukan. Tidak ada coordinates, provider, HTTP, DB, atau UI dalam core. Metadata ID/hash dipetakan application layer di luar solver.

```ts
type DistanceMatrix = ReadonlyArray<ReadonlyArray<number>>;
type Route = ReadonlyArray<number>;
type NNTwoOptDiagnostics = Readonly<{
  nnInitialDistanceM?: number;
  twoOptPasses?: number;
  acceptedImprovements?: number;
}>;
type AntSystemDiagnostics = Readonly<{
  iterationsCompleted?: number;
  bestIteration?: number;
}>;
type AntSystemParameters = Readonly<{
  alpha: number;
  beta: number;
  rho: number;
  Q: number;
  tau0: number;
  antCount: number;
  maxIterations: number;
}>;
type OptimizerResult = Readonly<{
  route: Route;
  totalDistanceM: number;
  algorithm: 'NN_2OPT' | 'ACO';
  diagnostics?: NNTwoOptDiagnostics | AntSystemDiagnostics;
}>;
```

Ini conceptual types, bukan file source yang sudah tersedia. Seed dan PRNG version harus eksplisit pada pemanggilan ACO dan run metadata. Core tidak boleh import `next/*`, React, Leaflet, Drizzle/TiDB, OSRM HTTP client, atau session/cookies. Tidak boleh memutasi matrix atau initial route milik caller.

## 2. Directed matrix and route distance

Untuk n customer, N=n+1 node, depot index **0**, customer indices **1..n**. Matrix NxN, N>=1, diagonal 0, off-diagonal finite dan nonnegative, tanpa null/unreachable. Matrix kosong ditolak. Symmetric fixtures boleh, tetapi symmetry bukan syarat input: d(i,j) dapat berbeda dari d(j,i).

Untuk route R=(r0,...,r(n+1)), r0=r(n+1)=0:

```text
L(R) = sum(k=0..n) D[r_k][r_(k+1)]     [meter]
```

Gunakan seluruh directed edges, termasuk return edge ke depot. Jangan round matrix sebelum optimasi; pembulatan hanya display. Penjumlahan yang overflow/non-finite adalah error.

ACO dengan eta=1/d memerlukan off-diagonal distance positif pada kasus nontrivial. Matrix dengan zero off-diagonal dapat lolos validasi bentuk/jarak umum, tetapi harus ditolak pada ACO preflight dengan error eksplisit. Jangan diam-diam memasukkan epsilon, mengganti jarak, atau menggabungkan customer. Aturan penerimaan koordinat yang menyebabkan zero distance harus diselesaikan sebelum freeze data formal; semua algoritma memakai eligibility dataset yang sama.

## 3. Nearest Neighbor (NN)

1. Mulai dengan route [0] dan semua customer unvisited.
2. Dari current i, pilih unvisited j dengan **D[i][j] minimum**.
3. Jika distance sama persis, pilih **lowest node index**.
4. Append j, hapus dari unvisited, ulangi sampai habis.
5. Append 0 dan hitung L(R).

Tidak ada random start atau multi-start. Same matrix/node order → same route. Untuk n=0, route [0,0], distance 0. n=1 menghasilkan [0,1,0]. n=2 tetap mengikuti directed nearest distance dan tie rule. NN route menjadi initial route 2-Opt.

## 4. Best-improvement 2-Opt

Input: valid closed NN route dan matrix yang sama. Depot tetap di posisi awal/akhir.

Pada tiap pass, enumerasi seluruh pasangan posisi customer 1 <= i < j <= n secara lexicographic (i dahulu, lalu j), termasuk seluruh segmen customer. Untuk tiap candidate:

1. Salin route saat ini.
2. Reverse segmen inclusive R[i..j].
3. **Recompute FULL route distance** dari directed matrix, termasuk internal reversed edges dan return edge.
4. Pilih candidate dengan distance terkecil yang merupakan **strict improvement** terhadap route saat ini. Bila beberapa candidate sama baik, pertahankan pasangan (i,j) pertama dalam urutan enumerasi.
5. Setelah semua candidate dievaluasi, accept satu best strict improvement dan mulai pass berikutnya. Berhenti bila tidak ada candidate yang lebih kecil.

Tidak accept equal/worse route, dan tidak berhenti pada improvement pertama. Toleransi assertion test tidak boleh menjadi izin menerima route lebih panjang. Tidak ada batas iterasi tersembunyi pada main method; resource interruption dilaporkan sebagai failure.

**Dilarang memakai symmetric-only delta shortcut** yang hanya menghitung dua boundary edges dan mengasumsikan biaya reversed internal edges tidak berubah. Adaptasi optimasi lain memerlukan pembuktian directed-cost equivalence dan review contract; baseline yang disetujui tetap full recomputation.

Invariant: **distance(NN + 2-Opt) <= distance(NN)**. n=0/1 tidak punya reversal candidate. Strict decrease pada jumlah permutation terbatas memastikan berhenti. Full recomputation sengaja memprioritaskan correctness; tiap pass mempunyai O(n²) candidates dengan O(n) evaluasi route.

## 5. ACO variant: Classical Ant System

Main comparison menggunakan **Classical Ant System**, tanpa 2-Opt setelah ACO, tanpa elitist/best-only deposit, ACS local update, atau Max-Min clipping tersembunyi.

### Explicit parameters and validation

- alpha, beta: finite >=0;
- rho (evaporation fraction): finite, 0<rho<1;
- Q, tau0: finite >0;
- antCount, maxIterations: positive safe integers;
- seed: eksplisit dalam format yang didukung seeded PRNG version yang dicatat.

Tidak ada nilai numerik final/default ilmiah di specification ini. Runner formal mewajibkan parameter lengkap dari satu global configuration yang dibekukan setelah literature justification/calibration. Numeric unit-test values harus diberi label fixture, bukan rekomendasi penelitian.

### Initialization and transition

Set tau[i][j]=tau0 untuk i!=j; diagonal tidak dipakai. Semua ant mulai dari depot 0. Tiap ant menyimpan visited set sendiri.

```text
eta[i][j] = 1 / D[i][j]
w[i][j] = tau[i][j]^alpha * eta[i][j]^beta
p[i][j] = w[i][j] / sum(h in unvisited) w[i][h]
```

p=0 untuk visited nodes. Enumerasi unvisited dalam ascending node index dan pilih dengan roulette-wheel menggunakan uniform u dalam [0,1). Pilih cumulative probability pertama yang >u; residual floating-point hanya boleh jatuh ke candidate terakhir yang memiliki bobot positif. Denominator/bobot invalid tidak boleh disamarkan menjadi uniform selection. Normalisasi yang stabil secara numerik boleh jika mempertahankan distribusi formula; jika tetap non-finite/zero, fail run.

Setelah semua customer dikunjungi, append depot 0 dan recompute L_k. Semua ant pada satu iterasi membangun tour menggunakan pheromone snapshot yang sama sebelum update.

### Evaporation and deposit

Setelah semua ant selesai pada iterasi t:

```text
deltaTau_k[i][j] = Q / L_k   jika ant k melewati directed edge i→j
                  0         selain itu
tau_next[i][j] = (1-rho) * tau[i][j] + sum(k in all valid ants) deltaTau_k[i][j]
```

Deposit mencakup return edge ke depot. Edge i→j tidak otomatis memberi deposit pada j→i. Semua valid ants berpartisipasi; bukan hanya best ant. Invalid ant adalah correctness/numerical failure yang menggagalkan run, bukan alasan mengurangi jumlah ant diam-diam. Jangan melaporkan run parsial sebagai success.

### Best route, stopping, and reproducibility

Track best observed valid route pada seluruh ant/iterasi; pada equal cost pertahankan yang pertama ditemukan dengan urutan ant/iterasi tetap. Stopping criterion adalah **fixed maxIterations**, bukan elapsed-time atau stagnation stop. Setiap run memulai PRNG dan pheromone dari awal; tidak ada state carry-over dari warm-up/run lain.

Same matrix + parameters + seed + PRNG/algorithm version + compatible runtime → route, cost, dan iteration count yang reproducible; execution time tidak diwajibkan identik. Jangan gunakan Math.random/timestamp seed untuk formal run. Seed list predetermined dicatat runner.

n=0 adalah trivial result [0,0], distance 0 tanpa division/deposit; bila diagnostic ACO disertakan, iterationsCompleted=0 dan bestIteration tidak ada. n=1/2 dengan positive off-diagonal tetap menggunakan fixed iteration contract; return edge dihitung. Formal main datasets selalu n=10/25/50.

## 6. Output and RouteValidator

Common result mengembalikan route indices, totalDistanceM dan algorithm. `diagnostics` opsional dan mengikuti algorithm; field berikut hanya dikembalikan bila diperlukan, bukan shared mandatory fields atau main research metrics baru.

| Algorithm | Optional diagnostic | Arti bila disertakan |
|---|---|---|
| NN_2OPT | nnInitialDistanceM | Full directed distance hasil NN sebelum 2-Opt, dalam meter |
| NN_2OPT | twoOptPasses | Jumlah pass evaluasi candidate yang selesai, termasuk pass terakhir tanpa improvement; 0 bila tidak ada candidate (n=0/1) |
| NN_2OPT | acceptedImprovements | Jumlah penggantian route dengan best strict improvement yang diterima; tidak menghitung pass terakhir tanpa improvement |
| ACO | iterationsCompleted | Jumlah iterasi Ant System yang selesai; maxIterations pada successful nontrivial run, 0 pada n=0 |
| ACO | bestIteration | Nomor iterasi mulai dari 1 saat final best route pertama ditemukan; tidak ada pada n=0 |

`iterationsCompleted` tidak dipakai untuk NN/2-Opt dan tidak disamakan dengan twoOptPasses atau acceptedImprovements. Diagnostic tidak mengubah stopping criterion atau failure policy; run parsial tetap failure. Application menambahkan matrix/input hash, node identity mapping, version, params, seed, run number, timer, status, dan environment metadata.

RouteValidator independen memeriksa:

- panjang n+2, integer indices dalam 0..n;
- depot 0 hanya start/end (trivial [0,0] valid);
- setiap customer tepat sekali, tanpa hilang/duplikat;
- full directed distance dapat direkomputasi dan finite;
- reported distance cocok dengan recomputation; bila floating tolerance digunakan untuk assertion, document precision dan jangan menggunakannya untuk menerima worsening 2-Opt;
- caller input tidak berubah.

Route invalid tidak boleh diperbaiki dengan dedupe/reordering setelah solver lalu dilaporkan sebagai hasil asli.

## 7. Timer boundaries

Runner controlled local environment melakukan matrix load/hash verification, external validation dan penyusunan parameter sebelum timer. Timer monotonic high-resolution membungkus pemanggilan algoritma saja. NN+2-Opt diukur sebagai satu pipeline; ACO mencakup PRNG initialization, pheromone initialization, konstruksi ant, update, dan best tracking. Tidak ada cached solver state antar repetition.

Independent post-run RouteValidator, persistence, aggregation, serialization, OSRM/HTTP/network, DB, geometry generation, dan Leaflet/rendering berada di luar timer. Pemeriksaan internal yang memang dilakukan solver tetap termasuk computation. Ikuti 5 warm-ups dan 30 repetitions pada [protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md).

## 8. Error taxonomy

| Code | Boundary / meaning |
|---|---|
| DISTANCE_MATRIX_INVALID | Shape, diagonal, range, non-finite, null/unreachable invalid |
| ALGORITHM_PARAMETER_ERROR | Parameter/seed tidak sesuai contract |
| ALGORITHM_DISTANCE_DOMAIN_ERROR | Nontrivial ACO input mengandung zero off-diagonal |
| ALGORITHM_NUMERICAL_ERROR | Non-finite route sum, invalid probability/pheromone |
| ALGORITHM_INVALID_ROUTE | RouteValidator gagal atau initial 2-Opt route invalid |
| BENCHMARK_INPUT_MISMATCH | Runner menemukan input/node order/matrix hash berbeda |
| BENCHMARK_RUN_FAILED | Run interrupted/exception; simpan cause dan run identity |

OSRM/network/storage errors adalah infrastructure errors, tidak dibuat seolah hasil algoritma valid. Tidak ada distance/time=0 palsu sebagai pengganti failure.

## 9. Unit-test fixtures

### Directed cheap cycle

Synthetic costs dalam meter, hanya unit-test fixture:

```text
D = [[0, 1, 9, 9],
     [9, 0, 1, 9],
     [9, 9, 0, 1],
     [1, 9, 9, 0]]
```

NN [0,1,2,3,0] memiliki cost 4; reverse [0,3,2,1,0] cost 36. 2-Opt harus mempertahankan cost 4. Reverse segment [1..2] menghasilkan [0,2,1,3,0] cost 28; full recomputation harus memasukkan perubahan internal edge 1→2 menjadi 2→1.

### Trap untuk symmetric-only shortcut

```text
D = [[0, 5, 1, 20],
     [20, 0, 1, 1],
     [20, 20, 0, 5],
     [5, 20, 20, 0]]
```

Valid initial route [0,1,2,3,0] cost 16. Reversal [1..2] memberi [0,2,1,3,0] cost 27 walau boundary-only shortcut mengira improvement 8. Candidate tersebut harus ditolak; fixture ini untuk standalone 2-Opt, tidak mengklaim initial route berasal dari NN fixture ini.

### Additional fixtures

- All off-diagonal=1 untuk lowest-index NN tie: [0,1,2,...,n,0].
- 0/1/2 customer, empty matrix rejected, invalid route, asymmetric/symmetric inputs.
- Best-improvement fixture: enumerasi semua candidates secara independen, pastikan accepted move terbaik, bukan sekadar yang pertama membaik.
- Seeded ACO repeatability, invalid params, zero off-diagonal rejection, finite probabilities/pheromone; directed deposit termasuk return edge dari **semua** ants.

## 10. Property/invariant tests

Generated finite matrices (positive off-diagonal untuk ACO), termasuk asymmetric, harus selalu menghasilkan valid closed tours, preserve input, dan cost recomputation cocok. 2-Opt tidak lebih buruk dari NN. ACO fixed-seed result identik; jangan mewajibkan ACO mengalahkan NN atau mencapai optimum pada setiap fixture. Pada small instance boleh exhaustive enumeration sebagai test oracle tanpa mengubah metode penelitian.


---

# SOURCE: docs/34_OSRM_DISTANCE_CONTRACT.md

# 34 — OSRM DISTANCE CONTRACT

**Status:** Approved target input infrastructure, 2026-10-02. Belum ada OSRM client aktual.
Keputusan: [ADR-012](docs/04_TECH_STACK_ADRS.md#adr-012--osrm-road-network-distance-matrix-for-formal-research-benchmark), [research decisions](docs/32_RESEARCH_DECISIONS.md).

## 1. Purpose

Membentuk satu frozen road-network distance matrix yang dapat dipakai ulang oleh kedua algoritma pada comparison yang sama.

## 2. OSRM role

```text
Depot + Customer Coordinates
→ road-network validation
→ OSRM Table Service
→ validate + hash + freeze directed distance matrix
→ NN → 2-Opt / ACO (Classical Ant System)
```

OSRM Table Service adalah approved core infrastructure untuk formal research input. Persetujuan ini tidak berarti adapter sudah diimplementasikan.

## 3. OSRM is NOT the research algorithm

Penelitian membandingkan NN+2-Opt vs Classical Ant System untuk urutan customer. OSRM tidak menggantikan optimizer dengan shortest-path A→B atau OSRM Trip. Domain hanya menerima matrix, tidak memanggil OSRM.

## 4. Table Service responsibility

Adapter menghasilkan full square table untuk ordered depot+customers dan meminta distance annotation secara eksplisit. Request/response mapping, provider/profile, options, dan versi dicatat. Durations tidak boleh dipakai sebagai distance.

API OSRM v5.24 mendokumentasikan distance table sebagai jarak pada rute tercepat menurut profile, dalam meter; ini tidak otomatis merupakan shortest-distance path secara matematis. Endpoint yang dipilih harus diverifikasi kompatibilitas dan kemampuannya sebelum generation. [Official Table Service reference](https://project-osrm.org/docs/v5.24.0/api/#table-service).

## 5. Route / Geometry Service responsibility

```text
Optimizer route sequence → OSRM Route geometry → Leaflet visualization
```

Route Service menerima urutan hasil optimizer untuk visualisasi jalan. Geometri tidak mengubah urutan atau menggantikan totalDistanceM dari frozen matrix. Geometry failure tidak membatalkan hasil algoritma yang valid; UI menampilkan kegagalan geometry secara terpisah. Geometry boleh menjadi pekerjaan visualisasi tahap berikutnya. [Official Route Service reference](https://project-osrm.org/docs/v5.24.0/api/#route-service).

## 6. Coordinate validation / routability

- Latitude/longitude finite dan dalam range [-90,90]/[-180,180]. Jangan perlakukan raw lat/lng sebagai Cartesian kilometer.
- Validasi identitas customer dan tepat satu depot; duplicate identity ditolak.
- Periksa road snapping/routability sebelum freeze matrix; coordinate range valid saja tidak menjamin jalur antar semua node.
- Simpan original coordinates dan bukti returned/snapped coordinates bila tersedia. Toleransi snapping, study area, sampling/replacement rule harus ditetapkan dan dicatat sebelum data formal dibuat; jangan menebak threshold ilmiah pada implementasi.
- ACO eta=1/d memerlukan positive off-diagonal. Zero-cost pair harus dilaporkan pada common preflight sesuai [algorithm contract](docs/33_ALGORITHM_SPECIFICATION.md); tidak boleh diubah menjadi epsilon/fallback diam-diam.

OSRM request memakai urutan longitude,latitude; adapter wajib mencegah tertukarnya lat/lng. [Official request format](https://project-osrm.org/docs/v5.24.0/api/#general-options).

## 7. Node ordering

Depot index=0. Customer memiliki stable indices 1..n dari urutan snapshot yang disimpan sebagai node_order_json. Urutan ini dibekukan sekali, dipakai untuk request rows/columns, optimizer, route reconstruction, dan hash. Jangan re-sort menggunakan live orders setelah freeze. N pada matrix adalah customer count+1.

## 8. Distance unit = meter

Canonical storage dan optimizer unit adalah **meter**. Validasi matrix NxN, diagonal 0, finite nonnegative values. Jangan round untuk display sebelum hashing/optimasi. Unit kilometer hanya konversi presentasi.

## 9. Directed / asymmetric semantics

D[i][j] adalah cost dari node i ke j. One-way roads, restrictions, dan network structure dapat membuat D[i][j] != D[j][i]. Jangan symmetrize dengan average/min/max, mirror triangular table, atau mengharuskan equality. Directed pheromone dan asymmetric-safe 2-Opt wajib mengikuti semantics yang sama.

## 10. Unreachable pair handling

Null/missing/unreachable pair, incomplete response, non-finite/negative value, wrong shape, atau nonzero diagonal membuat matrix gagal validasi dan tidak eligible untuk formal benchmark. Dilarang mengganti dengan nol, garis lurus, duration, atau fallback speed estimate. Tidak boleh menghapus customer dari snapshot diam-diam. Perbaikan coordinates menghasilkan snapshot baru; log rejection dan alasannya. Jangan lanjut satu algoritma dengan matrix lain karena provider gagal.

## 11. Input hash and matrix hash

- input_hash (coordinate/input hash): SHA-256 canonical serialization dari ordered depot/customer identities + original coordinate snapshots + configuration input yang relevan.
- matrix_hash: SHA-256 canonical serialization yang mengikat input_hash, node order, provider/profile/options, unit=meter, directed semantics, matrix values, dan serialization/contract version.
- Tetapkan satu serializer berversi dengan key order dan representasi angka deterministik; larang NaN/Infinity, normalisasi -0 menjadi 0, pertahankan array order. generated_at adalah provenance, tidak mengubah content identity.
- Hash dihitung dari actual content; jangan mengarang hash atau memakai ID DB sebagai pengganti. Perubahan value/order/unit/config harus mengubah hash yang bersangkutan.

Exact serializer implementation dan test vectors dibuat dalam task infrastructure, bukan source code pada task documentation ini.

## 12. Freeze / immutability

Editable Scenario → immutable Benchmark Case/points → validated, frozen distance_matrices snapshot. Minimal metadata: id, benchmark_case_id, provider, profile, node_order_json, distance_matrix_json, input_hash, matrix_hash, generated_at. Detail konseptual di [database design](docs/08_DATABASE_DESIGN.md).

Simpan juga unit/contract version dan provider/network provenance jika tersedia. Frozen matrix tidak diedit/rebuilt in place. Regeneration membentuk snapshot baru, mempertahankan history lama. Simpan snapshot sekali dan referensikan dari experiments, bukan meminta OSRM ulang untuk setiap run.

## 13. Same-matrix fairness rule

Kedua algoritma harus memakai exact matrix values, input hash, node order, dan matrix hash yang sama. Runner memverifikasi hash setelah load dan mencatat reference/hash pada setiap experiment/export. Hash mismatch menghentikan comparison. ACO dan NN tidak boleh melakukan provider request masing-masing.

## 14. Timing exclusion

OSRM request, road validation, matrix generation/load/hash, DB, HTTP/network, serialization, route geometry, serta Leaflet/rendering berada di luar formal algorithm timer. Frozen matrix dan params sudah siap di memory sebelum measured solver call. Timer formal berjalan pada environment terkontrol, tidak bergantung pada Vercel.

## 15. Reproducibility concerns

Catat generation time, endpoint identity tanpa credential, profile/options, provider/software version, dataset/OSM extract date/hash dan returned data version bila tersedia, node order, original/snapped points, input/matrix hashes, serta generation code SHA. Metadata yang tidak tersedia ditandai unavailable, tidak diisi tebakan.

Network/profile/provider dapat berubah; coordinates yang sama belum tentu menghasilkan matrix yang sama saat diminta ulang. Reproduksi **algorithm results** memakai matrix tersimpan. Reproduksi **matrix generation** membutuhkan provider/network provenance lebih lengkap dan merupakan batas reproducibility terpisah.

## 16. Public vs self-hosted / local consideration

Keputusan endpoint final masih OPEN. Evaluasi dukungan distance annotation, limits N+1 nodes, reproducibility/version pinning, availability, kebijakan penggunaan dan budget. Public service jangan diasumsikan unlimited atau stabil. Local/self-hosted memberi kontrol extract/profile tetapi membutuhkan setup/storage/compute. Pilihan dan keterbatasan wajib dicatat sebelum formal generation; tidak ada deployment OSRM pada task ini.

## 17. Failure handling

Adapter membedakan coordinate/routability error, timeout/network error, provider error, unsupported distance response, invalid matrix, hash mismatch, dan storage/freeze failure. Retry terbatas hanya untuk transient infrastructure errors sebelum freeze dan dicatat. Jangan fallback ke metric lain atau overwrite snapshot sukses. Failed generation disimpan sebagai failure record, bukan successful benchmark case. Geometry error ditangani terpisah dari matrix/algorithm errors.


---

# SOURCE: templates/ADR_TEMPLATE.md

# ADR-XXX — Decision Title

**Status:** Proposed / Accepted / Superseded / Rejected  
**Date:** YYYY-MM-DD

## Context

Masalah/constraint apa yang mendorong keputusan?

## Options considered

### Option A

Pros:

- 

Cons:

- 

### Option B

Pros:

- 

Cons:

- 

## Decision

Apa yang dipilih?

## Rationale

Mengapa?

## Consequences

Positive:

- 

Negative:

- 

## Migration / rollback impact

## Review date


---

# SOURCE: templates/BUG_REPORT_TEMPLATE.md

# Bug Report

## Summary

## Environment

- [ ] Local
- [ ] Preview branch:
- [ ] Testing
- [ ] Production

## Version

- Commit SHA:
- Deployment URL:

## Steps to reproduce

1.
2.
3.

## Expected

## Actual

## Evidence

- screenshot/log/error:

## Frequency

- always / intermittent

## Severity

- BLOCKER / HIGH / MEDIUM / LOW

## Suspected area

- UI / API / DB / algorithm / environment / deployment

## Regression?

- Last known good commit:

## Safety note

Apakah bug menyentuh production data/secret?


---

# SOURCE: templates/FEATURE_TASK_TEMPLATE.md

# Feature Task

## Title

`feature/...`

## Problem

Apa masalah yang ingin diselesaikan?

## Goal

Apa outcome spesifik?

## In Scope

- 

## Out of Scope

- 

## Acceptance Criteria

- [ ] 
- [ ] 

## Technical Notes

Relevant docs:

- `AGENTS.md`
- `docs/...`

## Security considerations

- 

## Data/schema impact

- none / describe

## Test plan

- unit:
- integration:
- manual:

## Done evidence

- CI:
- Preview:
- screenshot:


---

# SOURCE: templates/PULL_REQUEST_TEMPLATE.md

# Pull Request

## Summary

<!-- Apa yang berubah dan mengapa? -->

## Related task/issue

- Task:
- Requirement/FR:

## Scope

### In scope

- 

### Out of scope

- 

## Changed areas

- [ ] UI
- [ ] API/server
- [ ] Database/schema
- [ ] Algorithm
- [ ] Tests
- [ ] Docs
- [ ] CI/config

## Database migration

- [ ] No migration
- [ ] Migration added and reviewed
- [ ] Applied to Dev
- [ ] Applied to Testing
- [ ] Production migration plan documented

## Evidence

```text
npm run lint      : PASS/FAIL
npm run typecheck : PASS/FAIL
npm run test      : PASS/FAIL
npm run build     : PASS/FAIL
```

## Manual test

- [ ] Preview URL tested
- [ ] Empty/error state tested
- [ ] Browser console checked

## Algorithm checklist (if applicable)

- [ ] Starts at depot
- [ ] Ends at depot
- [ ] Every customer exactly once
- [ ] Distance independently recomputed
- [ ] Seed reproducibility tested

## Security

- [ ] No secret
- [ ] No production DB in Preview
- [ ] Server validation
- [ ] Authorization checked where relevant

## Screenshots / evidence

<!-- attach -->

## Risks / limitations

- 

## Rollback

-


---

# SOURCE: templates/VERIFICATION_REPORT_TEMPLATE.md

# Verification Report — <Task>

## Verdict

PASS / PASS WITH FINDINGS / FAIL

## Scope verified

## Acceptance Criteria matrix

| AC | Evidence | Status |
|---|---|---|
| | | |

## Automated checks

| Command | Result |
|---|---|
| npm run lint | |
| npm run typecheck | |
| npm run test | |
| npm run build | |

## Findings

### BLOCKER

- none

### HIGH

- none

### MEDIUM

- none

### LOW

- none

## Security / environment review

## Database review

## Algorithm invariants review

## Manual checks still required

## Corrective actions


---

# SOURCE: templates/WORKLOG_TEMPLATE.md

# Worklog — <Task>

## Context

## Audit before change

- files inspected:
- tests inspected:
- schema inspected:

## Plan

1.
2.
3.

## Implementation

## Changed files

| File | Reason |
|---|---|
| | |

## Commands run

```text
command -> result
```

## Manual verification

## Decisions

## Risks / limitations

## Next actions
