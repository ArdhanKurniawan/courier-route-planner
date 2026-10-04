# Courier Route Planner — Engineering & Research Documentation Pack

**Status:** Route Planner application shell; Phase 0A CLOSED/PR #7; Phase 0B CLOSED/PR #8; Phase 0C CLOSED/PR #9, final independent verification PASS; Phase 0D CI/enforcement VERIFIED on testing; main behavior DEFERRED; 0D-3A Testing tooling prepared locally; Gate 1 OPEN
**Tanggal sinkronisasi:** 2026-10-04
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

Baseline Phase 0D-3A pada `feature/phase-0d-tidb-testing-foundation`: `5d54403feca3ba2397c89e884650208ed84fba6d`, setelah PR #13 merged ke testing. Phase 0C CLOSED setelah [PR #9](https://github.com/ArdhanKurniawan/courier-route-planner/pull/9) merged ke `testing`, dengan [final independent verification PASS](docs/proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md) dan [remote closure/tree evidence](docs/proses/phase-0/0d/PHASE_0D_BASELINE_AUDIT_REPORT.md#c-phase-0c-closure-evidence). Phase 0A CLOSED/PR #7; Phase 0B CLOSED/PR #8. Shell UI berasal dari cleanup terverifikasi 2026-10-02:

| Status | Evidence / kondisi aktual |
|---|---|
| Tersedia | Repository documentation dan local branch guard files `.githooks/pre-commit`, `.githooks/pre-push`; ini bukan bukti GitHub protections sudah aktif |
| Tersedia | Shell dan reusable UI primitives dari TailAdmin Free 2.4.0 di `src/`; provenance SHA tercatat di `THIRD_PARTY_NOTICES.md`, license di `licenses/TAILADMIN-MIT.txt` |
| Tersedia | Next.js App Router, React, TypeScript strict, Tailwind; Node `24.x` dalam `engines.node` dan `.nvmrc` berisi `24` |
| Current | UI Template Cleanup terverifikasi lokal; branding Courier Route Planner, dashboard status kesiapan fitur tanpa data palsu, sidebar sesuai mapping project, header dan tema light/dark |
| Tersedia | Routing sederhana tanpa locale: `/`, `/about`, dan 10 route modul dengan status **Belum diimplementasikan**; seluruh link sidebar dan refresh route diuji melalui browser |
| Dibersihkan | Demo e-commerce, charts, demographic map, calendar, profile/auth, showcase, mock data dan assets; `apexcharts`, `react-apexcharts`, `next-intl`, JVectorMap, FullCalendar, Swiper, DnD, Dropzone dan SimpleBar dihapus setelah audit usage |
| Dipertahankan | Form controls, date picker (`flatpickr`), table primitives, modal, badge, alert, dropdown, pagination, cards, breadcrumbs dan generic icons |
| Belum | Leaflet, OSRM adapter, domain algorithms, immutable matrix storage, benchmark engine, CRUD domain |
| Belum | Auth/authorization aktual; halaman sign-in/sign-up demo telah dihapus |
| Phase 0A CLOSED | Scripts lint/typecheck/test/test:watch/test:coverage/build; typecheck menjalankan `next typegen && tsc --noEmit` untuk generated route types |
| Phase 0A CLOSED | Vitest, V8 coverage, React Testing Library, jest-dom dan jsdom sebagai dev dependencies; navigation/dashboard regression tests: 2 files, 11 tests PASS |
| Security audit | Next.js/eslint-config-next `16.3.6`; Stage 1 audit: runtime 0, full 19 (1 low, 6 moderate, 12 high, 0 critical). Delta +4 moderate pada dev tooling Drizzle Kit; detail pada laporan Stage 1 |
| Phase 0B CLOSED | Pure typed APP_ENV parser, exact `development/testing/production`, required saat runtime read, tanpa default/trim/import-time validation; independent verification PASS |
| Phase 0B CLOSED | `GET /api/health`: app-only, 200 `{"status":"ok"}` atau 503 `{"status":"error"}` untuk missing/invalid APP_ENV; `Cache-Control: no-store`, tanpa env disclosure atau DB; behavior tetap |
| Phase 0C CLOSED | Drizzle + TiDB HTTP driver + Zod; pure DB URL parser, lazy server-only client, `depots` saja. Initial migration sudah diterapkan manusia pada Dev; ledger 1 entry, hash/journal dan live schema cocok |
| Phase 0C CLOSED | `GET /api/ready`: connectivity-only `SELECT 1 AS ok`, 5000 ms/no retry, minimal JSON + no-store; live health/readiness HTTP 200, application HTTP read dan migration TCP/TLS SELECT 1 PASS |
| Historical Phase 0C tests | 9 files / 147 tests PASS: 48 tests lama + 99 DB/schema/readiness tests; server tests memakai Node dan transport palsu |
| Phase 0D CI verified | [Quality workflow](.github/workflows/quality.yml): PR dan push ke testing/main; job Quality Gate, Node 24/npm cache, read-only contents, sembilan required commands, runtime audit hard gate dan full audit informational dengan tool-error handling |
| Phase 0D-2C | [Testing behavioral enforcement proof](docs/proses/phase-0/0d/PHASE_0D_ENFORCEMENT_BEHAVIOR_PROOF_REPORT.md): pending required check/merge unavailable → success/Ready to merge → human merge → successful push Quality Gate; main behavior DEFERRED |
| Phase 0D-3A local | `getTestingMigrationCredentials`, `drizzle.testing.config.ts`, `db:migrate:testing`; exact testing/database guard, TLS verification; [tooling report](docs/proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md) |
| Foundation gap | Testing/Production NOT YET PROVISIONED; Testing migration NOT APPLIED; Vercel/isolation, second-member reproduction dan Playwright/E2E pending; Gate 1 OPEN |

