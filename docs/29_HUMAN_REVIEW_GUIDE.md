# 29 — HUMAN REVIEW GUIDE: Cara Mengecek Pekerjaan AI

AI verification penting, tetapi reviewer manusia tetap perlu melakukan pemeriksaan sederhana yang konsisten.

## 1. Jangan mulai dari membaca 1.000 baris code

Mulai dari scope:

1. task meminta apa?
2. file apa yang berubah?
3. apakah ada file yang tidak semestinya berubah?

Command:

```bash
git status
git diff --stat
git diff
```

Red flags:

- package besar baru tanpa alasan;
- config deployment berubah padahal task UI;
- schema berubah padahal task map;
- `.env` muncul;
- ribuan baris generated file tidak dijelaskan.

## 2. Check acceptance criteria satu per satu

Jangan menerima kalimat “semua AC terpenuhi”.

Buat tabel:

| AC | Cara check | Hasil |
|---|---|---|
| depot can create | manual form + DB | PASS |
| invalid lat rejected | input 100 | PASS |

## 3. Automated evidence

Jalankan sendiri minimal sebelum merge penting:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Jika AI hanya mengklaim command run tanpa output/evidence, ulangi di mesin kalian atau CI.

## 4. Preview test

Test URL Vercel Preview:

- buka incognito bila relevan;
- cek browser console;
- lakukan happy path;
- lakukan invalid input;
- reload page;
- cek empty/error state.

## 5. Database change review

Tanya:

- tabel/column apa berubah?
- data existing aman?
- migration reversible/mitigatable?
- apakah migration hanya Dev/Test?
- apakah benchmark history immutable tetap terjaga?

Jangan pernah “coba saja migration ke prod” untuk mengetahui aman atau tidak.

## 6. Security review sederhana

Search:

```bash
git grep -n "DATABASE_URL"
git grep -n "NEXT_PUBLIC_"
git grep -n "dangerouslySetInnerHTML"
```

Tujuannya bukan bahwa kata-kata ini selalu salah; reviewer memeriksa penggunaan.

Check GitHub staged diff untuk secret.

## 7. Algorithm review

Tidak perlu membaca formula dulu. Mulai dari behavioral checks:

### Route validity

Input:

```text
Depot D
Customers A B C D
```

Output harus seperti:

```text
Depot → A/C/... → ... → Depot
```

Dan set customer output = set customer input.

### Distance

Recompute route distance secara fungsi terpisah. Jangan mempercayai `totalDistance` yang dikembalikan algoritma sendiri.

Gunakan frozen OSRM directed matrix dalam meter; cocokkan input hash, node order dan matrix hash di kedua metode. Jangan hanya mencocokkan coordinates atau nama scenario. Matrix/benchmark case tetap immutable setelah orders diedit.

### NN and 2-Opt

NN: depot=0, nearest directed cost, tie-break lowest node index. 2-Opt: best improvement setelah semua candidates, reverse segment dan full directed recomputation. Jalankan asymmetric fixtures di [docs/33](33_ALGORITHM_SPECIFICATION.md); jangan menerima symmetric-only two-boundary-edge delta. Hasil final harus <= NN distance.

### ACO reproducibility

Run dua kali dengan same seed + same matrix + same params.

Expected untuk test deterministic RNG path:

```text
same result
```

Pastikan varian Classical Ant System: directed pheromone, semua valid ants deposit, fixed iterations, state reset per run, tidak ada post-ACO 2-Opt. Parameter numerik ilmiah harus berasal dari literature/calibration, bukan tebakan AI.

### Benchmark evidence

Periksa [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md): 10/25/50 × 10 random datasets; N=100 conditional, other patterns optional; calibration terpisah dan satu global configuration frozen. Per dataset ada 30 independent seeded ACO runs, 30 NN+2-Opt timing samples, dan 5 warm-ups yang dikeluarkan. ACO mean/median pembanding utama, best tambahan. Dataset-level observations tidak diganti dengan jumlah runs. Raw poor-valid/failed runs tetap ada.

Timer harus mengecualikan OSRM/DB/network/serialization/geometry/rendering dan dijalankan terkontrol di luar runtime Vercel. Untuk task dokumentasi, periksa keselarasan sumber dengan MASTER_GUIDE/MANIFEST; application lint/build tidak membuktikan metodologi penelitian.

## 8. AI review trap

Jangan bertanya:

> “Apakah kode ini sudah bagus?”

Tanya:

> “Cari minimal 5 cara implementasi ini bisa gagal. Buktikan dengan code path/test. Jangan berikan pujian.”

## 9. Merge decision

### PASS

Semua blocker/high resolved, CI green, AC green.

### PASS WITH FINDINGS

Hanya low/known limitation yang disepakati dan tidak mengganggu release.

### FAIL

- correctness issue;
- production safety issue;
- secret exposure;
- migration unsafe;
- core test gagal;
- scope tidak terpenuhi.

## 10. Reviewer sign-off text

```text
Reviewed by: <nama>
Scope checked: yes
Diff checked: yes
Automated checks: green
Preview manual test: pass
DB impact: none/reviewed
Security quick check: pass
Known limitations: ...
Decision: APPROVE / REQUEST CHANGES
```


## 11. UI template review

Jika task menyentuh TailAdmin/template:

- pastikan hanya Free/open-source source yang dipakai;
- cek tidak ada asset/component Pro;
- cek `THIRD_PARTY_NOTICES.md` tetap ada dan benar;
- cek menu/demo e-commerce yang tidak relevan tidak kembali masuk;
- cek dependency baru punya alasan dan license jelas;
- jalankan `npm ls apexcharts react-apexcharts`; target normal setelah cleanup adalah tidak ada;
- cek sidebar desktop/mobile, header, empty state, console, dan Vercel Preview;
- jangan approve hanya karena UI “terlihat bagus” jika build/test/license/dependency review gagal.
