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
