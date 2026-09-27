# 15 — RESEARCH BENCHMARK PROTOCOL

Dokumen ini menjaga penelitian agar tidak berubah menjadi sekadar demo software.

## 1. Research comparison

Methods:

- Hybrid Nearest Neighbor + 2-Opt.
- Ant Colony Optimization.

Primary metrics:

- total distance;
- execution time;
- scalability terhadap number of customers;
- consistency/stability ACO.

## 2. Fair comparison rule

Untuk setiap case:

```text
Frozen input
→ ONE distance matrix
→ NN+2Opt
→ ACO
```

Tidak boleh masing-masing algoritma membangun input berbeda.

## 3. Candidate scenarios

Initial engineering support:

```text
10
25
50
100 customers
```

Pattern:

```text
random
clustered
circular
directional
```

Jumlah final harus dikonfirmasi berdasarkan literatur/dosen.

## 4. Dataset generation

Setiap generated scenario memiliki seed.

Reproducibility:

```text
same generator version
+ same seed
+ same depot
+ same config
= same points
```

## 5. Freeze before benchmark

Sebelum run:

- snapshot depot;
- snapshot customers;
- canonical order point IDs;
- compute input hash;
- record distance metric/version;
- record git SHA.

## 6. Coordinate/distance methodology

**Belum boleh difinalkan hanya dari engineering assumption.**

Research source menyatakan latitude/longitude tidak boleh asal diperlakukan sebagai Cartesian kilometer.

Sebelum formal benchmark:

- pilih transformasi/projection/distance formulation berdasarkan literature;
- dokumentasikan unit;
- version implementation;
- lock setelah review dosen.

## 7. Timing methodology

Formal execution time diukur dengan high-resolution monotonic timer pada machine yang sama.

Record:

- OS;
- CPU;
- RAM;
- Node version;
- commit SHA;
- power/performance mode bila relevan;
- process condition sederhana.

Jangan gunakan network/database time di dalam algorithm timing.

Recommended timing boundary:

```text
start timer
→ algorithm(matrix, params)
→ stop timer
```

DB load/save di luar timer.

## 8. Warm-up

Untuk benchmark runtimes JS, pertimbangkan warm-up runs agar JIT/cold initialization tidak mendominasi. Method final harus konsisten dan ditulis di laporan.

## 9. ACO repetitions

ACO stochastic harus multi-run. Initial engineering recommendation adalah **30 independent runs per case/configuration**, tetapi angka final harus dikonfirmasi metodologi/literatur/dosen.

Record minimal:

- best;
- mean;
- median;
- standard deviation;
- min/max;
- execution time distribution.

## 10. NN+2Opt repetitions

Jika deterministic, satu result route cukup untuk quality, tetapi runtime sebaiknya diulang beberapa kali untuk timing analysis jika execution-time comparison menjadi klaim utama.

## 11. Random seed policy

- seeds disimpan;
- seed list sama antar rerun;
- jangan memilih hanya seed yang menghasilkan ACO terbaik;
- jangan discard failed/poor run tanpa rule pre-defined.

## 12. Parameter tuning

Jangan tune ACO pada test case lalu melaporkan case yang sama seolah unbiased evaluation.

Pisahkan bila memungkinkan:

```text
tuning cases
vs
evaluation cases
```

Untuk scope S1 kecil, minimal dokumentasikan parameter source dan jangan melakukan cherry-picking.

## 13. Validity checks

Setiap run harus:

- valid closed tour;
- all customers exactly once;
- distance recomputed independently;
- no NaN;
- status success.

Invalid run jangan diganti diam-diam; catat sebagai error dan investigasi.

## 14. Output format

CSV export columns minimal:

```text
benchmark_case_id
pattern
customer_count
algorithm
algorithm_version
run_number
seed
total_distance_m
execution_time_ms
parameters_json
input_hash
git_commit_sha
```

## 15. Scientific wording

Hindari:

- “ACO paling optimal”.

Gunakan:

- “ACO menghasilkan rata-rata jarak lebih rendah pada skenario ...”;
- “NN+2Opt memiliki execution time lebih rendah pada ...”;
- “hasil berbeda menurut pola distribusi ...”.
