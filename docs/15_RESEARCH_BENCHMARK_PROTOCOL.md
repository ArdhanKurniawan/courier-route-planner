# 15 — RESEARCH BENCHMARK PROTOCOL v1

**Status:** Accepted working protocol, 2026-10-02.
Authority: [research decisions](32_RESEARCH_DECISIONS.md). Solver contract: [docs/33](33_ALGORITHM_SPECIFICATION.md). Formal input: [docs/34](34_OSRM_DISTANCE_CONTRACT.md). Pelaksanaan formal menunggu implementasi, verification, dan penyelesaian keputusan OPEN; dokumen ini bukan hasil eksperimen.

## 1. Research comparison and RQ

Bandingkan Hybrid Nearest Neighbor → best-improvement 2-Opt dengan ACO / Classical Ant System. Tidak menambah 2-Opt setelah ACO pada main comparison.

- **RQ1:** Bagaimana perbandingan total jarak rute yang dihasilkan Hybrid Nearest Neighbor–2-Opt dan Ant Colony Optimization pada jumlah customer yang berbeda?
- **RQ2:** Bagaimana perbandingan waktu komputasi Hybrid Nearest Neighbor–2-Opt dan Ant Colony Optimization ketika jumlah customer meningkat?
- **RQ3:** Seberapa besar variasi hasil Ant Colony Optimization pada pengujian berulang, dengan hasil Hybrid Nearest Neighbor–2-Opt sebagai referensi deterministik?

## 2. Four phases and exit evidence

### Phase A — Algorithm Verification

Sebelum mengukur performa ilmiah, buktikan matrix/route invariants, NN directed minimum + lowest-index tie, best-improvement 2-Opt full directed recomputation, dan Classical Ant System seeded behavior. Jalankan 0/1/2 customer, known small instances, asymmetric fixtures dan tests dalam docs/14 serta docs/33. Tidak menafsirkan test fixtures sebagai evaluation datasets.

Exit: semua correctness checks pass, versi implementasi/PRNG dicatat, independent route-distance recomputation tersedia.

### Phase B — ACO Calibration

Gunakan relevant literature atau small calibration experiment untuk nilai numerik ACO; jangan mengarang final defaults. Calibration cases **wajib terpisah** dari main evaluation: identitas, generation seeds, coordinates/input hashes, matrix hashes dan tujuan split dicatat.

Dokumentasikan candidate configurations, selection criterion dan anggaran calibration sebelum membandingkan hasil. Setelah calibration, **freeze satu global configuration** (alpha, beta, rho, Q, tau0, antCount, maxIterations). Jangan memilih konfigurasi berbeda agar N10/N25/N50 menang. Calibration results dan alasan pemilihan disimpan.

Exit: global configuration, sumber/hasil calibration, serta pemisahan calibration/evaluation dapat diaudit.

### Phase C — Pilot

Periksa kemampuan provider menghasilkan N+1 node matrix, routability, correctness, durasi keseluruhan runner, memory, timer resolution, dan raw export. Gunakan pilot cases yang diidentifikasi terpisah dari main evaluation; jika pilot memicu retuning, kembali ke Phase B sebelum main dibekukan.

Pilot menentukan apakah **N=100 / 100 customers** feasible sebagai conditional/optional experiment. Ini tidak menjadikan N=100 mandatory main experiment. clustered/circular/directional dapat dipilih sebagai additional experiments dengan rencana terpisah; jangan menyebutnya core novelty.

Exit: pipeline dapat menyimpan/replay exact matrix, hardware/runtime tercatat, seed lists dan run schedule ditetapkan, pilihan eksperimen tambahan dicatat sebelum dijalankan.

### Phase D — Main Experiment

| Jumlah customer (tanpa depot) | Independent random datasets |
|---|---:|
| 10 | 10 |
| 25 | 10 |
| 50 | 10 |
| Total | 30 |

Primary generation pattern **random**. clustered, circular, directional adalah optional engineering/additional support. Jangan menjadikan semua pattern atau N=100 sebagai mandatory primary design.

Per dataset: ACO **30 independent seeded runs**; NN+2-Opt **satu deterministic quality output + 30 measured timing repetitions**; **5 warm-up executions per algoritma** sebelum measured runtime. Main mencakup 900 ACO measured runs dan 900 NN+2-Opt timing samples ketika semua run berhasil. Repetitions dalam satu dataset tidak menambah jumlah independent datasets.

## 3. Dataset generation and split

Setiap dataset memiliki generation seed dan generator version. Catat depot/study area, pattern=random, radius/bounds/config, customer identities dan original coordinates. Main datasets dibuat independen sesuai generation procedure yang dibekukan; jangan menyeleksi dataset berdasarkan algoritma mana yang menang.

