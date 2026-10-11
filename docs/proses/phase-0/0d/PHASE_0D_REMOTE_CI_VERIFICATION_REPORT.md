# Phase 0D-2 — Remote CI Verification Report

Tanggal verifikasi: **2026-10-04**. Repository: `ArdhanKurniawan/courier-route-planner`. Mode: **STRICT READ-ONLY GITHUB REMOTE VERIFICATION + FACTUAL REPORTING**.

## A. Verdict

**REMOTE CI VERIFIED — REQUIRED CHECK ENFORCEMENT PENDING**

PR #10 merged; pull_request Quality Gate dan post-merge testing push Quality Gate keduanya completed/success. Actual checkout, Linux environment, seluruh required steps, tests, offline db:check, build, runtime audit dan full-audit wrapper diverifikasi dari API/log remote.

**PROCESS DEVIATION / CONTROL GAP:** merge terjadi sebelum PR Quality Gate selesai. Technical quality evidence PASS dapat diterima; PR #10 tidak diblokir oleh Quality Gate sebelum merge. Required-check enforcement belum terbukti. Phase 0D dan Gate 1 tetap OPEN.

## B. Verification Scope

Task hanya membaca GitHub PR/ref/commit/run/job/check/ruleset metadata, dua complete job logs, workflow pada exact testing merge commit, serta local source/baseline yang relevan. Known human observations diperiksa ulang; tidak dipakai sebagai pengganti remote evidence.

Plan: audit local baseline → verify PR/merge topology → inspect kedua run dan full logs → verify check identity dan accessible protections → factual report → independent report review → final preservation checks.

AGENTS.md, RTK.md, `.agents/`, historical baseline dan implementation report dibaca. Skills: using-superpowers, verification-before-completion, requesting-code-review. Supported shell commands menggunakan RTK proxy. `gh` tidak tersedia; GitHub connector GET/read tools digunakan. Tidak ada skill installation atau systematic-debugging session karena tidak ada conflicting CI evidence.

Satu-satunya project output adalah laporan ini. Tidak menjalankan ulang local quality suite maupun workflow, mengubah workflow/source/docs existing, atau melakukan Git/configuration/cloud mutation.

Evidence lokal di luar Git:

`C:/Users/L E N O V O/AppData/Local/Temp/courier-phase0d-remote-ci-20261004/`

`remote-evidence.json`, `remote-quality.yml`, `job-111417235025.log`, `job-111417258765.log`, `verified-evidence.json`, `initial.json` dan `final-preservation.json`. Logs dibaca penuh; timestamps/API digunakan untuk timeline. Snapshot ini host-local dan dapat kedaluwarsa; canonical GitHub links tetap dicantumkan pada section terkait.

## C. Repository / Remote Context

Local initial snapshot `2026-10-04T10:48:57.031Z`:

| Item | Actual |
|---|---|
| Local branch | feature/phase-0d-remote-ci-verification |
| Local HEAD / testing / origin/testing | 904b49135f725276a751b00d141c88fecd821bc5 |
| Local main / origin/main | 7836b894c212e951dfe652d30b2531b128f7deff |
| Working tree / index | Clean / empty |
| Initial diff check | PASS, exit 0 |
| Initial preserved file set | 212 repository files; 402 skill files |
| Remote refs/heads/testing | 904b49135f725276a751b00d141c88fecd821bc5 |
| PR | #10, Phase 0D-1 — Quality CI Foundation |

Remote testing cocok local baseline; tidak ada fetch/pull/sync otomatis. Remote ref dibaca melalui [testing ref API](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/git/ref/heads/testing), lalu dikonfirmasi ulang `2026-10-04T10:59:09.435Z`: masih merge SHA yang sama. Source of truth untuk current remote verification adalah remote ref tersebut; final ref snapshot tersimpan sebagai `final-testing-ref.json` di TEMP evidence directory.

Historical context: [baseline report](PHASE_0D_BASELINE_AUDIT_REPORT.md) dan [local implementation report](PHASE_0D_CI_IMPLEMENTATION_REPORT.md). Historical local/remotely-pending statements dipertahankan sebagai snapshot, bukan ditulis ulang oleh task ini.

