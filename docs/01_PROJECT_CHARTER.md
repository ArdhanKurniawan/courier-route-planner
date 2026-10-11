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
- ACO / Classical Ant System tanpa post-ACO 2-Opt;
- benchmark pada input yang sama;
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
- optimization menggunakan paid map API.

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
6. ACO menghasilkan closed tour valid;
7. kedua metode menerima benchmark input yang identik;
8. hasil jarak dapat diverifikasi ulang;
9. execution time tercatat;
10. ACO mendukung seeded run;
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
- hasil ACO multi-run dapat dianalisis;
- hasil route dapat direkonstruksi.

Main design: 10/25/50 customer, masing-masing 10 independent random datasets. N=100 conditional setelah pilot; clustered/circular/directional optional tambahan. ACO 30 independent seeded runs, NN+2-Opt satu quality result dan 30 timing repetitions, 5 warm-ups per algoritma/dataset. Calibration datasets terpisah dan satu global ACO configuration dibekukan. RQ/metrics mengikuti [research decisions](32_RESEARCH_DECISIONS.md) dan [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md).

OSRM adalah input infrastructure, bukan algoritma penelitian. Geometry terpisah; timer formal hanya algorithm execution pada environment terkontrol, tanpa OSRM/DB/network/serialization/geometry/rendering.

## 9. Non-goals

Project ini tidak mencoba membuktikan heuristic/metaheuristic menghasilkan optimum global kecuali ada benchmark exact/best-known yang mendukung klaim tersebut.

Gunakan istilah:

- “rute yang dihasilkan”;
- “lebih pendek pada skenario X”;
- “best observed solution”;

bukan “rute paling optimal” tanpa bukti optimum.