Same generator/version + seed + depot/config harus mereproduksi points. Latitude/longitude mentah tidak dipakai sebagai Cartesian kilometer. Coordinate/routability checks dan penanganan rejected/zero-distance points ditetapkan sebelum generation; log setiap rejection/replacement. Perubahan titik pada snapshot frozen membuat case baru.

Calibration, pilot, dan main case lists disimpan secara terpisah dan diperiksa agar evaluation input tidak dipakai untuk tuning. Generator pattern tambahan tidak otomatis masuk main list.

## 4. Freeze and same-matrix fairness

```text
Editable Scenario
→ Immutable Benchmark Case + ordered point snapshots + input_hash
→ road validation + OSRM Table Service
→ validated frozen directed road-network matrix + matrix_hash
→ exact same matrix → NN+2-Opt / Classical Ant System
```

Canonical unit **meter**, depot index=0, stable customer indices, NxN termasuk depot, diagonal zero, finite valid values, no null/unreachable. Tidak ada asumsi symmetry. Common ACO preflight menolak zero off-diagonal tanpa mengganti metric.

Simpan provider/profile/options/version, node order, original/snapped-coordinate evidence, matrix values dan generation timestamp/provenance yang tersedia. Matrix sudah frozen sebelum formal execution; matrix/input hashes harus cocok pada kedua algoritma. Jangan request ulang OSRM per algoritma/run. Geometry terpisah dari hasil distance matrix.

## 5. Seed and state policy

Seed list predetermined dan disimpan sebelum measured runs. Contoh konseptual 10001..10030 bukan final seed list otomatis. Timestamp seeds dilarang. Generation seeds, warm-up seeds, calibration seeds dan measured ACO seeds diberi role jelas.

Setiap measured ACO run menginisialisasi PRNG/pheromone baru dari seed yang tercatat, dengan configuration global yang sama. Tidak carry-over state dari run/warm-up lain. Simpan PRNG algorithm/version; ulangi seed list yang sama untuk reproduction. Jangan hanya memilih seed yang menghasilkan jarak pendek.

NN+2-Opt deterministik dengan depot=0, directed nearest distance dan lowest-index tie-break; best-improvement 2-Opt memakai enumerasi deterministik dan full distance recomputation. Semua timing repetitions harus memberi quality result yang sama.

## 6. Environment and timer boundary

Formal benchmark dijalankan pada machine/runtime terkontrol, tidak bergantung pada runtime Vercel. Catat OS, CPU, RAM, Node/runtime version, code commit SHA, PRNG version, power/performance mode, process/load condition, timer unit/resolution, dan execution schedule. Gunakan kondisi dan machine yang sama untuk comparison; jangan menjalankan workloads paralel yang mengganggu timing.

```text
load + validate frozen matrix / verify hashes / prepare params
start high-resolution monotonic timer
algorithm(matrix, params, seed) → result
stop timer
independent RouteValidator + persistence + summaries/export
```

NN+2-Opt diukur sebagai satu pipeline. ACO timing mencakup initialisasi PRNG/pheromone, ant construction, iteration updates dan best tracking. Core internal checks tetap bagian solver execution.

Formal timer **mengecualikan** OSRM request, DB, HTTP/network, serialization, external preflight/hash checks, independent post-run validation, route geometry generation, Leaflet/rendering, serta aggregation. Jangan mengambil timing HTTP endpoint sebagai algorithm time.

Tetapkan dan simpan urutan eksekusi sebelum measured runs; catat gangguan machine. Jangan memilih sampel tercepat saja.

### Predetermined balanced execution order

Untuk **MAIN evaluation datasets**, bekukan urutan dataset dan pemetaan ordinal 1..30 ke benchmark_case_id sebelum measured runs. Simpan pemetaan ini beserta urutan algorithm blocks dalam experiment manifest / execution schedule agar dapat direproduksi.

| Ordinal dataset | Urutan measured blocks |
|---|---|
| Ganjil | NN+2-Opt → ACO |
| Genap | ACO → NN+2-Opt |

Contoh: D01 menjalankan NN+2-Opt → ACO, D02 ACO → NN+2-Opt, D03 NN+2-Opt → ACO, dan seterusnya; D01/D02/D03 adalah label ordinal pada daftar yang dibekukan. Jalankan **5 warm-ups untuk algorithm block terkait tepat sebelum measured block-nya**, sesuai bagian 7. Selesaikan measured block (30 repetitions/runs) sebelum beralih ke algoritma berikutnya. Jangan interleave individual runs atau randomize execution order saat runtime.

Balancing ini mengurangi systematic execution-order / thermal/runtime bias pada RQ2, tanpa menjamin seluruh environmental noise hilang. Aturan machine/environment, state reset dan pencatatan gangguan tetap berlaku.

## 7. Warm-up and repetitions

