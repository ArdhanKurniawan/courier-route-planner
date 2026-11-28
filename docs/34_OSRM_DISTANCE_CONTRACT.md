# 34 — OSRM DISTANCE CONTRACT

**Status — 2026-11-28.** Phase 3B menyediakan adapter dan penyimpanan frozen snapshot. Migration `0005` berstatus SUCCESS + VERIFIED di Testing. Generasi tetap nonaktif. Arsitektur Multi-Provider OSRM masih berupa rencana.
Keputusan: [ADR-012](04_TECH_STACK_ADRS.md#adr-012--osrm-road-network-distance-matrix-for-formal-research-benchmark), [research decisions](32_RESEARCH_DECISIONS.md).

## 1. Purpose

Membentuk satu frozen road-network distance matrix yang dipakai bersama oleh baseline Nearest Neighbor dan hasil Hybrid NN + 2-Opt.

## 2. OSRM role

```text
Depot + Customer Coordinates
→ road-network validation
→ OSRM Table Service
→ validate + hash + freeze directed distance matrix
→ baseline NN → best-improvement 2-Opt
```

OSRM Table Service adalah approved core infrastructure untuk input formal.

## 3. OSRM is NOT the research algorithm

MVP memakai Hybrid NN + 2-Opt untuk urutan customer dengan rute awal NN sebagai baseline. OSRM tidak menggantikan optimizer dengan shortest-path A→B atau OSRM Trip. Domain hanya menerima matrix, tidak memanggil OSRM.

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
- Laporkan zero-cost pair dan pertahankan nilainya pada matriks. Kriteria sampling dan routability formal masih menunggu validasi akademik. [Kontrak algoritma](33_ALGORITHM_SPECIFICATION.md)

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

Baseline NN dan hasil Hybrid memakai exact matrix values, input hash, node order, matrix hash, dan actual provider provenance yang sama. Runner memverifikasi hash setelah load dan mencatat referensinya pada setiap experiment/export. Hash mismatch menghentikan evaluasi. Pengulangan timing memakai snapshot tersimpan.

## 14. Timing exclusion

OSRM request, road validation, matrix generation/load/hash, DB, HTTP/network, serialization, route geometry, serta Leaflet/rendering berada di luar formal algorithm timer. Frozen matrix dan params sudah siap di memory sebelum measured solver call. Timer formal berjalan pada environment terkontrol, tidak bergantung pada Vercel.

## 15. Reproducibility concerns

Catat generation time, endpoint identity tanpa credential, profile/options, provider/software version, dataset/OSM extract date/hash dan returned data version bila tersedia, node order, original/snapped points, input/matrix hashes, serta generation code SHA. Metadata yang tidak tersedia ditandai unavailable, tidak diisi tebakan.

Network/profile/provider dapat berubah; coordinates yang sama belum tentu menghasilkan matrix yang sama saat diminta ulang. Reproduksi **algorithm results** memakai matrix tersimpan. Reproduksi **matrix generation** membutuhkan provider/network provenance lebih lengkap dan merupakan batas reproducibility terpisah.

## 16. Phase 3B — kontrak provider dan validasi

Generasi default nonaktif. Adapter formal dan konfigurasi Multi-Provider dijelaskan pada bagian 20. Setiap provider harus membuktikan dukungan distance annotation, kapasitas N+1, provenance yang tersedia, dan kepatuhan kebijakan sebelum aktivasi.

Untuk Phase 3B, ukuran utama 10, 25, dan 50 Order memerlukan masing-masing 11, 26, dan 51 titik termasuk Depot. Satu Table request menghasilkan 121, 676, dan 2.601 sel berarah. Ketiga ukuran lulus dengan respons sintetis. Batas `--max-table-size` OSRM dapat dikonfigurasi operator. Sebelum generasi formal, provider terpilih harus membuktikan dukungan `annotations=distance`, ukuran target, dan kebijakan pemakaian. FOSSGIS membatasi satu request per detik, melarang penggunaan berat, dan menyimpan permintaan di log. [Konfigurasi OSRM](https://project-osrm.org/docs/v26.4.0/tools) · [Kebijakan FOSSGIS](https://routing.openstreetmap.de/about.html#usage-policy)

Server meminta `annotations=distance` dengan radius meter per titik. Bukti snap sumber dan tujuan harus tersedia, menunjuk koordinat yang sama untuk indeks tersebut, dan berada dalam radius. Pemeriksaan batas bawah geometris membantu menolak waypoint yang terkait ke indeks salah. Toleransi satu meter menampung kuantisasi koordinat. Pemeriksaan ini tidak menentukan nilai matriks. Versi data, software, atau network extract tanpa bukti ditampilkan sebagai tidak tersedia.

## 17. Failure handling

Adapter membedakan coordinate/routability error, timeout/network error, provider error, unsupported distance response, invalid matrix, hash mismatch, dan storage/freeze failure. Mode operasional dapat memilih provider berikutnya untuk kegagalan yang dibatasi pada bagian 20. Setiap provider mendapat paling banyak satu percobaan per operasi. Kegagalan tidak menghasilkan snapshot sukses. Geometry error ditangani terpisah dari matrix/algorithm errors.

Di Phase 3B, kode kegagalan generasi dicatat di log aplikasi tanpa koordinat atau payload provider. Kegagalan validasi tidak membuat snapshot. Jika hasil penyimpanan belum pasti, cari UUID request melalui recovery read-only. Hasil kosong tetap belum terkonfirmasi. Matriks dengan nol di luar diagonal dapat ditinjau dan memuat daftar pasangan berarah yang bermasalah. Perlakukan zero off-diagonal sebagai temuan kualitas data untuk direview sebelum evaluasi formal.

Panel Distance Matrix berada di detail Benchmark Case. Route admin `/api/benchmark-cases/[id]/distance-matrices` memakai POST untuk generasi dan GET untuk riwayat. Query `requestId` melakukan recovery read-only. GET `/api/benchmark-cases/[id]/distance-matrices/[matrixId]` membaca snapshot tersimpan.

## 18. Bukti acceptance dan riwayat rilis Testing

- **Phase 3A UAT di Testing lulus menurut konfirmasi owner.** Baseline `8fecbb0` mencakup [PR #72](https://github.com/ArdhanKurniawan/courier-route-planner/pull/72). Benchmark Case Testing #90001 menyimpan satu Depot dan 10 Order untuk total 11 titik. [Bukti acceptance persistence](14_TESTING_QA.md#26-live-acceptance-benchmark-case-persistence-di-testing-2026-11-25)
- **Phase 3B offline lulus.** Kandidat mencatat 284/284 tes terfokus dan 1.297/1.297 tes penuh. ESLint, typecheck, `db:check`, dan `git diff --check` lulus. Mock OSRM mencakup 11, 26, dan 51 titik. Build Turbopack lokal dihentikan saat kompilasi. Percobaan webpack gagal pada loader `icon.svg` yang tetap sama. Build standar diperiksa lewat Quality Gate.
- **Kompatibilitas sebelum `0005` berdasarkan review kode.** Detail Benchmark Case memakai pembacaan Phase 3A. Panel riwayat matriks memuat secara terpisah dan menampilkan status tidak tersedia saat tabel belum ada. Tombol generasi tetap nonaktif. Endpoint baru dapat mengembalikan `503 UNAVAILABLE` pada lookup storage sebelum sempat memanggil OSRM.

Urutan rilis historis mencatat verifikasi Quality Gate, migrasi `0005` dengan persetujuan tersendiri, verifikasi ledger/schema, dan generasi default nonaktif. PR #73 sudah merged dan migration `0005` terverifikasi di Testing. Aktivasi provider menunggu bukti kesiapan.

## 19. Evaluasi awal FOSSGIS — historis dan superseded

Catatan berikut menyimpan evaluasi saat FOSSGIS masih menjadi kandidat utama. Prioritas tersebut diganti oleh rencana pada bagian 20. Bukti teknis, kebijakan, dan pertanyaan kepada operator tetap relevan jika FOSSGIS dipilih sebagai provider opsional.

Kandidat gratis adalah layanan FOSSGIS dengan base URL `https://routing.openstreetmap.de/routed-car`. `router.project-osrm.org` memakai backend mobil FOSSGIS yang sama. API upstream mendokumentasikan `annotations=distance` dalam meter pada rute tercepat. Konfigurasi publik FOSSGIS memakai CH. Batas default upstream adalah 100 titik, tetapi kapasitas Table aktif untuk 11, 26, dan 51 titik, opsi `radiuses`, dan bukti waypoint yang dibutuhkan aplikasi masih perlu dikonfirmasi ke operator. [Wiki demo OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server) · [Konfigurasi FOSSGIS](https://github.com/fossgis-routing-server/ansible_openstreetmap.de/blob/master/group_vars/osrm.yml#L98-L116) · [API OSRM v5.27.1](https://github.com/Project-OSRM/osrm-backend/blob/v5.27.1/docs/http.md#table-service) · [Default Table OSRM](https://github.com/Project-OSRM/osrm-backend/blob/v5.27.1/src/tools/routed.cpp#L120-L132)

Rancangan historis menghitung 30 Table request sukses dari 10 kasus per ukuran, dengan pilot, kalibrasi terpisah, dan percobaan gagal di luar hitungan. Volume sebenarnya mengikuti rancangan revisi setelah validasi akademik. Pengulangan algoritma membaca matriks yang sudah disimpan. Penggunaan demo harus ringan dan nonkomersial. Kebijakan umum menetapkan maksimum satu request per detik dan satu koneksi untuk skrip. Konfigurasi publik Nginx menetapkan 6 request per menit per IP untuk kelompok Table, Match, dan Trip. Batas teknis itu tidak menetapkan jatah penelitian. Konfirmasi jadwal, volume, dan ukuran matriks ke operator sebelum uji. Kirim hanya koordinat sintetis atau titik referensi publik yang disetujui karena server mencatat request. [Protokol penelitian](15_RESEARCH_BENCHMARK_PROTOCOL.md) · [Ketentuan FOSSGIS](https://github.com/fossgis/fossgis-webseite/blob/master/content/arbeitsgruppen/osm-server/nutzungsbedingungen.md#english-version) · [Rate limit Table](https://github.com/fossgis-routing-server/ansible_openstreetmap.de/blob/master/roles/osrm/templates/nginx-ratelimit.conf.jinja#L10-L38) · [Kontak dan privasi layanan](https://routing.openstreetmap.de/about.html)

Usulan FOSSGIS saat itu membatasi pengecualian guard ke endpoint HTTPS dan profil mobil yang disetujui pada Vercel Preview branch `testing`. Pasang reservasi Redis yang juga dipakai Map Testing pada dispatch Table baru, setelah pemeriksaan input dan lookup request tersimpan. Pertahankan satu reservasi lintas instance per 60 detik, fail-closed saat Redis gagal, dan tanpa retry otomatis. Gunakan User-Agent proyek yang sudah ada dan `Referer` dari `AUTH_ORIGIN` Testing yang tepercaya. Tampilkan sumber OSRM/FOSSGIS, kredit OpenStreetMap dan lisensi ODbL, [Perbaiki peta](https://www.openstreetmap.org/fixthemap), serta kontak operator aplikasi. [Atribusi OpenStreetMap](https://www.openstreetmap.org/copyright)

Tabel berikut adalah usulan konfigurasi historis untuk FOSSGIS. Konfirmasi operator dan perubahan kode menjadi prasyarat jika opsi ini diteruskan. Generasi tetap nonaktif selama evaluasi.

| Environment variable | Nilai Testing yang direncanakan |
|---|---|
| `APP_ENV` | `testing` pada Preview branch `testing`. Metadata branch dan target berasal dari Vercel. |
| `DISTANCE_MATRIX_GENERATION` | Kosong atau `0` saat ini. `1` setelah persetujuan dan pengujian. |
| `DISTANCE_MATRIX_OSRM_URL` | `https://routing.openstreetmap.de/routed-car` |
| `DISTANCE_MATRIX_OSRM_PROFILE` | `driving`, sesuai profil mobil yang diuji. |
| `DISTANCE_MATRIX_OSRM_MAX_POINTS` | `11` untuk pilot awal. Naikkan ke `26` dan `51` setelah ukuran terkait dikonfirmasi dan lulus uji. |
| `DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M` | Radius meter positif yang ditetapkan pada protokol sebelum pengumpulan data. |
| `AUTH_ORIGIN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Pakai origin Testing dan Redis Testing yang sama dengan Map. |
| `DISTANCE_MATRIX_OSRM_SOFTWARE_VERSION`, `DISTANCE_MATRIX_OSRM_EXTRACT_SHA256` | Opsional. Isi jika bukti untuk instance aktif tersedia. |

## 20. Multi-Provider OSRM — implementasi offline

| Prioritas | Provider | Bukti dan batas aktivasi |
|---|---|---|
| Primary | Just Routing Free | Dokumentasi mencakup Indonesia, satu negara per request, 100 × 100 sel per matriks, 100 request/hari, dan 5 request/detik. Satu matriks memakai satu request. Ukuran 11/26/51 berada dalam batas yang dipublikasikan. Reset harian dan ketentuan publikasi hasil perlu dikonfirmasi sebelum aktivasi. |
| Secondary | OSRMPlus Free | Owner mengamati Table 3 × 3 dan Route Semarang pada Playground serta kuota akun 50.000 elemen dan 1.000 routing calls per bulan. Satu Table menggunakan satu routing call dan N × N elemen. Dokumentasi memakai reset awal bulan kalender dan menyebut batas harian serta burst per detik/menit. Timezone reset, angka batas harian/burst, kapasitas per request Free, dan dukungan `radiuses` dengan `annotations=distance` saja masih memerlukan bukti akun atau pilot. |
| Optional | FOSSGIS | Tetap nonaktif untuk matriks formal. |

Just Routing memakai `https://api.justrouting.tech/table/v1/driving/{coordinates}` dengan `Authorization: Bearer`. Dokumentasinya mendukung jarak berarah dalam meter, `radiuses` per titik, waypoint sumber/tujuan, dan caching matriks. Batas Directions yang dipublikasikan adalah 100 koordinat. Konfirmasi retensi koordinat dan hak publikasi hasil terpisah dari dukungan caching. [Table](https://docs.justrouting.tech/api-reference/distance-matrix) · [Directions](https://docs.justrouting.tech/api-reference/directions) · [Coverage](https://docs.justrouting.tech/coverage) · [Limit Free](https://justrouting.tech/#pricing)

OSRMPlus memakai `https://api.osrmplus.com/table/v1/driving/{coordinates}` dengan `x-api-key`. API memakai satu region berlisensi per request dan mendokumentasikan bentuk OSRM dengan jarak meter, termasuk contoh distance bersama duration. Batas numerik koordinat Route pada Free belum terverifikasi. Ketentuan mengizinkan penggunaan hasil routing dan menyatakan koordinat request tidak dicatat. Pertahankan kredit OpenStreetMap pada panel dan keluaran riset yang relevan. [API OSRMPlus](https://osrmplus.com/docs) · [Terms](https://osrmplus.com/terms) · [Atribusi OSM](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines#Routing_engines)

### Operational Mode

Manager memprioritaskan Just Routing dan hanya mempertimbangkan konfigurasi terverifikasi yang mampu menangani ukuran matriks. Capacity dari Redis, respons kuota/rate limit, timeout, jaringan, dan HTTP 5xx dapat memilih OSRMPlus. Kegagalan autentikasi, lisensi region, validasi input atau respons, pair unreachable, snapping, dan storage menghentikan operasi. Setiap provider mendapat paling banyak satu percobaan, dengan batas 8 detik per Table dan anggaran manager 20 detik.

Redis mereservasi setiap percobaan secara atomik setelah input dan lookup UUID lolos. Reservasi tetap dihitung jika hasil upstream ambigu. Just Routing memakai jendela bergulir 24 jam. OSRMPlus memakai jendela aplikasi 31 hari yang konservatif untuk kuota bulanan, disertai batas harian dan burst. Hitungan Redis hanya mencakup aplikasi. Akun yang juga dipakai dari Playground atau client lain mungkin mencapai kuota vendor lebih awal. Respons vendor dan `Retry-After` diutamakan. Redis yang tidak dapat diverifikasi menghentikan dispatch. Request baru mengevaluasi ulang primary setelah cooldown atau kuota bergulir kembali tersedia. Failback tidak mengubah request berjalan atau snapshot historis.

### Research Mode

Operator memilih **Research Provider Lock** sebelum generasi. Seluruh sel berasal dari satu provider dan kegagalan provider terkunci menghentikan operasi. Sebelum dispatch, Redis mengikat mode dan provider riset ke pasangan Benchmark Case dan UUID secara atomik. Pengikatan tetap disimpan setelah kegagalan dan tidak memakai TTL kuota. Preview harus memakai Redis Testing bersama yang mempertahankan key pengikatan. Replay dengan pilihan berbeda ditolak, termasuk bila snapshot pertama belum tersimpan. Snapshot baru mencatat `provenance.actualProvider` dan `provenance.generationMode`. Kolom database `provider` tetap `osrm` dan `distance-matrix/v1` tetap mengikat endpoint provider pada hash. Readback memeriksa kecocokan endpoint dengan identitas provider ketika tersedia, dan tetap menerima snapshot legacy tanpa field baru. Pada hasil penyimpanan ambigu, gunakan UUID yang sama di endpoint recovery read-only. Baseline NN dan Hybrid memakai frozen matrix, hash, dan node order yang sama. Operator harus mempertahankan pilihan yang sama sepanjang batch riset. Penyimpanan lock untuk formal batch masih menunggu Experiments.

Estimasi satu matriks sukses per Benchmark Case adalah `d11 + d26 + d51` request dan `121 × d11 + 676 × d26 + 2.601 × d51` elemen. Sebagai contoh historis, 10 kasus per ukuran memerlukan 30 request dan 33.980 elemen, sebelum pilot, kegagalan, atau regenerasi. Jumlah dataset evaluasi tetap mengikuti validasi akademik. Repetisi solver tidak menambah request OSRM. [Protokol penelitian](15_RESEARCH_BENCHMARK_PROTOCOL.md)

### Konfigurasi Testing Preview

| Variabel | Ketentuan |
|---|---|
| `APP_ENV`, metadata Vercel | `testing` pada Preview branch `testing`. |
| `DISTANCE_MATRIX_GENERATION` | Default kosong atau `0`. Gunakan `1` setelah persetujuan pilot. |
| `DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M` | Radius meter positif sesuai protokol. |
| `DISTANCE_MATRIX_JUST_ROUTING_VERIFIED`, `DISTANCE_MATRIX_OSRM_PLUS_VERIFIED` | Set `1` per provider setelah kontrak, akun, wilayah, batas ukuran, dan penggunaan data disetujui. |
| `DISTANCE_MATRIX_JUST_ROUTING_API_KEY`, `DISTANCE_MATRIX_OSRM_PLUS_API_KEY` | Secret aplikasi server-side. Endpoint HTTPS dan profile `driving` ditetapkan di kode. |
| `DISTANCE_MATRIX_JUST_ROUTING_MAX_POINTS`, `DISTANCE_MATRIX_OSRM_PLUS_MAX_POINTS` | Batas kuadrat terverifikasi termasuk Depot, dengan maksimum aplikasi 51. Gunakan batas yang mematuhi limit titik dan elemen provider. |
| `DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_SECOND`, `DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_MINUTE`, `DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_DAY` | Cap aplikasi positif berdasarkan batas akun yang sudah diverifikasi. |
| `DISTANCE_MATRIX_JUST_ROUTING_SOFTWARE_VERSION`, `DISTANCE_MATRIX_JUST_ROUTING_EXTRACT_SHA256`, `DISTANCE_MATRIX_OSRM_PLUS_SOFTWARE_VERSION`, `DISTANCE_MATRIX_OSRM_PLUS_EXTRACT_SHA256` | Opsional, isi berdasarkan bukti. |
| `AUTH_ORIGIN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Konfigurasi autentikasi dan shared quota Testing yang sudah ada. |

Pilot yang disetujui sebaiknya memakai fixture sintetis dan satu provider terkunci. Mulai dari matriks terkecil yang sudah dikonfirmasi, periksa directed distances, bukti snapping, quota usage, provenance, dan readback dari storage. Naikkan ukuran hanya setelah bukti sebelumnya lengkap. FOSSGIS Map demo tetap terpisah.
