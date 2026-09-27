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
