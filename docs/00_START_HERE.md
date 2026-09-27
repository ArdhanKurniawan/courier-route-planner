# 00 — START HERE

Dokumen ini untuk anggota tim yang **belum paham Next.js, Vercel, dan TiDB**.

## Jangan mulai dengan coding algoritma

Urutan aman project:

```text
Pahami konsep
→ pilih/adopsi TailAdmin Free baseline
→ setup local
→ repo & branch
→ Vercel skeleton
→ TiDB dev/testing/prod
→ CRUD kecil end-to-end
→ map
→ distance engine
→ NN
→ 2-Opt
→ ACO
→ benchmark
→ QA
→ production demo
```

Jika langsung mengerjakan ACO sebelum foundation stabil, debugging akan tercampur antara framework, database, deployment, dan algoritma.

## Pembagian pemahaman

Kalian hanya perlu memahami empat lapisan:

### 1. Next.js

Aplikasi web full-stack.

```text
Browser
  ↓
Next.js UI
  ↓
Next.js server code
  ↓
TiDB
```

### 2. Vercel

Tempat aplikasi Next.js di-build dan dijalankan online.

```text
GitHub push
   ↓
Vercel build
   ↓
Preview / Production URL
```

### 3. TiDB

Database SQL terkelola yang kompatibel dengan banyak pola MySQL.

```text
Next.js server
   ↓
Drizzle
   ↓
TiDB
```

### 4. GitHub

Source control dan workflow kolaborasi.

```text
feature/* → testing → main
```

## Tiga environment

Target kita:

| Environment | Fungsi | Database |
|---|---|---|
| Local Development | coding di laptop | TiDB Dev |
| Preview/Testing | integrasi & review | TiDB Testing |
| Production | demo/live stabil | TiDB Production |

Jika free quota TiDB berubah, lihat fallback di `25_COST_GUARDRAILS.md`.

## Cara memakai AI

AI tidak boleh langsung diberi prompt “buat semua project”.

Gunakan pola:

```text
AUDIT → PLAN → IMPLEMENT → VERIFY → HUMAN CHECK → MERGE
```

Lihat:

- `21_AI_OPERATING_MODEL.md`
- `22_PROMPT_LIBRARY.md`
- `23_PHASE_GATES_CHECKLISTS.md`

## Daily workflow anggota tim

1. tarik branch `testing` terbaru;
2. buat branch fitur;
3. baca task dan AC;
4. minta AI audit bila perlu;
5. coding kecil bertahap;
6. jalankan checks;
7. push feature branch;
8. cek Vercel Preview;
9. buka PR ke `testing`;
10. review;
11. merge bila gate lulus.

## Hal yang belum boleh dianggap final

Walaupun engineering stack sudah dikunci, keputusan penelitian berikut tetap harus didukung literatur/dosen:

- rumus/transformasi koordinat untuk formal Euclidean distance;
- parameter ACO final;
- jumlah run ACO final;
- jumlah scenario final;
- research question/judul final;
- apakah OSRM masuk MVP atau future work.

Engineering harus memungkinkan perubahan parameter tersebut tanpa rewrite besar.


## UI template baseline

Sebelum bootstrap UI, baca `docs/30_UI_TEMPLATE_GUIDE.md`. Project memakai **TailAdmin Next.js Free** sebagai baseline shell; Free edition only.
