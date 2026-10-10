# 12 — CI/CD & RELEASE

## 1. Separation of responsibility

**GitHub Actions:** quality gate.  
**Vercel Git Integration:** deployment.

Jangan duplikasi deployment melalui Actions tanpa kebutuhan khusus.

**Current Phase 0D OPEN:** [quality.yml](../.github/workflows/quality.yml) implemented dan remote verified; exact Quality Gate/GitHub Actions required pada testing/main. Testing behavioral proof VERIFIED; main behavior DEFERRED ke real testing → main promotion. [Behavioral evidence](proses/phase-0/0d/PHASE_0D_ENFORCEMENT_BEHAVIOR_PROOF_REPORT.md). Tooling 0D-3A merged/PR #14; Testing pada 0D-3B PROVISIONED terpisah dari Dev, migration APPLIED ONCE dengan explicit approval, live verification PASS. [Testing live report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md). Production NOT PROVISIONED; Vercel NOT CONNECTED; Preview isolation pending; Gate 1 OPEN.

## 2. CI triggers

Actual triggers:

- `pull_request` dengan base branches `testing` dan `main`, default opened/synchronize/reopened;
- `push` ke `testing` dan `main`, untuk actual merge/branch SHA.

Tidak ada feature push trigger, pull_request_target, schedule, workflow_dispatch, path filter atau matrix. Workflow **Quality**, job ID **quality**, display/check job **Quality Gate**. Exact required context yang verified adalah Quality Gate, GitHub Actions app15368; strict freshness aktif pada testing/main.

## 3. CI stages

```text
checkout
→ setup Node 24 + npm cache
→ npm ci
→ lint
→ typecheck
→ unit/component tests
→ coverage tanpa threshold
→ offline db:check
→ build
→ post-build typecheck
→ runtime audit hard gate
→ full audit informational
```

Sembilan required commands fail pada nonzero exit. Full audit memakai inline Node standard library: jalankan npm audit --json, parse/validate evidence, tampilkan counts dan affected package names/severity. Valid advisory result dengan exit 0/1 nonblocking; spawn/signal/unexpected exit, error JSON, malformed output atau inconsistent counts gagal step. Tidak ada `|| true`, continue-on-error, atau acceptance count yang di-hardcode. [npm audit reference](https://docs.npmjs.com/cli/v11/commands/npm-audit/) menjelaskan exit nonzero untuk advisories; tool error tidak boleh disamakan dengan advisory result.

Runtime `npm audit --omit=dev --json` hard gate untuk advisory severity apa pun, tanpa audit-level override. Full findings tetap visible dan ditriage terpisah; tidak menjalankan audit fix. Coverage command wajib tanpa numeric threshold/third-party upload. Playwright/E2E dan live integration DB tests belum menjadi workflow commands.

Runner ubuntu-latest, timeout 10 menit. Permissions hanya contents:read; checkout persist-credentials:false. Actions dipin ke full SHA dengan version comments. Setup-node menggunakan Node 24 dan cache:npm/package-lock.json; tidak cache node_modules. Workflow tidak memberikan project/cloud/DB secrets atau APP_ENV/DATABASE_URL. GitHub automatic token tetap ada dengan read scope; tidak ada custom token/PAT atau write permission.

Concurrency group `${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}`, cancel-in-progress hanya saat pull_request. PR superseded dapat dibatalkan; unrelated PRs terpisah; running push tidak aktif dibatalkan. Default pending-run replacement tetap mungkin, sehingga evidence terbaru harus cocok current SHA. Ini mengikuti [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## 4. Required npm scripts

Actual commands dari package.json; urutan workflow:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run db:check
npm run build
npm run typecheck
npm audit --omit=dev --json
npm audit --json
```

Typecheck menjalankan next typegen && tsc --noEmit. db:check adalah offline migration-history validation, bukan live DB. Tidak ada db:generate, db:migrate, health/readiness HTTP call, Vercel command, environment deployment job atau artifact upload. APP_ENV/DATABASE_URL/private env tidak diperlukan untuk quality. Script e2e belum tersedia; jangan mengarang existing command.

## 5. Deploy model

Bagian 5–9 adalah panduan release lanjutan setelah task/approval terkait. Stage 0D-1 tidak membuktikan cloud deployment atau memberikan izin migration/release.

```text
feature branch → Vercel Preview
 testing       → Vercel Preview stable branch
 main          → Vercel Production
```

## 6. Database migration in deploy

Jangan otomatis menjalankan destructive migration pada setiap Preview build.

Policy awal:

- dev migrations manual/controlled;
- testing migration setelah review;
- production migration sebagai release step terencana.

Setelah tim matang, automation dapat ditambah dengan ADR.

0D-3A menyediakan manual guarded Dev `db:migrate` dan Testing `db:migrate:testing`; keduanya dilarang dijalankan dari install/build/dev/start/test/CI/Vercel. `db:check` tetap offline. Testing initial apply telah dijalankan tepat sekali pada 0D-3B setelah explicit human approval **YES APPLY TESTING MIGRATION**, dengan pre-empty-state dan post-ledger/schema/live checks PASS. Jangan rerun untuk idempotence test; migration berikutnya membutuhkan task/review/approval baru. Production helper/config/script belum tersedia. [Tooling report](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_TOOLING_REPORT.md); [Testing live evidence](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md).

## 7. Release checklist

Sebelum testing → main:

- [ ] CI green;
- [ ] QA checklist green;
- [ ] migration applied to testing;
- [ ] UAT/smoke testing selesai;
- [ ] no open blocker;
- [ ] backup/export bila migration risky;
- [ ] environment variables verified;
- [ ] production domain known;
- [ ] rollback path known.

## 8. Post-deploy smoke

Minimal:

1. home/dashboard load;
2. health endpoint;
3. DB read;
4. safe write/read/delete on production demo data bila sesuai;
5. map render;
6. run small NN+2Opt scenario;
7. run small ACO scenario;
8. verify no console/server critical error.

## 9. Rollback principle

Code rollback di Vercel relatif mudah melalui previous deployment/revert commit. Database rollback **tidak otomatis**.

Karena itu schema change harus backward-compatible sebisa mungkin.

Recommended expand/contract:

```text
add new column
→ deploy code supporting both
→ migrate data
→ switch reads
→ later remove old column
```
