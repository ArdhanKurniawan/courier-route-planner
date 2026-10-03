# Phase 0A — Next.js Security Patch Report

## A. Context

Controlled runtime dependency remediation pada 2026-10-03, Asia/Jakarta. Tujuan: memperbaiki known critical Next.js finding dengan patch yang disetujui, menyelaraskan official lint config, dan memverifikasi baseline sebelum Quality Foundation dilanjutkan.

| Item | Evidence |
| --- | --- |
| Repository | `ArdhanKurniawan/courier-route-planner` |
| Branch | `feature/foundation-quality-gates` |
| HEAD before/after | `092e29972767d2e0ea28947ba64e21d926974aab` |
| Last commit | Merge pull request #6 from ArdhanKurniawan/feature/ui-template-cleanup |
| Initial Git state | Tiga historical process reports untracked; tidak ada tracked/staged changes |
| Node | `v24.19.0` |
| npm | `11.6.0` |
| Next / lint config baseline | `16.3.4` / `16.3.4`, requested masing-masing `^16.3.4` |
| React / React DOM baseline | `19.2.8` / `19.2.8`, requested masing-masing `^19.2.8` |
| Lockfile | Existing npm lockfileVersion `3` |
| Direct package counts | 7 runtime + 12 dev = 19, sebelum dan sesudah patch |
| Skills | `using-superpowers`, `systematic-debugging`, `verification-before-completion`; `writing-plans` untuk urutan kerja singkat sesuai scope task |
| RTK | Semua shell commands melalui RTK; `proxy` untuk mempertahankan raw JSON/output |

Official [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) menyatakan Next affected `>=16.2.0 <16.3.6`, patched `16.3.6`. Advisory terkait Node.js `next/og` ImageResponse dan attacker-controlled SVG content, attributes, atau styles. Patch dilakukan untuk mengeluarkan installed framework dari affected range tersebut; tidak perlu membuktikan exploit pada project untuk menerapkan patch yang telah disetujui manusia.

Audit branch, `.agents/`, AGENTS.md lengkap, task, dokumentasi minimum, historical reports, manifest/lockfile, config, dan source imports dilakukan sebelum update. Laporan triage sebelumnya memilih REVIEW REQUIRED BEFORE ADDING DEPENDENCIES; manusia kemudian memberikan task patch ini dengan dua target version yang eksplisit.

Plan yang dikerjakan: fresh security/hash snapshot → official npm update dua packages → review lockfile → cleanup generated state → `npm ci` → typegen/tsc/lint/build/final tsc → security re-audit → scope verification/report. Testing bootstrap dan dev tooling remediation tetap task terpisah.

## B. Approved Changes

| Package | Before | After | Reason |
| --- | --- | --- | --- |
| `next` | Requested `^16.3.4`; resolved/installed `16.3.4` | Requested `^16.3.6`; resolved/installed **`16.3.6`** | Official patch untuk known runtime critical advisory |
| `eslint-config-next` | Requested `^16.3.4`; resolved/installed `16.3.4` | Requested `^16.3.6`; resolved/installed **`16.3.6`** | Menjaga official lint configuration pada patch line framework yang sama |

Command update resmi npm:

```text
npm install next@16.3.6 eslint-config-next@16.3.6 --save-exact=false --cache "%TEMP%\courier-phase0a-next-security-npm-cache"
```

Command tersebut berhasil dengan exit 0: 12 packages changed, 577 audited, sekitar 1 menit. Manifest menghasilkan ranges `^16.3.6` sesuai task. Lockfile diperbarui oleh npm; tidak diedit manual. Matching lint config bukan klaim bahwa semua dev vulnerabilities ikut terselesaikan.

## C. Package / Lockfile Delta

Changed project files:

| File | Change |
| --- | --- |
| `package.json` | Dua version floors/ranges pada B |
| `package-lock.json` | Root manifest entries dan 12 package records yang terkait approved patch |
| `docs/proses/PHASE_0A_NEXT_SECURITY_PATCH_REPORT.md` | Laporan baru task ini |

Tidak ada package location yang ditambahkan/dihapus dari lockfile. Selain dua direct packages, **10 transitive packages** berubah `16.3.4 → 16.3.6`:

- `@next/env`, pinned oleh Next.
- `@next/eslint-plugin-next`, pinned oleh official lint config.
- Delapan optional SWC platform packages: `@next/swc-darwin-arm64`, `@next/swc-darwin-x64`, `@next/swc-linux-arm64-gnu`, `@next/swc-linux-arm64-musl`, `@next/swc-linux-x64-gnu`, `@next/swc-linux-x64-musl`, `@next/swc-win32-arm64-msvc`, `@next/swc-win32-x64-msvc`.

