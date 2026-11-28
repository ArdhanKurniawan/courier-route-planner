# 32 — RESEARCH DECISIONS & OPEN QUESTIONS

**Status — 2026-11-28.** Keputusan owner menetapkan lingkup aktif proyek. RQ, research gap, dan rancangan evaluasi di bawah masih berupa proposal untuk validasi akademik. [Protokol evaluasi](15_RESEARCH_BENCHMARK_PROTOCOL.md) · [Kontrak algoritma](33_ALGORITHM_SPECIFICATION.md) · [Kontrak matriks](34_OSRM_DISTANCE_CONTRACT.md)

## 1. Keputusan scope MVP

- Hybrid Nearest Neighbor + 2-Opt menjadi satu-satunya metode optimasi aktif. Rute awal NN menjadi baseline untuk mengukur perbaikan 2-Opt dalam pipeline yang sama.
- Problem tetap single-depot closed-tour TSP. Rute berangkat dari Depot, mengunjungi setiap customer tepat sekali, lalu kembali ke Depot.
- Input formal berasal dari frozen Benchmark Case dan satu frozen OSRM Table distance matrix yang immutable. Matriks berarah dalam meter, dengan Depot indeks 0, node order stabil, input hash, dan matrix hash.
- Run Optimization, Experiments, Results, dan Export tetap menjadi target pengembangan.
- ACO Classical Ant System ditunda sebagai Future Development. Implementasi offline tersimpan pada [commit arsip](https://github.com/ArdhanKurniawan/courier-route-planner/commit/259533e20e926ddc65188c1bd71ae920652d2f55). Integrasi berada di luar scope MVP dan kelanjutan pengembangan tidak bergantung padanya. [Issue #75](https://github.com/ArdhanKurniawan/courier-route-planner/issues/75)

## 2. Posisi penelitian dan research gap

Studi yang diusulkan mengukur perubahan kualitas rute dari baseline NN setelah best-improvement 2-Opt diterapkan pada biaya jaringan jalan berarah. Kontribusi yang ditargetkan adalah hasil empiris terkontrol, input serta hasil yang dapat diaudit, dan Web Admin untuk menyiapkan dan menampilkan eksperimen.

Research gap masih memerlukan validasi literatur dan akademik. Petakan studi yang relevan berdasarkan problem, data, metode jarak, ukuran, pendekatan 2-Opt, metrik, dan keterulangan hasil. Hindari klaim novelty, keunggulan, atau optimum global tanpa bukti yang sesuai. [Source references](27_SOURCE_REFERENCES.md)

## 3. Usulan research questions

- **RQ1:** Seberapa besar pengurangan total jarak setelah penerapan 2-Opt pada rute awal Nearest Neighbor?
- **RQ2:** Bagaimana waktu komputasi Hybrid NN + 2-Opt pada jumlah customer yang berbeda?
- **RQ3:** Bagaimana pengaruh jumlah customer terhadap efektivitas perbaikan rute menggunakan 2-Opt?

## 4. Rancangan evaluasi awal

| Unsur | Usulan |
|---|---|
| Ukuran awal | 10, 25, dan 50 customer, di luar Depot. |
| Input berpasangan | Rute awal NN dan tur hasil 2-Opt memakai Benchmark Case, node order, dan matriks yang sama. |
| Kualitas rute | Jarak NN awal, jarak Hybrid, perbaikan absolut dalam meter, dan persentase perbaikan. |
| Skalabilitas | Waktu komputasi Hybrid dan perubahan efektivitas perbaikan menurut jumlah customer. |
| Kontrol | Depot/study area, prosedur generator, provider lock, profil jaringan, versi solver, hardware/runtime, dan timer boundary. |

Dataset adalah unit observasi. Pengulangan timing pada dataset identik dapat membantu mengukur variasi runtime dan tetap dihitung sebagai pengukuran dari dataset yang sama. Data valid dengan perbaikan kecil atau nol, serta percobaan gagal, dipertahankan.

Runner formal memakai environment terkontrol di luar runtime Vercel. OSRM, DB, HTTP/network, serialization, geometry, dan rendering berada di luar timer solver. OSRM Table membentuk input, sedangkan OSRM Route/geometry tetap terpisah untuk visualisasi.

## 5. Keputusan yang masih memerlukan validasi

- Research gap berbasis literatur dan wording final RQ.
- Jumlah dataset independen per ukuran, prosedur sampling, lokasi studi, dan kriteria routability.
- Jumlah warm-up dan repetisi, urutan eksekusi, ringkasan statistik, serta metode analisis.
- Format pelaporan perubahan efektivitas berdasarkan jumlah customer dan kebutuhan eksperimen tambahan.
- Provider yang memenuhi kontrak, profil, dan provenance yang cukup untuk pengumpulan data formal. Prioritas provider adalah rencana engineering. [Kontrak OSRM](34_OSRM_DISTANCE_CONTRACT.md)

## 6. Keputusan historis

Rancangan 2026-10-02 membandingkan NN + 2-Opt dan Classical Ant System. Rancangan itu mencatat 10 dataset per ukuran, kalibrasi ACO terpisah, 30 seeded runs ACO, 30 timing repetitions NN + 2-Opt, dan 5 warm-up. Rancangan itu **superseded untuk evaluasi aktif**. Riwayat keputusan dan spesifikasi ACO tetap tersedia. [Keputusan 2026-10-02](https://github.com/ArdhanKurniawan/courier-route-planner/blob/c5b8684b57141da0ccf196533e3a4bf25de4c5b8/docs/32_RESEARCH_DECISIONS.md) · [Issue #75](https://github.com/ArdhanKurniawan/courier-route-planner/issues/75)
