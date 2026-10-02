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

The upstream template contained demo functionality and dependencies that are scheduled for cleanup, including ecommerce demo components and ApexCharts-related dependencies.

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
