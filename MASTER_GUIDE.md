# MASTER GUIDE — Courier Route Planner

Generated documentation bundle. Each section preserves its source filename.


---

# SOURCE: README.md

# Courier Route Planner — Engineering & Research Documentation Pack

**Status:** Baseline v1.2  
**Tanggal baseline:** 2026-09-26  
**Tujuan:** menjadi source-of-truth teknis, proses kerja tim, panduan onboarding, panduan penggunaan AI coding agent, dan protokol verifikasi untuk project **Sistem Optimasi Rute Pengiriman Paket Berbasis Web**.

> Dokumen ini dirancang dengan standar engineering yang ketat, tetapi tetap disesuaikan dengan konteks project mahasiswa S1, tim kecil, dan target biaya **Rp0**. Istilah “production” di dokumen ini berarti environment live/demo yang stabil; bukan klaim SLA enterprise/commercial production.

## Keputusan utama yang sudah dikunci

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
  - **Ant Colony Optimization (ACO)**.
- Fokus pengujian: total distance, execution time, scalability, consistency/stability.
- OSRM: supporting/future layer, **bukan core MVP**.

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
7. OSRM bukan algoritma penelitian utama.
8. Jangan mengganti problem menjadi Dijkstra/A* source-to-destination.
9. Formal research benchmark **tidak boleh bergantung pada runtime Vercel**; benchmark resmi dijalankan pada environment terkontrol dan dicatat.
10. Jangan memperlakukan latitude/longitude mentah sebagai Cartesian kilometer tanpa metode yang disetujui penelitian.

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

## 9. Database rules

- Semua mutation server-side divalidasi dengan Zod.
- Gunakan ORM/query parameterization; jangan concat SQL dari input user.
- Migration harus forward-safe.
- Eksperimen harus memakai immutable snapshot input (`benchmark_cases`/points).
- Edit order setelah benchmark tidak boleh mengubah sejarah eksperimen lama.
- Production migration harus punya rollback/mitigation plan.

## 10. Required checks after implementation

Minimal jalankan:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Jika script belum tersedia, agent boleh menambahkan script yang wajar dan menjelaskan perubahan.

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
testing → feature/... → PR ke testing → QA → PR testing ke main
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

## Merge strategy

Untuk tim kecil, gunakan **Squash and Merge** agar history `testing`/`main` bersih, kecuali ada alasan teknis menyimpan commit terpisah.

## Hotfix

```text
main → hotfix/... → PR main → deploy → sinkronkan kembali ke testing
```

Jangan memperbaiki production hanya di `main` lalu lupa membawa perubahan ke `testing`.


## Protected branch safety

- Jangan commit/push langsung ke `main` atau `testing`.
- Aktifkan repository hooks dengan `git config core.hooksPath .githooks` setelah hooks tersedia.
- Semua perubahan masuk melalui PR sesuai `docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md`.


---

# SOURCE: THIRD_PARTY_NOTICES.md

# THIRD-PARTY NOTICES

Dokumen ini mencatat third-party source/template yang menjadi baseline atau dependency penting project.

## TailAdmin Next.js Free

- Purpose: planned baseline UI/admin template.
- Upstream: https://github.com/TailAdmin/free-nextjs-admin-dashboard
- Website: https://tailadmin.com/nextjs
- License reported by upstream free repository: MIT.
- Adoption status: **PLANNED — source code belum di-import ke repository project pada saat documentation baseline ini dibuat.**
- Adoption date: TBD.
- Adopted commit SHA: TBD — wajib diisi saat import.

Rules:

- hanya Free/Open-source repository;
- jangan mengambil Pro/paid assets;
- preserve required copyright/license notices;
- template adalah UI baseline, bukan source-of-truth domain architecture.

## ApexCharts

TailAdmin upstream snapshot dapat membawa `apexcharts` / `react-apexcharts`.

Project decision:

- **NOT APPROVED sebagai core dependency**;
- hapus pada template cleanup jika tidak dibutuhkan;
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
→ distance engine
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

## Hal yang belum boleh dianggap final

