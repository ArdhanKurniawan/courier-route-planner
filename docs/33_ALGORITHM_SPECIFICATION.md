# 33 — ALGORITHM SPECIFICATION

**Status — 2026-11-28.** Phase 4 Hybrid NN + 2-Opt selesai di Testing melalui [PR #74](https://github.com/ArdhanKurniawan/courier-route-planner/pull/74). ACO merupakan kontrak historis yang ditunda sebagai [Future Development](https://github.com/ArdhanKurniawan/courier-route-planner/issues/75).
Rujukan: [research decisions](32_RESEARCH_DECISIONS.md), [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md), [matrix contract](34_OSRM_DISTANCE_CONTRACT.md).

## 1. Common optimizer input contract

Input solver aktif adalah **DistanceMatrix** tervalidasi. Tidak ada coordinates, provider, HTTP, DB, atau UI dalam core. Metadata ID/hash dipetakan application layer di luar solver.

```ts
type DistanceMatrix = ReadonlyArray<ReadonlyArray<number>>;
type Route = ReadonlyArray<number>;
type NNTwoOptDiagnostics = Readonly<{
  nnInitialDistanceM?: number;
  twoOptPasses?: number;
  acceptedImprovements?: number;
}>;
type OptimizerResult = Readonly<{
  route: Route;
  totalDistanceM: number;
  algorithm: 'NN_2OPT';
  diagnostics: NNTwoOptDiagnostics;
}>;
```

Implementasi ada di [solver Hybrid](../src/domain/nn-two-opt.ts) dan [validator](../src/domain/route-validator.ts). Core tidak boleh import `next/*`, React, Leaflet, Drizzle/TiDB, OSRM HTTP client, atau session/cookies. Tidak boleh memutasi matrix atau initial route milik caller.

## 2. Directed matrix and route distance

Untuk n customer, N=n+1 node, depot index **0**, customer indices **1..n**. Matrix NxN, N>=1, diagonal 0, off-diagonal finite dan nonnegative, tanpa null/unreachable. Matrix kosong ditolak. Symmetric fixtures boleh, tetapi symmetry bukan syarat input: d(i,j) dapat berbeda dari d(j,i).

Untuk route R=(r0,...,r(n+1)), r0=r(n+1)=0:

```text
L(R) = sum(k=0..n) D[r_k][r_(k+1)]     [meter]
```

Gunakan seluruh directed edges, termasuk return edge ke depot. Jangan round matrix sebelum optimasi; pembulatan hanya display. Penjumlahan yang overflow/non-finite adalah error.

Laporkan zero off-diagonal sebagai bukti kualitas data dan tetapkan penanganannya sebelum pengumpulan formal. Biaya tetap sesuai matriks frozen, termasuk nilai nol. [Kontrak matriks](34_OSRM_DISTANCE_CONTRACT.md)

## 3. Nearest Neighbor (NN)

1. Mulai dengan route [0] dan semua customer unvisited.
2. Dari current i, pilih unvisited j dengan **D[i][j] minimum**.
3. Jika distance sama persis, pilih **lowest node index**.
4. Append j, hapus dari unvisited, ulangi sampai habis.
5. Append 0 dan hitung L(R).

Tidak ada random start atau multi-start. Same matrix/node order → same route. Untuk n=0, route [0,0], distance 0. n=1 menghasilkan [0,1,0]. n=2 tetap mengikuti directed nearest distance dan tie rule. NN route menjadi initial route 2-Opt.

## 4. Best-improvement 2-Opt

Input: valid closed NN route dan matrix yang sama. Depot tetap di posisi awal/akhir.

Pada tiap pass, enumerasi seluruh pasangan posisi customer 1 <= i < j <= n secara lexicographic (i dahulu, lalu j), termasuk seluruh segmen customer. Untuk tiap candidate:

1. Salin route saat ini.
2. Reverse segmen inclusive R[i..j].
3. **Recompute FULL route distance** dari directed matrix, termasuk internal reversed edges dan return edge.
4. Pilih candidate dengan distance terkecil yang merupakan **strict improvement** terhadap route saat ini. Bila beberapa candidate sama baik, pertahankan pasangan (i,j) pertama dalam urutan enumerasi.
5. Setelah semua candidate dievaluasi, accept satu best strict improvement dan mulai pass berikutnya. Berhenti bila tidak ada candidate yang lebih kecil.

Tidak accept equal/worse route, dan tidak berhenti pada improvement pertama. Toleransi assertion test tidak boleh menjadi izin menerima route lebih panjang. Tidak ada batas iterasi tersembunyi pada main method; resource interruption dilaporkan sebagai failure.

**Dilarang memakai symmetric-only delta shortcut** yang hanya menghitung dua boundary edges dan mengasumsikan biaya reversed internal edges tidak berubah. Adaptasi optimasi lain memerlukan pembuktian directed-cost equivalence dan review contract; baseline yang disetujui tetap full recomputation.

Invariant: **distance(NN + 2-Opt) <= distance(NN)**. n=0/1 tidak punya reversal candidate. Strict decrease pada jumlah permutation terbatas memastikan berhenti. Full recomputation sengaja memprioritaskan correctness; tiap pass mempunyai O(n²) candidates dengan O(n) evaluasi route.

## 5. ACO variant: Classical Ant System

**Historis dan deferred.** Bagian ini menyimpan kontrak varian Classical Ant System sebagai referensi. ACO tidak menjadi prerequisite MVP, Run Optimization, Experiments, Results, atau Export. [Issue #75](https://github.com/ArdhanKurniawan/courier-route-planner/issues/75) · [Implementasi arsip](https://github.com/ArdhanKurniawan/courier-route-planner/commit/259533e20e926ddc65188c1bd71ae920652d2f55)

### Explicit parameters and validation

- alpha, beta: finite >=0;
- rho (evaporation fraction): finite, 0<rho<1;
- Q, tau0: finite >0;
- antCount, maxIterations: positive safe integers;
- seed: eksplisit dalam format yang didukung seeded PRNG version yang dicatat.

Tidak ada nilai numerik final/default ilmiah di specification ini. Rancangan ACO historis menetapkan parameter eksplisit dari satu konfigurasi global setelah justifikasi literatur dan kalibrasi. Numeric unit-test values harus diberi label fixture, bukan rekomendasi penelitian.

### Initialization and transition

Set tau[i][j]=tau0 untuk i!=j; diagonal tidak dipakai. Semua ant mulai dari depot 0. Tiap ant menyimpan visited set sendiri.

```text
eta[i][j] = 1 / D[i][j]
w[i][j] = tau[i][j]^alpha * eta[i][j]^beta
p[i][j] = w[i][j] / sum(h in unvisited) w[i][h]
```

p=0 untuk visited nodes. Enumerasi unvisited dalam ascending node index dan pilih dengan roulette-wheel menggunakan uniform u dalam [0,1). Pilih cumulative probability pertama yang >u; residual floating-point hanya boleh jatuh ke candidate terakhir yang memiliki bobot positif. Denominator/bobot invalid tidak boleh disamarkan menjadi uniform selection. Normalisasi yang stabil secara numerik boleh jika mempertahankan distribusi formula; jika tetap non-finite/zero, fail run.

Setelah semua customer dikunjungi, append depot 0 dan recompute L_k. Semua ant pada satu iterasi membangun tour menggunakan pheromone snapshot yang sama sebelum update.

### Evaporation and deposit

Setelah semua ant selesai pada iterasi t:

```text
deltaTau_k[i][j] = Q / L_k   jika ant k melewati directed edge i→j
                  0         selain itu
tau_next[i][j] = (1-rho) * tau[i][j] + sum(k in all valid ants) deltaTau_k[i][j]
```

Deposit mencakup return edge ke depot. Edge i→j tidak otomatis memberi deposit pada j→i. Semua valid ants berpartisipasi; bukan hanya best ant. Invalid ant adalah correctness/numerical failure yang menggagalkan run, bukan alasan mengurangi jumlah ant diam-diam. Jangan melaporkan run parsial sebagai success.

### Best route, stopping, and reproducibility

Track best observed valid route pada seluruh ant/iterasi; pada equal cost pertahankan yang pertama ditemukan dengan urutan ant/iterasi tetap. Stopping criterion adalah **fixed maxIterations**, bukan elapsed-time atau stagnation stop. Setiap run memulai PRNG dan pheromone dari awal; tidak ada state carry-over dari warm-up/run lain.

Same matrix + parameters + seed + PRNG/algorithm version + compatible runtime → route, cost, dan iteration count yang reproducible; execution time tidak diwajibkan identik. Jangan gunakan Math.random/timestamp seed untuk formal run. Seed list predetermined dicatat runner.

n=0 adalah trivial result [0,0], distance 0 tanpa division/deposit; bila diagnostic ACO disertakan, iterationsCompleted=0 dan bestIteration tidak ada. n=1/2 dengan positive off-diagonal tetap menggunakan fixed iteration contract; return edge dihitung.

## 6. Output and RouteValidator

Hasil Hybrid mengembalikan route indices, `totalDistanceM`, `algorithm`, dan `diagnostics`. `nnInitialDistanceM` menyediakan baseline untuk menghitung perbaikan absolut dan persentase dengan matriks yang sama.

| Algorithm | Optional diagnostic | Arti bila disertakan |
|---|---|---|
| NN_2OPT | nnInitialDistanceM | Full directed distance hasil NN sebelum 2-Opt, dalam meter |
| NN_2OPT | twoOptPasses | Jumlah pass evaluasi candidate yang selesai, termasuk pass terakhir tanpa improvement; 0 bila tidak ada candidate (n=0/1) |
| NN_2OPT | acceptedImprovements | Jumlah penggantian route dengan best strict improvement yang diterima; tidak menghitung pass terakhir tanpa improvement |
| ACO (historis) | iterationsCompleted | Jumlah iterasi Ant System yang selesai pada implementasi arsip. |
| ACO (historis) | bestIteration | Iterasi ketika best route pertama ditemukan pada implementasi arsip. |

`iterationsCompleted` berbeda dari `twoOptPasses` dan `acceptedImprovements`. Application layer menambahkan matrix/input hash, actual provider provenance, node mapping, versi, identitas pengukuran, timer, status, dan metadata environment.

RouteValidator independen memeriksa:

- panjang n+2, integer indices dalam 0..n;
- depot 0 hanya start/end (trivial [0,0] valid);
- setiap customer tepat sekali, tanpa hilang/duplikat;
- full directed distance dapat direkomputasi dan finite;
- reported distance cocok dengan recomputation; bila floating tolerance digunakan untuk assertion, document precision dan jangan menggunakannya untuk menerima worsening 2-Opt;
- caller input tidak berubah.

Route invalid tidak boleh diperbaiki dengan dedupe/reordering setelah solver lalu dilaporkan sebagai hasil asli.

## 7. Timer boundaries

Runner controlled local environment melakukan matrix load/hash verification, external validation dan penyusunan parameter sebelum timer. Timer monotonic high-resolution membungkus pemanggilan algoritma saja. NN + 2-Opt diukur sebagai satu pipeline. Tidak ada cached solver state antar repetition.

Independent post-run RouteValidator, persistence, aggregation, serialization, OSRM/HTTP/network, DB, geometry generation, dan Leaflet/rendering berada di luar timer. Pemeriksaan internal yang memang dilakukan solver tetap termasuk computation. Warm-up dan repetisi mengikuti keputusan setelah validasi akademik. [Protokol evaluasi](15_RESEARCH_BENCHMARK_PROTOCOL.md)

## 8. Error taxonomy

| Code | Boundary / meaning |
|---|---|
| DISTANCE_MATRIX_INVALID | Shape, diagonal, range, non-finite, null/unreachable invalid |
| ALGORITHM_PARAMETER_ERROR | Historis ACO. Parameter/seed di luar kontrak arsip. |
| ALGORITHM_DISTANCE_DOMAIN_ERROR | Historis ACO. Input nontrivial mengandung zero off-diagonal. |
| ALGORITHM_NUMERICAL_ERROR | Non-finite route sum. Dalam ACO arsip juga mencakup invalid probability/pheromone. |
| ALGORITHM_INVALID_ROUTE | RouteValidator gagal atau initial 2-Opt route invalid |
| BENCHMARK_INPUT_MISMATCH | Runner menemukan input/node order/matrix hash berbeda |
| BENCHMARK_RUN_FAILED | Run interrupted/exception; simpan cause dan run identity |

OSRM/network/storage errors adalah infrastructure errors, tidak dibuat seolah hasil algoritma valid. Tidak ada distance/time=0 palsu sebagai pengganti failure.

## 9. Unit-test fixtures

### Directed cheap cycle

Synthetic costs dalam meter, hanya unit-test fixture:

```text
D = [[0, 1, 9, 9],
     [9, 0, 1, 9],
     [9, 9, 0, 1],
     [1, 9, 9, 0]]
```

NN [0,1,2,3,0] memiliki cost 4; reverse [0,3,2,1,0] cost 36. 2-Opt harus mempertahankan cost 4. Reverse segment [1..2] menghasilkan [0,2,1,3,0] cost 28; full recomputation harus memasukkan perubahan internal edge 1→2 menjadi 2→1.

### Trap untuk symmetric-only shortcut

```text
D = [[0, 5, 1, 20],
     [20, 0, 1, 1],
     [20, 20, 0, 5],
     [5, 20, 20, 0]]
```

Valid initial route [0,1,2,3,0] cost 16. Reversal [1..2] memberi [0,2,1,3,0] cost 27 walau boundary-only shortcut mengira improvement 8. Candidate tersebut harus ditolak; fixture ini untuk standalone 2-Opt, tidak mengklaim initial route berasal dari NN fixture ini.

### Additional fixtures

- All off-diagonal=1 untuk lowest-index NN tie: [0,1,2,...,n,0].
- 0/1/2 customer, empty matrix rejected, invalid route, asymmetric/symmetric inputs.
- Best-improvement fixture: enumerasi semua candidates secara independen, pastikan accepted move terbaik, bukan sekadar yang pertama membaik.
- Fixture ACO historis tersedia pada [commit arsip](https://github.com/ArdhanKurniawan/courier-route-planner/commit/259533e20e926ddc65188c1bd71ae920652d2f55).

## 10. Property/invariant tests

Generated finite matrices, termasuk matriks asimetris, harus menghasilkan valid closed tours dan mempertahankan input. Recompute directed cost secara independen dan verifikasi jarak Hybrid tidak melebihi baseline NN. Exhaustive enumeration pada fixture kecil dapat dipakai sebagai test oracle.
