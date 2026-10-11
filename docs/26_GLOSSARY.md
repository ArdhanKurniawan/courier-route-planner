# 26 — GLOSSARY

**App Router** — routing model modern Next.js berbasis folder `app/`.

**Server Component** — React component yang dirender server-side dan dapat mengakses server resources tanpa dikirim seluruh logic-nya ke browser.

**Client Component** — component dengan `'use client'`, diperlukan untuk browser API/interactivity tertentu.

**Route Handler** — HTTP endpoint pada Next.js App Router.

**Vercel Preview** — deployment non-production untuk branch/PR.

**Production Deployment** — deployment branch production (`main`).

**TiDB Cloud Starter** — managed TiDB entry tier dengan free quota sesuai kebijakan saat ini.

**Drizzle ORM** — typed TypeScript data access/schema tooling.

**Distance Matrix** — formal input optimizer berupa frozen OSRM road-network costs dalam meter, NxN termasuk depot, stable node order.

**Directed / Asymmetric** — d(i,j) dapat berbeda dari d(j,i); jangan mengasumsikan symmetric costs pada road network.

**Closed Tour** — route yang mulai dan berakhir di depot.

**Nearest Neighbor (NN)** — deterministic greedy heuristic dari depot index 0, memilih minimum directed distance; tie memakai lowest node index.

**2-Opt** — local search segment reversal; project memakai best improvement dengan full directed route recomputation, depot fixed, strict improvement saja.

**ACO** — Ant Colony Optimization, metaheuristic stochastic berbasis pheromone/heuristic information.

**Classical Ant System** — varian ACO main comparison: directed pheromone, roulette-wheel selection, fixed iterations, evaporation dan deposit dari semua valid ants, tanpa post-ACO 2-Opt.

**Seed** — nilai awal RNG agar data/run stochastic dapat direproduksi.

**Benchmark Case** — snapshot input immutable untuk eksperimen.

**Input Hash** — fingerprint dataset/config untuk memastikan input sama.

**Matrix Hash** — SHA-256 canonical content yang mengikat input hash, node order, provider/config/unit dan matrix values; dipakai untuk memverifikasi same-matrix fairness.

**Calibration Dataset** — input tuning yang terpisah dari main evaluation; menghasilkan satu global ACO configuration frozen.

**CV** — coefficient of variation, SD/mean (atau persen bila dilabeli); tidak ada threshold baik/buruk tanpa source.

**CI** — Continuous Integration; automated quality checks.

**CD** — Continuous Delivery/Deployment.

**ADR** — Architecture Decision Record.

**DoD** — Definition of Done.

**UAT** — User Acceptance Testing.

**OSRM** — Open Source Routing Machine. Table Service adalah core input infrastructure formal road-network matrix, bukan research algorithm. Route Service/geometry adalah concern visualisasi terpisah.

Kontrak lengkap: [docs/32](32_RESEARCH_DECISIONS.md), [docs/33](33_ALGORITHM_SPECIFICATION.md), [docs/34](34_OSRM_DISTANCE_CONTRACT.md).