Validasi Phase 0A pada Node `24.19.0`, npm `11.6.0`: `npm ci`, lint, typecheck dari generated state bersih, test, test:coverage dan build PASS. Coverage mencakup seluruh source TypeScript/TSX sebagai baseline informasi, tanpa threshold. Vite mengeluarkan warning tentang config loader pada future major; tests saat ini PASS. Evidence dan audit delta: [Phase 0A Quality Foundation Report](docs/proses/phase-0/0a/PHASE_0A_QUALITY_FOUNDATION_REPORT.md).

Phase 0A independent verification: [report](docs/proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md). Phase 0B CLOSED/PR #8: [independent verification PASS](docs/proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md). Phase 0C Stage 1: [implementation report](docs/proses/phase-0/0c/PHASE_0C_IMPLEMENTATION_REPORT.md); [independent offline PASS](docs/proses/phase-0/0c/PHASE_0C_OFFLINE_INDEPENDENT_VERIFICATION_REPORT.md); [Dev live verification](docs/proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md). Build/typegen/tests tetap tidak memerlukan APP_ENV, DATABASE_URL atau real env file. `.env.example` kini memuat APP_ENV dan DATABASE_URL kosong; credential Dev diisi manusia pada ignored file privat dan tidak disalin ke Git. NEXT_PUBLIC_APP_NAME tidak diperlukan.

Jalankan quality gates lokal setelah clone/pull:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run db:check
npm run build
npm run typecheck
npm audit --omit=dev --json
npm audit --json
```

Sembilan command pertama adalah required CI gates; typecheck kedua dijalankan setelah build. Full audit terakhir informational untuk advisories valid; malformed/transport/command failure tetap gagal. Coverage tanpa numeric threshold. CI tidak mendefinisikan APP_ENV/DATABASE_URL, tidak menghubungi TiDB, tidak migrate dan tidak deploy. Detail: [CI contract](docs/12_CI_CD_RELEASE.md), [implementation report](docs/proses/phase-0/0d/PHASE_0D_CI_IMPLEMENTATION_REPORT.md).

`npm run test:watch` tersedia untuk development. Browser checks pada cleanup 2026-10-02 mencakup desktop/mobile/tablet, keyboard drawer, route refresh, tema light/dark dan persistensi refresh; console tanpa error/warning pada flow shell yang diuji saat itu.

Remote CI dan exact required Quality Gate configuration sudah verified; testing behavioral enforcement verified pada PR #12, main behavior deferred. Deployment/env isolation belum diverifikasi. Phase 0 Foundation dan seluruh gate adopsi template belum selesai; Phase 0D, Vercel Preview dan reproduksi anggota kedua masih diperlukan. Dev-first tetap menargetkan tiga independent TiDB Starter resources, tanpa shared-instance fallback. Kontrak penelitian tetap sama.

Kontrak utama: [research decisions](docs/32_RESEARCH_DECISIONS.md), [algorithm specification](docs/33_ALGORITHM_SPECIFICATION.md), [OSRM distance contract](docs/34_OSRM_DISTANCE_CONTRACT.md), dan [benchmark protocol v1](docs/15_RESEARCH_BENCHMARK_PROTOCOL.md).

Testing migration tooling prepared locally. `npm run db:migrate` tetap Dev-only (`.env.migrations.local`, APP_ENV=development, DB `courier_route_planner_dev`). Manual `npm run db:migrate:testing` memakai `.env.migrations.testing.local`, APP_ENV=testing dan exact DB `courier_route_planner_testing`, TLS `rejectUnauthorized: true`. Testing resource/apply pending 0D-3B; file env Testing belum dibuat. Tidak ada Production apply path atau migration saat install/build/CI/deploy. Logical-name guard tidak membuktikan physical resource identity; future apply memerlukan verifikasi provider/role/target dan approval eksplisit.

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
