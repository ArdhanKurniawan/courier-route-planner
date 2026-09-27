# 20 — TEAM LEARNING PLAN

Tujuan: tim dapat memahami stack cukup untuk review, bukan hanya copy-paste AI.

## Week/Learning Block 1 — JavaScript/TypeScript bridge

Target:

- `const/let`;
- object/array;
- destructuring;
- modules;
- async/await;
- TypeScript types;
- Promise;
- npm/package.json.

Mini-task: ubah fungsi PHP sederhana ke TypeScript.

## Block 2 — React

Target:

- component;
- props;
- state;
- events;
- render lists;
- form basic.

Mini-task: customer list static + add row local.

## Block 3 — Next.js App Router

Target:

- `app/` routing;
- layout/page;
- Server vs Client Component;
- Route Handler;
- environment variables.

Mini-task: `/learning` page + `/api/health`.

## Block 3A — TailAdmin template literacy

Target:

- bedakan UI template dengan domain architecture;
- tahu lokasi sidebar/layout/form/table components;
- bisa menghapus demo content tanpa merusak app shell;
- paham Free vs Pro asset;
- paham third-party license/provenance;
- tahu kenapa dependency template tetap harus diaudit.

Mini-task: ubah satu menu demo menjadi menu `Depot` tanpa mengimplementasikan CRUD.

## Block 4 — TiDB + Drizzle

Target:

- instance;
- `DATABASE_URL`;
- schema;
- insert/select/update/delete;
- migration concept.

Mini-task: `learning_notes` CRUD.

## Block 5 — Vercel

Target:

- project import;
- Preview;
- Production;
- env scopes;
- logs;
- custom domain.

Mini-task: branch `feature/learning-preview` dan buka Preview URL.

## Block 6 — Project workflow

Target:

- `testing` branch;
- feature branch;
- PR;
- CI;
- review;
- merge.

## Knowledge checkpoint

Setiap anggota harus bisa menjawab tanpa AI:

1. kenapa DB query tidak dilakukan di Client Component?
2. beda Preview dan Production?
3. mengapa `.env.local` tidak boleh commit?
4. apa fungsi Drizzle?
5. mengapa benchmark formal tidak mengandalkan Vercel timing?
6. apa beda scenario editable vs benchmark case immutable?
7. mengapa feature dibuat dari testing?
8. mengapa template gratis tetap harus diaudit dependency dan lisensinya?
9. mengapa TailAdmin hanya UI shell, bukan domain architecture?

Jika belum bisa, jangan memberikan task sensitif production kepada anggota tersebut tanpa pairing.
