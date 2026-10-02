# 33 — ALGORITHM SPECIFICATION

**Status:** Approved implementation contract, 2026-10-02; belum merupakan implementasi.
Rujukan: [research decisions](32_RESEARCH_DECISIONS.md), [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md), [matrix contract](34_OSRM_DISTANCE_CONTRACT.md).

## 1. Common optimizer input contract

Input geografi optimizer hanya **DistanceMatrix** yang sudah divalidasi, ditambah parameter algoritma/seed bila diperlukan. Tidak ada coordinates, provider, HTTP, DB, atau UI dalam core. Metadata ID/hash dipetakan application layer di luar solver.

```ts
type DistanceMatrix = ReadonlyArray<ReadonlyArray<number>>;
type Route = ReadonlyArray<number>;
type NNTwoOptDiagnostics = Readonly<{
  nnInitialDistanceM?: number;
  twoOptPasses?: number;
  acceptedImprovements?: number;
}>;
type AntSystemDiagnostics = Readonly<{
  iterationsCompleted?: number;
  bestIteration?: number;
}>;
type AntSystemParameters = Readonly<{
  alpha: number;
  beta: number;
  rho: number;
  Q: number;
  tau0: number;
  antCount: number;
  maxIterations: number;
}>;
type OptimizerResult = Readonly<{
  route: Route;
  totalDistanceM: number;
  algorithm: 'NN_2OPT' | 'ACO';
  diagnostics?: NNTwoOptDiagnostics | AntSystemDiagnostics;
}>;
```

Ini conceptual types, bukan file source yang sudah tersedia. Seed dan PRNG version harus eksplisit pada pemanggilan ACO dan run metadata. Core tidak boleh import `next/*`, React, Leaflet, Drizzle/TiDB, OSRM HTTP client, atau session/cookies. Tidak boleh memutasi matrix atau initial route milik caller.

## 2. Directed matrix and route distance

Untuk n customer, N=n+1 node, depot index **0**, customer indices **1..n**. Matrix NxN, N>=1, diagonal 0, off-diagonal finite dan nonnegative, tanpa null/unreachable. Matrix kosong ditolak. Symmetric fixtures boleh, tetapi symmetry bukan syarat input: d(i,j) dapat berbeda dari d(j,i).

Untuk route R=(r0,...,r(n+1)), r0=r(n+1)=0:

```text
L(R) = sum(k=0..n) D[r_k][r_(k+1)]     [meter]
```

Gunakan seluruh directed edges, termasuk return edge ke depot. Jangan round matrix sebelum optimasi; pembulatan hanya display. Penjumlahan yang overflow/non-finite adalah error.

ACO dengan eta=1/d memerlukan off-diagonal distance positif pada kasus nontrivial. Matrix dengan zero off-diagonal dapat lolos validasi bentuk/jarak umum, tetapi harus ditolak pada ACO preflight dengan error eksplisit. Jangan diam-diam memasukkan epsilon, mengganti jarak, atau menggabungkan customer. Aturan penerimaan koordinat yang menyebabkan zero distance harus diselesaikan sebelum freeze data formal; semua algoritma memakai eligibility dataset yang sama.

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

Main comparison menggunakan **Classical Ant System**, tanpa 2-Opt setelah ACO, tanpa elitist/best-only deposit, ACS local update, atau Max-Min clipping tersembunyi.

### Explicit parameters and validation

- alpha, beta: finite >=0;
- rho (evaporation fraction): finite, 0<rho<1;
- Q, tau0: finite >0;
- antCount, maxIterations: positive safe integers;
- seed: eksplisit dalam format yang didukung seeded PRNG version yang dicatat.

Tidak ada nilai numerik final/default ilmiah di specification ini. Runner formal mewajibkan parameter lengkap dari satu global configuration yang dibekukan setelah literature justification/calibration. Numeric unit-test values harus diberi label fixture, bukan rekomendasi penelitian.

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

n=0 adalah trivial result [0,0], distance 0 tanpa division/deposit; bila diagnostic ACO disertakan, iterationsCompleted=0 dan bestIteration tidak ada. n=1/2 dengan positive off-diagonal tetap menggunakan fixed iteration contract; return edge dihitung. Formal main datasets selalu n=10/25/50.

