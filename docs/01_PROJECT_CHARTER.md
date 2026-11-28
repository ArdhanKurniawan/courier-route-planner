# 01 — PROJECT CHARTER

## 1. Nama sementara

**Sistem Optimasi Rute Pengiriman Paket Berbasis Web**

## 2. Problem statement

Admin yang harus mengatur banyak tujuan pengiriman dapat menghasilkan urutan kunjungan yang zig-zag, bolak-balik, atau memiliki total perjalanan lebih panjang jika penentuan urutan dilakukan manual. Sistem ditujukan untuk membantu admin menghasilkan dan membandingkan urutan kunjungan customer dari satu depot, mengunjungi seluruh customer, lalu kembali ke depot.

## 3. Model masalah

```text
DEPOT
  ↓
Customer ?
  ↓
Customer ?
  ↓
...
  ↓
DEPOT
```

Fokus adalah **sequence of visits**, bukan shortest path satu pasangan node.

## 4. In-scope MVP

- konfigurasi depot;
- generate dummy order;
- CRUD/edit dummy order;
- latitude/longitude customer;
- map marker depot/customer;
- scenario dataset;
- seeded dummy generation;
- frozen directed OSRM Table road-network distance matrix, meter, input/matrix hash;
- Nearest Neighbor;
- best-improvement 2-Opt dengan full directed route recomputation;
- evaluasi NN awal dan hasil Hybrid pada frozen Benchmark Case serta matriks yang sama;
- total distance;
- execution time;
- route sequence;
- result history;
- map polyline titik-ke-titik;
- export hasil eksperimen minimal CSV;
- testing dan production environment.

## 5. Out-of-scope MVP

- aplikasi/mobile kurir;
- GPS realtime;
- turn-by-turn navigation;
- live traffic;
- proof of delivery;
- chat/WhatsApp customer;
- pembayaran;
- fleet payroll;
- multi-depot VRP;
- dynamic vehicle capacity;
- optimization menggunakan paid map API;
- integrasi ACO Classical Ant System yang ditunda sebagai [Future Development](https://github.com/ArdhanKurniawan/courier-route-planner/issues/75).

## 6. Constraints

- tim paling familiar PHP/MySQL, tetapi stack dipilih Next.js + TiDB;
- tim masih pemula Next.js/Vercel/TiDB;
- budget infrastruktur: **Rp0**;
- domain sendiri tersedia;
- project akademik S1;
- waktu dan maintainability lebih penting daripada arsitektur kompleks;
- teknologi harus sebisa mungkin free/open-source.

## 7. Technical success criteria

MVP dianggap berhasil bila:

1. aplikasi dapat diakses pada environment testing dan production;
2. data dev/testing/prod tidak tercampur;
3. dummy order dapat dibuat dan diedit;
4. map menampilkan depot dan customer;
5. NN+2-Opt menghasilkan closed tour valid;
6. baseline NN menghasilkan closed tour valid;
7. jarak NN dan Hybrid dihitung dengan matriks dan identitas snapshot yang sama;
8. hasil jarak dapat diverifikasi ulang;
9. execution time tercatat;
10. perbaikan absolut dan persentase dapat ditelusuri ke dua jarak tersebut;
11. CI lulus sebelum release;
12. tidak ada secret di Git;
13. production DB tidak digunakan oleh preview branch.

## 8. Research success criteria

- eksperimen reproducible;
- input snapshot immutable;
- seed dicatat;
- algorithm parameter dicatat;
- git commit SHA dicatat;
- environment benchmark dicatat;
- jarak sebelum/sesudah, besaran perbaikan, dan runtime dapat dianalisis menurut jumlah customer;
- hasil route dapat direkonstruksi.

Ukuran awal adalah 10, 25, dan 50 customer. RQ dan rincian rancangan evaluasi, termasuk jumlah dataset, repetisi, dan analisis, masih memerlukan validasi akademik. [Research decisions](32_RESEARCH_DECISIONS.md) · [Protokol evaluasi](15_RESEARCH_BENCHMARK_PROTOCOL.md)

OSRM adalah input infrastructure, bukan algoritma penelitian. Geometry terpisah; timer formal hanya algorithm execution pada environment terkontrol, tanpa OSRM/DB/network/serialization/geometry/rendering.

## 9. Non-goals

Project ini tidak mencoba membuktikan heuristic/metaheuristic menghasilkan optimum global kecuali ada benchmark exact/best-known yang mendukung klaim tersebut.

Gunakan istilah:

- “rute yang dihasilkan”;
- “lebih pendek pada skenario X”;
- “best observed solution”;

bukan “rute paling optimal” tanpa bukti optimum.
