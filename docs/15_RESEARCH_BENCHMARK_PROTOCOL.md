# 15 — RESEARCH BENCHMARK PROTOCOL v1

**Status — 2026-11-28.** Proposal revisi evaluasi Hybrid NN + 2-Opt untuk validasi akademik. Scope MVP mengikuti [research decisions](32_RESEARCH_DECISIONS.md). Kontrak solver dan input terdokumentasi pada [docs/33](33_ALGORITHM_SPECIFICATION.md) dan [docs/34](34_OSRM_DISTANCE_CONTRACT.md).

## 1. Research comparison and RQ

Ukur perbaikan dari rute awal Nearest Neighbor ke rute akhir best-improvement 2-Opt untuk setiap dataset. Keduanya memakai tur single-depot yang sama definisinya dan biaya berarah dari satu matriks immutable.

- **RQ1:** Seberapa besar pengurangan total jarak setelah penerapan 2-Opt pada rute awal Nearest Neighbor?
- **RQ2:** Bagaimana waktu komputasi Hybrid NN + 2-Opt pada jumlah customer yang berbeda?
- **RQ3:** Bagaimana pengaruh jumlah customer terhadap efektivitas perbaikan rute menggunakan 2-Opt?

Ketiganya merupakan usulan, bersama rancangan sampling, pengukuran, dan analisis di bawah.

## 2. Verification, pilot, and proposed main experiment

1. **Verification.** Periksa matrix/route invariants, nearest directed cost dan lowest-index tie, best-improvement 2-Opt dengan full recomputation, serta validator jarak independen. Gunakan fixture sintetis simetris/asimetris dan 0/1/2 customer. Catat versi implementasi.
2. **Pilot.** Gunakan dataset pilot yang diidentifikasi terpisah. Periksa provider lock, kapasitas dan routability untuk 11/26/51 titik termasuk Depot, penyimpanan serta replay exact matrix, timer, dan raw export. Catat keterbatasan sebelum membekukan daftar dataset evaluasi.
3. **Main evaluation.** Ukuran awal **10, 25, dan 50 customer**. Jumlah dataset independen per ukuran, pattern, kriteria sampling, pembagian pilot/evaluation, warm-up, repetisi timing, dan analisis masih menunggu validasi akademik.

## 3. Dataset generation and split

Catat generator/version, seed dataset bila digunakan, depot/study area, pattern, konfigurasi generation, original coordinates, serta alasan penolakan atau penggantian titik. Gunakan daftar dataset yang dibekukan dan beri label pilot atau evaluasi. Jangan memilih dataset berdasarkan besarnya perbaikan yang terlihat. Perubahan input koordinat setelah freeze menghasilkan Benchmark Case baru.

## 4. Freeze and same-matrix fairness

```text
Editable Scenario
→ Immutable Benchmark Case + ordered point snapshots + input_hash
→ OSRM Table dengan Research Provider Lock
→ immutable directed matrix dalam meter + matrix_hash
→ NN awal → best-improvement 2-Opt
```

Kedua jarak direkomputasi dari exact matrix values, node order, input hash, dan matrix hash yang sama. Verifikasi NxN dengan Depot indeks 0, diagonal 0, finite nonnegative values, dan tanpa null/unreachable. Catat actual provider, endpoint/profile/options/version, bukti snapping, serta provenance yang tersedia. Pelaksanaan Research Mode memakai satu provider yang dipilih eksplisit per matriks. Saat provider terkunci gagal, generasi berhenti dengan error. [Kontrak OSRM dan rencana provider](34_OSRM_DISTANCE_CONTRACT.md)

## 5. Determinism and run state

Nearest Neighbor dan best-improvement 2-Opt memakai aturan deterministik di [docs/33](33_ALGORITHM_SPECIFICATION.md). Untuk setiap pengukuran, mulai dari state solver baru. Snapshot tervalidasi dapat dimuat sekali ke memori. Reuse hasil solver sebagai sampel runtime berikutnya dilarang. Catat generator seed sebagai provenance dataset bila digunakan.

## 6. Environment and timer boundary

Ukur Hybrid NN + 2-Opt sebagai satu pipeline pada hardware dan runtime terkontrol di luar Vercel. Catat OS, CPU, RAM, Node/runtime, commit, timer unit/resolution, serta kondisi mesin dan urutan eksekusi.

