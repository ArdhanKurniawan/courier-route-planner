# 02 — PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 1. Persona utama

**Admin Route Planner**: pengguna yang menyiapkan data order/customer, menentukan scenario, menjalankan optimasi, membandingkan hasil, dan melihat route pada map.

## 2. Core user journey

```text
Admin buka dashboard
→ pilih/atur depot
→ buat scenario
→ generate/import/edit customer
→ validasi titik
→ freeze benchmark snapshot + OSRM Table directed matrix + hash/freeze
→ run Hybrid NN + 2-Opt dan rekam baseline NN awal
→ lihat perbaikan rute
→ lihat route di map
→ simpan/export hasil
```

## 3. Functional requirements

### FR-001 Depot management

Admin dapat:

- membuat depot;
- mengubah nama/alamat/lat/lng;
- memilih depot aktif untuk scenario;
- menampilkan marker depot.

**Acceptance criteria:**

- latitude [-90, 90];
- longitude [-180, 180];
- perubahan tervalidasi server-side;
- depot tidak dapat dihapus jika melanggar referential rule yang disepakati.

### FR-002 Scenario management

Scenario memiliki minimal:

- nama;
- depot;
- distribution pattern;
- customer count;
- min/max radius;
- generation seed;
- status draft/frozen bila diperlukan.

### FR-003 Dummy generator

Primary generation pattern untuk main experiment adalah random. Engineering generator boleh mendukung pattern berikut; clustered/circular/directional hanya optional/additional experiment, bukan mandatory primary experiment atau core novelty:

- random;
- clustered;
- circular;
- directional.

Requirement:

- seed sama → dataset sama;
- hasil dapat diedit setelah dibuat;
- generator tidak boleh membuat koordinat invalid;
- regenerate harus meminta konfirmasi jika menimpa data.

### FR-004 Order/customer CRUD

Minimal field:

- order code;
- customer name;
- address;
- latitude;
- longitude;
- source (`dummy`/`manual`).

Owner-approved Phase 1C contract (2026-11-01): every Order belongs to exactly one Scenario. Order code is canonical uppercase, at most 64 Unicode characters after normalization, unique within that Scenario with case-insensitive and accent-insensitive comparison. The same code may exist in another Scenario. Manual API creation fixes source=manual; source and Scenario association cannot be changed by editing. Future trusted generator-created dummy Orders remain editable while preserving source=dummy. Scenario deletion is blocked while Orders reference it. Scenario customer_count is configuration, never an Order quota or an automatically updated actual count.

### FR-005 Map

Map harus:

- menampilkan depot;
- menampilkan customer;
- membedakan marker depot/customer;
- menampilkan sequence number setelah optimasi;
- menampilkan polyline route;
- menampilkan attribution OpenStreetMap.

### FR-006 Distance matrix

- matrix dibentuk dari frozen benchmark case melalui road validation + OSRM Table Service sesuai [docs/34](34_OSRM_DISTANCE_CONTRACT.md);
- unit meter, NxN termasuk depot index 0, directed/asymmetric diterima tanpa asumsi symmetry;
- diagonal 0, finite nonnegative values, null/unreachable ditolak, dan zero off-diagonal dilaporkan;
- stable node order, input hash, matrix hash, provider/profile/version metadata;
- freeze immutable matrix sebelum formal run. Baseline NN dan hasil Hybrid memakai snapshot/hash identik dengan actual provider provenance.

### FR-007 NN + 2-Opt

- NN deterministic menghasilkan initial closed tour dari depot=0, minimum directed cost, tie-break lowest node index;
- 2-Opt hanya menerima route valid;
- 2-Opt tidak boleh menghilangkan customer;
- best-improvement 2-Opt reverse candidate segment dan recompute FULL directed route distance; symmetric-only delta shortcut dilarang;
- accept strict improvement saja, depot fixed, hasil final distance <= NN initial distance, sesuai [docs/33](33_ALGORITHM_SPECIFICATION.md).

### FR-008 Deferred — ACO

Nomor ini dipertahankan untuk jejak historis. Classical Ant System diarsipkan sebagai [Future Development](https://github.com/ArdhanKurniawan/courier-route-planner/issues/75).

### FR-009 Benchmark evaluation

Run Optimization dan Experiments menargetkan satu pipeline Hybrid yang mencatat jarak baseline NN dan jarak akhir pada Benchmark Case serta frozen matrix yang sama. Research Mode memakai Research Provider Lock. Ukuran awal 10, 25, dan 50 customer. Jumlah dataset, repetisi, warm-up, dan metode statistik menunggu validasi akademik. [Protokol evaluasi](15_RESEARCH_BENCHMARK_PROTOCOL.md)

Simpan input hash, matrix ID/hash, node order, actual provider provenance, versi algoritma, rute, jarak, runtime, dan status attempt.

### FR-010 Results

Tampilkan total jarak NN awal, jarak Hybrid, perbaikan absolut/persentase, runtime, dan urutan kunjungan. Hasil eksperimen mendukung ringkasan skalabilitas dan perbaikan menurut jumlah customer, sesuai metode yang disetujui.

### FR-011 Export

Minimal CSV untuk hasil benchmark.

## 4. Non-functional requirements

### NFR-001 Security

- no secret in browser bundle;
- no production DB credential on Preview;
- server-side validation;
- parameterized DB access;
- auth required sebelum aplikasi public mutation digunakan secara terbuka.

### NFR-002 Reproducibility

- dataset seed;
- input snapshot;
- commit SHA;
- parameter snapshot.

### NFR-003 Maintainability

- algoritma terpisah dari Next.js/DB/UI;
- TypeScript strict;
- small modules;
- migration tracked.

### NFR-004 Performance

Tidak menetapkan SLA enterprise. Target MVP:

- UI CRUD responsif untuk <= 100 customer;
- algoritma tidak memblok UI client karena dijalankan server/benchmark runner;
- formal benchmark dilakukan terkontrol.

### NFR-005 Accessibility

- form label jelas;
- keyboard usable;
- color bukan satu-satunya indikator;
- table comparison memiliki header semantik.

## 5. Requirement traceability

Setiap feature task harus mencantumkan FR/NFR yang disentuh agar review tidak menjadi “feeling-based”.