Version, tarball URL, dan integrity berubah untuk records tersebut. Next dependency pins/optional pins serta lint config plugin pin ikut diperbarui. Seluruh perubahan ini berasal dari normal resolution approved two-package patch. Tidak ada unrelated transitive version change.

**React dan React DOM unchanged:** requested `^19.2.8`, resolved dan installed `19.2.8`. Seluruh 17 direct packages lainnya mempertahankan requested/resolved version, termasuk TypeScript, ESLint, Tailwind, SVGR, dan PostCSS. Scripts, package metadata, dan direct dependency counts tidak berubah.

| File | SHA-256 before | SHA-256 after |
| --- | --- | --- |
| `package.json` | `6f3879731be0ad21595a06a30ff45d88e5da112aeb3e99b7e2295d8413331e2d` | `c7dc731f48d6a0425ba56adf7dfbd00616ebb6e3cb304f1aa95a71eab5029c05` |
| `package-lock.json` | `c8c944fb07e13f3bf9fa1f9846555166a8a7545b2c7eb2cc2b78084c4c2d0844` | `26dca0d99d90e4fd5e80e9dbcf315b4680bbd400f39c915cd9e3d4b4e6ee9979` |

## D. Baseline Security Snapshot

Fresh audit sebelum update, menggunakan cache TEMP yang dapat ditulis. Full JSON captured 20:49:59 WIB; runtime JSON 20:49:52 WIB, 2026-10-03.

| Audit | Low | Moderate | High | Critical | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full dependency tree, before | 1 | 2 | 13 | 1 | **17** |
| Runtime-only (`--omit=dev`), before | 0 | 0 | 0 | 1 | **1** |

Kedua commands exit **1**, dengan JSON valid dan findings. `next@16.3.4` merupakan satu-satunya entry runtime. Info severity 0. Counts adalah vulnerable **package entries**, bukan jumlah CVE independen.

Snapshot full/runtime dengan cache TEMP mempunyai hashes yang sama dengan raw evidence pada [dependency audit report](PHASE_0A_DEPENDENCY_AUDIT_REPORT.md). Tidak ada registry/advisory delta terhadap baseline triage yang terverifikasi sebelum patch.

### Cache diagnostic sebelum authoritative snapshot

Pada initial attempt, registry metadata requests (`npm view`) gagal exit 1 dengan `EPERM mkdir` pada default cache di `AppData/Local/npm-cache`. Full audit dengan default cache mengeluarkan 133 entries, termasuk empty aggregate ranges. Output attempt ini tidak dipakai untuk decision/delta patch. Sebelum package mutation, command diulang dengan cache TEMP yang writable: metadata requests berhasil, audit kembali 17 entries dengan non-empty ranges dan raw hash yang cocok dengan evidence triage.

Initial diagnostic JSON tetap disimpan di TEMP sebagai `courier-phase0a-next-patch-before-full-20261003.json` dan `...before-runtime-20261003.json`. Comparative snapshot yang dipakai adalah files **`before-...-temp-cache`** pada F. Tidak ada perubahan npm global config; masalah cache tidak diselesaikan dengan mengubah package versions.

## E. Validation Evidence

Npm/npx dijalankan melalui RTK dengan explicit bundled Node 24 executable dan existing npm/npx 11.6.0 CLI di TEMP. PATH hanya disesuaikan untuk proses command. Validation memakai local Next dari project, dengan `--no-install`. Npm cache diarahkan per-command ke `%TEMP%/courier-phase0a-next-security-npm-cache`.

