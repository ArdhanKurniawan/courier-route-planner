# 03 — SYSTEM ARCHITECTURE

## 1. Architecture style

**Modular monolith full-stack Next.js**.

Kita sengaja tidak memakai microservice pada MVP.

```text
Browser
  │
  ▼
Next.js App Router
  ├─ Server Components
  ├─ Client Components (hanya bila interaktif/browser API)
  ├─ Route Handlers / Server Actions
  ├─ Application Services
  ├─ Routing Algorithms
  └─ Data Access (Drizzle)
             │
             ▼
        TiDB Cloud
```

## 2. Key architectural boundaries

### UI layer

Tanggung jawab:

- rendering;
- form UX;
- map interaction;
- client state lokal yang benar-benar perlu.

Tidak boleh:

- menyimpan DB credential;
- menjalankan formal research benchmark;
- berisi core ACO implementation.

### Server/API layer

Tanggung jawab:

- validation;
- authorization;
- orchestration;
- database mutation;
- memanggil services.

### Domain/application layer

Tanggung jawab:

- scenario freeze;
- benchmark orchestration;
- route validation;
- statistics;
- business rules.

### Algorithm layer

Tanggung jawab:

- distance matrix operation;
- NN;
- 2-Opt;
- ACO.

Input/output harus plain typed structures.

## 3. Core flow — create scenario

```text
Form
→ Zod validation
→ Scenario service
→ Drizzle
→ TiDB
→ revalidate UI
```

## 4. Core flow — benchmark

```text
Editable Scenario
      ↓ FREEZE
Immutable Benchmark Case
      ↓
Distance Provider
      ↓
Distance Matrix
      ├───────────────┐
      ↓               ↓
  NN → 2-Opt         ACO x N runs
      ↓               ↓
 Route result       Run results
      └───────┬───────┘
              ↓
       Experiment summary
              ↓
            TiDB
```

## 5. Research reproducibility boundary

Scenario adalah **editable working dataset**.

Benchmark case adalah **immutable scientific snapshot**.

Jangan menjalankan formal comparison langsung dari mutable `orders` lalu menganggap hasil dapat direproduksi.

```text
Scenario #12 (editable)
      ↓ Freeze
Benchmark Case #37 (immutable)
      ├─ depot snapshot
      ├─ customer snapshots
      ├─ input_hash
      └─ metric/version
```

## 6. Map architecture

Leaflet adalah client-side dependency.

Recommended:

```text
Server Component page
  ↓ pass serializable data
Client Map Component (`'use client'`)
  ↓
Leaflet
```

Jangan import Leaflet langsung dari Server Component karena bergantung pada browser DOM.

## 7. Routing engine future adapter

Gunakan abstraction:

```text
DistanceProvider
├─ ResearchEuclideanProvider
└─ RoadNetworkProvider (future OSRM)
```

dan terpisah:

```text
RouteGeometryProvider
└─ OSRM geometry (future)
```

Urutan customer dan geometri jalan adalah dua concern berbeda.

## 8. Failure boundaries

- DB failure → tampilkan error yang aman; jangan kehilangan form state bila memungkinkan.
- algorithm validation failure → fail closed; jangan simpan route invalid.
- ACO one-run failure → tandai run failed; summary tidak boleh diam-diam menganggap sukses.
- migration failure → stop deployment path, jangan coba “fix otomatis” di production.

## 9. Architecture quality attributes

Prioritas:

1. correctness;
2. reproducibility;
3. maintainability;
4. security;
5. simplicity;
6. performance;
7. extensibility.

Bukan prioritas:

- distributed system sophistication;
- premature caching;
- microservices;
- event bus;
- Kubernetes.
