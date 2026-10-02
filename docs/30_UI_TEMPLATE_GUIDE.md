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

`Benchmark Batches` pada contoh menu adalah optional/future design consideration, bukan kewajiban membuat tabel `benchmark_batches`. Main experiment dan comparison mengikuti [docs/32](32_RESEARCH_DECISIONS.md) dan [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md); jangan menurunkan schema penelitian dari contoh menu.

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
