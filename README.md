# Courier Route Planner — Engineering & Research Documentation Pack

**Status:** Research contract sync v1, Route Planner application shell; Phase 0A Quality Foundation implemented locally
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

Audit branch `feature/foundation-quality-gates`, 2026-10-03; shell UI berasal dari cleanup terverifikasi 2026-10-02:

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
| Phase 0A lokal | Scripts lint/typecheck/test/test:watch/test:coverage/build; typecheck menjalankan `next typegen && tsc --noEmit` untuk generated route types |
| Phase 0A lokal | Vitest, V8 coverage, React Testing Library, jest-dom dan jsdom sebagai dev dependencies; navigation/dashboard regression tests: 2 files, 11 tests PASS |
| Security audit | Next.js dan eslint-config-next dipatch ke `16.3.6`; audit 2026-10-03: runtime-only 0 findings, full 15 dev-only findings (1 low, 2 moderate, 12 high), tercatat di laporan Phase 0A |
| Foundation gap | Phase 0B env validation + health; Phase 0C TiDB/Drizzle/Zod; Phase 0D GitHub Actions + Vercel/Preview/env isolation; Playwright/E2E masih pending |

Validasi Phase 0A pada Node `24.19.0`, npm `11.6.0`: `npm ci`, lint, typecheck dari generated state bersih, test, test:coverage dan build PASS. Coverage mencakup seluruh source TypeScript/TSX sebagai baseline informasi, tanpa threshold. Vite mengeluarkan warning tentang config loader pada future major; tests saat ini PASS. Evidence dan audit delta: [Phase 0A Quality Foundation Report](docs/proses/PHASE_0A_QUALITY_FOUNDATION_REPORT.md).

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

Deployment/env/remote branch protections belum diverifikasi. Phase 0 Foundation dan seluruh gate adopsi template belum selesai; Phase 0B/0C/0D, Vercel Preview, independent Phase 0A review dan reproduksi anggota kedua masih diperlukan. Kontrak penelitian tetap sama.

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
