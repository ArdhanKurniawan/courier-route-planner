# 25 — ZERO-BUDGET COST GUARDRAILS

## Goal

Project tidak boleh menghasilkan biaya tak terduga.

## 1. Vercel

- gunakan Hobby/free selama memenuhi kebutuhan akademik;
- jangan mengaktifkan paid feature tanpa persetujuan tim;
- monitor usage dashboard;
- hindari endpoint polling terus-menerus;
- batasi compute-heavy web-triggered ACO.

## 2. TiDB

Per baseline 2026-09-26, docs TiDB menyatakan hingga lima Starter instance pertama per organization mendapat monthly free quota. **Free tier dapat berubah**.

Checklist provisioning:

- [ ] baca pricing/free quota terbaru;
- [ ] no card/paid spending bila target zero-cost;
- [ ] spending limit sesuai target Rp0;
- [ ] monitor RU/storage;
- [ ] jangan load-test production free instance.

## 3. GitHub

CI harus hemat:

- trigger pada PR, bukan setiap event tidak penting;
- cache npm bila sesuai;
- jangan menjalankan full E2E berkali-kali untuk docs-only change jika workflow bisa path-filter dengan aman.

## 4. OpenStreetMap

Leaflet library gratis, OSM data terbuka. Tetapi public tile server bukan unlimited commercial CDN.

Untuk project akademik low traffic:

- attribution wajib;
- jangan tile scraping;
- jangan prefetch massal;
- monitor usage.

Jika trafik besar, evaluasi tile provider sesuai policy/budget.

## 5. No paid map API

Jangan menambahkan Google Maps/Mapbox paid dependency tanpa ADR + budget approval.

## 6. Resource limits

Web endpoint algorithm harus punya cap agar user tidak mengirim:

```text
10,000 customers × 50,000 iterations × 5,000 ants
```

Formal heavy benchmark dilakukan controlled local runner.


## 7. UI template & dependency licensing

- gunakan **TailAdmin Next.js Free** saja; jangan copy Pro/paid asset;
- preserve license/provenance;
- dependency bawaan template tetap harus diaudit; “template free” tidak otomatis berarti seluruh transitive/dependency policy cocok untuk project;
- ApexCharts bukan core dependency yang disetujui karena current licensing menggunakan community/revenue-based model; targetkan removal saat cleanup;
- bila perlu chart penelitian, pilih dependency berlisensi sederhana/open-source yang disetujui (preferensi awal Recharts MIT) melalui task/ADR.
