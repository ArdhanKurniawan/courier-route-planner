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
