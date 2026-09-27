# 05 — NEXT.JS FOR PHP DEVELOPERS

Dokumen ini menerjemahkan konsep yang familiar dari PHP ke Next.js.

## 1. Mental model

PHP klasik:

```text
Request → index.php/controller → query DB → render HTML → response
```

Next.js App Router:

```text
Request/navigation
→ route/page/layout
→ Server Component / Route Handler / Server Action
→ DB/service
→ React output/JSON
```

## 2. Perbandingan konsep

| PHP/MVC | Next.js App Router |
|---|---|
| route config | folder/file routing di `src/app` |
| controller | Route Handler / Server Action / server function |
| view/template | React Server/Client Component |
| model/repository | `src/db` + service/repository functions |
| middleware | `proxy.ts`/framework middleware pattern sesuai versi + auth guards |
| `.env` | `.env.local` + Vercel Environment Variables |
| composer | npm |
| `vendor/` | `node_modules/` |
| `composer.lock` | `package-lock.json` |
| session | cookies/Auth.js/server session |

## 3. Server Component vs Client Component

### Server Component — default

Gunakan untuk:

- fetch DB;
- render list/table;
- logic yang tidak butuh browser API;
- menjaga secret di server.

### Client Component

Tambahkan `'use client'` hanya jika perlu:

- event handler kompleks;
- `window`/DOM;
- Leaflet;
- interactive local state.

**Anti-pattern:** membuat seluruh halaman `'use client'` karena terasa lebih mudah.

## 4. Route Handlers

Mirip endpoint controller:

```text
src/app/api/scenarios/route.ts
```

Bisa memiliki `GET`, `POST`, dsb.

Gunakan bila butuh API HTTP jelas, integration, atau client fetch.

## 5. Server Actions

Cocok untuk mutation dari form React tanpa membuat endpoint manual untuk semua hal. Namun jangan memasukkan business logic langsung ke action. Action tetap memanggil service.

## 6. Data fetching

Default thinking:

- bila data hanya perlu untuk render server → fetch di Server Component;
- bila mutation form → Server Action atau Route Handler;
- bila map interaktif butuh data → server fetch lalu pass typed props ke Client Component.

## 7. Error handling

Gunakan boundary Next.js seperti:

- `error.tsx`;
- `not-found.tsx`;
- validation errors yang eksplisit;
- server logs untuk unexpected exception.

Jangan `catch` semua error lalu return “success=false” tanpa log/trace.

## 8. TypeScript yang wajib dipahami dulu

Tim tidak perlu langsung ahli semua TS. Fokus:

1. primitive types;
2. `type` dan `interface`;
3. union type;
4. optional property;
5. generics dasar;
6. async/Promise;
7. narrowing;
8. `unknown` vs `any`.

Rule: `any` bukan solusi default.

## 9. React minimal yang wajib

- component;
- props;
- state;
- event handler;
- conditional rendering;
- list rendering + key;
- controlled form hanya bila perlu;
- effect hanya bila ada side-effect client.

## 10. Anti-pattern untuk tim baru

- semua komponen client;
- fetch DB dari browser;
- expose `DATABASE_URL` via `NEXT_PUBLIC_*`;
- business logic di JSX;
- `useEffect` untuk data yang bisa server-fetch;
- global state library sebelum benar-benar perlu;
- route handler berisi algorithm core;
- mengabaikan TypeScript error dengan `as any`.

## 11. Latihan onboarding

Sebelum core project, setiap anggota idealnya mampu:

1. buat page `/hello`;
2. buat Server Component;
3. buat Client Component counter;
4. buat Route Handler `/api/health`;
5. buat satu table TiDB `learning_notes`;
6. insert/select via Drizzle;
7. deploy feature branch dan buka Preview URL.

Baru kemudian mengambil task core.