```text
load + validate frozen matrix / verify hashes
start monotonic timer
Hybrid NN + 2-Opt(matrix) → NN initial distance + final route and distance
stop timer
independent route validation + raw persistence + aggregation/export
```

Timer mengecualikan OSRM, DB, HTTP/network, serialization, external preflight/hash checks, independent post-run validation, geometry, rendering, dan aggregation. Catat gangguan eksekusi dan simpan jadwal sebelum measured runs dimulai.

## 7. Warm-up and repetitions

Tetapkan jumlah warm-up, jumlah measured repetitions, dan aturan timing setelah pilot dan validasi akademik. Jika menggunakan warm-up, tandai terpisah dan keluarkan dari statistik measured runtime. Untuk input yang sama, verifikasi konsistensi rute dan jarak deterministik. Repetisi dalam satu dataset tetap merupakan pengukuran dari dataset yang sama.

## 8. Metrics and aggregation

| Metrik | Definisi atau usulan pelaporan |
|---|---|
| Jarak awal | Total directed distance tur NN dalam meter. |
| Jarak akhir | Total directed distance tur Hybrid dalam meter. |
| Perbaikan absolut | Jarak awal dikurangi jarak akhir, dalam meter. |
| Perbaikan persentase | Perbaikan absolut ÷ jarak awal × 100%. Jika jarak awal nol, laporkan persentase tidak terdefinisi. |
| Waktu komputasi | Elapsed time pemanggilan solver Hybrid dalam unit yang dicatat. |
| Skalabilitas dan efektivitas | Ringkasan runtime dan perbaikan menurut ukuran customer. |

Usulkan ringkasan pada level dataset dan kemudian per ukuran customer. Pemilihan statistik deskriptif, visualisasi, serta analisis inferensial jika diperlukan masih menunggu review akademik. Pertahankan hasil dengan perbaikan nol atau kecil.

## 9. Formal failed-run and poor-run policy

- Simpan identitas attempt, matrix/input hash, status, alasan gagal, dan waktu. Invalid route, non-finite output, exception, serta interupsi dilaporkan sebagai failure.
- Simpan attempt asli sebelum rerun yang beralasan. Tampilan ringkasan membedakan jumlah planned, sukses, dan gagal. Nyatakan keterbatasan jika pengukuran belum lengkap.
- Kegagalan provider, routability, atau freeze masuk catatan persiapan data. Hasil itu berada di luar measured algorithm runs.

## 10. Raw persistence and export

Simpan raw results sebelum summaries. Run Optimization, Experiments, Results, dan Export memakai ID snapshot, hash, dan actual provider provenance. [Database design](08_DATABASE_DESIGN.md)

```text
benchmark_case_id, distance_matrix_id, input_hash, matrix_hash
dataset_role, customer_count, generation_seed, generator_version
provider, profile, algorithm_version, git_commit_sha, environment_reference
run_number, attempt, run_role, status, error_code
route, nn_initial_distance_m, total_distance_m, improvement_m, improvement_pct
execution_time_ms
```

Format fisik ditetapkan pada task implementasi. Simpan informasi pemetaan indeks ke point serta provenance matriks agar rute dan biaya bisa direkonstruksi dari snapshot tersimpan.

## 11. Scientific reporting and historical protocol

Klaim empiris mengikuti evidence, seperti perbaikan yang benar-benar diamati pada satu ukuran dataset. Research gap, RQ, jumlah dataset, repetisi, warm-up, dan metode statistik memerlukan validasi akademik sebelum evaluasi formal.

Rancangan 2026-10-02 dengan ACO calibration, seeded runs, serta jadwal comparison dua metode **superseded untuk scope aktif**. Versi tersebut tersimpan sebagai [protokol historis](https://github.com/ArdhanKurniawan/courier-route-planner/blob/c5b8684b57141da0ccf196533e3a4bf25de4c5b8/docs/15_RESEARCH_BENCHMARK_PROTOCOL.md). ACO tercatat sebagai Future Development pada [Issue #75](https://github.com/ArdhanKurniawan/courier-route-planner/issues/75).
