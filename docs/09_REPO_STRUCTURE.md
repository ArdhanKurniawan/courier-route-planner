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
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── map/
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   ├── repositories/
│   │   └── migrations/
│   ├── domain/
│   │   ├── routing/
│   │   └── experiments/
│   ├── lib/
│   │   ├── env/
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
