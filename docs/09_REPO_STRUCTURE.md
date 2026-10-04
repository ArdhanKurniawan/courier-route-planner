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
│   │   └── db-env.ts       # pure Zod DB URL parser + Dev CLI guard
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
    └── pull_request_template.md
```

## Domain routing structure

Phase 0C actual files marked di atas tersedia lokal; initial migration sudah Dev-applied oleh manusia, ledger/live schema dan connectivity diverifikasi read-only. Final independent Phase 0C review pending. Test-only `server-only` fixture/alias mempertahankan production marker. Real `.env.local` dan dedicated `.env.migrations.local` sudah dibuat manusia, keduanya ignored dan tidak menjadi source artifact. Folder domain/application/CI/E2E dalam target ini tetap belum diimplementasikan.

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

## Naming

- file TS: `kebab-case.ts`;
- React component: file konsisten `kebab-case.tsx`, exported component PascalCase;
- database: `snake_case`;
- TS properties: `camelCase`;
- constants: `UPPER_SNAKE_CASE` bila benar-benar constant.
