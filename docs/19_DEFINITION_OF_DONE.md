# 19 — DEFINITION OF DONE

**Current Gate 1 decision — 2026-10-18:** [proportionate evidence acceptance](23_PHASE_GATES_CHECKLISTS.md#gate-1--foundation) berlaku; verifier Ed25519 dan custody/ticket checkpoint ditunda. Gate 1 tetap OPEN. Status deployment dalam snapshot 11 Oktober di bawah bukan status terkini; gunakan laporan deployment bertanggal dan criterion Gate 1.

**Promotion evidence 2026-10-11:** [PR #20 closure](proses/phase-0/0d/PHASE_0D_MAIN_FOUNDATION_PROMOTION_REPORT.md); current-candidate PR Quality and post-merge main Quality PASS. Vercel NOT integrated; public Production/Preview NOT deployed; Phase 0D/Gate 1 OPEN.

## 1. Task DoD

Task selesai bila:

- [ ] Acceptance Criteria terpenuhi;
- [ ] code reviewed sendiri (`git diff`);
- [ ] lint pass;
- [ ] typecheck pass;
- [ ] relevant tests pass;
- [ ] build pass;
- [ ] docs updated bila contract berubah;
- [ ] no secret;
- [ ] manual check dilakukan;
- [ ] known limitation dicatat.

## 2. Feature DoD

Tambahkan:

- [ ] Preview deployment dapat diuji;
- [ ] error/empty/loading state;
- [ ] security boundary checked;
- [ ] integration test bila menyentuh DB;
- [ ] screenshot/evidence PR;
- [ ] migration reviewed bila ada.

## 3. Algorithm DoD

- [ ] valid closed tour;
- [ ] customer exactly once;
- [ ] depot start/end;
- [ ] recomputed distance same;
- [ ] edge cases;
- [ ] deterministic seed test where applicable;
- [ ] no framework dependency;
- [ ] complexity/risk documented;
- [ ] parameter contract documented.
- [ ] NN directed minimum, depot=0, lowest-index tie;
- [ ] 2-Opt best improvement, full directed recomputation, asymmetric fixtures pass, <= NN distance;
- [ ] ACO Classical Ant System, directed pheromone, seeded reset, all-ant deposit, fixed iterations;
- [ ] tidak ada post-ACO 2-Opt atau invented final numeric defaults.

## 4. Database DoD

**Phase 0C Dev foundation: VERIFIED.** Offline foundation dan independent offline verification PASS; manusia memprovision Dev dan menerapkan initial depots migration sekali. Read-only live verification membuktikan application HTTP read/readiness, migration TCP/TLS SELECT 1, ledger 1 entry dan schema/PK/index sesuai source/SQL. [Dev live evidence](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md). Testing pada 0D-3B PROVISIONED terpisah, migration APPLIED ONCE setelah approval eksplisit, ledger/schema/app read/health/readiness PASS; [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production LIVE independent Starter, initial migration exactly once/schema-ledger verified; [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md). **Initial three-environment database foundation: VERIFIED. Full Database DoD: PENDING**, karena future mutation/rollback requirements belum ditutup. Phase 0C CLOSED/PR #9, final independent verification PASS; Phase 0D/Gate 1 OPEN; deployment Vercel berikutnya mengikuti evidence dan acceptance pada [Gate 1](23_PHASE_GATES_CHECKLISTS.md#gate-1--foundation). Tidak ada production migration automation. TiDB DDL dapat autocommit; migration berikutnya memerlukan review target/history, partial-failure mitigation dan explicit approval.

- [x] initial depots schema migration documented;
- [x] initial depots Dev applied; ledger/schema verified read-only;
- [x] Testing migration tooling prepared locally (0D-3A): explicit Testing guard/config/manual script, TLS verification and offline cross-env tests; [report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md);
- [x] Testing PROVISIONED / migration APPLIED ONCE; role separation, ledger/schema/application read/health/readiness verified pada approved 0D-3B;
- [x] Production tooling verified: exact environment/database guard, TLS, separate config/manual command, offline cross-env tests; [Production tooling report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_TOOLING_REPORT.md);
- [x] Production LIVE independent Starter, two separate human approvals/private handoff selesai; invocation 1/retry 0/exit 0, identity/scoped grants/TLS/schema/ledger/application read verified; [Production live report](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md);
- [ ] no destructive prod action;
- [ ] indexes justified;
- [ ] rollback/mitigation known.

Initial database foundation evidence di atas tetap historis; full Database DoD untuk future mutation/rollback tetap pending. Production/Preview deployments berikutnya tercatat pada [Gate 1](23_PHASE_GATES_CHECKLISTS.md#gate-1--foundation); acceptance pemisahan environment mengikuti metode gabungan di sana, tanpa mengklaim direct physical runtime SQL identity. main FOUNDATION PROMOTED (PR #20), main Quality Gate VERIFIED, main required-check behavioral proof CLOSED/VERIFIED adalah historical evidence. Future partial failure tetap memerlukan read-only inspection dan separate remediation approval; tidak automatic retry. [Production contract](07_TIDB_GUIDE.md#production-migration-tooling--phase-0d).

## 5. Release DoD

- [ ] CI green;
- [ ] testing QA green;
- [ ] UAT evidence;
- [ ] prod env checked;
- [ ] prod migration executed safely;
- [ ] smoke test after deploy;
- [ ] release note;
- [ ] no blocker.

## 6. Research benchmark DoD

- [ ] case frozen;
- [ ] input hash;
- [ ] same matrix both algorithms;
- [ ] OSRM road validation dan Table matrix frozen, meter, directed, no unreachable pair;
- [ ] stable node order dan exact matrix hash cocok di kedua experiments;
- [ ] seeds saved;
- [ ] algorithm parameters saved;
- [ ] machine info saved;
- [ ] dataset ordinal mapping dan balanced execution schedule disimpan sesuai [protocol bagian 6](15_RESEARCH_BENCHMARK_PROTOCOL.md#6-environment-and-timer-boundary);
- [ ] commit SHA saved;
- [ ] invalid routes rejected;
- [ ] raw results exported;
- [ ] summary reproducible from raw results.
- [ ] calibration terpisah dan satu global ACO config frozen;
- [ ] main 10/25/50 × 10 random datasets; N=100 conditional, other patterns optional;
- [ ] 30 independent seeded ACO runs dan 30 NN+2-Opt timing samples per dataset;
- [ ] 5 warm-ups per algoritma/dataset dikeluarkan dari statistik;
- [ ] timer hanya algoritma, tanpa OSRM/DB/network/serialization/geometry/rendering;
- [ ] ACO median/mean comparison utama, best tambahan; RQ3 range/SD/CV;
- [ ] dataset adalah unit observasi, repetitions tidak dihitung sebagai independent datasets;
- [ ] failure/poor valid runs disimpan, incomplete datasets dilabeli.

Detail contract: [docs/32](32_RESEARCH_DECISIONS.md), [docs/33](33_ALGORITHM_SPECIFICATION.md), [docs/34](34_OSRM_DISTANCE_CONTRACT.md), [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md).

## 7. Documentation-only DoD

Untuk perubahan yang tidak menyentuh source/package: audit initial branch/status, review changed docs, diff --check, internal links, contradictions, MASTER_GUIDE parity, dan MANIFEST actual bytes/SHA-256. Jalankan existing lint/build bila environment memungkinkan; missing typecheck/test dilaporkan sebagai foundation gap, bukan hasil PASS. Jangan membuat scripts/dependencies hanya untuk menyatakan documentation task lolos application tests.

## 8. Gate 1 — proportionate evidence and deferred verifier

Keputusan owner 18 Oktober 2026, **YES APPROVE GATE 1 PROPORTIONATE EVIDENCE REVISION**, menetapkan [criterion PASS/PENDING/FAIL Gate 1](23_PHASE_GATES_CHECKLISTS.md#gate-1--foundation) sebagai acceptance foundation. Full Feature, Database, Research dan Release DoD tidak otomatis menjadi seluruh prerequisite Gate 1. Auth/authorization sebelum public mutation tetap wajib menurut ADR-009; keputusan ini tidak mengurangi scope Gate 2 atau security boundary aplikasi.

Ed25519 verifier, diagnostic endpoint, real keys/tickets, dedicated Windows custody/ACL dan checkpoint terkait ditunda. Historical implementation/review reports serta seluruh 11 source/test files WIP tetap dipertahankan. Review dokumentasi ini tidak merilis, men-disable deployment, menghapus, memindahkan atau mengubah source tersebut.

### Prosedur penyimpanan WIP — referensi untuk operasi yang diotorisasi terpisah

Inventory historis berasal dari executor report Phase 0D-8B, 18 Oktober 2026, bagian 2. Referensi audit lokal: `PHASE_0D_RUNTIME_TIDB_ISOLATION_LOCAL_IMPLEMENTATION_REPORT.md` — **NOT PUBLISHED**, disimpan di docs/proses/phase-0/0d/. Ringkasannya berikut membuat inventory dapat dibaca tanpa laporan lokal tersebut:

- 9 file baru dalam arsip WIP: `scripts/foundation-sign-ticket.mjs`, `src/app/api/internal/foundation-verify/route.ts`, `src/config/foundation-verifier.ts`, `src/db/foundation-verify.ts`, `src/security/foundation-ticket.ts`, `tests/unit/foundation-ticket.test.ts`, `tests/unit/foundation-verifier-config.test.ts`, `tests/unit/foundation-verify-route.test.ts`, `tests/unit/foundation-verify.test.ts`.
- 2 existing files yang dimodifikasi: `src/db/client.ts` dan `tests/unit/db-client.test.ts`.
- Setelah owner mengotorisasi local preservation, executor memverifikasi arsip lokal pada branch `wip/phase-0d-runtime-isolation-verifier`, commit verifier `f783612ac4f733c6a40e537fef5ff2ee80db4596`. Metadata Git lokal ini bukan bukti publikasi, release atau runtime isolation. Verifier tidak disertakan pada kandidat dokumentasi Gate 1.

1. Inventarisasi tepat 11 file di atas. Perubahan database client dan tests termasuk dalam scope, sehingga mengecualikan file baru saja tidak cukup.
2. Setelah separate explicit Git authorization, buat branch WIP khusus dari exact current base dan commit hanya 11 file tersebut dengan explicit allowlist. Jangan memasukkan normative revision ini, historical untracked reports, skills atau private values secara otomatis. Tidak broad staging, stash/reset atau discard.
3. Verifikasi WIP commit mencakup seluruh intended changes dan hash/diff sesuai snapshot; pertahankan working tree/dokumen lain. Gunakan clean checkout/worktree dari accepted foundation ref untuk pekerjaan aplikasi berikutnya, tanpa menyalin WIP verifier.
4. Publikasi revision normatif dilakukan terpisah setelah scope Git/PR disetujui. Perubahan verifier masuk release hanya melalui keputusan dan review khusus di masa depan. Prosedur ini tidak memberikan izin Git atau cloud; setiap operasi memerlukan otorisasi scope tersendiri.

### Final acceptance

Gunakan accepted deployment/source references dan evidence yang masih relevan, [reproduksi anggota kedua](17_SETUP_FROM_ZERO.md#reproduksi-anggota-kedua--gate-1), serta final independent review dan human sign-off. Batas dan UNKNOWN tetap dicatat; exposure credential tidak diubah CLOSED, historical PARTIAL tidak diubah menjadi fresh PASS. Kegagalan/mismatch material memblokir criterion terkait; known limitation di luar criterion tidak menjadi blocker administratif baru.

Revisi normatif ini tidak meregenerasi MASTER_GUIDE/MANIFEST karena scope owner hanya existing normative documents. Derived files tetap dated snapshots; tidak mengeklaim fresh parity terhadap source yang direvisi. Sinkronisasi derived dilakukan pada scope publikasi dokumentasi yang mengizinkannya. **Gate 1 tetap OPEN sampai seluruh criterion dan final human acceptance terpenuhi.**
