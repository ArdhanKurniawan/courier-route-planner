# 32 — RESEARCH DECISIONS

**Status:** Accepted working research contract, keputusan manusia 2026-10-02.
Dokumen ini menetapkan arah penelitian; prosedur eksekusi ada di [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md), kontrak algoritma di [specification](33_ALGORITHM_SPECIFICATION.md), dan input jalan di [OSRM contract](34_OSRM_DISTANCE_CONTRACT.md). Ini target yang disetujui, bukan klaim fitur sudah diimplementasikan.

## 1. Research context

Web Admin Courier Route Planner membantu admin menyiapkan customer, menghasilkan urutan kunjungan, dan membandingkan Hybrid Nearest Neighbor → 2-Opt dengan Ant Colony Optimization (ACO), varian Classical Ant System.

## 2. Problem statement

Satu depot menjadi awal dan akhir: Depot → Customer → ... → Customer → Depot. Setiap customer dikunjungi tepat sekali. Problem adalah multi-stop route sequencing / TSP-like closed tour. Jumlah customer tidak termasuk depot.

## 3. Why the problem matters / urgency

Admin perlu menentukan urutan banyak tujuan dan menilai jarak serta waktu komputasi metode yang dipakai. Perbandingan terkontrol memberi dasar pemilihan metode pada konteks studi. Pengurangan biaya, jarak, atau waktu operasional belum boleh diklaim sebelum ada pengukuran.

## 4. Existing research position

Studi terdahulu telah membandingkan NN/NN+2-Opt dan ACO pada TSP dan konteks optimasi lain. Posisi ini tidak mengklaim pasangan metode sebagai penemuan baru.

**TODO-LIT-01:** petakan studi pembanding yang benar-benar dibaca: sitasi, problem, input jarak, ukuran, varian, parameter, repetitions, dan metrics. Daftar bibliografi yang memadai belum tersedia di repository; lihat [source references](27_SOURCE_REFERENCES.md). Jangan membuat sitasi fiktif.

## 5. Research gap

Working gap: bukti perbandingan empiris terkontrol dalam konteks pengiriman multi-customer dengan input road-network identik, beberapa ukuran masalah, route quality, computation time, repeated stochastic stability, dan implementasi Web Admin masih terbatas. Frasa **masih terbatas** adalah posisi kerja yang harus dibuktikan melalui TODO-LIT-01, bukan hasil systematic review yang sudah selesai. Hindari klaim universal “belum pernah ada”.

## 6. Research questions

- **RQ1:** Bagaimana perbandingan total jarak rute yang dihasilkan Hybrid Nearest Neighbor–2-Opt dan Ant Colony Optimization pada jumlah customer yang berbeda?
- **RQ2:** Bagaimana perbandingan waktu komputasi Hybrid Nearest Neighbor–2-Opt dan Ant Colony Optimization ketika jumlah customer meningkat?
- **RQ3:** Seberapa besar variasi hasil Ant Colony Optimization pada pengujian berulang, dengan hasil Hybrid Nearest Neighbor–2-Opt sebagai referensi deterministik?

RQ ini tidak boleh diganti diam-diam oleh agent implementasi.

## 7. Research objectives

1. Membandingkan total jarak NN+2-Opt dengan mean/median ACO pada tiap ukuran customer.
2. Membandingkan distribusi waktu eksekusi algoritma pada environment terkontrol.
3. Mengukur variasi hasil ACO antar seed dengan NN+2-Opt sebagai referensi deterministik.

## 8. Contribution

Kontribusi yang ditargetkan adalah evidence empiris terkontrol, snapshot input/matrix dan raw results yang dapat diaudit, serta Web Admin untuk menyiapkan dan menampilkan eksperimen. Pattern generator tambahan dan penggunaan dua algoritma bukan klaim novelty dengan sendirinya.

## 9. Independent, dependent, and control variables

| Jenis | Variabel |
|---|---|
| Independent | Metode (NN+2-Opt vs Classical Ant System), jumlah customer (10/25/50) |
| Dependent | Total distance meter, algorithm execution time, variasi jarak ACO antar run |
| Control | Depot/study area dan generation procedure yang dibekukan; node order, input dan matrix hash identik dalam tiap comparison; satu konfigurasi ACO global; daftar seed predetermined; versi algoritma/PRNG; hardware/runtime dan timing policy |

Dataset adalah unit observasi scenario. Tiga puluh run ACO pada satu dataset adalah pengulangan stochastic, bukan tiga puluh dataset independen.

