# 28 — COACHING SEQUENCE: Cara Saya Membimbing Tim Langkah demi Langkah

Dokumen ini bukan sekadar referensi. Ini urutan kerja yang disarankan ketika tim meminta bantuan AI/ChatGPT.

## Prinsip utama

Jangan meminta 10 langkah sekaligus lalu menjalankan semuanya tanpa verifikasi.

Pola sesi:

```text
Saya jelaskan 1 checkpoint
→ tim menjalankan
→ tim kirim output/screenshot
→ saya verifikasi
→ baru lanjut checkpoint berikutnya
```

## Session 0 — Readiness

Tim kirim:

```text
node -v
npm -v
git --version
```

Lalu konfirmasi:

- siapa repo owner;
- repo public/private;
- domain yang akan dipakai (tidak perlu credential);
- apakah akun Vercel sudah dibuat;
- apakah akun TiDB sudah dibuat.

**Jangan kirim password/token/connection string ke chat.**

### Prompt ke saya

```text
Kita mulai Phase 0 Courier Route Planner.
Bimbing saya satu checkpoint per satu checkpoint.
Jangan lanjut sebelum saya kirim hasil command/checkpoint sebelumnya.

Environment saya:
node -v: <hasil>
npm -v: <hasil>
git --version: <hasil>

Repo: belum/sudah dibuat
Vercel: belum/sudah
TiDB: belum/sudah
```

## Session 1 — GitHub + Next.js local

Goal:

- repo ada;
- Next.js local berjalan;
- `npm run build` berhasil.

Human evidence:

```text
npm run dev
npm run build
```

Kirim:

- terminal output error bila ada;
- screenshot browser halaman awal;
- `git status`.

Jangan kirim seluruh `node_modules` atau secret.

## Session 2 — TiDB Dev only

Goal:

- create TiDB Dev;
- local app dapat melakukan safe select;
- `.env.local` tidak tracked.

Human checks:

```bash
git status
```

Pastikan `.env.local` tidak muncul sebagai staged/tracked.

Kirim ke saya hanya:

```text
TiDB instance status: Active
DB connection test: PASS/FAIL
```

Jika error, redaksi username/host/token bila perlu.

## Session 3 — Git branches + Vercel Preview

Goal:

```text
main
└── testing
    └── feature/test-preview
```

Verify:

- main Production URL;
- feature Preview URL;
- deployment logs clean.

## Session 4 — Environment isolation

Ini **checkpoint paling penting sebelum coding bisnis**.

Buat safe environment marker, misalnya app menampilkan:

```text
APP_ENV = development/testing/production
```

Tidak menampilkan DB URL.

Verify:

- Local = development.
- Preview = testing.
- Production = production.

Kemudian lakukan controlled data marker:

- insert `ENV_TEST_PREVIEW` pada Testing DB;
- pastikan tidak muncul di Production;
- hapus marker setelah verifikasi.

## Session 5 — CI

Goal:

PR ke testing menunjukkan quality check.

Kirim:

- screenshot PR checks;
- command local;
- error log jika gagal.

## Session 6 — First real feature: Depot

Baru setelah foundation gate PASS.

Gunakan prompt `DEPOT CRUD` dari `22_PROMPT_LIBRARY.md`.

Setelah AI implement:

1. jangan langsung merge;
2. gunakan MASTER VERIFICATION PROMPT;
3. cek Preview manual;
4. buka PR.

## Session 7 onward

Ikuti roadmap:

```text
Scenario
→ Orders
→ Map
→ Dummy generator
→ Freeze benchmark
→ Distance matrix
→ NN
→ 2-Opt
→ ACO
→ Benchmark runner
```

## Bagaimana bertanya saat bingung

Berikan **state**, bukan hanya “kok error?”.

Template:

```text
Saya sedang di Phase <x>, checkpoint <y>.
Goal checkpoint: <goal>.

Command yang saya jalankan:
<command>

Output:
<output>

Yang saya harapkan:
<expected>

Yang terjadi:
<actual>

Perubahan terakhir:
<apa yang berubah>

Jangan kasih saya 20 langkah sekaligus. Bimbing diagnosis satu per satu.
```

## Kapan perlu screenshot?

Screenshot berguna untuk:

- Vercel Settings;
- Vercel Deployment error;
- TiDB UI;
- GitHub branch rules;
- browser UI bug.

Terminal error sebaiknya **copy-paste text**, bukan screenshot, agar dapat dianalisis akurat.

## Kapan STOP

Stop dan minta review sebelum:

- membuat production DB;
- memasukkan production `DATABASE_URL`;
- membuat custom domain production;
- menjalankan migration production;
- merge testing → main;
- mengubah distance methodology;
- mengubah ACO parameter penelitian final;
- mengaktifkan paid/billing setting.
