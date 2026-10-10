# Phase 0D — Runtime Audit Security Corrective Report

## A. Verdict

**RUNTIME AUDIT CORRECTIVE VERIFIED**.

Corrective dilakukan 2026-10-10 (Asia/Jakarta). Fresh runtime audit berubah dari **3 HIGH / exit 1** menjadi **0 total / exit 0**. Next dan official lint config menjadi 16.3.8; sharp 0.35.5 dan source-map-js 1.2.2 tetap transitif. Seluruh quality commands pada K PASS; full audit valid dengan 19 dev findings, informational menurut workflow existing.

## B. Baseline

| Check | Evidence |
| --- | --- |
| Repository | ArdhanKurniawan/courier-route-planner |
| Branch | `fix/runtime-audit-advisories` |
| HEAD, testing, origin/testing, merge-base HEAD testing | `cccf724edbecec08c54c020a5e6b4da4e3b514b6` |
| Initial status / index | Clean / empty |
| Initial git diff --check | Exit 0, no diagnostics |
| Local runtime | Node v24.19.0, npm 11.6.0; Windows x64 |
| Instructions | AGENTS.md, RTK.md, latest task attachment, actual manifest/scripts/workflow/config/tests reviewed |
| Skills | using-superpowers, systematic-debugging, verification-before-completion, requesting-code-review |

Semua shell commands melalui RTK; proxy mempertahankan raw audit JSON. Tidak memasang atau mengubah skills. Plan: reproduce failure → inspect dependency paths and current registry → minimum patch → fresh public-source quality validation → independent review → final scope checks. Risks yang diuji: native package install, lint/framework compatibility, generated routes, serta lockfile consistency. TiDB provisioning/migration, deployment, source/config changes, dan Git mutation berada di luar scope.

## C. Remote Failure Evidence

