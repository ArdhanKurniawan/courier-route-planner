# 09 — REPOSITORY STRUCTURE

**Promotion evidence 2026-10-11:** [PR #20 closure](proses/phase-0/0d/PHASE_0D_MAIN_FOUNDATION_PROMOTION_REPORT.md); current-candidate PR Quality and post-merge main Quality PASS. Vercel NOT integrated; public Production/Preview NOT deployed; Phase 0D/Gate 1 OPEN.

Target struktur (belum seluruhnya tersedia; lihat [current implementation](../README.md#current-implementation-status)). Ini panduan dokumentasi, bukan instruksi membuat folder/source pada task sync:

```text
.
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.*
├── drizzle.config.ts
├── drizzle.dev.config.ts  # legacy Kit config; active Dev apply uses runner below
├── drizzle.testing.config.ts  # explicit Testing apply only, guarded; initial applied once
├── drizzle.production.config.ts  # explicit Production apply only, guarded; initial applied exactly once
├── drizzle/              # actual generated SQL + meta journal/snapshot
├── .env.example
├── .gitignore
├── scripts/
│   └── migrate-development.mjs  # explicit Dev-only mysql2 TLS + official Drizzle migrator
├── src/
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── dashboard/
│   │   │   ├── depots/
│   │   │   ├── scenarios/
│   │   │   ├── experiments/
│   │   │   └── results/
│   │   ├── api/
│   │   │   ├── health/
│   │   │   ├── ready/    # actual readiness; Dev/Testing HTTP and Production local handlers verified
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── config/
│   │   ├── navigation.ts
│   │   ├── env.ts          # pure APP_ENV parser; health call-site
│   │   └── db-env.ts       # pure Zod DB URL parser + explicit Dev/Testing/Production CLI guards
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── map/
│   ├── db/
│   │   ├── client.ts       # actual lazy server-only HTTP client
│   │   ├── readiness.ts    # actual SELECT 1 connectivity service
│   │   ├── schema.ts       # actual depots ONLY
│   │   └── repositories/   # future CRUD; absent in Stage 1
│   ├── domain/
│   │   ├── routing/
│   │   └── experiments/
│   ├── lib/
│   │   ├── validation/
│   │   ├── security/
│   │   └── utils/
│   └── types/
├── scripts/
│   ├── seed-dev.ts
│   ├── benchmark.ts
│   └── verify-env.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── e2e/
├── docs/
└── .github/
    ├── workflows/
    │   └── quality.yml       # actual Quality / Quality Gate; remote testing verified
    └── pull_request_template.md
```

## Domain routing structure

Phase 0C CLOSED/PR #9 merged ke testing pada `e1c36988e588e397af312a140677c3f71bd451d2`; [final independent verification PASS](proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md). Initial migration sudah Dev-applied oleh manusia, ledger/live schema dan connectivity diverifikasi read-only. Test-only `server-only` fixture/alias mempertahankan production marker. Real `.env.local` dan dedicated `.env.migrations.local` sudah dibuat manusia, keduanya ignored dan tidak menjadi source artifact. Folder domain/application/E2E dalam target ini tetap belum diimplementasikan.

Phase 0D-1 menyediakan tepat satu actual workflow [`.github/workflows/quality.yml`](../.github/workflows/quality.yml). CI quality-only untuk PR/push testing/main; tidak deploy, query DB, atau migrate. Remote CI dan required-check configuration VERIFIED; testing behavioral enforcement VERIFIED, main required-check behavioral proof CLOSED/VERIFIED. `.github/pull_request_template.md` pada diagram tetap target, bukan file yang dibuat stage ini. Lihat [CI contract](12_CI_CD_RELEASE.md).

```text
src/domain/routing/
├── types.ts
├── route-validator.ts
├── distance/
│   ├── types.ts
│   └── matrix-validator.ts
├── nn/
│   └── nearest-neighbor.ts
├── two-opt/
│   └── two-opt.ts
└── aco/
    ├── ant-colony.ts
    ├── rng.ts
    └── types.ts
```

## Rule of dependency direction

### Actual Phase 1B source — 2026-10-31

`src/app/(admin)/scenarios/page.tsx` dan `src/app/api/scenarios/{route.ts,[id]/route.ts}` memakai existing server-side admin boundary. HTTP helper `src/lib/http/scenario-api.ts` → `src/application/scenarios/scenario-service.ts` → `src/db/repositories/scenario-repository.ts` → lazy application DB. DTO/Zod contracts berada di `src/lib/validation/scenario.ts`; UI di `src/components/scenarios/`.

`src/db/schema.ts` kini memiliki source depots + scenarios; migration `drizzle/0001_scenarios.sql` beserta snapshot/journal telah diterapkan dan diverifikasi pada Development/Testing melalui approval terpisah, bukan SQL baru pada pembaruan ini. Source di atas merged ke Testing melalui PR #31 pada `0beb0642b39bdb7194a25a9e72c340fbd07d4a40`; post-merge Quality Gate PASS dan stable Preview READY. Unit fixtures bersifat sintetis/offline; integration Scenario adalah runner live terpisah yang hanya boleh memakai Testing APPLICATION setelah approval. Route Scenario sudah keluar dari placeholder `plannedModules`. Core Browser CRUD dilaporkan OWNER-OBSERVED agregat, dengan detail PENDING pada [assessment Testing](14_TESTING_QA.md#19-phase-1b-testing-post-merge-closure-assessment-2026-11-01). Order, Generator, Map, freeze dan algoritma tetap future target; Production migration/release belum diotorisasi.

```text
UI/API → application → algorithm domain (DistanceMatrix + params/seed)
             └→ infrastructure adapters / repositories
```

Algorithm domain tidak boleh import dari:

```text
next/*
react
leaflet
@tidbcloud/*
drizzle-orm
OSRM HTTP client
```

## Application and OSRM infrastructure target

```text
src/
├── application/
│   ├── scenarios/       # editable scenario → immutable benchmark case
│   └── benchmark/       # matrix builder/storage orchestration, hash checks, runner
└── infrastructure/
    └── routing/
        └── osrm/
            ├── osrm-client.ts
            ├── osrm-table-provider.ts
            └── osrm-geometry-provider.ts
```

DistanceProvider port dan OSRM HTTP implementation berada di luar algorithm core. Table provider menghasilkan frozen directed road-network matrix dalam meter; geometry provider menangani visualisasi setelah sequence tersedia. Matrix validator dan route validator di domain adalah pure operations. Storage implementation boleh menggunakan repository `src/db/` melalui application; domain tidak import DB. Kontrak: [docs/33](33_ALGORITHM_SPECIFICATION.md), [docs/34](34_OSRM_DISTANCE_CONTRACT.md).

## Testing migration tooling — Phase 0D-3A

`drizzle.testing.config.ts` dan manual `db:migrate:testing` tersedia, memakai pure Testing guard dan existing offline history. `tests/unit/db-migration.test.ts` memeriksa exact guard/TLS/parser rejection dan cross-env isolation; tests lama dipertahankan. Tooling 0D-3A merged/PR #14; pada 0D-3B Testing PROVISIONED, migration APPLIED ONCE setelah checkpoint approval, live ledger/schema/app read/health/readiness PASS. Manusia telah menyimpan `.env.testing.local`/`.env.migrations.testing.local` dengan credential berbeda; keduanya ignored dan tidak ditampilkan pada struktur tracked. Production LIVE pada independent Starter, migration exactly once dan schema/ledger verified; Vercel NOT integrated; public Production/Preview NOT deployed; historical Preview preflight NOT READY; main FOUNDATION PROMOTED (PR #20), main Quality Gate VERIFIED, main required-check behavioral proof CLOSED/VERIFIED; Phase 0D/Gate 1 OPEN. [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md). [Tooling report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md); [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md).

## Production migration tooling — Phase 0D

**Production LIVE; independent Starter; migration APPLIED EXACTLY ONCE; schema/ledger VERIFIED.** Dev LIVE/established dan Testing LIVE/migrated once/verified. Vercel NOT integrated; public Production/Preview NOT deployed; historical Preview preflight **NOT READY**; main FOUNDATION PROMOTED (PR #20), main Quality Gate VERIFIED, main required-check behavioral proof CLOSED/VERIFIED; Phase 0D/Gate 1 **OPEN**. Separate `drizzle.production.config.ts`, pure `getProductionMigrationCredentials`, manual `db:migrate:production` dan offline `tests/unit/db-production-migration.test.ts` tersedia. Runtime schema/client/readiness dan sole migration history unchanged. Private Production app/migrator files sudah disimpan manusia, ignored dan bukan tracked source. Approved initial apply invocation 1/retry 0/exit 0; ledger satu row dan depots parity PASS. Local unchanged handlers PASS memakai app credential; public deployed HTTP belum diverifikasi. [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md); [tooling history](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md); [guard/approval contract](07_TIDB_GUIDE.md#production-migration-tooling--phase-0d).

## Naming

- file TS: `kebab-case.ts`;
- React component: file konsisten `kebab-case.tsx`, exported component PascalCase;
- database: `snake_case`;
- TS properties: `camelCase`;
- constants: `UPPER_SNAKE_CASE` bila benar-benar constant.

## Phase 1C local Order source — 2026-11-01

Protected page: src/app/(admin)/orders/page.tsx. UI: src/components/orders/order-manager.tsx and order-form.tsx. Nested API lives under the existing Scenario [id] directory: src/app/api/scenarios/[id]/orders/route.ts and orders/[orderId]/route.ts; [id] represents scenarioId, without introducing a conflicting Next slug. API helper src/lib/http/order-api.ts uses the existing auth/Origin/body/environment guards, then application/orders/order-service.ts and db/repositories/order-repository.ts. Zod/DTOs are in lib/validation/order.ts. All identifiers remain strings at HTTP boundaries. Scenario repository adds only an Order reference precondition; existing authentication/database client/dependencies are unchanged.

Migration `0002_orders`, snapshot and journal append are versioned with Order source. The migration passed in Development and Testing. `tests/integration/order-crud.integration.test.ts` uses the fixture registry and lookup under `tests/fixtures/` for durable receipts and scoped cleanup. Testing live integration remains **NOT EXECUTED**. [Evidence and pending checkpoints](14_TESTING_QA.md#21-phase-1c-verification-and-draft-pr-readiness-2026-11-07).
