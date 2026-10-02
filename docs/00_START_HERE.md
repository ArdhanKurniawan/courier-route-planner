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
→ freeze snapshot + road validation + OSRM Table matrix + hash/freeze
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

## Research contract yang wajib dibaca

- [32 — Research Decisions](32_RESEARCH_DECISIONS.md): working RQ, main experiment dan OPEN decisions.
- [33 — Algorithm Specification](33_ALGORITHM_SPECIFICATION.md): NN deterministic, 2-Opt asymmetric-safe, ACO Classical Ant System.
- [34 — OSRM Distance Contract](34_OSRM_DISTANCE_CONTRACT.md): formal input memakai frozen directed OSRM road-network matrix dalam meter.
- [15 — Protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md): 10/25/50 customer × 10 random datasets; 30 ACO seeded runs; 30 NN+2-Opt timing repetitions; 5 warm-ups.

Calibration/evaluation wajib terpisah dan satu ACO configuration global dibekukan. N=100 serta clustered/circular/directional optional setelah review/pilot. OPEN: nilai numerik ACO, depot/study area, endpoint public/local OSRM, dan eksperimen tambahan; jumlah run/main datasets serta peran OSRM bukan keputusan yang masih pending.

Status implementasi aktual ada di [README](../README.md#current-implementation-status). Target arsitektur dan checklist bukan evidence implementasi selesai.


## UI template baseline

Sebelum bootstrap UI, baca `docs/30_UI_TEMPLATE_GUIDE.md`. Project memakai **TailAdmin Next.js Free** sebagai baseline shell; Free edition only.