## 6. Output and RouteValidator

Common result mengembalikan route indices, totalDistanceM dan algorithm. `diagnostics` opsional dan mengikuti algorithm; field berikut hanya dikembalikan bila diperlukan, bukan shared mandatory fields atau main research metrics baru.

| Algorithm | Optional diagnostic | Arti bila disertakan |
|---|---|---|
| NN_2OPT | nnInitialDistanceM | Full directed distance hasil NN sebelum 2-Opt, dalam meter |
| NN_2OPT | twoOptPasses | Jumlah pass evaluasi candidate yang selesai, termasuk pass terakhir tanpa improvement; 0 bila tidak ada candidate (n=0/1) |
| NN_2OPT | acceptedImprovements | Jumlah penggantian route dengan best strict improvement yang diterima; tidak menghitung pass terakhir tanpa improvement |
| ACO | iterationsCompleted | Jumlah iterasi Ant System yang selesai; maxIterations pada successful nontrivial run, 0 pada n=0 |
| ACO | bestIteration | Nomor iterasi mulai dari 1 saat final best route pertama ditemukan; tidak ada pada n=0 |

`iterationsCompleted` tidak dipakai untuk NN/2-Opt dan tidak disamakan dengan twoOptPasses atau acceptedImprovements. Diagnostic tidak mengubah stopping criterion atau failure policy; run parsial tetap failure. Application menambahkan matrix/input hash, node identity mapping, version, params, seed, run number, timer, status, dan environment metadata.

RouteValidator independen memeriksa:

- panjang n+2, integer indices dalam 0..n;
- depot 0 hanya start/end (trivial [0,0] valid);
- setiap customer tepat sekali, tanpa hilang/duplikat;
- full directed distance dapat direkomputasi dan finite;
- reported distance cocok dengan recomputation; bila floating tolerance digunakan untuk assertion, document precision dan jangan menggunakannya untuk menerima worsening 2-Opt;
- caller input tidak berubah.

Route invalid tidak boleh diperbaiki dengan dedupe/reordering setelah solver lalu dilaporkan sebagai hasil asli.

## 7. Timer boundaries

Runner controlled local environment melakukan matrix load/hash verification, external validation dan penyusunan parameter sebelum timer. Timer monotonic high-resolution membungkus pemanggilan algoritma saja. NN+2-Opt diukur sebagai satu pipeline; ACO mencakup PRNG initialization, pheromone initialization, konstruksi ant, update, dan best tracking. Tidak ada cached solver state antar repetition.

Independent post-run RouteValidator, persistence, aggregation, serialization, OSRM/HTTP/network, DB, geometry generation, dan Leaflet/rendering berada di luar timer. Pemeriksaan internal yang memang dilakukan solver tetap termasuk computation. Ikuti 5 warm-ups dan 30 repetitions pada [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md).

## 8. Error taxonomy

| Code | Boundary / meaning |
|---|---|
| DISTANCE_MATRIX_INVALID | Shape, diagonal, range, non-finite, null/unreachable invalid |
| ALGORITHM_PARAMETER_ERROR | Parameter/seed tidak sesuai contract |
| ALGORITHM_DISTANCE_DOMAIN_ERROR | Nontrivial ACO input mengandung zero off-diagonal |
| ALGORITHM_NUMERICAL_ERROR | Non-finite route sum, invalid probability/pheromone |
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
- Seeded ACO repeatability, invalid params, zero off-diagonal rejection, finite probabilities/pheromone; directed deposit termasuk return edge dari **semua** ants.

## 10. Property/invariant tests

Generated finite matrices (positive off-diagonal untuk ACO), termasuk asymmetric, harus selalu menghasilkan valid closed tours, preserve input, dan cost recomputation cocok. 2-Opt tidak lebih buruk dari NN. ACO fixed-seed result identik; jangan mewajibkan ACO mengalahkan NN atau mencapai optimum pada setiap fixture. Pada small instance boleh exhaustive enumeration sebagai test oracle tanpa mengubah metode penelitian.
