# 23 — PHASE GATES & CHECKLISTS

**Current normative decision — 2026-10-24:** Phase 0 / Phase 0D / Gate 1 **CLOSED secara administratif** setelah final human acceptance. Kontrak evidence proporsional 18 Oktober tetap berlaku; [closure report](proses/phase-0/0d/PHASE_0D_GATE1_FINAL_CLOSURE_REPORT.md) merangkum final evidence. Historical reports dan verdict PARTIAL/NOT READY pada waktunya dipertahankan.

**Historical promotion evidence 2026-10-11:** [PR #20 closure](proses/phase-0/0d/PHASE_0D_MAIN_FOUNDATION_PROMOTION_REPORT.md); current-candidate PR Quality and post-merge main Quality PASS. Vercel NOT integrated; public Production/Preview NOT deployed; Phase 0D/Gate 1 OPEN.

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

**Status: CLOSED — 2026-10-24 (administratif, dokumentasi lokal).** Owner memberikan **YES ACCEPT PHASE 0 GATE 1 FINAL CLOSURE** berdasarkan seluruh criterion wajib PASS dan independent final assessment. Metode acceptance mengikuti keputusan proporsional 18 Oktober; ADR-002/ADR-008 tetap berlaku: main → Production, testing → stable Preview, tiga independent TiDB resources tanpa shared fallback.

### Kontrak acceptance yang berlaku

Runtime TiDB Isolation Verifier Ed25519, endpoint diagnostik, private key, signed ticket, window/replay checkpoint, serta custody/Windows ACL khusus **ditunda dan bukan prerequisite Gate 1**. Implementasi lokal dipertahankan; tidak otomatis menjadi release candidate. Keputusan ini menggantikan persyaratan verifier pada rencana evidence terdahulu untuk Gate 1, tanpa mengubah historical reports, ADR, atau hasil checkpoint lama.

- **PASS:** evidence cukup untuk criterion dan candidate/environment yang dinyatakan, dengan source/provenance/waktu serta keterbatasannya; hasil historis disebut historis.
- **PENDING:** evidence wajib belum tersedia, candidate belum dapat diikat ke evidence, atau ada UNKNOWN material. UNKNOWN bukan bukti kegagalan.
- **FAIL:** mismatch atau kegagalan teramati, misalnya Preview memakai Production credential/database, required Quality Gate gagal, atau secret terekspos dalam candidate.
- Gate 1 hanya CLOSED setelah seluruh criterion wajib PASS dan final human acceptance eksplisit. Task review dokumentasi bukan acceptance tersebut.

| Criterion wajib | Evidence minimum / kondisi PASS | Status yang telah diterima |
| --- | --- | --- |
| Foundation dan quality | Node 24, TailAdmin Free/provenance/cleanup, local application, scripts quality sesuai docs/12, runtime audit sesuai kebijakan existing, dan required Quality Gate untuk exact accepted commit. | PASS: foundation historis dan exact candidate Quality Gate main/testing; audit runtime 0, full 4 Moderate dev-only diterima; lihat closure report. |
| Database foundation | Dev/Testing/Production independent; schema/ledger initial coherent; dedicated application/migration roles dan credential sesuai environment, tanpa runtime admin/migrator atau shared fallback. | PASS historis: Dev/Testing/Production live foundation. Tidak mengulang initial migration atau provisioning. |
| Pemisahan environment aplikasi | Seluruh rantai evidence gabungan pada bagian berikut lengkap untuk accepted Production/Preview deployments; tidak ada known relevant drift atau conflict. | PASS dalam scope composite evidence historis + owner attestation/configuration preservation; direct physical runtime SQL identity tetap NOT VERIFIED. |
| Deployment dan minimum smoke | main Production dan stable testing Preview READY pada accepted source; shell/root serta health/readiness berhasil sesuai kontrak minimal, APIs no-store. Build/deploy tidak menjalankan migration. | PASS: Production 24 Oktober melalui composite deployment evidence dan owner smoke; Preview minimum historis tetap diterima. Formal Preview HTTP PARTIAL tidak diubah. |
| Reproduksi anggota kedua | Anggota bernama pada mesin kedua, clean accepted checkout, actual quality results dan Dev-only local application/connectivity smoke yang diotorisasi, tanpa secret exposure. | PASS — Chacha, laptop kedua Windows 10, clean accepted testing, Node 24.21.0/npm 11.19.0, 301 tests/quality/local smoke PASS; prior Dev APPLICATION authorization dan runtime Development dikonfirmasi manusia. |
| Final acceptance | Final review atas candidate/evidence matrix, keterbatasan dan konsistensi dokumen; tidak ada unresolved blocking mismatch; owner memberikan final Gate 1 acceptance. | PASS — explicit final owner acceptance 24 Oktober 2026, setelah independent final assessment READY. |

Accepted closure references: main Production `16700a73c37e4c7a3b08cf1ab69c96fd848e5038` dan accepted testing `ff95ee70d3a7bf6a68b3376c9622470204e86890`, dengan provenance/scope pada [closure report](proses/phase-0/0d/PHASE_0D_GATE1_FINAL_CLOSURE_REPORT.md). Historical deployment/source references pada ringkasan berikut tetap historis; WIP verifier tidak menjadi release candidate.

### Ringkasan evidence lokal yang belum dipublikasikan

Ringkasan berikut berasal dari laporan eksekusi/assessment lokal bertanggal, bukan provider read, deployment, HTTP request atau pemeriksaan credential baru pada revisi dokumentasi ini. Semua nama laporan pada tabel adalah referensi audit lokal di docs/proses/phase-0/0d/, berstatus **NOT PUBLISHED**; file lengkap dan verdict historis dipertahankan tanpa dipublikasikan. Ringkasan ini mencatat dasar accepted minimum evidence serta keterbatasannya.

| Sumber lokal — NOT PUBLISHED | Provenance dan hasil yang diterima | Batas pembuktian |
| --- | --- | --- |
| `PHASE_0D_VERCEL_PRODUCTION_INITIAL_DEPLOYMENT_REPORT.md`, bagian C–J | Executor scoped provider/Dashboard reads: project courier-route-planner, workspace ardhankurniawans-projects, GitHub ArdhanKurniawan/courier-route-planner; deployment `dpl_ixwFvRzsJeoAHduzE7vcsBt7SVmW`, Production/main, SHA `a0a9c291fb980d2ff32b32f2b0fd9c2b3dfc429b`, provider READY 17 Oktober 2026 22:48:03.574 WIB. Native HTTPS smoke pada alias publik courier-route-planner.vercel.app, 22:52:40–22:52:44 WIB: root 200/HTML/Foundation shell; health dan ready 200, Content-Type `application/json`, body `{"status":"ok"}`, Cache-Control no-store. | Status/headers berasal dari Production alias yang dikaitkan ke deployment; protected exact URL hanya mempunyai authenticated body checks. Bounded build logs dan source mendukung no migration pada build path. Readiness SELECT 1 tidak mengidentifikasi resource/account/DB. |
| `PHASE_0D_VERCEL_PREVIEW_INITIAL_DEPLOYMENT_REPORT.md`, bagian C–I | Executor scoped provider reads dan Dashboard: deployment `dpl_CVSfQbFTtyLX6fC9YZvPij96mRSY`, Preview/testing, SHA `906557639bdb3a81b9e9cd7a9d5d9f9cd6e23087`, provider READY 18 Oktober 2026 09:25:02.607 WIB, same project/workspace/Git link. Existing authorized IAB mengamati Foundation shell dan exact ok JSON health/ready pada 09:27 WIB. Metadata empat env assignments, IDs/timestamps dan Production identity dipertahankan pada pre/post guards. | Initial authenticated observations adalah body checks, tanpa live status/headers. Project metadata bukan full immutable settings dump; env IDs/timestamps bukan bukti Secret bytes. Subsequent composite Preview metadata acceptance tetap terpisah dari verdict HTTP PARTIAL. |
| `PHASE_0D_VERCEL_PRIVATE_ENV_CONFIGURATION_REPORT.md`, bagian D–J | Scoped connector metadata dengan decrypt=false dan targeted Dashboard reconciliation, closing guard 17 Oktober 2026 15:06:23 UTC: tepat empat assignments. Production-only dan Preview-only/All Branches masing-masing mempunyai APP_ENV encrypted/config dan DATABASE_URL sensitive/secret; tidak ada Development, branch/custom override atau shared conflict. Intended APP_ENV production/testing dan Production/Testing APPLICATION credential sources dikonfirmasi manusia melalui private handoff. | Agent tidak membaca literal/Secret/private env. Source/role adalah human attestation ditambah historical provisioning records; metadata tidak membuktikan actual stored bytes, SQL grants atau physical runtime binding. Deployment reports di atas mengaitkan preservation metadata dengan actual deployment/source; tidak mengeklaim byte equality. |
| `PHASE_0D_PREVIEW_HTTP_PARTIAL_EVIDENCE_ASSESSMENT_REPORT.md`, bagian 1–5 | Human-reported Chrome Network transcription, 18 Oktober 2026, target Preview deployment di atas dan origin publik courier-route-planner-8f3gc79n1-ardhankurniawans-projects.vercel.app: root 200/HTML/Foundation shell; health dan ready 200, Content-Type `application/json`, body `{"status":"ok"}`, Cache-Control no-store. Reported Date headers root 04:32:52, health 04:32:33, ready 04:03:14 UTC. Executor menilai transkripsi, tanpa capture/request ulang; screenshot tidak diinspeksi pada assessment itu. | Historical verdict tetap PROTECTED PREVIEW HTTP PARTIAL EVIDENCE — CLOSURE NOT VERIFIED. Chrome berbeda dari approved IAB; intentional counts, freshness, capture time, exact response correlation/binding dan procedural compliance belum terbukti. Date headers bukan verified capture timestamps. Owner kemudian menerima technical observations terbatas untuk minimum Gate 1, tanpa mengubah verdict historis. |

Hasil di atas dipakai bersama provisioning/resource mapping dan source review pada kontrak isolasi berikut. Evidence metadata/provisioning/konektivitas gabungan tetap diterima untuk Gate 1; **direct physical runtime SQL identity tetap NOT VERIFIED**. Referensi inventory verifier lokal yang juga NOT PUBLISHED diringkas terpisah pada [DoD](19_DEFINITION_OF_DONE.md#prosedur-penyimpanan-wip--referensi-untuk-operasi-yang-diotorisasi-terpisah).

### Batas pembuktian isolasi

Evidence gabungan yang disetujui terdiri dari **semua** komponen berikut:

1. Independent provider resource/provisioning mapping dan complete application principal/account-host → logical database, dengan provenance tersendiri dari URL yang diuji. A1–A3 historis telah diterima; A2 dilengkapi human-attested provider readback 18 Oktober sekitar 18.55–18.57 WIB, bukan verifikasi agent baru.
2. Private source/role attestation dan scoped assignment: Production menggunakan Production application credential; Preview menggunakan Testing application credential. Metadata key/type/target/override tidak membuktikan bytes secret.
3. Keterkaitan assignment/configuration records dengan actual deployment ID, commit SHA, environment dan waktu deployment yang diterima. Setting project saat ini saja tidak membuktikan snapshot deployment lama.
4. Review application database factory pada accepted source: memakai application DATABASE_URL, tanpa admin/migrator atau alternate caller target. Parser URL runtime memvalidasi format; exact APP_ENV/database guards migrator tidak boleh diklaim sebagai runtime enforcement.
5. Health/readiness smoke pada deployment relevan. Health app-only dan readiness SELECT 1 membuktikan liveness/connectivity; **keduanya sendiri tidak membuktikan identity/resource isolation**.

Label acceptance ini adalah **pemisahan environment berdasarkan evidence gabungan konfigurasi/provisioning dan konektivitas**, bukan direct physical runtime SQL identity VERIFIED. Rantai tidak lengkap → PENDING; cross-environment mismatch teramati → FAIL. Tidak mengarang actual SQL identity dari metadata atau boolean connectivity.

### Evidence yang dipakai kembali dan gap minimum

[0A](proses/phase-0/0a/PHASE_0A_INDEPENDENT_VERIFICATION_REPORT.md), [0B](proses/phase-0/0b/PHASE_0B_INDEPENDENT_VERIFICATION_REPORT.md), [0C](proses/phase-0/0c/PHASE_0C_FINAL_INDEPENDENT_VERIFICATION_REPORT.md), [main promotion/Quality Gate](proses/phase-0/0d/PHASE_0D_MAIN_FOUNDATION_PROMOTION_REPORT.md), [Testing](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md), [Production](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md), serta env/deployment summaries pada [ringkasan lokal](#ringkasan-evidence-lokal-yang-belum-dipublikasikan) adalah evidence bertanggal, bukan fresh executions pada revisi ini. Preview metadata composite dan human attestations yang diterima dicatat sesuai provenance; raw private values tidak diperlukan dalam dokumen.

Minimum smoke dan stable testing Preview sudah diterima melalui YES APPROVE GATE1 MINIMUM EVIDENCE PLAN. HTTP assessment PARTIAL pada [ringkasan lokal](#ringkasan-evidence-lokal-yang-belum-dipublikasikan) dan historical process deviations dipertahankan. Password replacement HUMAN-ATTESTED dan reuse UNKNOWN tetap residual uncertainty yang diterima owner; exposure tidak diubah menjadi CLOSED dan tidak memicu triage ulang tanpa risiko baru konkret.

Reproduksi anggota kedua dan final candidate/evidence acceptance kini PASS; tidak ada unresolved mandatory Gate 1 blocker dalam accepted scope. Untuk perubahan berikutnya, evaluasi hanya evidence yang terdampak source/dependency/workflow/configuration/deployment drift dan applicable exact-commit Quality Gate. Jangan mengulang accepted mapping, SQL, screenshot, HTTP atau credential triage demi administrasi. Perubahan dokumen saja tidak otomatis membutuhkan deployment/application probe.

Custody/ACL, system variables untuk ticket binding, dan collector checks khusus verifier tidak memblokir metode baru. Explicit saved spending-limit-0 yang belum terbukti tetap keterbatasan cost metadata, bukan bukti isolation gagal; jangan mengklaim angka fresh atau menjadikan billing edit sebagai syarat Gate 1 baru. Kebijakan resource/cost existing tetap berlaku untuk tindakan cloud berikutnya.

[Reproduksi anggota kedua](17_SETUP_FROM_ZERO.md#reproduksi-anggota-kedua--gate-1), [DoD/WIP boundary](19_DEFINITION_OF_DONE.md#8-gate-1--proportionate-evidence-and-deferred-verifier), independent final assessment dan human acceptance telah dipenuhi. Closure ini tidak memulai Gate 2, endpoint/key/SQL baru, ataupun publikasi Git. Tindakan berikutnya tetap membutuhkan authorization sesuai scope.

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