| Command | Exit | Result |
| --- | ---: | --- |
| `git branch --show-current`, `git status --short --untracked-files=all`, `git log -1 --oneline` | 0 | **PASS**, branch/baseline sesuai |
| `node -v`, `npm -v`, `npx --no-install next --version` sebelum patch | 0 | **PASS**, Node 24.19.0, npm 11.6.0, local Next 16.3.4 |
| Baseline manifest/lockfile/hash verification | 0 | **PASS**, versions/hashes cocok dengan triage |
| `npm view next@16.3.6 version dependencies --json` dengan cache TEMP | 0 | **PASS**, target tersedia |
| `npm view eslint-config-next@16.3.6 version dependencies --json` dengan cache TEMP | 0 | **PASS**, target tersedia |
| `npm install next@16.3.6 eslint-config-next@16.3.6 --save-exact=false` dengan cache TEMP | 0 | **PASS**, hanya approved direct changes |
| `git diff -- package.json package-lock.json` + structural lockfile review | 0 | **PASS**, dua direct + 10 Next transitive changes |
| Read-only process metadata query sebelum generated cleanup | 0 | **PASS**, 0 active Next/npm dev/build candidates |
| `git check-ignore -v .next next-env.d.ts`; `git ls-files .next next-env.d.ts` | 0 | **PASS**, ignored dan tidak tracked |
| Safe PowerShell generated cleanup | 0 | **PASS**, hanya `.next/` dan `next-env.d.ts` di workspace dihapus |
| `npm ci` dengan cache TEMP | 0 | **PASS**, 576 packages added, 577 audited, 31 detik |
| `npx --no-install next typegen` | 0 | **PASS**, Types generated successfully |
| `npx --no-install tsc --noEmit` pertama | 0 | **PASS**, tidak ada TypeScript diagnostics |
| `npm run lint` | 0 | **PASS**, 0 errors, 0 warnings |
| `npm run build` | 0 | **PASS**, Next.js 16.3.6, compile/typecheck/page generation berhasil |
| `npx --no-install tsc --noEmit` setelah build | 0 | **PASS**, tidak ada TypeScript diagnostics |
| `npm ls next eslint-config-next @next/env @next/eslint-plugin-next react react-dom --depth=0` | 0 | **PASS**, direct installed versions 16.3.6/16.3.6/19.2.8/19.2.8; transitive versions diverifikasi melalui lockfile/install state |
| `npx --no-install next --version` setelah validation | 0 | **PASS**, local CLI Next.js 16.3.6 |
| Targeted ImageResponse/OG usage search | 1 | **EXPECTED ABSENCE**, no matches; supporting evidence saja |

Build detail: Next.js **16.3.6 (Turbopack)**; compiled successfully dalam **18.8 detik**; build TypeScript selesai **2.6 detik**; **15/15** static pages generated dalam **967ms**. Routes mencakup `/`, `/about`, 10 module paths, not-found, dan `icon.svg`. Tidak ada Next.js build warnings atau TypeScript diagnostics pada sequence tersebut.

Generated-state safety: kedua cleanup targets diverifikasi ignored/untracked. Absolute resolved targets diperiksa berada tepat di workspace dan bukan reparse points sebelum native PowerShell `Remove-Item -LiteralPath`. Tidak ada proses yang dihentikan. Query proses awal mendapat sandbox Access denied; query read-only dengan approved escalation berhasil dan diulang tepat sebelum cleanup.

| Generated artifact setelah typegen/build | Evidence |
| --- | --- |
| `.next/types/routes.d.ts` | Exists, 1474 bytes, non-empty |
| `.next/types/validator.ts` | Exists, 2998 bytes |
| `.next/dev/types/routes.d.ts` | Absent |
| `.next/dev/types/validator.ts` | Absent |
| `next-env.d.ts` | Exists, 295 bytes, regenerated |

Generated files tidak diedit manual. Strict TypeScript/config tidak dilonggarkan. Build tidak meninggalkan generated state yang menggagalkan final standalone tsc.

Script `typecheck` dan `test` belum tersedia: **FOUNDATION PREREQUISITE / GAP**. Pemeriksaan TypeScript di atas memakai actual explicit npx command yang diminta task; tidak mengklaim `npm run typecheck` atau `npm run test` PASS. Tidak membuat test tooling atau tests baru dalam patch task ini.

## F. Security Re-Audit

Fresh audit setelah patch, clean install, build, dan final tsc. Full JSON captured 20:59:16 WIB; runtime JSON 20:59:15 WIB, 2026-10-03.

| Audit | Low | Moderate | High | Critical | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full dependency tree, after | 1 | 2 | 13 | **0** | **16** |
| Runtime-only (`--omit=dev`), after | **0** | **0** | **0** | **0** | **0** |

Full command exit **1** karena remaining findings. Runtime command exit **0**, valid empty vulnerability inventory. Keduanya info 0. Dependency metadata tetap `prod: 37`, `dev: 475`, `optional: 84`, `peer: 0`, `peerOptional: 0`, `total: 576`; kategori metadata dapat overlap.