Walaupun engineering stack sudah dikunci, keputusan penelitian berikut tetap harus didukung literatur/dosen:

- rumus/transformasi koordinat untuk formal Euclidean distance;
- parameter ACO final;
- jumlah run ACO final;
- jumlah scenario final;
- research question/judul final;
- apakah OSRM masuk MVP atau future work.

Engineering harus memungkinkan perubahan parameter tersebut tanpa rewrite besar.


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
- distance matrix;
- Nearest Neighbor;
- 2-Opt improvement;
- ACO;
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
→ generate distance matrix
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

Pattern awal:

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

- matrix dibentuk dari frozen benchmark case;
- matrix bersifat simetris jika metric yang dipakai simetris;
- diagonal 0;
- tidak menerima NaN/Infinity;
- implementation metric harus versioned.

### FR-007 NN + 2-Opt

- NN menghasilkan initial closed tour;
- 2-Opt hanya menerima route valid;
- 2-Opt tidak boleh menghilangkan customer;
- hasil final memiliki distance <= initial distance, kecuali ada contract khusus yang dijelaskan.

### FR-008 ACO

Parameter harus configurable, minimal konsep:

- ant count;
- iterations;
- alpha;
- beta;
- evaporation;
- seed.

Nilai default final **belum dikunci** sampai didukung metodologi.

### FR-009 Benchmark comparison

Satu benchmark case harus digunakan oleh kedua algoritma.

Sistem menyimpan:

- input hash;
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
- best distance;
- mean distance untuk stochastic method;
- median (direkomendasikan);
- standard deviation;
- runtime;
- route sequence;
- improvement terhadap baseline bila dihitung.

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

Input/output harus plain typed structures.

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
Distance Provider
      ↓
Distance Matrix
      ├───────────────┐
      ↓               ↓
  NN → 2-Opt         ACO x N runs
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
      └─ metric/version
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

## 7. Routing engine future adapter

Gunakan abstraction:

```text
DistanceProvider
├─ ResearchEuclideanProvider
└─ RoadNetworkProvider (future OSRM)
```

dan terpisah:

```text
RouteGeometryProvider
└─ OSRM geometry (future)
```

Urutan customer dan geometri jalan adalah dua concern berbeda.

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

Jangan memakai Vercel runtime timing sebagai satu-satunya formal research benchmark.

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

OSRM hanya future/supporting untuk road geometry atau road-network distance experiment bila penelitian membutuhkannya.


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
- jangan simpan distance matrix berkali-kali jika bisa direcompute dari immutable snapshot kecuali penelitian butuh;
- batasi export/run abuse dengan auth dan server validation.


---

# SOURCE: docs/08_DATABASE_DESIGN.md

# 08 — DATABASE DESIGN

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

`input_hash` dibuat dari canonical serialized depot+customer snapshots + relevant metric configuration.

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

## 8. `experiments`

Satu konfigurasi algoritma terhadap satu benchmark case.

```text
id BIGINT PK
benchmark_case_id BIGINT FK
algorithm VARCHAR
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

## 9. `experiment_runs`

```text
id BIGINT PK
experiment_id BIGINT FK
run_number INT
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

Unique:

```text
UNIQUE(experiment_id, run_number)
```

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

## 13. Cascade behavior

Jangan asal `ON DELETE CASCADE` pada history eksperimen.

Rekomendasi:

- deleting scenario yang sudah memiliki benchmark history → soft delete/archive atau block;
- benchmark cases → preserve;
- experiment results → preserve.

## 14. Data retention

Dev/testing boleh reset. Production research history jangan dihapus tanpa backup/export dan approval.


---

# SOURCE: docs/09_REPO_STRUCTURE.md

# 09 — REPOSITORY STRUCTURE

