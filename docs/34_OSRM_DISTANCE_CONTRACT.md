# 34 — OSRM DISTANCE CONTRACT

**Status:** Approved target input infrastructure, 2026-10-02. Belum ada OSRM client aktual.
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

Exact serializer implementation dan test vectors dibuat dalam task infrastructure, bukan source code pada task documentation ini.

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

## 17. Failure handling

Adapter membedakan coordinate/routability error, timeout/network error, provider error, unsupported distance response, invalid matrix, hash mismatch, dan storage/freeze failure. Retry terbatas hanya untuk transient infrastructure errors sebelum freeze dan dicatat. Jangan fallback ke metric lain atau overwrite snapshot sukses. Failed generation disimpan sebagai failure record, bukan successful benchmark case. Geometry error ditangani terpisah dari matrix/algorithm errors.