Lakukan **5 warm-up executions** untuk setiap algoritma pada setiap dataset sebelum measured block. Simpan warm-up policy dan role/seed bila stochastic. Hasil/timing warm-up tidak masuk statistical research results.

- NN+2-Opt: satu quality output (dapat berasal dari measured run pertama yang valid) dan 30 measured timing samples; verifikasi route/cost konsisten.
- ACO: 30 independent seeded runs, masing-masing menyumbang quality dan runtime.
- Reset seluruh per-run algorithm state. Pembacaan snapshot sekali ke memory boleh; reuse hasil solver atau pheromone antar runs dilarang.

## 8. Metrics and aggregation

Hitung per dataset terlebih dahulu; dataset-level summaries adalah independent scenario-level observations. **Jangan memperlakukan 30 ACO runs sebagai 30 independent datasets.** Laporkan per ukuran masalah dari 10 dataset, tanpa menyembunyikan variasi antar dataset dengan pooling seluruh runs.

| RQ | Primary descriptive output per dataset |
|---|---|
| RQ1 quality | NN+2-Opt distance; ACO mean, median, best, worst, SD |
| RQ2 time | NN+2-Opt 30 samples dan ACO 30 runtimes: mean, median, SD; min/max optional |
| RQ3 stability | ACO mean, median, best, worst, range, SD, CV |

**Primary comparison menggunakan ACO median dan/atau mean.** Best-of-30 tetap dilaporkan sebagai additional result, bukan satu-satunya pembanding dengan satu deterministic NN result.

Untuk m successful samples, mean=sum(x)/m, median=nilai tengah (rata-rata dua tengah bila m genap), sample SD=sqrt(sum((x-mean)^2)/(m-1)), range=max-min, CV=SD/mean (tulis sebagai rasio atau ×100% secara eksplisit). SD undefined bila m<2; CV undefined bila mean=0. Nilai undefined dilaporkan demikian, bukan diubah menjadi nol. Tidak ada threshold CV baik/buruk tanpa scientific source.

Inferential testing tidak dikunci di protocol ini. Jika ditambahkan, tetapkan metode/asumsi dan unit dataset dengan review metodologi; jangan menjadikan within-dataset runs sebagai observasi independen untuk memperbesar sample size.

## 9. Formal failed-run and poor-run policy

- Valid tetapi poor result wajib dipertahankan. Dilarang mengganti seed/run untuk memperbaiki hasil.
- Simpan planned run identity, params, seed, matrix hash, status, failure reason dan timestamp untuk semua attempt.
- Invalid route, non-finite output, interrupted run atau exception ditandai failed; tidak diberi distance/time nol palsu dan tidak dianggap success.
- Investigasi kegagalan correctness/input sebelum meneruskan main. Jika perlu rerun, simpan attempt asli, alasan dan versi; jangan overwrite. Dataset dengan kurang dari 30 successful planned measured runs ditandai incomplete, tidak diam-diam diklaim memenuhi desain lengkap.
- Summary sementara boleh atas successful samples jika sample count, planned count dan failure count ditampilkan jelas. Final formal comparison menunggu resolusi atau laporan keterbatasan yang eksplisit.
- Failure infrastruktur sebelum freeze adalah data-generation failure; tidak dicampur sebagai measured algorithm result.

## 10. Raw persistence and export

Raw results disimpan sebelum summaries. Simpan matrix snapshot terpisah dan referensikan secara immutable; lihat [database design](08_DATABASE_DESIGN.md).

Minimal export:

```text
benchmark_case_id, distance_matrix_id, input_hash, matrix_hash
dataset_role, pattern, customer_count, generation_seed
algorithm, algorithm_version, prng_version, parameters_json
run_number, attempt, seed, run_role, status, error_code
route, total_distance_m, execution_time_ms
git_commit_sha, environment_reference
```

Format exact physical columns ditetapkan pada task implementation; semua informasi di atas harus dapat diambil tanpa live orders. Preserve raw run data, route indices/point mapping, failure records, configuration, seed lists, machine metadata, dan frozen matrices. Recompute route distance secara independen dan cocokkan hash sebelum analisis.

## 11. Scientific reporting and open decisions

Laporkan hasil berdasarkan evidence, misalnya “median ACO lebih rendah pada dataset ...”. Jangan klaim optimum tanpa bukti, superiority universal, atau gap “belum pernah dibandingkan”. Working gap dan RQ tetap sesuai docs/32.

OPEN sebelum generation/main: numeric ACO config dan evidence, exact depot/study area/sampling-routability acceptance, public vs local/self-hosted OSRM final provenance, N=100 feasibility, dan pilihan additional scenarios. Main counts, 30 seeded runs, 30 timing repetitions, 5 warm-ups, directed frozen matrix, serta Classical Ant System sudah dikunci.