Target struktur:

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
│   │   ├── env/
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
│   ├── matrix.ts
│   └── research-euclidean.ts
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
UI/API → application/domain → db adapter
```

Algorithm domain tidak boleh import dari:

```text
next/*
react
leaflet
@tidbcloud/*
```

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

| Environment | Code | DB | Tujuan |
|---|---|---|---|
| Local | developer branch | TiDB Dev | coding |
| Preview | feature/fix/testing | TiDB Testing | review/integration |
| Production | main | TiDB Production | demo/live |

## 2. Required environment variables

Initial:

```text
DATABASE_URL=
APP_ENV=development|testing|production
```

Future auth:

```text
AUTH_SECRET=
GITHUB_ID=
GITHUB_SECRET=
```

Optional:

```text
NEXT_PUBLIC_APP_NAME=Courier Route Planner
```

## 3. Rules

- `.env.local` never commit.
- `.env.example` commit, **tanpa nilai secret**.
- `DATABASE_URL` tidak pernah prefix `NEXT_PUBLIC_`.
- production credential hanya Production scope.
- Preview menggunakan testing DB credential.
- dev laptop menggunakan dev DB credential.

## 4. `.env.example`

```dotenv
DATABASE_URL=mysql://USER:PASSWORD@HOST/DATABASE
APP_ENV=development
NEXT_PUBLIC_APP_NAME=Courier Route Planner
```

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

Server startup/health diagnostics harus mengetahui `APP_ENV`.

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
→ push
→ Vercel Preview
→ PR ke testing
→ CI
→ review
→ merge
→ testing branch preview smoke test
```

## 5. Release flow

```text
testing
→ freeze release candidate
→ full QA/UAT
→ PR testing → main
→ CI
→ approval
→ merge
→ Vercel Production
→ smoke test
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

## 10. Pull request rule

Tidak merge bila:

- CI merah;
- migration tidak direview;
- preview tidak bisa dibuka;
- AC belum lulus;
- ada secret;
- algorithm tests gagal;
- reviewer belum paham perubahan.


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


---

# SOURCE: docs/15_RESEARCH_BENCHMARK_PROTOCOL.md

# 15 — RESEARCH BENCHMARK PROTOCOL

Dokumen ini menjaga penelitian agar tidak berubah menjadi sekadar demo software.

## 1. Research comparison

Methods:

- Hybrid Nearest Neighbor + 2-Opt.
- Ant Colony Optimization.

Primary metrics:

- total distance;
- execution time;
- scalability terhadap number of customers;
- consistency/stability ACO.

## 2. Fair comparison rule

Untuk setiap case:

```text
Frozen input
→ ONE distance matrix
→ NN+2Opt
→ ACO
```

Tidak boleh masing-masing algoritma membangun input berbeda.

## 3. Candidate scenarios

Initial engineering support:

```text
10
25
50
100 customers
```

Pattern:

```text
random
clustered
circular
directional
```

Jumlah final harus dikonfirmasi berdasarkan literatur/dosen.

## 4. Dataset generation

Setiap generated scenario memiliki seed.

Reproducibility:

```text
same generator version
+ same seed
+ same depot
+ same config
= same points
```

## 5. Freeze before benchmark

Sebelum run:

- snapshot depot;
- snapshot customers;
- canonical order point IDs;
- compute input hash;
- record distance metric/version;
- record git SHA.

## 6. Coordinate/distance methodology

**Belum boleh difinalkan hanya dari engineering assumption.**

Research source menyatakan latitude/longitude tidak boleh asal diperlakukan sebagai Cartesian kilometer.

Sebelum formal benchmark:

- pilih transformasi/projection/distance formulation berdasarkan literature;
- dokumentasikan unit;
- version implementation;
- lock setelah review dosen.

## 7. Timing methodology

Formal execution time diukur dengan high-resolution monotonic timer pada machine yang sama.

Record:

- OS;
- CPU;
- RAM;
- Node version;
- commit SHA;
- power/performance mode bila relevan;
- process condition sederhana.

Jangan gunakan network/database time di dalam algorithm timing.

Recommended timing boundary:

```text
start timer
→ algorithm(matrix, params)
→ stop timer
```

DB load/save di luar timer.

## 8. Warm-up

Untuk benchmark runtimes JS, pertimbangkan warm-up runs agar JIT/cold initialization tidak mendominasi. Method final harus konsisten dan ditulis di laporan.

## 9. ACO repetitions

ACO stochastic harus multi-run. Initial engineering recommendation adalah **30 independent runs per case/configuration**, tetapi angka final harus dikonfirmasi metodologi/literatur/dosen.

Record minimal:

- best;
- mean;
- median;
- standard deviation;
- min/max;
- execution time distribution.

## 10. NN+2Opt repetitions

Jika deterministic, satu result route cukup untuk quality, tetapi runtime sebaiknya diulang beberapa kali untuk timing analysis jika execution-time comparison menjadi klaim utama.

## 11. Random seed policy

- seeds disimpan;
- seed list sama antar rerun;
- jangan memilih hanya seed yang menghasilkan ACO terbaik;
- jangan discard failed/poor run tanpa rule pre-defined.

## 12. Parameter tuning

Jangan tune ACO pada test case lalu melaporkan case yang sama seolah unbiased evaluation.

Pisahkan bila memungkinkan:

```text
tuning cases
vs
evaluation cases
```

Untuk scope S1 kecil, minimal dokumentasikan parameter source dan jangan melakukan cherry-picking.

## 13. Validity checks

Setiap run harus:

- valid closed tour;
- all customers exactly once;
- distance recomputed independently;
- no NaN;
- status success.

Invalid run jangan diganti diam-diam; catat sebagai error dan investigasi.

## 14. Output format

CSV export columns minimal:

```text
benchmark_case_id
pattern
customer_count
algorithm
algorithm_version
run_number
seed
total_distance_m
execution_time_ms
parameters_json
input_hash
git_commit_sha
```

## 15. Scientific wording

Hindari:

- “ACO paling optimal”.

Gunakan:

- “ACO menghasilkan rata-rata jarak lebih rendah pada skenario ...”;
- “NN+2Opt memiliki execution time lebih rendah pada ...”;
- “hasil berbeda menurut pola distribusi ...”.


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

`/api/health` minimal mengembalikan app status tanpa membocorkan secret.

Boleh memisahkan:

- liveness: app process berjalan;
- readiness: DB connectivity bila perlu.

Production health response jangan expose raw DB host/credential.

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

## PHASE E — Install project foundation dependencies

Setelah template baseline build berhasil dan cleanup plan jelas, install hanya dependency project yang belum tersedia:

```bash
npm install drizzle-orm @tidbcloud/serverless zod leaflet react-leaflet
npm install -D drizzle-kit vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @playwright/test
```

Jangan install auth package sampai phase auth dimulai.

Jika chart penelitian diperlukan nanti, jangan otomatis mempertahankan ApexCharts hanya karena datang dari template. Gunakan keputusan dependency yang sudah diaudit/di-ADR-kan.

## PHASE F — Create TiDB instances

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

## PHASE G — Local env

Buat `.env.local`:

```dotenv
DATABASE_URL="mysql://...DEV..."
APP_ENV="development"
NEXT_PUBLIC_APP_NAME="Courier Route Planner"
```

Pastikan `.gitignore` mencakup `.env*` kecuali `.env.example` sesuai kebijakan project.

Buat `.env.example` tanpa secret.

## PHASE H — Drizzle connection

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

Buat endpoint sederhana:

```text
GET /api/health
```

Tahap 1: app-only health.  
Tahap 2: optional DB read check yang aman.

## PHASE J — First Git commit

Sebelum commit:

```bash
npm run lint
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
- [ ] seeds saved;
- [ ] algorithm parameters saved;
- [ ] machine info saved;
- [ ] commit SHA saved;
- [ ] invalid routes rejected;
- [ ] raw results exported;
- [ ] summary reproducible from raw results.


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

- [ ] TailAdmin Free provenance + adopted SHA tercatat;
- [ ] no TailAdmin Pro/paid asset;
- [ ] template baseline build pass sebelum cleanup;
- [ ] route-planner menu/branding baseline;
- [ ] ApexCharts tidak menjadi approved core dependency / cleanup status terdokumentasi;
- [ ] Next.js local works;
- [ ] build pass;
- [ ] health endpoint;
- [ ] TiDB Dev connection;
- [ ] Vercel main deployment;
- [ ] Vercel feature preview;
- [ ] Preview DB != Production DB;
- [ ] CI basic green;
- [ ] `.env.local` ignored;
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
- [ ] all patterns covered by tests;
- [ ] no OSRM dependency.

## Gate 4 — Research input foundation

- [ ] scenario freeze;
- [ ] immutable benchmark snapshots;
- [ ] input hash stable;
- [ ] distance method approved or marked non-formal;
- [ ] matrix validation tests.

## Gate 5 — NN + 2-Opt

- [ ] known fixture pass;
- [ ] route valid;
- [ ] 2-Opt not worse;
- [ ] no duplicate/missing point;
- [ ] framework-independent.

## Gate 6 — ACO

- [ ] seeded reproducibility;
- [ ] route valid;
- [ ] parameter validation;
- [ ] no NaN;
- [ ] multi-run support;
- [ ] no hidden default claimed scientific.

## Gate 7 — Benchmark engine

- [ ] same matrix;
- [ ] timing boundary correct;
- [ ] raw runs stored;
- [ ] summary reproducible;
- [ ] CLI runner;
- [ ] metadata/commit SHA captured.

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
- pheromone minimum;
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

**Distance Matrix** — matrix jarak antar semua titik yang menjadi input optimizer.

**Closed Tour** — route yang mulai dan berakhir di depot.

**Nearest Neighbor (NN)** — constructive greedy heuristic memilih titik terdekat berikutnya.

**2-Opt** — local search yang menukar dua edge untuk memperbaiki tour.

**ACO** — Ant Colony Optimization, metaheuristic stochastic berbasis pheromone/heuristic information.

**Seed** — nilai awal RNG agar data/run stochastic dapat direproduksi.

**Benchmark Case** — snapshot input immutable untuk eksperimen.

**Input Hash** — fingerprint dataset/config untuk memastikan input sama.

**CI** — Continuous Integration; automated quality checks.

**CD** — Continuous Delivery/Deployment.

**ADR** — Architecture Decision Record.

**DoD** — Definition of Done.

**UAT** — User Acceptance Testing.

**OSRM** — Open Source Routing Machine, future supporting road routing layer.


---

# SOURCE: docs/27_SOURCE_REFERENCES.md

# 27 — SOURCE REFERENCES & VERIFICATION BASELINE

**Last web verification:** 2026-09-26.

Dokumen project harus diperbarui bila platform mengubah plan/feature/runtime.

## Internal project sources

- `HANDOFF_RISET_WEB_KURIR_ROUTE_PLANNER(1).md`
- `PROMPT_PENCARIAN_20_JURNAL_ROUTE_PLANNER_4_TAHUN_BAHASA_INDONESIA(1).md`
- `Proyek Informatika.pdf` (RPS)
- materi metodologi/literature review project USM yang tersedia di workspace.

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
→ Distance matrix
→ NN
→ 2-Opt
→ ACO
→ Benchmark runner
```

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

### ACO reproducibility

Run dua kali dengan same seed + same matrix + same params.

Expected untuk test deterministic RNG path:

```text
same result
```

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
- distribution pattern comparison.

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
feature/* / fix/* / chore/* / hotfix/*
        ↓ Pull Request
      testing
        ↓ QA + Pull Request
       main
```

Tidak ada direct code change ke `main` atau `testing`.

---

## 2. Protection layers

Kita memakai minimum lima lapisan.

### Layer A — GitHub server-side branch protection (authoritative)

Target branch:

```text
main
testing
```

Required settings:

- Require a pull request before merging: **ON**
- Required approvals: **1** (jika tersedia pada plan)
- Require status checks before merging: **ON**
- Require conversation resolution: **ON**
- Block force pushes / do not allow force pushes: **ON**
- Block deletion / do not allow deletions: **ON**
- Do not allow bypassing / bypass list: **none**, sejauh plan mengizinkan

Recommended required checks:

```text
lint
typecheck
test
build
```

Dengan protection aktif, jika seseorang melakukan:

```bash
git push origin main
```

GitHub harus menolak perubahan yang tidak melewati PR sesuai rule.

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
