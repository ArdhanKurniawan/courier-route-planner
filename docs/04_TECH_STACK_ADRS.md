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

Keputusan manusia Phase 0D-3A mempertahankan tiga independent TiDB resources, tanpa shared Dev/Testing/Production fallback. Quota/spending akun wajib diverifikasi manusia sebelum provisioning. Perubahan isolation membutuhkan keputusan manusia dan ADR baru.

---

## ADR-009 — Auth sebelum public mutation

Auth bukan bagian penelitian, tetapi Web Admin yang exposed ke internet tidak boleh membiarkan mutation anonim.

Rencana P1: Auth.js + provider yang disepakati tim; alternatif paling sederhana adalah GitHub OAuth dengan allowlist anggota.

Boleh defer saat local-only foundation. Wajib sebelum custom production domain dibuka untuk mutation publik.

---

## ADR-010 — OSRM bukan MVP core

**Status:** Superseded oleh [ADR-012](#adr-012--osrm-road-network-distance-matrix-for-formal-research-benchmark), 2026-10-02.

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

OSRM distance bukan otomatis mathematical shortest-distance path. Provider/profile/version harus dicatat beserta keterbatasan endpoint. Lihat [OSRM contract](34_OSRM_DISTANCE_CONTRACT.md).

### Why ADR-010 was superseded

Framing OSRM sebagai future untuk seluruh fungsi tidak lagi sesuai approved formal research input. Pemisahan input infrastructure, optimization algorithm, dan geometry membuat peran baru ini jelas tanpa mengganti core TSP-like problem.

### Implementation follow-up

Matrix foundation berada sebelum algorithm integration pada Phase 3. Conceptual storage ada di [database design](08_DATABASE_DESIGN.md); protocol di [docs/15](15_RESEARCH_BENCHMARK_PROTOCOL.md); specification di [docs/33](33_ALGORITHM_SPECIFICATION.md). Tidak ada actual DB migration dalam sinkronisasi dokumentasi ini.

---

## ADR-013 — mysql2 as Drizzle Kit Migration CLI Dev-Only Adapter

Status: Accepted, keputusan manusia Phase 0C Stage 1, 2026-10-04.

Context: stable Drizzle Kit `0.31.11` memakai driver MySQL CLI untuk migration; aplikasi tetap `Next.js → Drizzle ORM → @tidbcloud/serverless → TiDB Cloud`. Source/package terpasang dan baseline audit memverifikasi bahwa adapter runtime HTTP bukan selector CLI Kit yang didukung.

Decision: `mysql2 3.24.5` diizinkan sebagai **dev dependency saja** untuk Drizzle Kit. Runtime dependencies yang disetujui: `drizzle-orm 0.45.3`, `@tidbcloud/serverless 0.3.0`, `zod 4.6.5`; dev tooling: `drizzle-kit 0.31.11`, `mysql2 3.24.5`.

Rules:

- Tidak ada application/Client Component import mysql2, runtime dependency langsung, atau TCP pool pada Next.js.
- Dedicated Dev migration credential memakai ignored `.env.migrations.local`; Testing tooling 0D-3A memakai ignored `.env.migrations.testing.local` dan explicit Testing guard/config. Kedua migrator berbeda peran dari credential aplikasi; TLS certificate verification aktif. Testing secret/resource/apply belum dibuat/dijalankan.
- Generate/check offline; apply Dev atau Testing hanya sesudah review target/history/SQL dan explicit human approval. Testing apply memerlukan checkpoint 0D-3B dengan approval **YES APPLY TESTING MIGRATION**. `db:push` dilarang.
- Tidak ada migration otomatis pada install/ci/build/start/dev/routes/Actions/Vercel, atau production migration automation.
- Kit lama membawa dua transitive loader deprecated dan empat temuan moderate tambahan pada full audit; runtime audit 0. Ini dicatat sebagai limitation tooling, tanpa audit fix/override.

Alternative: custom HTTP migrator ditolak untuk foundation karena menambah runner dan beban pengujian khusus.

Resource sequence yang disetujui: **Dev-first**; Dev telah diprovision manusia dan koneksi HTTP/TCP-TLS diverifikasi read-only, Testing sebelum integration/Preview Phase 0D, Production sebelum controlled rollout. Target ADR-008 tetap tiga independent Starter resources, tanpa shared fallback. Stage 1 hanya `depots`. Initial migration sudah diterapkan sekali oleh manusia pada Dev; ledger dan schema live cocok dengan artifact lokal. [Live evidence](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md). Phase 0C CLOSED/PR #9, final independent verification PASS; Gate 1 OPEN.