## D. PR #10 Merge Evidence

[PR #10](https://github.com/ArdhanKurniawan/courier-route-planner/pull/10), independently read melalui [PR API](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/pulls/10):

| Field | Actual |
|---|---|
| Title | Phase 0D-1 — Quality CI Foundation |
| State / merged | closed / true |
| Head branch | feature/foundation-ci-vercel |
| Head SHA | 17efa76a98948c26d9b46912029de2800b2ff66b |
| Base branch / recorded base SHA | testing / e1c36988e588e397af312a140677c3f71bd451d2 |
| Created at | 2026-10-04T10:34:10Z |
| Merged at | 2026-10-04T10:34:21Z |
| Closed at | 2026-10-04T10:34:21Z |
| Merge SHA | 904b49135f725276a751b00d141c88fecd821bc5 |

[Merge commit API](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/git/commits/904b49135f725276a751b00d141c88fecd821bc5) confirms ordered parents `e1c36988e588e397af312a140677c3f71bd451d2` and `17efa76a98948c26d9b46912029de2800b2ff66b`, with message:

```text
Merge pull request #10 from ArdhanKurniawan/feature/foundation-ci-vercel

Phase 0D-1 — Quality CI Foundation
```

Feature, synthetic PR merge and actual testing merge have identical tree `52f985424329426db6f4a27791b246140415d8c4`. Workflow exists at the actual merge commit; remote/local workflow content matches after line-ending normalization.

## E. Process Deviation

**YES — PROCESS DEVIATION / CONTROL GAP.** Exact API timestamps, UTC:

| Event | Timestamp |
|---|---|
| PR created | 10:34:10Z |
| PR workflow run started | 10:34:14Z |
| PR Quality Gate check started | 10:34:17Z |
| PR #10 merged | 10:34:21Z |
| testing push workflow started | 10:34:23Z |
| testing push Quality Gate check started | 10:34:26Z |
| PR Quality Gate completed success | 10:35:09Z |
| PR run updated as completed/success | 10:35:10Z |
| testing push Quality Gate completed success | 10:35:20Z |

Merge occurred **48 seconds before PR check completion**. Run updated_at is recorded separately from check completed_at; it is not substituted for a job completion timestamp. PR run started seven seconds before merge.

PR CI did execute and later passed. Actual merged testing SHA also received a successful push-triggered check. Merged code therefore has successful remote quality evidence, while PR #10's merge did not wait for the required quality result. This is a process/control finding, not evidence of code/CI implementation failure. No rollback or history rewrite was performed.

## F. Pull Request CI Run

[Quality run 37195784553](https://github.com/ArdhanKurniawan/courier-route-planner/actions/runs/37195784553):

| Item | Actual |
|---|---|
| Workflow / path | Quality / .github/workflows/quality.yml |
| Event / run number / attempt | pull_request / 1 / 1 |
| Head metadata branch | feature/foundation-ci-vercel |
| Run head_sha metadata | 17efa76a98948c26d9b46912029de2800b2ff66b |
| Actual checkout | refs/remotes/pull/10/merge |
| Actual checkout SHA | 6d11da321114076d1fe30f83edf03ba8118dcbea |
| Status / conclusion | completed / success |
| Job/check ID | 111417235025 |
| Check suite ID | 100750479543 |
| Check start → completion | 10:34:17Z → 10:35:09Z; 52 seconds |

Checkout log fetched the synthetic SHA and `git log -1 --format=%H` printed it. [Synthetic commit API](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/git/commits/6d11da321114076d1fe30f83edf03ba8118dcbea) confirms merge of feature `17efa76…` into base `e1c369…`, with both exact parents and the same tree as actual merge. PR CI tested merge-ref content; it did not test only the raw feature SHA.

## G. Post-Merge Testing CI Run

[Quality run 37195792090](https://github.com/ArdhanKurniawan/courier-route-planner/actions/runs/37195792090):

| Item | Actual |
|---|---|
| Workflow / path | Quality / .github/workflows/quality.yml |
| Event / run number / attempt | push / 2 / 1 |
| Branch | testing |
| Run head_sha and actual checkout | 904b49135f725276a751b00d141c88fecd821bc5 |
| Status / conclusion | completed / success |
| Job/check ID | 111417258765 |
| Check suite ID | 100750500533 |
| Check start → completion | 10:34:26Z → 10:35:20Z; 54 seconds |

Checkout log fetches this SHA into origin/testing and prints the same SHA after checkout. This run verifies the actual current testing merge commit, independently of the PR merge-ref identity.

## H. Exact Check Identity

| Field | PR feature evidence | testing merge evidence |
|---|---|---|
| Check name | Quality Gate | Quality Gate |
| Provider/app | GitHub Actions | GitHub Actions |
| App ID / slug | 15368 / github-actions | 15368 / github-actions |
| Check-run ID | 111417235025 | 111417258765 |
| Conclusion | success | success |

Read [feature check-runs API](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/commits/17efa76a98948c26d9b46912029de2800b2ff66b/check-runs) and [merge check-runs API](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/commits/904b49135f725276a751b00d141c88fecd821bc5/check-runs): each has one completed successful check with the identity above. Workflow name is Quality, job ID is quality; the observed check name is exactly **Quality Gate**. No composite context string invented.

Future enforcement should select this observed GitHub Actions context. Its presence/success does not itself prove enforcement.

## I. Runner Environment

Actual values from both complete remote job logs:

| Item | PR | testing push |
|---|---|---|
| OS | Ubuntu 24.04.5 LTS | Ubuntu 24.04.5 LTS |
| Runner image | ubuntu-24.04 | ubuntu-24.04 |
| Image version | 20260927.320.1 | 20260927.320.1 |
| Actions runner version | 2.337.0 | 2.337.0 |
| Node | v24.21.0 | v24.21.0 |
| npm | 11.19.0 | 11.19.0 |
| Git | 2.55.0 | 2.55.0 |

Workflow selected ubuntu-latest and Node 24. Setup-node resolved the hosted Node toolcache; Runtime versions output independently confirms Node/npm. Remote values differ from local 24.19.0/11.6.0 snapshot; the report uses actual remote values.

## J. Effective Token Permissions

Both logs explicitly show GITHUB_TOKEN Permissions:

```text
Contents: read
Metadata: read
```

No write permission observed. Checkout/setup use GitHub's masked automatic token; no custom PAT/OIDC/cloud/DB token in workflow. App installation capabilities are not used to infer effective token privileges. `Secret source: Actions` in setup log does not demonstrate project DB/deployment secrets were passed to the job.

## K. Pinned Actions

Both logs explicitly download:

| Action | Exact fetched SHA | Version comment in workflow |
|---|---|---|
| actions/checkout | 3d3c42e5aac5ba805825da76410c181273ba90b1 | v7.0.1 |
| actions/setup-node | 820762786026740c76f36085b0efc47a31fe5020 | v7.0.0 |

Checkout input `persist-credentials: false` visible; logs show auth removed after fetch/checkout. Setup-node inputs Node 24, cache npm and cache-dependency-path package-lock.json visible. No additional workflow action. [Exact merge workflow](https://github.com/ArdhanKurniawan/courier-route-planner/blob/904b49135f725276a751b00d141c88fecd821bc5/.github/workflows/quality.yml).

## L. Remote Step Matrix

Job APIs and logs agree. Each listed step is **completed / success** on both runs:

| Step | PR run | testing push |
|---|---|---|
| Set up job | PASS | PASS |
| Checkout | PASS | PASS |
| Setup Node | PASS | PASS |
| Runtime versions | PASS | PASS |
| Install dependencies: npm ci | PASS | PASS |
| Lint | PASS | PASS |
| Typecheck | PASS | PASS |
| Unit and component tests | PASS | PASS |
| Coverage without threshold | PASS | PASS |
| Offline migration history check | PASS | PASS |
| Build | PASS | PASS |
| Typecheck after build | PASS | PASS |
| Runtime audit gate | PASS | PASS |
| Full audit information | PASS | PASS |
| Post Setup Node | PASS | PASS |
| Post Checkout | PASS | PASS |
| Complete job | PASS | PASS |

Seventeen reported job steps; thirteen workflow-defined steps include nine required command gates. No failed/skipped/cancelled step. APIs: [PR jobs](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/actions/runs/37195784553/jobs), [testing push jobs](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/actions/runs/37195792090/jobs).

## M. Tests

Remote normal test and coverage test both report **9 files / 147 tests PASS**, on both runs. Vitest 4.1.11; no failed suite/test. This conclusion comes from actual remote logs, not the previous local report.

Normal test reported duration: PR 2.47 seconds; push 2.57 seconds. Coverage test duration: 3.13 seconds on each run. These are runner log timings, not application or research-algorithm benchmarks.

## N. Coverage

| Metric | PR | testing push |
|---|---:|---:|
| Statements | 18.11% | 18.11% |
| Branches | 16.21% | 16.21% |
| Functions | 17.34% | 17.34% |
| Lines | 18.61% | 18.61% |

V8 whole-source summary matches previous baseline. Existing config includes src TS/TSX, with no numeric threshold. No coverage upload/token or additional exclusion. Low coverage remains a known nonblocking limitation.

## O. DB Check

Both logs execute `npm run db:check` → `drizzle-kit check --config=drizzle.config.ts` and output `Everything's fine`. Both step conclusions success.

Actual config provides dialect/schema/output/breakpoints and no connection credentials. This verifies offline migration history only. No db:generate, db:migrate, drizzle push, live schema query or DATABASE_URL supplied by workflow. Successful db:check does not prove live DB schema.

## P. Build

Both remote builds PASS: **Next.js 16.3.6 (Turbopack)**, successful TypeScript, **17/17 static pages**, `/api/health` and `/api/ready` marked dynamic. Both post-build `next typegen && tsc --noEmit` checks success.

Workflow provides no APP_ENV/DATABASE_URL/private env. No health/readiness HTTP request or DB query invoked by workflow. Production-build wording in Next logs denotes build mode; it does not mean a Production deployment occurred.

## Q. Runtime Audit

Both runs execute `npm audit --omit=dev --json` as a required direct command under Bash fail-on-error, with successful step completion. JSON auditReportVersion 2, empty vulnerabilities object:

| Severity | PR | testing push |
|---|---:|---:|
| Info | 0 | 0 |
| Low | 0 | 0 |
| Moderate | 0 | 0 |
| High | 0 | 0 |
| Critical | 0 | 0 |
| Total | 0 | 0 |

Required runtime gate exit 0 supported by direct command plus completed/success status; no audit-level override or bypass. Runtime zero is current dependency evidence, not a blanket application security claim.

## R. Full Audit Informational Behavior

Both logs show the actual Node heredoc running with `/usr/bin/bash --noprofile --norc -e -o pipefail`. The wrapper executes npm audit --json and prints valid counts/packages, then informational notice. Both steps completed/success, verifying actual Linux execution and closing the prior local report's Linux heredoc boundary for this observed valid-advisory path.

| Severity | PR | testing push |
|---|---:|---:|
| Info | 0 | 0 |
| Low | 1 | 1 |
| Moderate | 6 | 6 |
| High | 12 | 12 |
| Critical | 0 | 0 |
| Total | 19 | 19 |

Visible output states advisories are informational and need separate review. All nineteen printed affected packages match the historical list; local committed lock mapping confirms every node for these names has dev:true. Counts are affected package entries, not nineteen distinct CVEs. Findings remain unresolved.

Raw child npm exit is not printed remotely; wrapper accepts only normal exit 0/1 with valid audit evidence, while final Node step succeeds. Do not substitute historical local raw exit 1 as a newly observed remote child exit. Failure handling is present in unchanged source; no deliberate transport/malformed failure, injected advisory or rerun was performed remotely.

## S. Cache / Runner Notes

Both setup-node logs report npm cache miss (`npm cache is not found`), then Post Setup Node logs report cache saved with the same lock-derived Linux/x64/npm key. These observations are informational; no cache hit is claimed. Hosted Node toolcache hit is distinct from npm package cache miss.

Both npm ci runs installed **641 packages / audited 642**; install log duration 17 seconds PR, 18 seconds push. Record these actual Linux/npm counts separately from prior Windows/npm counts. Workflow/lock content was not modified to force historical install-count equality.

Job/check durations: 52 seconds PR, 54 seconds push. Run started_at to updated_at: 56 seconds PR, 57 seconds push; updated_at is run metadata, not a precise timer for each command. No cancellation occurred in these observed runs; this does not exercise every concurrency scenario.

## T. Nonblocking Warnings

Observed on both runs:

- Vite future native config-loader warning for ESM syntax loaded as CommonJS in vitest.config.ts; current tests PASS.
- Deprecated esbuild-kit/esm-loader and core-utils notices during install.
- npm install-script review warnings for four entries: esbuild 0.18.20/0.25.12/0.28.2 and unrs-resolver 1.11.1. No allowScripts approval/config change performed.
- Next telemetry notice and missing Next build-cache warning.
- Git initial-branch naming hint in ephemeral runner checkout.
- Npm installation audit prints the nineteen known findings; suggestions to audit fix are log output, not commands performed by this task.

No warning fixed, suppressed or treated as evidence of resolved dependency risk. Job conclusions remain success. Later maintenance/triage requires its own scope.

## U. Secret / DB / Deployment Boundary

Exact merge workflow and complete logs show no project DB/cloud secret reference, APP_ENV/DATABASE_URL assignment, migration, live DB probe, health/readiness HTTP call, Vercel command/action/API/hook, deployment environment or deployment step. Automatic GitHub token stays read-only and masked.

DB tests use existing test transport boundaries; offline config and build/import behavior preserve the no-live-DB contract. No TiDB/Vercel access by the verifier. Private env files, credentials and repository secrets inventory were not queried. Evidence supports observed workflow/source/log behavior; it does not inventory unrelated account secrets or provide network packet tracing.

No revert, workflow edit, rerun/cancellation/deletion, PR edit/create/reopen, Actions setting change, required-check/ruleset/branch protection mutation, Git add/commit/push/merge/rebase/reset/restore/clean/stash/tag/cherry-pick or branch creation. Existing human merge happened before this verification task.

## V. Required Check Current State

Read-only [ruleset inventory](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/rulesets?includes_parents=true&per_page=100) returned two active repository branch rulesets:

| Branch / ruleset | Accessible configuration | Quality Gate required? |
|---|---|---|
| main / protect-main, 24061641 | PR: one approval, stale dismissal, last-push approval and thread resolution; deletion/non-fast-forward restrictions | No required_status_checks rule observed |
| testing / protect-testing, 24061672 | PR: zero approvals; deletion/non-fast-forward restrictions | No required_status_checks rule observed |

Details: [protect-main API](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/rulesets/24061641), [protect-testing API](https://api.github.com/repos/ArdhanKurniawan/courier-route-planner/rulesets/24061672). Both ref conditions exactly match their branch. Each reports empty bypass_actors and current connector user can_bypass never; these facts are scoped to these rulesets/current caller, not all human administrators or other protection mechanisms.

Classic `branches/testing/protection` and `branches/main/protection` returned **403 Resource not accessible by integration**. This is an access limitation, not evidence of absent classic protection. The connector also rejected rules/branches/testing and rules/branches/main with 400 INVALID_ARGUMENT endpoint allowlist restriction; no active-branch-rules result was obtained from those endpoints.

**Current global enforcement: NOT FULLY VERIFIED** on testing/main because classic protection was inaccessible. **No Quality Gate enforcement in the two observed rulesets**. PR #10 demonstrably merged before Quality Gate completed, so effective pre-merge blocking was absent for that PR. No setting changed or mutation attempted to test enforcement.

## W. Control Gap Assessment

Technical PASS concerns code checked in two successful remote executions, including actual merged testing SHA. The control gap concerns when merge was allowed. They are separate acceptance facts and both remain visible.

PR #10 was not gated on completed Quality Gate success before merge. Current accessible rulesets omit required status checks; classic configuration/bypass mechanism is not fully verified. The timeline proves the gap's effect but does not identify every configuration or actor mechanism behind it.

Forward hardening is needed: required **Quality Gate**, observed provider **GitHub Actions**, on testing and main; require branch up-to-date per approved D8 and preserve existing review/deletion/non-fast-forward protections. First inspect full current effective protection and bypass behavior using authorized account access, then obtain approval for the concrete enforcement change. This report does not grant that approval.

## X. Rollback Assessment

**NO REVERT REQUIRED.** Both key remote runs PASS, including current testing merge SHA. No code/CI defect requiring rollback was found in this verification scope. Early merge alone is a process deviation requiring forward control hardening.

No revert, PR reopening, migration rerun or history rewrite performed or recommended from this timeline alone.

## Y. Remaining Work

Next scoped task, only after explicit human authorization: **PHASE 0D-2B — REQUIRED QUALITY GATE ENFORCEMENT**.

1. Read full current branch/ruleset/classic/bypass configuration with sufficient authorized access and resolve this report's access limitations.
2. Prepare and approve exact Quality Gate/GitHub Actions required check for testing/main, with approved up-to-date policy; preserve existing protections.
3. After approved configuration, use a separate small approved PR to prove merge is blocked while Quality Gate pending/failed and allowed only after success plus existing requirements. A harmless docs/process PR can be considered; do not merge a deliberately broken change.
4. Record effective settings and current-SHA enforcement proof. No proof PR created in this task.

Vercel, TiDB Testing/Production, migration guards/apply, cloud isolation/smoke, second-member reproduction, broader documentation sync and final Gate 1 closure remain later work. Existing source docs/MASTER still contain historical remote-pending wording; strict scope preserves them. This report is excluded from existing MANIFEST/MASTER source policy, so no regeneration is performed.

## Z. Recommendation

**READY FOR PHASE 0D-2B REQUIRED CHECK ENFORCEMENT**

Technical remote acceptance criteria PASS. Enforcement readiness means sufficient observed check identity and current merged-SHA quality evidence to prepare the next approved task; it does not mean enforcement is already active or authorize a configuration mutation.

TEMP evidence assertions PASS for PR/merge/tree topology, run/check identity/status, every step result, checkout, Linux versions/permissions/action pins, tests/coverage, audits and observed rulesets. Phase 0D and Gate 1 remain OPEN.

### Final report review and preservation

Fresh-context reviewer `/root/phase0d_remote_ci_report_review` read the complete draft, task, captured API payloads, both full remote logs, exact workflow and relevant local config/tests. Review verdict: **0 BLOCKER, 0 IMPORTANT, 0 MINOR**; technical verdict and readiness for Phase 0D-2B supported. Reviewer made no project/Git/remote changes; no report correction required. Review used captured fresh evidence, not a new remote workflow execution.

Reviewer explicitly declined to judge inaccessible classic/bypass enforcement, unobserved concurrency/timeout/audit-failure paths, live DB/Vercel/production readiness and Gate 1 closure. These boundaries remain recorded above.

Final post-review read-only checks PASS:

- `git status --short --untracked-files=all`: only this new verification report untracked.
- `git diff --check`: exit 0; `git diff --cached --stat`: empty.
- `git rev-parse HEAD`: unchanged `904b49135f725276a751b00d141c88fecd821bc5`; branch, five refs and hooksPath unchanged.
- SHA-256 preservation: **212 baseline repository files and 402 skill files unchanged**; historical reports, workflow, existing docs, MASTER/MANIFEST, source/tests/packages and skills-lock.json preserved.
- Report checks: **26 ordered A–Z sections**, two valid local links, no trailing whitespace/replacement characters or matches for basic credential-URL/token/email patterns. This is a bounded report scan, not a general security guarantee.

Only this report was created in the project. Index remains empty. No revert, workflow edit, rerun, required-check/branch-protection mutation, Vercel/TiDB/migration work, Git add/commit/push/merge or PR creation. **STOP AFTER REMOTE VERIFICATION REPORT**; next stage requires explicit human authorization.
