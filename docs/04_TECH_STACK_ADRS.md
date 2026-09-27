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
