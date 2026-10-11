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
→ run NN+2Opt
→ run ACO
→ lihat comparison
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
- diagonal 0, finite nonnegative values, null/unreachable ditolak; ACO eligibility untuk zero off-diagonal mengikuti docs/33;
- stable node order, input hash, matrix hash, provider/profile/version metadata;
- freeze immutable matrix sebelum formal run; kedua algoritma memakai snapshot/hash identik.

### FR-007 NN + 2-Opt

- NN deterministic menghasilkan initial closed tour dari depot=0, minimum directed cost, tie-break lowest node index;
- 2-Opt hanya menerima route valid;
- 2-Opt tidak boleh menghilangkan customer;
- best-improvement 2-Opt reverse candidate segment dan recompute FULL directed route distance; symmetric-only delta shortcut dilarang;
- accept strict improvement saja, depot fixed, hasil final distance <= NN initial distance, sesuai [docs/33](33_ALGORITHM_SPECIFICATION.md).

### FR-008 ACO

Varian = Classical Ant System, seeded deterministic PRNG, directed pheromone, roulette-wheel selection, fixed iterations, semua valid ants deposit, best observed route tracked. Tidak menambahkan 2-Opt setelah ACO pada main comparison. Parameter typed explicit:

- ant count;
- iterations;
- alpha;
- beta;
- evaporation;
- Q;
- tau0;
- seed.

Nilai default final **belum dikunci** sampai didukung metodologi.

### FR-009 Benchmark comparison

Satu benchmark case dan frozen OSRM matrix/hash harus digunakan oleh kedua algoritma. Main: 10/25/50 customer × 10 independent random datasets = 30 datasets; N=100 optional setelah pilot. Calibration wajib terpisah dan satu global ACO configuration frozen.

ACO: 30 independent seeded runs per dataset. NN+2-Opt: satu deterministic quality result + 30 measured timing repetitions. Lakukan 5 warm-ups per algoritma/dataset; timer mengecualikan OSRM/DB/HTTP/network/serialization/geometry/rendering. Raw failed/poor runs dipertahankan. Detail [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md).

Sistem menyimpan:

- input hash;
- distance matrix ID/hash dan node order;
- distance metric/version;
- algorithm name/version;
- parameters;
- run number;
- seed;
- route;
- total distance;
- execution time.

### FR-010 Result comparison

Minimal tampil:

- algorithm;
- deterministic NN+2-Opt distance;
- mean dan median ACO sebagai primary descriptive comparison;
- ACO best dan worst sebagai tambahan, bukan best-of-30 sebagai satu-satunya primary comparison;
- standard deviation;
- runtime;
- route sequence;
- improvement terhadap baseline bila dihitung.

RQ3 menambahkan range dan CV ACO tanpa threshold baik/buruk yang tidak bersumber. Runtime: mean, median, SD dari measured repetitions. Dataset-level summaries adalah observasi scenario; 30 runs dalam satu dataset bukan 30 independent datasets.

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
- ACO seed;
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
