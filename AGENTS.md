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
