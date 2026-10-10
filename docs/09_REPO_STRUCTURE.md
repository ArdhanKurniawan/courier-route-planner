# 09 — REPOSITORY STRUCTURE

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
├── drizzle.dev.config.ts  # explicit Dev apply only, guarded
├── drizzle.testing.config.ts  # explicit Testing apply only, guarded; initial applied once
├── drizzle/              # actual generated SQL + meta journal/snapshot
├── .env.example
├── .gitignore
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
│   │   │   ├── ready/    # actual connectivity readiness; Dev live verified
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── config/
│   │   ├── navigation.ts
│   │   ├── env.ts          # pure APP_ENV parser; health call-site
│   │   └── db-env.ts       # pure Zod DB URL parser + explicit Dev/Testing CLI guards
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

Phase 0D-1 menyediakan tepat satu actual workflow [`.github/workflows/quality.yml`](../.github/workflows/quality.yml). CI quality-only untuk PR/push testing/main; tidak deploy, query DB, atau migrate. Remote CI dan required-check configuration VERIFIED; testing behavioral enforcement VERIFIED, main behavior DEFERRED. `.github/pull_request_template.md` pada diagram tetap target, bukan file yang dibuat stage ini. Lihat [CI contract](12_CI_CD_RELEASE.md).

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

`drizzle.testing.config.ts` dan manual `db:migrate:testing` tersedia, memakai pure Testing guard dan existing offline history. `tests/unit/db-migration.test.ts` memeriksa exact guard/TLS/parser rejection dan cross-env isolation; tests lama dipertahankan. Tooling 0D-3A merged/PR #14; pada 0D-3B Testing PROVISIONED, migration APPLIED ONCE setelah checkpoint approval, live ledger/schema/app read/health/readiness PASS. Manusia telah menyimpan `.env.testing.local`/`.env.migrations.testing.local` dengan credential berbeda; keduanya ignored dan tidak ditampilkan pada struktur tracked. Production NOT PROVISIONED; Vercel NOT CONNECTED; Phase 0D/Gate 1 OPEN. [Tooling report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md); [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md).

## Naming

- file TS: `kebab-case.ts`;
- React component: file konsisten `kebab-case.tsx`, exported component PascalCase;
- database: `snake_case`;
- TS properties: `camelCase`;
- constants: `UPPER_SNAKE_CASE` bila benar-benar constant.
