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
→ generate distance matrix
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

Pattern awal:

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

- matrix dibentuk dari frozen benchmark case;
- matrix bersifat simetris jika metric yang dipakai simetris;
- diagonal 0;
- tidak menerima NaN/Infinity;
- implementation metric harus versioned.

### FR-007 NN + 2-Opt

- NN menghasilkan initial closed tour;
- 2-Opt hanya menerima route valid;
- 2-Opt tidak boleh menghilangkan customer;
- hasil final memiliki distance <= initial distance, kecuali ada contract khusus yang dijelaskan.

### FR-008 ACO

Parameter harus configurable, minimal konsep:

- ant count;
- iterations;
- alpha;
- beta;
- evaporation;
- seed.

Nilai default final **belum dikunci** sampai didukung metodologi.

### FR-009 Benchmark comparison

Satu benchmark case harus digunakan oleh kedua algoritma.

Sistem menyimpan:

- input hash;
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
- best distance;
- mean distance untuk stochastic method;
- median (direkomendasikan);
- standard deviation;
- runtime;
- route sequence;
- improvement terhadap baseline bila dihitung.

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
