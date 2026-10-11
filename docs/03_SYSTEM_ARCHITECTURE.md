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

Input/output harus plain typed structures. Algorithm domain menerima DistanceMatrix sebagai satu-satunya input geografis, ditambah params/seed; tidak boleh import `next/*`, React, Leaflet, Drizzle/TiDB, atau OSRM HTTP client. Road validation, matrix construction/storage, dan hashing ditangani application/infrastructure.

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
Road-network validation + OSRM Table adapter (infrastructure)
      ↓
Validated frozen directed matrix (meter, input hash, matrix hash)
      ├───────────────┐
      ↓               ↓
  NN → 2-Opt         Classical Ant System x 30 seeded runs
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
      ├─ provider/profile/version
      └─ distance_matrices snapshot + matrix_hash + stable node order
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

## 7. OSRM infrastructure and optimizer boundary

Gunakan abstraction:

```text
UI/API → Application → Algorithm Domain (matrix + params/seed → result)
              │
              └→ Matrix Builder / Storage → OSRM Table adapter
```

dan terpisah:

```text
Optimizer sequence → RouteGeometryProvider → OSRM Route geometry → Leaflet
```

DistanceProvider adalah port infrastructure untuk produksi matrix, bukan dependency algoritma. OSRM Table merupakan core formal input sesuai [ADR-012](04_TECH_STACK_ADRS.md#adr-012--osrm-road-network-distance-matrix-for-formal-research-benchmark). Geometry boleh menyusul sebagai pekerjaan visualisasi terpisah.

Kedua algoritma memakai matrix hash/values/node order identik. NN deterministic (depot=0, lowest-index tie); 2-Opt best improvement full recomputation untuk directed costs; ACO Classical Ant System tanpa post-ACO 2-Opt. Detail [docs/33](33_ALGORITHM_SPECIFICATION.md) dan [docs/34](34_OSRM_DISTANCE_CONTRACT.md).

Formal runner terkontrol mengukur hanya solver call, termasuk initialisasi state algoritma. OSRM/DB/HTTP/network/serialization/geometry/rendering, external validation, dan hash verification di luar timer. Main design dan repetitions mengikuti [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md). Diagram adalah target architecture; current implementation ada di [README](../README.md#current-implementation-status).

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
