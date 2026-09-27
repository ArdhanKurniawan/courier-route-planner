# 06 — VERCEL GUIDE FOR BEGINNERS

## 1. Apa itu Vercel?

Vercel adalah platform deployment yang sangat terintegrasi dengan Next.js.

Dalam project ini, Vercel bertugas:

- build Next.js;
- menjalankan server-side functions;
- melayani static assets;
- memberi Preview URL per branch/PR;
- production deployment dari `main`;
- menyimpan environment variables;
- custom domain.

## 2. Apa yang terjadi saat push?

```text
git push origin feature/map
        ↓
GitHub
        ↓
Vercel Git Integration
        ↓
Build
        ↓
Preview deployment
```

Merge `testing` → `main`:

```text
main updated
   ↓
Production deployment
```

## 3. Production vs Preview

- Production: branch `main`.
- Preview: branch selain production, termasuk `testing` dan `feature/*`.

Kita menggunakan `testing` sebagai stable integration Preview branch.

## 4. Branch-specific configuration

Vercel mendukung Preview Environment Variables dan override per Git branch. Gunakan agar `testing` dapat diarahkan ke TiDB Testing tanpa menyentuh production.

Policy:

- Production env `DATABASE_URL` → TiDB Production.
- Preview default `DATABASE_URL` → TiDB Testing.
- Local Development → TiDB Dev via `.env.local`.

## 5. Domain

Rencana:

```text
route.example.com          → Production/main
testing-route.example.com  → branch testing
```

Jangan gunakan domain production untuk testing.

## 6. Preview branch feature

Feature preview memakai TiDB Testing secara default. Karena beberapa feature preview bisa hidup bersamaan, gunakan data scenario yang diberi owner/tag dan jangan mengandalkan satu row global mutable.

Untuk schema migration besar, koordinasikan terlebih dahulu.

## 7. Environment variable rule

Secret:

- `DATABASE_URL`
- `AUTH_SECRET` bila auth aktif
- OAuth credentials bila digunakan

Tidak boleh memakai prefix `NEXT_PUBLIC_` kecuali nilainya memang aman untuk browser.

Setelah mengubah env var di Vercel, lakukan redeploy bila diperlukan.

## 8. Logs

Jika Preview gagal:

1. buka Deployment;
2. cek build logs;
3. cek missing environment variables;
4. cek Node version;
5. cek build command;
6. cek runtime exception logs bila build sukses tetapi request gagal.

## 9. Node version

Baseline project: **Node 24.x**.

Set:

- `package.json` engines;
- Vercel Project Settings Node.js Version = 24.x.

Jangan biarkan laptop satu anggota 20.x, CI 22.x, dan Vercel 24.x tanpa alasan.

## 10. Vercel is not the research benchmark machine

Vercel bagus untuk application behavior. Tetapi formal comparison execution time harus dijalankan pada environment terkontrol, karena serverless environment dapat memiliki variasi cold/warm state dan resource scheduling.

## 11. Minimum Vercel verification

Setelah setup:

- [ ] main deploy sukses;
- [ ] feature branch menghasilkan Preview;
- [ ] Preview tidak terhubung production DB;
- [ ] main terhubung production DB;
- [ ] health endpoint sukses;
- [ ] custom domain production valid;
- [ ] testing branch/domain valid bila dikonfigurasi;
- [ ] env secret tidak tampil di browser bundle.