Delta full audit: **17 → 16**, critical **1 → 0**. Removed vulnerable package entry hanya `next`; tidak ada added vulnerable package names. Seluruh 16 remaining package names, severity, dan advisory URL sets sama dengan fresh before snapshot serta historical triage. Framework lint plugin/config version berubah, tetapi propagated dev finding tetap.

Raw JSON disimpan hanya di system TEMP, di luar repository:

| Evidence | Filename di `%TEMP%` | SHA-256 |
| --- | --- | --- |
| Before full | `courier-phase0a-next-patch-before-full-temp-cache-20261003.json` | `cb90e603136ffb0cb3ab5256173b7cfe8aeea703bef113bd08387531a9ec980f` |
| Before runtime | `courier-phase0a-next-patch-before-runtime-temp-cache-20261003.json` | `bcfc1ad307ba48ef2ed1dfab869e5c7398fae312587d12c5632bc9b24ae06a29` |
| After full | `courier-phase0a-next-patch-after-full-20261003.json` | `8bbb83f932ca40d4b3ba3e10b110f3ebd91851365c29480a5b1f19b67e39fc24` |
| After runtime | `courier-phase0a-next-patch-after-runtime-20261003.json` | `85c4b489339dc825336459617e1456d3aa344fd4378ce7f98ab97a603e73ae03` |

Lockfile baseline snapshot, structural delta, dan audit delta helper outputs juga berada di TEMP. Tidak ada permanent audit JSON/helper file dalam repository.

## G. Runtime Critical Finding

**REMEDIATED — runtime Next critical finding remediated.**

Evidence:

- Manifest Next sekarang `^16.3.6`; lockfile dan local installed package tepat **16.3.6**.
- Runtime-only audit berubah dari satu critical entry `next` menjadi **0 findings**, exit 0.
- Full audit tidak lagi mempunyai `next` entry maupun critical count.
- Target versi sesuai official patched version pada [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).

Targeted search `ImageResponse|next/og|opengraph|twitter|openGraph` pada `src` dan `next.config.ts` menghasilkan no matches, exit 1. Next sendiri digunakan aktif melalui CLI, font, link, image, dan navigation imports. Absence fitur advisory hanya supporting evidence; tidak dipakai untuk menyatakan framework vulnerability irrelevant.

Tidak dilakukan exploit testing, deployment inspection, atau klaim actual exploitability. Hasil ini mencakup known advisory pada dependency snapshot/registry saat audit, bukan klaim repository bebas seluruh security risks.

## H. Dev Tooling Findings

**16 remaining dev-only package entries: 1 low, 2 moderate, 13 high.** Semua vulnerable nodes pada after audit memiliki lockfile `dev: true` dan tidak muncul di runtime-only audit. Mereka tetap potential exposure pada lint/build/config processing; dev-only tidak berarti aman.

| Package | Installed flagged version(s) after | Severity |
| --- | --- | --- |
| `@babel/core` | `7.28.5` | Low |
| `@babel/plugin-transform-modules-systemjs` | `7.28.5` | High |
| `@humanfs/node` | `0.16.7` | Moderate |
| `@next/eslint-plugin-next` | `16.3.6` | High, propagated |
| `ajv` | `6.12.6` | Moderate |
| `brace-expansion` | `1.1.12`, `2.0.2` | High |
| `braces` | `3.0.3` | High |
| `browserslist` | `4.28.1` | High |
| `eslint-config-next` | `16.3.6` | High, propagated |
| `fast-glob` | `3.3.1` | High, propagated |
| `flatted` | `3.3.3` | High |
| `js-yaml` | `4.1.1` | High |
| `micromatch` | `4.0.8` | High, propagated |
| `minimatch` | `3.1.2`, `9.0.5` | High |
| `picomatch` | `4.0.3` | High |
| `svgo` | `3.3.2` | High |

Representative remaining lint chain:

```text
courier-route-planner@2.4.0
└── eslint-config-next@16.3.6
    └── @next/eslint-plugin-next@16.3.6
        └── fast-glob@3.3.1
            └── micromatch@4.0.8
                └── braces@3.0.3
```

Structural lockfile comparison menunjukkan chain dependency declarations di bawah plugin/glob tetap sama, kecuali lint config plugin pin. Detailed advisories, duplicate installed majors, dan paths lain tetap tercatat pada [historical dependency audit report](PHASE_0A_DEPENDENCY_AUDIT_REPORT.md). Package version references `16.3.4` pada historical report tetap menjadi before evidence dan tidak diubah.

