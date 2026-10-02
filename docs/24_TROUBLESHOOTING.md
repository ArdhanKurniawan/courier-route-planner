# 24 — TROUBLESHOOTING GUIDE

## Next.js local tidak jalan

Check:

```bash
node -v
npm -v
npm ci
npm run dev
```

Jika `node_modules` corrupt:

```bash
rm -rf node_modules
npm ci
```

Pada Windows, gunakan command equivalent dengan hati-hati; jangan hapus folder project.

## Build lokal sukses, Vercel gagal

Check:

- Node version setting;
- env variables;
- case-sensitive import path;
- dependency ada di `package.json`;
- code yang bergantung filesystem/local-only.

## Preview membaca production data

**BLOCKER.**

1. stop testing mutation;
2. cek Vercel Preview `DATABASE_URL` scope;
3. rotate production credential bila exposure dicurigai;
4. verify branch-specific overrides;
5. document incident.

## TiDB connection error

Check:

- connection string;
- generated password;
- database name;
- serverless driver connection mode;
- quota/status instance;
- env formatting/quotes.

Jangan log full `DATABASE_URL`.

## Leaflet error `window is not defined`

Kemungkinan Leaflet diimport pada server context.

Solusi architecture:

- isolate into Client Component;
- dynamic import if necessary;
- jangan mengubah seluruh page menjadi client tanpa alasan.

## Migration mismatch

Symptoms:

- column not found;
- table missing;
- preview works for one branch only.

Check migration history dan DB environment. Jangan manually patch production dulu.

## ACO NaN

Check:

- zero distance handling;
- probability denominator;
- pheromone initialization/evaporation dan numerical validity sesuai Classical Ant System; jangan menambah clipping/minimum yang mengubah varian diam-diam;
- invalid alpha/beta;
- duplicate coordinates;
- random selection edge cases.

Fail run instead of silently substituting value.

## Route duplicate/missing customer

Treat as correctness blocker.

Run route validator and smallest reproducible fixture. Jangan “dedupe hasil” setelah algorithm karena itu menyembunyikan bug.

## Formal benchmark inconsistent

Check:

- seed;
- input hash;
- frozen matrix hash, stable node order, provider/profile provenance (jangan request ulang OSRM untuk mereproduksi run);
- Node version;
- machine load;
- warm-up policy;
- parameter JSON;
- commit SHA;
- apakah timer memasukkan DB/network.