Read-only GitHub connector mengambil step summaries dan decoded logs untuk job **114231703601**, [PR #15 checks](https://github.com/ArdhanKurniawan/courier-route-planner/pull/15/checks), pada 2026-10-10. Job memakai Node 24.21.0 / npm 11.19.0 dan merge test commit 4b3a5ed, yang menggabungkan PR head 7080e53ca5479083c2d5fa4571ccb1cf62452111 ke base cccf724edbecec08c54c020a5e6b4da4e3b514b6.

- PASS: npm ci, lint, typecheck, tests (10 files / 212 tests), coverage, offline db:check, build (Next 16.3.6), post-build typecheck.
- FAIL: **Runtime audit gate**, `npm audit --omit=dev --json`; 3 HIGH package entries; exit 1 at 2026-10-10 14:10:14 UTC.
- SKIPPED: Full audit information, karena runtime gate gagal sebelumnya.

Remote log dan fresh local audit menunjuk next, sharp, source-map-js yang sama. Full-audit parser tidak dieksekusi pada failed job; tidak ada evidence parser failure. Tidak mengubah atau rerun PR #15. Direct job metadata URL ditolak allowlist connector; supported step/log endpoints berhasil dan menjadi evidence yang dipakai.

## D. Runtime Findings

Fresh before audit selesai 2026-10-10 14:23:53 UTC: 0 info, 0 low, 0 moderate, 3 high, 0 critical; total 3, exit 1, valid npm audit v2 JSON; fixAvailable=true untuk ketiga packages.

| Package | Installed / resolved before | Status | Audit affected range | Minimum patch |
| --- | --- | --- | --- | --- |
| next | 16.3.6 | Direct runtime, HIGH aggregate | 16.0.0–16.3.7 | 16.3.8 |
| sharp | 0.35.4 | Optional transitive runtime, HIGH | <0.35.5 | 0.35.5 |
| source-map-js | 1.2.1 | Shared transitive runtime/dev, HIGH | >=1.0.0 <1.2.2 | 1.2.2 |

Six Next advisory entries from fresh npm evidence:

| Advisory | Severity | npm affected range |
| --- | --- | --- |
| [GHSA-3w37-wq28-93x7](https://github.com/advisories/GHSA-3w37-wq28-93x7) | moderate | `>=16.3.0 <16.3.8` |
| [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) | moderate | `>=16.0.0 <16.3.8` |
| [GHSA-39w2-rjm5-chcv](https://github.com/advisories/GHSA-39w2-rjm5-chcv) | low | `>=16.0.0 <16.3.8` |
| [GHSA-f87g-xv8r-7p7x](https://github.com/advisories/GHSA-f87g-xv8r-7p7x) | moderate | `>=16.0.0 <16.3.8` |
| [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) | moderate | `>=16.0.0 <16.3.8` |
| [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) | high | `>=16.0.0 <16.3.8` |

Sharp: [upstream librsvg advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), affected <0.35.5; upstream documents patch 0.35.5 with librsvg 2.63.2. Source-map-js: [indexed source-map DoS advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), affected >=1.0.0 <1.2.2 according to fresh npm evidence. Exact Next patch boundary above comes from the npm audit response; the browsed upstream SSRF page showed a masked 16.3.? patch field.

## E. Dependency Graph

Fresh `npm explain next`, `npm explain sharp`, `npm explain source-map-js` exited 0 before updates. Installed package metadata matched lockfile versions.

Runtime paths:

`root → next@16.3.6 → optional sharp@0.35.4` (parent range ^0.35.4).

`root → next@16.3.6 → postcss@8.5.23 → source-map-js@1.2.1` (range ^1.2.1).

`root → @tailwindcss/postcss@4.3.3 → postcss@8.5.28 → source-map-js@1.2.1`.

`root → @tailwindcss/postcss@4.3.3 → @tailwindcss/node@4.3.3 → source-map-js@1.2.1`.

Shared dev paths include root dev postcss, Vitest → Vite → PostCSS, coverage-v8 → magicast, SVGR → SVGO → css-tree (also via csso), and jsdom → css-tree (via dom-selector/specificity). All shared source-map-js parents accept 1.2.2. Patch does not introduce direct sharp/source-map-js entries.

## F. Selected Minimal Fix

Official `npm view <package>@<version> version engines dependencies optionalDependencies peerDependencies license dist.integrity dist.unpackedSize --json` confirmed all four exact releases. Registry version inventories showed sharp 0.35.5 and source-map-js 1.2.2 as latest stable in their compatible ranges at audit time. Next 16.3.8 is the first patch outside every observed Next range; 16.3.7 remains affected.

| Package | Before → after | Reason / compatibility |
| --- | --- | --- |
| next | 16.3.6 → 16.3.8 | Minimum observed fixed 16.3.x; Node >=20.9.0 and current React 19.2.8 supported |
| eslint-config-next | 16.3.6 → 16.3.8 | Match framework patch; plugin pinned 16.3.8; existing ESLint 9 / TypeScript 5 supported |
| sharp | 0.35.4 → 0.35.5 | Minimum librsvg patch, allowed by Next ^0.35.4; Node >=20.9.0 |
| source-map-js | 1.2.1 → 1.2.2 | Minimum DoS patch, allowed by all parents; no new dependencies |

On an external public-source candidate, npm generated target records with:

`npm install next@16.3.8 eslint-config-next@16.3.8 --save-exact=false --package-lock-only --ignore-scripts --no-audit`

`npm update sharp source-map-js --package-lock-only --ignore-scripts --no-audit`

Both exited 0. Installation-stage --no-audit avoids duplicate registry calls; required security audits ran separately and remain hard-gated. No audit fix, force, overrides, suppressions, major upgrade, or unrelated version update. No new direct dependency or source/config compatibility change. Existing package licenses remain MIT (Next/config), Apache-2.0 (sharp), BSD-3-Clause (source-map-js); existing native platform license notices retained.

## G. package.json Delta

**Changed YES.** Only dependencies.next and devDependencies.eslint-config-next floors changed `^16.3.6 → ^16.3.8`. Scripts, engine, metadata, other ranges, and direct counts **10 runtime / 19 dev** unchanged. No sharp/source-map-js direct dependency.

## H. package-lock Delta

**Changed YES.** LockfileVersion 3 retained. **40 package records + root manifest record** changed: 12 Next/config/env/plugin/SWC records; 27 sharp/native/libvips records; 1 source-map-js record. Sharp binaries track 0.35.5 and associated libvips binaries track 1.3.4. Zero added/removed package locations; no unrelated version or dev/optional classification change. Registry tarball URLs, integrity, and parent pins track the selected releases. Source-map-js now includes its BSD-3-Clause license metadata.

Npm also generated unrelated metadata normalization: six bundled records under unchanged Tailwind oxide WASM and four dev flags on unchanged WASM utility records. These incidental changes were discarded by preserving exact baseline records outside the reviewed package set. Selected records retain npm-generated version/tarball/integrity data; no integrity or version was invented. Fresh npm ci consumed the resulting minimal lockfile successfully without changing it. All unrelated package records remain structurally equal to baseline.

| File | SHA-256 before | SHA-256 after |
| --- | --- | --- |
| `package.json` | `ce3dd15f84f8ff5de7ada8d2f07fe1c3a85072f0021392aeb0da8825acb9ea00` | `97fc198af758f2fec6bd9e4f7c077ed7dbaa3ffd0b445bab0c95200f6a49a644` |
| `package-lock.json` | `5deaceac49f8f941d86741b72d1b07cac308b1c45204a06d3fe4893d4324d4f7` | `3b21928a1933ff072d7f0a003432d0a668f5973d2c2fdabd831da74dbc3feb71` |

## I. Runtime Audit After Fix

`npm audit --omit=dev --json`: **exit 0; 0 info, 0 low, 0 moderate, 0 high, 0 critical; total 0**. Finished 2026-10-10 14:36:33.802 UTC. Valid JSON, empty vulnerabilities inventory, no audit error. Fresh installed candidate versions match the delivered lockfile: Next/config 16.3.8, sharp 0.35.5, source-map-js 1.2.2. Runtime hard gate satisfied.

| Evidence | SHA-256 of raw JSON |
| --- | --- |
| Before runtime | `94eb22cbe95e8080f1fc5c2332c198f7e38e8c5462f81f4a3281b4001caba6f5` |
| After runtime | `c87ce433934ad60b5bd5f84443f8f7c0e34b647448c16849624df63ea46a44cd` |

## J. Full Audit Information

`npm audit --json`: **exit 1; 0 info, 1 low, 6 moderate, 12 high, 0 critical; total 19**. Finished 2026-10-10 14:36:36.732 UTC. JSON/errors/counts/inventory/severity consistency validated against the existing workflow parser contract. Valid advisory result, not an audit execution/parser PASS with zero findings. Full total **22 → 19**, removing the three runtime entries; remaining flagged nodes all have dev=true. They remain tooling exposure and are recorded separately under the existing informational policy.

| Remaining package | Locked affected versions | Severity |
| --- | --- | --- |
| `@babel/core` | 7.28.5 | low |
| `@babel/plugin-transform-modules-systemjs` | 7.28.5 | high |
| `@esbuild-kit/core-utils` | 3.3.2 | moderate |
| `@esbuild-kit/esm-loader` | 2.6.5 | moderate |
| `@humanfs/node` | 0.16.7 | moderate |
| `@next/eslint-plugin-next` | 16.3.8 | high |
| `ajv` | 6.12.6 | moderate |
| `brace-expansion` | 2.0.2, 1.1.12 | high |
| `braces` | 3.0.3 | high |
| `browserslist` | 4.28.1 | high |
| `drizzle-kit` | 0.31.11 | moderate |
| `esbuild` | 0.18.20 | moderate |
| `eslint-config-next` | 16.3.8 | high |
| `fast-glob` | 3.3.1 | high |
| `flatted` | 3.3.3 | high |
| `js-yaml` | 4.1.1 | high |
| `micromatch` | 4.0.8 | high |
| `minimatch` | 9.0.5, 3.1.2 | high |
| `svgo` | 3.3.2 | high |

Raw full JSON SHA-256: `57c1ca30684584f876c1c49b6e0df70cf746315904c4dcd707fd415f02ca6e25`. Remaining tooling remediation requires a separate scoped task; no proposed major downgrades from npm audit were applied.

## K. Quality Suite

Fresh commands ran on the exact updated public tracked source in an external candidate with its own node_modules. Repo/candidate source and manifest/lockfile bytes compared equal; ignored Dev/Testing env files were not read/copied. APP_ENV, DATABASE_URL, and Node debug/options/TLS override variables were removed from child environment. Public .env.example files only; no Next dev server. Checkout node_modules was left unchanged; use npm ci in the developer checkout before running the patched app there.

| Command | Exit | Result | Finished |
| --- | ---: | --- | --- |
| `npm ci` | 0 | PASS | 2026-10-10 14:34:11.835 UTC |
| `npm run lint` | 0 | PASS | 2026-10-10 14:35:14.768 UTC |
| `npm run typecheck` | 0 | PASS | 2026-10-10 14:35:29.035 UTC |
| `npm run test` | 0 | PASS | 2026-10-10 14:35:50.729 UTC |
| `npm run test:coverage` | 0 | PASS | 2026-10-10 14:35:56.652 UTC |
| `npm run db:check` | 0 | PASS | 2026-10-10 14:35:58.183 UTC |
| `npm run build` | 0 | PASS | 2026-10-10 14:36:28.461 UTC |
| `npm run typecheck` | 0 | PASS | 2026-10-10 14:36:31.559 UTC |
| `npm audit --omit=dev --json` | 0 | PASS | 2026-10-10 14:36:33.802 UTC |
| `npm audit --json` | 1 | VALID INFORMATIONAL RESULT | 2026-10-10 14:36:36.732 UTC |

Test and coverage runs each: **10 test files / 212 tests PASS, zero failures**. Existing fake transports/fixture.invalid used for DB tests. Coverage without threshold: statements 19.2%, branches 17.43%, functions 17.81%, lines 19.62%. No test/source/config changes.

Initial npm ci exited 0, but npm dropped the optional Rolldown Windows binding and first tests failed at startup. Read-only diagnosis found locked 1.2.12 installed in checkout and absent in candidate; checkout binding load PASS. Official npm pack of the same 1.2.12 tarball succeeded with matching lock integrity. A second fresh npm ci then installed that binding and direct load PASS; the entire validation sequence above reran successfully. Initial failure evidence retained separately; not counted as PASS. No version/config workaround. Install prints existing esbuild-kit deprecation warnings and full dev advisory counts. Vitest also prints the existing Vite warning about future native config loading of ESM syntax in vitest.config.ts; it remains unsuppressed and does not fail the current commands. No unresolved test/build errors.

## L. Build Verification

Next **16.3.8 (Turbopack)** build exited 0: compilation, TypeScript, static generation, and optimization completed. Routes retain /, /_not-found, /[module] with ten module paths, /about, /api/health, /api/ready, and /icon.svg. Post-build `next typegen && tsc --noEmit` exited 0. Build ran without private DB env; no live readiness request or provider connection. GitHub Actions for this new corrective remain pending a human PR; local Windows validation is not a new Linux CI result.

## M. Migration / Database Preservation

`npm run db:check` used unchanged offline drizzle.config.ts and passed. No db:generate, migrate, db:migrate:testing, manual schema/ledger SQL, TiDB query, or provider UI action. All src/db, env parsing, migration configs, SQL/snapshot/journal bytes unchanged.

| Preserved artifact | SHA-256 before = after |
| --- | --- |
| `drizzle/0000_dear_rictor.sql` | `64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577` |
| `drizzle/meta/_journal.json` | `9e3ed23ec5e1bb4fbce6a8b4a3f06362cbd38f29ccbb428392fa20b4324578b8` |
| `drizzle/meta/0000_snapshot.json` | `9d3a7d20deacbd8ab4e85b4fba5cbc0a51b787a3800969cffaafdbb23ddfe584` |
| `drizzle.config.ts` | `84f65bad903d185dc260ca0f11ec4d1e657dc5bed734ce49b7e205398bc6ae3f` |
| `drizzle.dev.config.ts` | `a6aca518007ae10d536f7d48a41f44d35997fbdf247276ffa166d24e201ec21e` |
| `drizzle.testing.config.ts` | `d8c7d374bc0f2b3b3d4e04d49bd5f300caf96b4198205a4d176e095e7e88b20e` |

## N. Workflow Preservation

**Workflow changed NO.** quality.yml SHA-256 remains `57b6b7d059ec0031c0c7720928015140da311bfa957b5dc1f0de4bbf36f70c32`. Runtime command stays `npm audit --omit=dev --json`, with no continue-on-error or advisory exceptions. Full-audit informational parser unchanged. No CI rerun, ruleset change, Vercel, or Production action.

## O. Scope Verification

Delivered project files only:

- package.json — two patch floors.
- package-lock.json — reviewed patch graph.
- docs/proses/phase-0/0d/PHASE_0D_RUNTIME_AUDIT_SECURITY_CORRECTIVE_REPORT.md — this new report.

All 218 baseline tracked file hashes checked; only the two package files differ. src/, tests/, drizzle/, .github/, config files, AGENTS.md, existing docs (including Phase 0D-3B evidence if present in this base), and tracked .agents/ files preserved. No skills install/change; skills-lock.json SHA-256 remains `7ed5449842773b3bc3fcd23822fa3daad5e94f077f186fe681dad6a1ff547000`. Helpers, cache, logs, and generated build/coverage output stay outside repo. No credential values logged.

Final local checks **PASS**, exit 0: git status --short --untracked-files=all (exactly the three files above), git diff --check (no diagnostics), git diff --cached --stat (empty index), git rev-parse HEAD (unchanged cccf724edbecec08c54c020a5e6b4da4e3b514b6), and git branch --show-current (fix/runtime-audit-advisories). Untracked report headings A–Q and whitespace checked directly. No staging, commit, push, merge, rebase, reset, restore, clean, or stash performed.

## P. Independent Review

**PASS — fresh-context runtime_audit_security_reviewer.** Reviewer inspected package diff, advisory graph, minimality, compatible Next/config, direct/transitive status, raw fresh audit/quality evidence, exact candidate source equality, and workflow/migration/skills preservation. No Critical, Important, or Minor findings. Independent checkout-lock runtime audit finished 2026-10-10 14:40:52.421 UTC, exit 0 / total 0, raw JSON SHA-256 c87ce433934ad60b5bd5f84443f8f7c0e34b647448c16849624df63ea46a44cd. Initial sandbox attempt failed DNS; approved network retry produced this valid result, captured as review-runtime-network.*. Reviewer confirmed all quality stdout hashes against exit metadata and all 41 selected lock records against npm-generated data. Local evidence supports a PR to testing; new remote CI must run after human Git actions.

## Q. Recommendation

**READY FOR SECURITY CORRECTIVE PR → testing**.

Human next steps: review these three files, run npm ci in the developer checkout, commit/push fix/runtime-audit-advisories, open a PR to testing, require fresh Quality Gate PASS, then merge through the existing human workflow. Only afterward should the human update PR #15 branch from testing. No Git action or PR #15 update was performed by this task.

Known limits: full dev advisories remain; audit inventory can change; no exploit/deployment/browser verification and no Linux run of this corrective yet. This verdict covers the captured runtime audit and local regression evidence.

Local raw evidence directory: `C:/Users/L E N O V O/.codex/visualizations/2026/10/02/01a0fcc3-a956-7a52-a7d5-e5f1890cf773/runtime-audit-20261010` (outside Git). Contains before/after audits, registry metadata, npm-generated and selected lock comparisons, raw command logs/exit records, scope hashes, initial install failure, and review evidence. The source correction and report are the only repository outputs.
