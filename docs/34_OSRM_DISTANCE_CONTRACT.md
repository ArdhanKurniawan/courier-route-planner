# 34 — OSRM DISTANCE CONTRACT

**Status:** Kontrak disetujui 2026-10-02. Kandidat Phase 3B menerapkan adapter dan penyimpanan snapshot. Verifikasi provider dan migrasi live masih menunggu persetujuan.
Keputusan: [ADR-012](04_TECH_STACK_ADRS.md#adr-012--osrm-road-network-distance-matrix-for-formal-research-benchmark), [research decisions](32_RESEARCH_DECISIONS.md).

## 1. Purpose

Membentuk satu frozen road-network distance matrix yang dapat dipakai ulang oleh kedua algoritma pada comparison yang sama.

## 2. OSRM role

```text
Depot + Customer Coordinates
→ road-network validation
→ OSRM Table Service
→ validate + hash + freeze directed distance matrix
→ NN → 2-Opt / ACO (Classical Ant System)
```

OSRM Table Service adalah approved core infrastructure untuk formal research input. Persetujuan ini tidak berarti adapter sudah diimplementasikan.

## 3. OSRM is NOT the research algorithm

Penelitian membandingkan NN+2-Opt vs Classical Ant System untuk urutan customer. OSRM tidak menggantikan optimizer dengan shortest-path A→B atau OSRM Trip. Domain hanya menerima matrix, tidak memanggil OSRM.

## 4. Table Service responsibility

Adapter menghasilkan full square table untuk ordered depot+customers dan meminta distance annotation secara eksplisit. Request/response mapping, provider/profile, options, dan versi dicatat. Durations tidak boleh dipakai sebagai distance.

API OSRM v5.24 mendokumentasikan distance table sebagai jarak pada rute tercepat menurut profile, dalam meter; ini tidak otomatis merupakan shortest-distance path secara matematis. Endpoint yang dipilih harus diverifikasi kompatibilitas dan kemampuannya sebelum generation. [Official Table Service reference](https://project-osrm.org/docs/v5.24.0/api/#table-service).

## 5. Route / Geometry Service responsibility

```text
Optimizer route sequence → OSRM Route geometry → Leaflet visualization
```

Route Service menerima urutan hasil optimizer untuk visualisasi jalan. Geometri tidak mengubah urutan atau menggantikan totalDistanceM dari frozen matrix. Geometry failure tidak membatalkan hasil algoritma yang valid; UI menampilkan kegagalan geometry secara terpisah. Geometry boleh menjadi pekerjaan visualisasi tahap berikutnya. [Official Route Service reference](https://project-osrm.org/docs/v5.24.0/api/#route-service).

## 6. Coordinate validation / routability

- Latitude/longitude finite dan dalam range [-90,90]/[-180,180]. Jangan perlakukan raw lat/lng sebagai Cartesian kilometer.
- Validasi identitas customer dan tepat satu depot; duplicate identity ditolak.
- Periksa road snapping/routability sebelum freeze matrix; coordinate range valid saja tidak menjamin jalur antar semua node.
- Simpan original coordinates dan bukti returned/snapped coordinates bila tersedia. Toleransi snapping, study area, sampling/replacement rule harus ditetapkan dan dicatat sebelum data formal dibuat; jangan menebak threshold ilmiah pada implementasi.
- ACO eta=1/d memerlukan positive off-diagonal. Zero-cost pair harus dilaporkan pada common preflight sesuai [algorithm contract](33_ALGORITHM_SPECIFICATION.md); tidak boleh diubah menjadi epsilon/fallback diam-diam.

OSRM request memakai urutan longitude,latitude; adapter wajib mencegah tertukarnya lat/lng. [Official request format](https://project-osrm.org/docs/v5.24.0/api/#general-options).

## 7. Node ordering

Depot index=0. Customer memiliki stable indices 1..n dari urutan snapshot yang disimpan sebagai node_order_json. Urutan ini dibekukan sekali, dipakai untuk request rows/columns, optimizer, route reconstruction, dan hash. Jangan re-sort menggunakan live orders setelah freeze. N pada matrix adalah customer count+1.

## 8. Distance unit = meter

Canonical storage dan optimizer unit adalah **meter**. Validasi matrix NxN, diagonal 0, finite nonnegative values. Jangan round untuk display sebelum hashing/optimasi. Unit kilometer hanya konversi presentasi.

## 9. Directed / asymmetric semantics

D[i][j] adalah cost dari node i ke j. One-way roads, restrictions, dan network structure dapat membuat D[i][j] != D[j][i]. Jangan symmetrize dengan average/min/max, mirror triangular table, atau mengharuskan equality. Directed pheromone dan asymmetric-safe 2-Opt wajib mengikuti semantics yang sama.

## 10. Unreachable pair handling

Null/missing/unreachable pair, incomplete response, non-finite/negative value, wrong shape, atau nonzero diagonal membuat matrix gagal validasi dan tidak eligible untuk formal benchmark. Dilarang mengganti dengan nol, garis lurus, duration, atau fallback speed estimate. Tidak boleh menghapus customer dari snapshot diam-diam. Perbaikan coordinates menghasilkan snapshot baru; log rejection dan alasannya. Jangan lanjut satu algoritma dengan matrix lain karena provider gagal.

## 11. Input hash and matrix hash

- input_hash (coordinate/input hash): SHA-256 canonical serialization dari ordered depot/customer identities + original coordinate snapshots + configuration input yang relevan.
- matrix_hash: SHA-256 canonical serialization yang mengikat input_hash, node order, provider/profile/options, unit=meter, directed semantics, matrix values, dan serialization/contract version.
- Tetapkan satu serializer berversi dengan key order dan representasi angka deterministik; larang NaN/Infinity, normalisasi -0 menjadi 0, pertahankan array order. generated_at adalah provenance, tidak mengubah content identity.
- Hash dihitung dari actual content; jangan mengarang hash atau memakai ID DB sebagai pengganti. Perubahan value/order/unit/config harus mengubah hash yang bersangkutan.

Serializer `distance-matrix/v1` mengikat versi, provider, profile, URL endpoint, opsi, unit, directed semantics, input hash, node order, nilai matriks, dan bukti snapping dalam urutan key tetap. Timestamp generate dan metadata provenance observasional berada di luar preimage. [Golden vector dan integrity tests](../tests/unit/distance-matrix-domain.test.ts)

## 12. Freeze / immutability

Editable Scenario → immutable Benchmark Case/points → validated, frozen distance_matrices snapshot. Minimal metadata: id, benchmark_case_id, provider, profile, node_order_json, distance_matrix_json, input_hash, matrix_hash, generated_at. Detail konseptual di [database design](08_DATABASE_DESIGN.md).

Simpan juga unit/contract version dan provider/network provenance jika tersedia. Frozen matrix tidak diedit/rebuilt in place. Regeneration membentuk snapshot baru, mempertahankan history lama. Simpan snapshot sekali dan referensikan dari experiments, bukan meminta OSRM ulang untuk setiap run.

## 13. Same-matrix fairness rule

Kedua algoritma harus memakai exact matrix values, input hash, node order, dan matrix hash yang sama. Runner memverifikasi hash setelah load dan mencatat reference/hash pada setiap experiment/export. Hash mismatch menghentikan comparison. ACO dan NN tidak boleh melakukan provider request masing-masing.

## 14. Timing exclusion

OSRM request, road validation, matrix generation/load/hash, DB, HTTP/network, serialization, route geometry, serta Leaflet/rendering berada di luar formal algorithm timer. Frozen matrix dan params sudah siap di memory sebelum measured solver call. Timer formal berjalan pada environment terkontrol, tidak bergantung pada Vercel.

## 15. Reproducibility concerns

Catat generation time, endpoint identity tanpa credential, profile/options, provider/software version, dataset/OSM extract date/hash dan returned data version bila tersedia, node order, original/snapped points, input/matrix hashes, serta generation code SHA. Metadata yang tidak tersedia ditandai unavailable, tidak diisi tebakan.

Network/profile/provider dapat berubah; coordinates yang sama belum tentu menghasilkan matrix yang sama saat diminta ulang. Reproduksi **algorithm results** memakai matrix tersimpan. Reproduksi **matrix generation** membutuhkan provider/network provenance lebih lengkap dan merupakan batas reproducibility terpisah.

## 16. Public vs self-hosted / local consideration

Keputusan endpoint final masih OPEN. Evaluasi dukungan distance annotation, limits N+1 nodes, reproducibility/version pinning, availability, kebijakan penggunaan dan budget. Public service jangan diasumsikan unlimited atau stabil. Local/self-hosted memberi kontrol extract/profile tetapi membutuhkan setup/storage/compute. Pilihan dan keterbatasan wajib dicatat sebelum formal generation; tidak ada deployment OSRM pada task ini.

Untuk Phase 3B, ukuran utama 10, 25, dan 50 Order memerlukan masing-masing 11, 26, dan 51 titik termasuk Depot. Satu Table request menghasilkan 121, 676, dan 2.601 sel berarah. Ketiga ukuran lulus dengan respons sintetis. Batas `--max-table-size` OSRM dapat dikonfigurasi operator. Sebelum generasi formal, provider terpilih harus membuktikan dukungan `annotations=distance`, ukuran target, dan kebijakan pemakaian. FOSSGIS membatasi satu request per detik, melarang penggunaan berat, dan menyimpan permintaan di log. [Konfigurasi OSRM](https://project-osrm.org/docs/v26.4.0/tools) · [Kebijakan FOSSGIS](https://routing.openstreetmap.de/about.html#usage-policy)

Generasi aplikasi default nonaktif. Untuk mengaktifkannya di lingkungan yang telah disetujui, operator mengatur `DISTANCE_MATRIX_GENERATION=1`, `DISTANCE_MATRIX_OSRM_URL` ke endpoint HTTPS khusus tanpa kredensial, `DISTANCE_MATRIX_OSRM_PROFILE`, `DISTANCE_MATRIX_OSRM_MAX_POINTS` hingga 51, dan `DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M` sesuai metode penelitian. Endpoint demo FOSSGIS dan Project OSRM ditolak. Server meminta distance saja dengan radius per titik, tanpa fallback atau retry otomatis. Bukti snap sumber dan tujuan harus tersedia, menunjuk koordinat yang sama untuk indeks tersebut, dan berada dalam radius. Pemeriksaan batas bawah geometris membantu menolak waypoint yang terkait ke indeks salah. Toleransi satu meter menampung kuantisasi koordinat, dan pemeriksaan ini tidak menentukan nilai matriks. Versi software atau network extract yang tidak diberikan provider ditampilkan sebagai tidak tersedia.

Operator dapat mencatat versi dan hash extract yang sudah diverifikasi melalui `DISTANCE_MATRIX_OSRM_SOFTWARE_VERSION` dan `DISTANCE_MATRIX_OSRM_EXTRACT_SHA256`. Versi data yang dikembalikan OSRM disimpan terpisah. Generasi tidak tersedia pada Production.

## 17. Failure handling

Adapter membedakan coordinate/routability error, timeout/network error, provider error, unsupported distance response, invalid matrix, hash mismatch, dan storage/freeze failure. Retry terbatas hanya untuk transient infrastructure errors sebelum freeze dan dicatat. Jangan fallback ke metric lain atau overwrite snapshot sukses. Failed generation disimpan sebagai failure record, bukan successful benchmark case. Geometry error ditangani terpisah dari matrix/algorithm errors.

Di Phase 3B, kode kegagalan generasi dicatat di log aplikasi tanpa koordinat atau payload provider. Kegagalan validasi tidak membuat snapshot. Jika hasil penyimpanan belum pasti, cari UUID request melalui recovery read-only. Hasil kosong tetap belum terkonfirmasi. Matriks dengan nol di luar diagonal dapat ditinjau dan memuat daftar pasangan berarah yang bermasalah. Matriks tersebut tidak memenuhi syarat common comparison ACO.

Panel Distance Matrix berada di detail Benchmark Case. Route admin `/api/benchmark-cases/[id]/distance-matrices` memakai POST untuk generasi dan GET untuk riwayat. Query `requestId` melakukan recovery read-only. GET `/api/benchmark-cases/[id]/distance-matrices/[matrixId]` membaca snapshot tersimpan.

## 18. Bukti acceptance dan urutan rilis Testing

- **Phase 3A UAT di Testing lulus menurut konfirmasi owner.** Baseline `8fecbb0` mencakup [PR #72](https://github.com/ArdhanKurniawan/courier-route-planner/pull/72). Benchmark Case Testing #90001 menyimpan satu Depot dan 10 Order untuk total 11 titik. [Bukti acceptance persistence](14_TESTING_QA.md#26-live-acceptance-benchmark-case-persistence-di-testing-2026-11-25)
- **Phase 3B offline lulus.** Kandidat mencatat 284/284 tes terfokus dan 1.297/1.297 tes penuh. ESLint, typecheck, `db:check`, dan `git diff --check` lulus. Mock OSRM mencakup 11, 26, dan 51 titik. Build Turbopack lokal dihentikan saat kompilasi. Percobaan webpack gagal pada loader `icon.svg` yang tetap sama. Build standar diperiksa lewat Quality Gate.
- **Kompatibilitas sebelum `0005` berdasarkan review kode.** Detail Benchmark Case memakai pembacaan Phase 3A. Panel riwayat matriks memuat secara terpisah dan menampilkan status tidak tersedia saat tabel belum ada. Tombol generasi tetap nonaktif. Endpoint baru dapat mengembalikan `503 UNAVAILABLE` pada lookup storage sebelum sempat memanggil OSRM.

Tunggu Quality Gate PR lulus. Dengan persetujuan terpisah, terapkan `0005_distance_matrices` pada TiDB Testing dari commit kandidat yang sudah diperiksa. Verifikasi entri ledger, tabel, FK, dan indeks sebelum merge ke `testing`. Pertahankan flag generasi nonaktif ketika deployment pertama diuji. Aktivasi dilakukan setelah endpoint khusus membuktikan dukungan distance annotation dan ukuran tabel yang dipakai.
