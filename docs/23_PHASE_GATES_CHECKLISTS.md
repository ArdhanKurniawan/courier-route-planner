# 23 — PHASE GATES & CHECKLISTS

**Current normative decision — 2026-10-18:** Gate 1 mengikuti revised evidence contract di bawah dan tetap OPEN. Snapshot promotion 11 Oktober berikut dipertahankan sebagai sejarah; tidak membatalkan evidence deployment sesudahnya.

**Promotion evidence 2026-10-11:** [PR #20 closure](proses/phase-0/0d/PHASE_0D_MAIN_FOUNDATION_PROMOTION_REPORT.md); current-candidate PR Quality and post-merge main Quality PASS. Vercel NOT integrated; public Production/Preview NOT deployed; Phase 0D/Gate 1 OPEN.

Jangan pindah phase hanya karena “kelihatannya jalan”.

## Gate 0 — Team readiness

- [ ] semua anggota punya Git;
- [ ] Node 24.x;
- [ ] npm;
- [ ] bisa clone/pull/branch/commit/push;
- [ ] paham Preview vs Production;
- [ ] paham TiDB Dev/Test/Prod;
- [ ] membaca `AGENTS.md`;
- [ ] membaca `docs/30_UI_TEMPLATE_GUIDE.md`;
- [ ] paham template Free vs Pro dan third-party provenance.

## Gate 1 — Foundation

**Status: OPEN.** Keputusan owner **2026-10-18 — YES APPROVE GATE 1 PROPORTIONATE EVIDENCE REVISION** memperbarui metode acceptance di bawah. [ADR-002 dan ADR-008](04_TECH_STACK_ADRS.md) tetap berlaku: main → Production, testing sebagai stable Preview, serta tiga independent TiDB resources tanpa shared fallback.

### Kontrak acceptance yang berlaku

Runtime TiDB Isolation Verifier Ed25519, endpoint diagnostik, private key, signed ticket, window/replay checkpoint, serta custody/Windows ACL khusus **ditunda dan bukan prerequisite Gate 1**. Implementasi lokal dipertahankan; tidak otomatis menjadi release candidate. Keputusan ini menggantikan persyaratan verifier pada rencana evidence terdahulu untuk Gate 1, tanpa mengubah historical reports, ADR, atau hasil checkpoint lama.

- **PASS:** evidence cukup untuk criterion dan candidate/environment yang dinyatakan, dengan source/provenance/waktu serta keterbatasannya; hasil historis disebut historis.
- **PENDING:** evidence wajib belum tersedia, candidate belum dapat diikat ke evidence, atau ada UNKNOWN material. UNKNOWN bukan bukti kegagalan.
- **FAIL:** mismatch atau kegagalan teramati, misalnya Preview memakai Production credential/database, required Quality Gate gagal, atau secret terekspos dalam candidate.
- Gate 1 hanya CLOSED setelah seluruh criterion wajib PASS dan final human acceptance eksplisit. Task review dokumentasi bukan acceptance tersebut.

| Criterion wajib | Evidence minimum / kondisi PASS | Status yang telah diterima |
| --- | --- | --- |
| Foundation dan quality | Node 24, TailAdmin Free/provenance/cleanup, local application, scripts quality sesuai docs/12, runtime audit sesuai kebijakan existing, dan required Quality Gate untuk exact accepted commit. | PASS historis: 0A–0C serta remote CI/main-promotion evidence. Tidak mengeklaim working tree verifier telah menjadi accepted candidate. |
| Database foundation | Dev/Testing/Production independent; schema/ledger initial coherent; dedicated application/migration roles dan credential sesuai environment, tanpa runtime admin/migrator atau shared fallback. | PASS historis: Dev/Testing/Production live foundation. Tidak mengulang initial migration atau provisioning. |
| Pemisahan environment aplikasi | Seluruh rantai evidence gabungan pada bagian berikut lengkap untuk accepted Production/Preview deployments; tidak ada known relevant drift atau conflict. | PASS untuk gabungan evidence historis dan human attestations yang diterima owner; direct physical runtime SQL identity tetap NOT VERIFIED. |
| Deployment dan minimum smoke | main Production dan stable testing Preview READY pada accepted source; shell/root serta health/readiness berhasil sesuai kontrak minimal, APIs no-store. Build/deploy tidak menjalankan migration. | PASS untuk scope minimum foundation berdasarkan laporan deployment dan accepted limited Preview HTTP evidence. Formal HTTP PARTIAL tetap PARTIAL. |
| Reproduksi anggota kedua | Anggota bernama pada mesin kedua, clean accepted checkout, actual quality results dan Dev-only local application/connectivity smoke yang diotorisasi, tanpa secret exposure. | PENDING: hasil reproduksi belum tersedia. |
| Final acceptance | Final review atas candidate/evidence matrix, keterbatasan dan konsistensi dokumen; tidak ada unresolved blocking mismatch; owner memberikan final Gate 1 acceptance. | PENDING: belum diberikan. |

Accepted deployed foundation references tetap Production/main dan Preview/testing pada [Production deployment report](proses/phase-0/0d/PHASE_0D_VERCEL_PRODUCTION_INITIAL_DEPLOYMENT_REPORT.md) serta [Preview deployment report](proses/phase-0/0d/PHASE_0D_VERCEL_PREVIEW_INITIAL_DEPLOYMENT_REPORT.md). Local verifier working tree bukan pengganti kedua source tersebut.

### Batas pembuktian isolasi

Evidence gabungan yang disetujui terdiri dari **semua** komponen berikut:

1. Independent provider resource/provisioning mapping dan complete application principal/account-host → logical database, dengan provenance tersendiri dari URL yang diuji. A1–A3 historis telah diterima; A2 dilengkapi human-attested provider readback 18 Oktober sekitar 18.55–18.57 WIB, bukan verifikasi agent baru.
2. Private source/role attestation dan scoped assignment: Production menggunakan Production application credential; Preview menggunakan Testing application credential. Metadata key/type/target/override tidak membuktikan bytes secret.
3. Keterkaitan assignment/configuration records dengan actual deployment ID, commit SHA, environment dan waktu deployment yang diterima. Setting project saat ini saja tidak membuktikan snapshot deployment lama.
4. Review application database factory pada accepted source: memakai application DATABASE_URL, tanpa admin/migrator atau alternate caller target. Parser URL runtime memvalidasi format; exact APP_ENV/database guards migrator tidak boleh diklaim sebagai runtime enforcement.
5. Health/readiness smoke pada deployment relevan. Health app-only dan readiness SELECT 1 membuktikan liveness/connectivity; **keduanya sendiri tidak membuktikan identity/resource isolation**.

Label acceptance ini adalah **pemisahan environment berdasarkan evidence gabungan konfigurasi/provisioning dan konektivitas**, bukan direct physical runtime SQL identity VERIFIED. Rantai tidak lengkap → PENDING; cross-environment mismatch teramati → FAIL. Tidak mengarang actual SQL identity dari metadata atau boolean connectivity.

### Evidence yang dipakai kembali dan gap minimum

[0A](proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md), [0B](proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md), [0C](proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md), [main promotion/Quality Gate](proses/phase-0/0d/PHASE_0D_MAIN_FOUNDATION_PROMOTION_REPORT.md), [Testing](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md), [Production](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md), [env metadata/private handoff](proses/phase-0/0d/PHASE_0D_VERCEL_PRIVATE_ENV_CONFIGURATION_REPORT.md), dan deployment reports adalah evidence bertanggal, bukan fresh executions pada revisi ini. Preview metadata composite dan human attestations yang diterima dicatat sesuai provenance; raw private values tidak diperlukan dalam dokumen.

Minimum smoke dan stable testing Preview sudah diterima melalui YES APPROVE GATE1 MINIMUM EVIDENCE PLAN. [HTTP assessment PARTIAL](proses/phase-0/0d/PHASE_0D_PREVIEW_HTTP_PARTIAL_EVIDENCE_ASSESSMENT_REPORT.md) dan historical process deviations dipertahankan. Password replacement HUMAN-ATTESTED dan reuse UNKNOWN tetap residual uncertainty yang diterima owner; exposure tidak diubah menjadi CLOSED dan tidak memicu triage ulang tanpa risiko baru konkret.

Gap saat ini adalah reproduksi anggota kedua dan final candidate/evidence acceptance. Lengkapi hanya hubungan konfigurasi–deployment yang terbukti belum tercatat atau berubah; jangan mengulang accepted mapping, SQL, screenshot, HTTP atau credential triage demi administrasi. Source/dependency/workflow/configuration/deployment drift membatalkan reuse hanya pada evidence terkait; exact new commit tetap memerlukan applicable required Quality Gate. Perubahan dokumen saja tidak otomatis membutuhkan deployment atau application probe.

Custody/ACL, system variables untuk ticket binding, dan collector checks khusus verifier tidak memblokir metode baru. Explicit saved spending-limit-0 yang belum terbukti tetap keterbatasan cost metadata, bukan bukti isolation gagal; jangan mengklaim angka fresh atau menjadikan billing edit sebagai syarat Gate 1 baru. Kebijakan resource/cost existing tetap berlaku untuk tindakan cloud berikutnya.

Ikuti [reproduksi anggota kedua](17_SETUP_FROM_ZERO.md#reproduksi-anggota-kedua--gate-1) dan [DoD Gate 1/pemisahan WIP](19_DEFINITION_OF_DONE.md#8-gate-1--proportionate-evidence-and-deferred-verifier). Final review dilakukan sekali setelah evidence minimum lengkap. Tidak perlu endpoint, key, release atau SQL baru hanya untuk menjalankan metode evidence ini; tindakan live/Git berikutnya tetap membutuhkan otorisasi scope tersendiri.

## Gate 2 — CRUD baseline

- [ ] depot CRUD accepted;
- [ ] scenario CRUD accepted;
- [ ] order CRUD accepted;
- [ ] server validation;
- [ ] DB integration tests;
- [ ] error/empty states;
- [ ] no production data used in testing.

## Gate 3 — Dataset + map

- [ ] markers correct;
- [ ] OSM attribution;
- [ ] seeded generator deterministic;
- [ ] edit generated order;
- [ ] primary random generator covered; optional clustered/circular/directional tested if implemented;
- [ ] marker/map component independent of OSRM HTTP client; Table matrix foundation proceeds at Gate 4.

## Gate 4 — Research input foundation

- [ ] scenario freeze;
- [ ] immutable benchmark snapshots;
- [ ] input hash stable;
- [ ] routability validation dan coordinate/snap evidence;
- [ ] OSRM Table road-network matrix produced, unit meter;
- [ ] directed/asymmetric NxN validation, depot index 0, stable node order;
- [ ] no unreachable/null pair, common ACO zero-distance eligibility checked;
- [ ] matrix hash stable and verified against actual values;
- [ ] matrix frozen in immutable storage;
- [ ] matrix validation/hash/freeze/replay tests.

## Gate 5 — NN + 2-Opt

- [ ] known fixture pass;
- [ ] route valid;
- [ ] 2-Opt not worse;
- [ ] no duplicate/missing point;
- [ ] framework-independent.
- [ ] NN deterministic directed minimum, lowest-node-index tie;
- [ ] best-improvement 2-Opt full directed recomputation, asymmetric trap tests;
- [ ] symmetric-only delta shortcut absent.

## Gate 6 — ACO

- [ ] seeded reproducibility;
- [ ] route valid;
- [ ] parameter validation;
- [ ] no NaN;
- [ ] multi-run support;
- [ ] no hidden default claimed scientific.
- [ ] Classical Ant System, directed pheromone, all valid ants deposit, fixed iterations;
- [ ] no 2-Opt after ACO in main comparison.

## Gate 7 — Benchmark engine

- [ ] same frozen OSRM matrix values/order/input hash/matrix hash;
- [ ] timing boundary correct;
- [ ] raw runs stored;
- [ ] summary reproducible;
- [ ] CLI runner;
- [ ] predetermined balanced execution order dan dataset ordinal mapping tersimpan sesuai [protocol bagian 6](15_RESEARCH_BENCHMARK_PROTOCOL.md#6-environment-and-timer-boundary);
- [ ] metadata/commit SHA captured.
- [ ] timer excludes OSRM/DB/network/serialization/geometry/rendering;
- [ ] 5 warm-ups excluded, 30 ACO seeded runs, 30 NN+2-Opt timing samples;
- [ ] calibration separated, global configuration frozen;
- [ ] main 10/25/50 × 10 random datasets; N=100 conditional and other patterns optional;
- [ ] mean/median ACO primary comparison, raw failures retained, dataset-level observations;
- [ ] Phase A verification → B calibration → C pilot → D main evidence per docs/15.

## Gate 8 — Public security

- [ ] auth active;
- [ ] authorization active;
- [ ] no anonymous mutation;
- [ ] resource limits;
- [ ] secrets audit;
- [ ] Preview cannot access Prod DB.

## Gate 9 — Release

- [ ] full CI;
- [ ] E2E critical flow;
- [ ] UAT evidence;
- [ ] DB migration safe;
- [ ] backup/export if needed;
- [ ] release notes;
- [ ] rollback plan;
- [ ] post-deploy smoke plan.