After audit masih memberi suggestion `fixAvailable: {name: "eslint-config-next", version: "14.2.35", isSemVerMajor: true}` untuk config/plugin/fast-glob/micromatch/braces. **Major downgrade suggestion remains unsuitable for automatic remediation.** Tidak diterapkan. Tidak mencoba menyelesaikan seluruh dev findings, mengganti transitive majors, menghapus packages, atau memakai overrides.

## I. Scope Verification

Scope yang diverifikasi:

- React/React DOM requested, resolved, installed versions tetap `^19.2.8` / `19.2.8`.
- Semua unrelated direct dependencies serta scripts/package metadata unchanged.
- Source, Next config, tsconfig, ESLint config, `.gitignore`, AGENTS.md, `.agents/`, dan `skills-lock.json` unchanged.
- Ketiga historical process reports unchanged, tetap untracked dan tidak di-stage.
- Tidak menambah Vitest, Testing Library, jsdom, coverage, atau foundation scripts/tests.
- Tidak menyentuh DB, migrations, domain algorithms, OSRM, map, CRUD, auth, CI, atau deployment.
- Tidak menjalankan audit fix/force fix, npm update/upgrade/dedupe/prune/uninstall, overrides, atau major downgrade.
- Tidak staging, commit, push, merge, rebase, reset, atau mengubah remote branch.

Historical report SHA-256 before/after:

| Report | Unchanged SHA-256 |
| --- | --- |
| `PHASE_0A_AUDIT_REPORT.md` | `eb461112f0fca0c03afe4e7195056a58f1fb9d42a6e1b86ededb3c57c7c53a80` |
| `PHASE_0A_BASELINE_RECOVERY_REPORT.md` | `c0a06aa6a0b8b7b761632912882ff7271c8d4b0041ba5ac03cdaf59bcf4ee1f6` |
| `PHASE_0A_DEPENDENCY_AUDIT_REPORT.md` | `10038fcf51e39a471326f7b60e8c54467d5448c2c1983de07bd38be15a8925a8` |

Final checks setelah report dibuat:

| Check | Exit | Result |
| --- | ---: | --- |
| `git status --short --untracked-files=all` | 0 | **PASS**, hanya dua manifest/lockfile changes dan empat process reports |
| `git diff --stat` | 0 | Dua tracked files; 50 insertions, 50 deletions |
| `git diff --check` | 0 | **PASS**, tanpa diagnostics |
| `git diff --cached --stat` | 0 | **PASS**, empty; tidak ada staged changes |
| `git rev-parse HEAD` | 0 | **PASS**, HEAD tetap sama |
| Direct versions + baseline hashes + report content verification | 0 | **PASS**, 19 direct packages, historical/config unchanged, report A–J lengkap dengan 16 remaining entries |

Actual final state:

```text
 M package-lock.json
 M package.json
?? docs/proses/PHASE_0A_AUDIT_REPORT.md
?? docs/proses/PHASE_0A_BASELINE_RECOVERY_REPORT.md
?? docs/proses/PHASE_0A_DEPENDENCY_AUDIT_REPORT.md
?? docs/proses/PHASE_0A_NEXT_SECURITY_PATCH_REPORT.md
```

Untracked report content diperiksa langsung karena `git diff --check` hanya mencakup tracked diff. Tidak ada generated artifacts atau raw JSON dalam tracked/staged changes.

## J. Phase 0A Recommendation

**READY TO CONTINUE QUALITY FOUNDATION.**

Approved Next/lint config patch ter-install dari updated lockfile; clean typegen, first tsc, lint, build, dan final tsc PASS. Runtime-only audit memenuhi preferred target 0 findings. Remaining dev-only findings sudah dicatat dan tidak diperbaiki dalam task ini.

Quality Foundation belum complete: Node engines/.nvmrc, explicit quality scripts, approved testing stack, meaningful tests/coverage, dan foundation documentation sync masih memerlukan task berikutnya. Contract typecheck yang diputuskan pada recovery tetap `next typegen && tsc --noEmit`; patch ini tidak menambahkan script tersebut.

Manual verification yang masih perlu manusia lakukan: review package/report diff sebelum eventual commit, reproduce checks pada environment anggota tim, dan UI/Preview smoke setelah patch masuk workflow deployment. Deployment/exploit/browser verification tidak dilakukan pada task ini. Audit registry dapat berubah; jalankan comparative audit lagi ketika testing stack ditambahkan.

**NO AUDIT FIX · NO COMMIT · NO PUSH · NO MERGE.**