## 10. Primary experiment design

| Customer count | Independent evaluation datasets | Pattern |
|---|---:|---|
| 10 | 10 | random |
| 25 | 10 | random |
| 50 | 10 | random |
| Total | 30 | Main evaluation |

- N=100 / **100 customers** conditional/optional setelah pilot feasibility; tidak wajib main experiment.
- clustered, circular, directional boleh didukung engineering generator, tetapi optional/additional experiments dan bukan core novelty.
- Calibration datasets wajib terpisah dari main evaluation. Freeze satu global ACO configuration setelah calibration; jangan memilih configuration berbeda untuk memenangkan N10/N25/N50.
- ACO: **30 independent seeded runs per main dataset**, seed list ditentukan dan disimpan sebelum measured runs. Timestamp seed dilarang.
- NN+2-Opt: satu deterministic quality result dan **30 measured timing repetitions** per dataset.
- **5 warm-up executions** per algoritma per dataset sebelum measured runtime; hasil warm-up tidak masuk statistik penelitian.
- Formal input adalah satu frozen OSRM road-network distance matrix per comparison, dalam meter dan berpotensi directed/asymmetric. Tidak ada asumsi global d(i,j)=d(j,i).
- Formal benchmark dijalankan pada environment terkontrol yang dicatat, tidak bergantung pada runtime Vercel.

## 11. Primary metrics

| RQ | Laporan per dataset |
|---|---|
| RQ1: quality | NN+2-Opt total distance; ACO mean, median, best, worst, SD |
| RQ2: time | Mean, median, SD dari 30 NN+2-Opt timing samples dan runtime 30 ACO runs; min/max optional |
| RQ3: stability | ACO mean, median, best, worst, range, SD, coefficient of variation (CV) |

Primary descriptive comparison memakai ACO median dan/atau mean. Best-of-30 adalah hasil tambahan, tidak dijadikan satu-satunya pembanding terhadap NN+2-Opt. Jangan menetapkan threshold CV baik/buruk tanpa sumber ilmiah. Definisi statistik dan failed-run policy ada di protocol v1.

## 12. Main scope

Web Admin, satu depot, customer dengan latitude/longitude, editable dummy orders/scenarios, immutable benchmark snapshots, frozen OSRM Table matrix, deterministic NN, best-improvement 2-Opt dengan full directed route recomputation, dan seeded Classical Ant System tanpa 2-Opt sesudah ACO pada main comparison.

OSRM adalah core input infrastructure, bukan research algorithm. OSRM Route/geometry untuk Leaflet adalah concern terpisah. Timer formal mengecualikan OSRM request, DB, HTTP/network, serialization, route geometry generation, dan rendering.

## 13. Out of scope

Shortest-path A→B sebagai problem utama, Dijkstra/A* sebagai metode penelitian, VRP multi-vehicle/multi-depot, realtime courier navigation, live traffic, dan klaim optimum global. Task sinkronisasi ini tidak mengimplementasikan produk atau menjalankan eksperimen.

## 14. Claims that MUST NOT be made

- “NN+2-Opt vs ACO belum pernah dibandingkan” tanpa literature evidence yang mendukung.
- Heuristic menghasilkan “optimal route” tanpa bukti optimum.
- Lebih cepat/pendek/stabil tanpa metric dan benchmark yang sah.
- OSRM Table distance otomatis mathematical shortest-distance route.
- Best-of-30 sebagai typical ACO performance, atau run dalam satu dataset sebagai dataset independen.
- ACO numeric defaults sudah final ketika belum ada literature/calibration record.

## 15. Decisions still OPEN

- Numerical ACO parameters, dengan justifikasi relevant literature atau small calibration experiment.
- Exact depot, study area, batas generator dan kriteria sampling/routability sebelum data final dibentuk.
- Public OSRM vs local/self-hosted untuk final data generation, berikut profile/network provenance yang akan dibekukan.
- Apakah N=100 masuk eksperimen akhir setelah pilot.
- Apakah clustered/additional scenarios dijalankan dan dilaporkan terpisah.
- TODO-LIT-01: evidence bibliografi untuk posisi/gap. Tidak boleh dianggap sudah dipenuhi oleh dokumentasi teknis platform.

Keputusan yang sudah dikunci (main counts, jumlah dataset, repetitions, warm-up, varian algoritma, input formal, dan RQ) tidak termasuk OPEN.
