# Phase 0A — Dependency Vulnerability Audit Report

## A. Audit Context

Audit/triage dependency baseline sebelum penambahan testing stack. **NO FIX**: satu-satunya file project yang dibuat oleh task ini adalah laporan ini.

| Item | Evidence |
| --- | --- |
| Repository | `ArdhanKurniawan/courier-route-planner` |
| Branch | `feature/foundation-quality-gates` |
| HEAD | `092e29972767d2e0ea28947ba64e21d926974aab` |
| Last commit | `092e299 Merge pull request #6 from ArdhanKurniawan/feature/ui-template-cleanup` |
| Date | 2026-10-03, Asia/Jakarta (WIB, UTC+7) |
| Audit JSON captured | Full: 20:13:26 WIB; runtime-only: 20:13:25 WIB |
| Node | `v24.19.0` |
| npm | `11.6.0` |
| Local Next.js | `16.3.4`, melalui `npx --no-install next --version` |
| Registry | `https://registry.npmjs.org/` |
| npm `package-lock` | `true` |
| Lockfile version | `3` |
| Direct packages | 19: 7 `dependencies`, 12 `devDependencies` |
| Initial working tree | Tidak ada tracked diff; dua historical reports untracked (lihat M) |
| Skills | `using-superpowers`, `systematic-debugging` untuk penelusuran akar temuan, `verification-before-completion` untuk verifikasi scope |
| RTK | `0.48.0`; command audit memakai `rtk proxy` agar JSON tidak terfilter |

Node dijalankan dari bundled runtime Codex dengan absolute path, npm dari CLI npm 11.6.0 yang sudah tersedia di TEMP. PATH hanya disesuaikan pada proses command; npm global config tidak diubah. Bare Node pada mesin mengarah ke shim NVM yang tidak aktif.

`npm ci` berhasil (exit 0): 576 packages added, 577 packages audited dalam 31 detik. Install berasal dari lockfile existing. Tidak ada fallback `npm install`.

Instruksi repository, task, `.agents/`, package/config, security/testing/Phase 0 documentation, serta dua laporan historical digunakan sebagai konteks. Phase 0A Quality Foundation belum diimplementasikan: script `typecheck` dan `test` belum tersedia. Recovery generated types sebelumnya tercatat pada [baseline recovery report](PHASE_0A_BASELINE_RECOVERY_REPORT.md); hasil lint/build/typecheck recovery tersebut merupakan evidence historical, bukan fresh checks pada task triage ini.

## B. Baseline Summary

| Audit | Low | Moderate | High | Critical | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full dependency tree | 1 | 2 | 13 | 1 | **17** |
| Runtime-only (`--omit=dev`) | 0 | 0 | 0 | 1 | **1** |

Kedua audit memiliki `info: 0`. Exit code masing-masing **1**, dengan JSON valid dan findings; ini hasil audit yang berhasil dikumpulkan, bukan kegagalan akses registry.

Angka 17 adalah jumlah **vulnerable package entries** menurut npm, bukan 17 CVE independen. Satu package dapat memiliki beberapa advisories/installed instances; severity juga dapat diteruskan ke parent package. Runtime-only hanya memuat `next`. Sebanyak 16 package entries lainnya berasal dari **DEV-ONLY TREE**. Tidak ada vulnerable entry yang memerlukan klasifikasi BOTH/SHARED atau UNKNOWN pada baseline ini.

Metadata dependency dari kedua audit sama: `prod: 37`, `dev: 475`, `optional: 84`, `peer: 0`, `peerOptional: 0`, `total: 576`. Kategori metadata dapat overlap; angka dev pada metadata runtime-only bukan jumlah vulnerable dev packages dalam hasil runtime-only. Total `npm ci` 577 memasukkan root project.

Raw evidence disimpan **hanya di system TEMP**, di luar repository:

| Evidence | Filename di `%TEMP%` |
| --- | --- |
| Full audit JSON | `courier-phase0a-triage-full-20261003.json` |
| Runtime audit JSON | `courier-phase0a-triage-runtime-20261003.json` |
| Framework/glob explain | `courier-phase0a-triage-explain-framework-20261003.json` |
| Tooling explain | `courier-phase0a-triage-explain-tools-20261003.json` |
| Filtered installed tree | `courier-phase0a-triage-versions-20261003.json` |

SHA-256 raw full audit: `cb90e603136ffb0cb3ab5256173b7cfe8aeea703bef113bd08387531a9ec980f`.

SHA-256 raw runtime audit: `bcfc1ad307ba48ef2ed1dfab869e5c7398fae312587d12c5632bc9b24ae06a29`.

TEMP bersifat sementara; laporan Markdown ini menjadi baseline human-readable yang dilacak workflow project. Audit registry dan advisory dapat berubah pada pemeriksaan berikutnya.

## C. Direct Dependencies

Requested berasal dari `package.json`; resolved dari `package-lock.json`, dikonfirmasi install `npm ci`. Kolom Vulnerable? berarti package itu memiliki entry di audit saat ini. Tidak adanya entry tidak membuktikan seluruh dependency chain bebas temuan.

| Package | Requested | Resolved | Runtime/Dev | Vulnerable? |
| --- | --- | --- | --- | --- |
| `@tailwindcss/postcss` | `^4.3.3` | `4.3.3` | Runtime tree | Tidak ditandai |
| `clsx` | `^2.1.1` | `2.1.1` | Runtime tree | Tidak ditandai |
| `flatpickr` | `^4.6.13` | `4.6.13` | Runtime tree | Tidak ditandai |
| `next` | `^16.3.4` | `16.3.4` | Runtime tree | **Critical** |
| `react` | `^19.2.8` | `19.2.8` | Runtime tree | Tidak ditandai |
| `react-dom` | `^19.2.8` | `19.2.8` | Runtime tree | Tidak ditandai |
| `tailwind-merge` | `^2.6.0` | `2.6.0` | Runtime tree | Tidak ditandai |
| `@svgr/webpack` | `^8.1.0` | `8.1.0` | Dev tree | Tidak ditandai langsung; membawa temuan transitive |
| `@tailwindcss/forms` | `^0.5.11` | `0.5.11` | Dev tree | Tidak ditandai |
| `@types/node` | `^20.19.25` | `20.19.26` | Dev tree | Tidak ditandai |
| `@types/react` | `^19.2.1` | `19.2.7` | Dev tree | Tidak ditandai |
| `@types/react-dom` | `^19.2.1` | `19.2.3` | Dev tree | Tidak ditandai |
| `eslint` | `^9.39.1` | `9.39.1` | Dev tree | Tidak ditandai langsung; membawa temuan transitive |
| `eslint-config-next` | `^16.3.4` | `16.3.4` | Dev tree | **High**, propagated |
| `postcss` | `^8.5.6` | `8.5.28` | Dev tree | Tidak ditandai |
| `prettier` | `^3.9.6` | `3.9.6` | Dev tree | Tidak ditandai |
| `prettier-plugin-tailwindcss` | `^0.8.1` | `0.8.1` | Dev tree | Tidak ditandai |
| `tailwindcss` | `^4.1.17` | `4.3.3` | Dev tree | Tidak ditandai |
| `typescript` | `^5.9.3` | `5.9.3` | Dev tree | Tidak ditandai |

Runtime/dev adalah lokasi dependency berdasarkan manifest, lockfile, dan audit. Package dalam `dependencies` dapat dipakai sebagai build tool; klasifikasi ini tidak menyatakan setiap package berjalan pada request server.

## D. Vulnerability Inventory

Classification fix mengacu pada kategori I. Path IDs merujuk evidence actual di H; setiap package memiliki path. MULTIPLE PATHS pada transitive packages tetap berada di dev tree. **Actual exploitability seluruh high/critical findings: NOT ESTABLISHED** oleh task ini.

| Package | Installed | Severity | Direct/Transitive | Runtime/Dev | Fix Available | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `@babel/core` | `7.28.5` | Low | Transitive; MULTIPLE PATHS, H07 | DEV-ONLY | `true` | C + E |
| `@babel/plugin-transform-modules-systemjs` | `7.28.5` | High | Transitive, H08 | DEV-ONLY | `true` | C; patch candidate + E |
| `@humanfs/node` | `0.16.7` | Moderate | Transitive; MULTIPLE PATHS, H09 | DEV-ONLY | `true` | C + E |
| `@next/eslint-plugin-next` | `16.3.4` | High | Transitive, H03 | DEV-ONLY | Object: lint config `14.2.35`, major | B + C + E |
| `ajv` | `6.12.6` | Moderate | Transitive; MULTIPLE PATHS, H10 | DEV-ONLY | `true` | C + E |
| `brace-expansion` | `1.1.12`, `2.0.2` | High | Transitive; MULTIPLE PATHS/versions, H11 | DEV-ONLY | `true` | C; patch/minor candidates + E |
| `braces` | `3.0.3` | High | Transitive, H06 | DEV-ONLY | Object: lint config `14.2.35`, major | B + C + E; upstream no patch listed |
| `browserslist` | `4.28.1` | High | Transitive; MULTIPLE PATHS, H12 | DEV-ONLY | `true` | C + E |
| `eslint-config-next` | `16.3.4` | High | **Direct dev**, H02 | DEV-ONLY | Object: self `14.2.35`, major | B + E |
| `fast-glob` | `3.3.1` | High | Transitive, H04 | DEV-ONLY | Object: lint config `14.2.35`, major | B + C + E |
| `flatted` | `3.3.3` | High | Transitive; MULTIPLE PATHS, H13 | DEV-ONLY | `true` | C + E |
| `js-yaml` | `4.1.1` | High | Transitive; MULTIPLE PATHS, H14 | DEV-ONLY | `true` | C; minor candidate + E |
| `micromatch` | `4.0.8` | High | Transitive, H05 | DEV-ONLY | Object: lint config `14.2.35`, major | B + C + E |
| `minimatch` | `3.1.2`, `9.0.5` | High | Transitive; MULTIPLE PATHS/versions, H15 | DEV-ONLY | `true` | C; patch candidates + E |
| `next` | `16.3.4` | Critical | **Direct runtime**, H01 | RUNTIME | `true` | **A + E**, patched version `16.3.6` |
| `picomatch` | `4.0.3` flagged; `2.3.2` also installed | High | Transitive; MULTIPLE PATHS/versions, H16 | DEV-ONLY | `true` | C; 4.x patch candidate + E |
| `svgo` | `3.3.2` | High | Transitive, H17 | DEV-ONLY | `true` | C; 3.x patch candidate + E |

## E. Critical Finding

| Question | Evidence |
| --- | --- |
| Package / version | `next@16.3.4` |
| Requested | `^16.3.4` |
| Advisory | [GHSA-vcvr-r3jv-pc5j: RCE in next/og ImageResponse](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) |
| Affected range | Advisory `>=16.2.0 <16.3.6`; npm package aggregate `16.2.0 - 16.3.5` |
| Direct/transitive | Direct runtime |
| Parent / actual path | Root project; `courier-route-planner@2.4.0 → next@16.3.4` |
| Runtime audit | Satu-satunya finding dalam `--omit=dev` |
| `fixAvailable` | `true`; npm JSON tidak memberikan target version object |
| Patched version | Official advisory menyebut **`16.3.6`** |
| Handling class | A: PATCH/MINOR CANDIDATE (di sini patch), ditambah E: NEEDS HUMAN REVIEW |

Advisory membahas implementasi Node.js `ImageResponse` dari `next/og`, dengan nilai attacker-controlled pada SVG content, attributes, atau styles saat image generation. Official advisory membedakan implementasi Edge serta penggunaan tanpa nilai attacker-controlled. Kondisi tersebut perlu diperiksa terhadap aplikasi/deployment aktual sebelum menyimpulkan exposure. [Official advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).

Next digunakan aktif oleh project. Search pada `src` dan `next.config.ts` tidak menemukan `ImageResponse`, `next/og`, `opengraph`, `twitter`, `runtime`, atau `openGraph`. Daftar route source tidak memuat API/OG/Twitter image handler. Ini evidence penggunaan source yang terlihat; **actual exploitability: NOT ESTABLISHED**. Tidak dilakukan deployment inspection, pembuktian exploit, maupun analisis internal seluruh framework.

`16.3.6` berada dalam requested range `^16.3.4`, tetapi lockfile saat ini tetap mengunci `16.3.4`. Remediation terpisah perlu memperbarui resolved version/lockfile dan memverifikasi kompatibilitas; tidak cukup melihat manifest range. React/React DOM tidak memiliki entry vulnerability pada audit ini dan tidak diubah.

## F. High Findings

13 high package entries dikelompokkan di bawah. Empat parent entries di F1 meneruskan severity dari `braces`; delapan packages pada F2–F4 memiliki advisories sendiri. Semua berada di **dev tooling paths**, berdasarkan lockfile `dev: true`, hasil runtime-only, dan H. Dev-only tetap memiliki potential exposure pada build/lint/config processing; severity tidak dihapus dari laporan.

### F1. Next lint config → glob → braces (5 high entries)

Actual chain:

```text
courier-route-planner@2.4.0
└── eslint-config-next@16.3.4
    └── @next/eslint-plugin-next@16.3.4
        └── fast-glob@3.3.1
            └── micromatch@4.0.8
                └── braces@3.0.3
```

`braces` memiliki advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), high, affected `<=3.0.3`: deeply nested brace patterns dapat menyebabkan stack exhaustion/DoS. Advisory mencantumkan **Patched versions: None** pada tanggal audit. Npm aggregate package range untuk `braces` adalah `*`; affected range advisory lebih spesifik.

Empat entries `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next` memiliki `via` berupa nama dependency berikutnya, bukan advisory baru. Aggregate ranges npm: `micromatch >=0.2.0`; `fast-glob *`; plugin/config `>=14.3.0-canary.0`.

Untuk kelima entries, npm memberikan `fixAvailable: {name: "eslint-config-next", version: "14.2.35", isSemVerMajor: true}`. Ini **downgrade lintas major 16 → 14**, di luar requested `^16.3.4`, sehingga membutuhkan review kompatibilitas lint config/framework. Metadata tersebut bukan rekomendasi menjalankan force fix. Tidak ada dependency tree candidate yang di-install untuk membuktikan apakah downgrade benar-benar menyelesaikan exposure.

Usage evidence langsung tersedia untuk lint config (J). Source usage audit transitive packages tidak diperluas. Actual invocation dengan nested untrusted patterns dan exploitability belum dibuktikan.

### F2. Babel/SVGR toolchain (3 high entries)

| Package | Advisory / affected range dari audit | Potential exposure |
| --- | --- | --- |
| `@babel/plugin-transform-modules-systemjs@7.28.5` | [GHSA-fv7c-fp4j-7gwp](https://github.com/advisories/GHSA-fv7c-fp4j-7gwp), high, `>=7.12.0 <=7.29.3` | Arbitrary generated code saat compile malicious input menggunakan SystemJS transform |
| `browserslist@4.28.1` | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), high, `<=4.28.6`; [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g), high, `<=4.28.6` | Unbounded query-cache memory; crash/prototype write dari untrusted custom stats |
| `svgo@3.3.2` | [GHSA-xpqw-6gx7-v673](https://github.com/advisories/GHSA-xpqw-6gx7-v673), high, `>=3 <3.3.3`; [GHSA-2p49-hgcm-8545](https://github.com/advisories/GHSA-2p49-hgcm-8545), high, `>=3 <3.3.4`; [GHSA-w27v-7q3p-w38r](https://github.com/advisories/GHSA-w27v-7q3p-w38r), high, `>=3 <3.3.5`; [GHSA-4vpr-x523-8j87](https://github.com/advisories/GHSA-4vpr-x523-8j87), moderate, `>=3 <3.3.5` | SVG entity expansion DoS; incomplete sanitization pada `removeScripts`, links, dan `foreignObject` |

Paths H08/H12/H17 menunjukkan `@svgr/webpack` sebagai salah satu root toolchain; Babel/Browserslist juga memiliki paths melalui ESLint config. Loader SVGR tercantum di Next config. Inspection terbatas loader yang sudah ter-install menunjukkan `preset-env` dengan `{modules: false}`; ini belum membuktikan SystemJS transform dijalankan dalam build project. Penggunaan untrusted SVG/stats, aktivasi sanitization plugin tertentu, dan exploitability tidak dibuktikan.

Advisory Babel menyebut patch `7.29.4`; `@babel/preset-env@7.29.5` membawa patch. Npm package aggregate menampilkan `7.12.0 - 7.29.0`, sedangkan advisory `via.range` mencakup sampai `7.29.3`; installed `7.28.5` berada dalam keduanya. Candidate review memakai advisory range, bukan aggregate yang lebih sempit. [Babel advisory](https://github.com/advisories/GHSA-fv7c-fp4j-7gwp).

SVGO `3.3.3` hanya mencakup fix entity expansion yang disebut advisory pertama. Untuk seluruh advisories SVGO dalam snapshot ini, range gabungan memerlukan candidate setidaknya `3.3.5` pada major 3, lalu audit ulang. Versi candidate tidak di-install atau diuji.

### F3. Glob matching / expansion (3 high entries)

Versi berbeda dicatat terpisah di H. Advisory yang muncul dua kali untuk major berbeda dihitung sebagai satu GHSA di tabel ini.

| Package | Advisory | Severity | Affected installed-major ranges |
| --- | --- | --- | --- |
| `brace-expansion` | [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v): zero-step sequence hang/OOM | Moderate | `<1.1.13`; `>=2 <2.0.3` |
| `brace-expansion` | [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp): exponential expansion | High | `<1.1.16`; `>=2 <2.1.2` |
| `brace-expansion` | [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg): unbounded expansion length | High | `<1.1.17`; `>=2 <2.1.3` |
| `brace-expansion` | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895): unbounded intermediate arrays | High | `<1.1.18`; `>=2 <2.1.4` |
| `brace-expansion` | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr): quadratic rewrite | Moderate | `<1.1.21`; `>=2 <2.1.7` |
| `brace-expansion` | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7): nested-group recursion | High | `<1.1.20`; `>=2 <2.1.6` |
| `brace-expansion` | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p): parseCommaParts recursion | High | `<1.1.19`; `>=2 <2.1.5` |
| `minimatch` | [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26): repeated-wildcard ReDoS | High | `<3.1.3`; `>=9 <9.0.6` |
| `minimatch` | [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj): globstar backtracking | High | `<3.1.3`; `>=9 <9.0.7` |
| `minimatch` | [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74): nested-extglob ReDoS | High | `<3.1.4`; `>=9 <9.0.7` |
| `picomatch` | [GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p): POSIX character-class method injection | Moderate | `>=4 <4.0.4` |
| `picomatch` | [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj): extglob ReDoS | High | `>=4 <4.0.4` |

Potential exposure adalah pemrosesan crafted glob/brace patterns pada ESLint/glob tooling. Tabel membatasi affected ranges ke installed majors dari audit, bukan seluruh versi yang pernah terdampak. Tidak diperiksa apakah project mengalirkan untrusted patterns ke fungsi tersebut. Actual exploitability: NOT ESTABLISHED.

### F4. ESLint/config parsing and cache (2 high entries)

| Package | Advisory / affected range | Potential exposure |
| --- | --- | --- |
| `flatted@3.3.3` | [GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f), high, `<3.4.0`; [GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh), high, `<=3.4.1` | Recursion DoS/prototype pollution dalam `parse()`; installed path melalui lint cache |
| `js-yaml@4.1.1` | [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68), moderate, `>=4 <=4.1.1`; [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m), high, `>=4 <4.3.0`; [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj), high, `>=4 <4.3.1`; [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh), high, `>=4 <4.3.2` | Quadratic CPU consumption pada crafted YAML aliases/merge chains/ordered maps/empty merges |

H13/H14 menelusuri cache dan config parser yang ter-install, termasuk js-yaml melalui SVGR/cosmiconfig. Input trust dan pemanggilan fungsi terdampak tidak diuji. Actual exploitability: NOT ESTABLISHED.

## G. Moderate / Low Findings

| Package | Severity | Advisory / affected range | Location / handling |
| --- | --- | --- | --- |
| `@babel/core@7.28.5` | Low | [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8), `<=7.29.0`: arbitrary file read via sourceMappingURL comment | Transitive dev, SVGR/ESLint config paths; `fixAvailable: true`, target tidak diberikan |
| `@humanfs/node@0.16.7` | Moderate | [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g), `<0.16.8`: recursive copy mengikuti symlink ke luar source tree | Transitive dev melalui ESLint; `fixAvailable: true`; patch floor candidate `0.16.8` dari range |
| `ajv@6.12.6` | Moderate | [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6), `<6.14.0`: ReDoS dengan `$data` option | Transitive dev melalui ESLint/eslintrc; `fixAvailable: true`; minor floor candidate `6.14.0` dari range |

Moderate advisories pada brace-expansion, picomatch, js-yaml, dan svgo sudah tercakup di F. Npm mengelompokkan masing-masing package tersebut pada highest severity high; jangan menambahkannya lagi ke count 2 moderate package entries.

## H. Dependency Paths

Evidence diperoleh dari filtered `npm explain ... --json` dan `npm ls ... --all --json`, lalu dicocokkan dengan lockfile. Root semua paths adalah `courier-route-planner@2.4.0` (ditulis `root` di tabel). Paths peer/shared dependencies dapat membawa package yang sama lewat lebih dari satu direct root; tabel memilih representative paths, bukan menganggapnya installed instances berbeda.

| ID | Package | Actual representative path |
| --- | --- | --- |
| H01 | `next` | `root → next@16.3.4` |
| H02 | `eslint-config-next` | `root → eslint-config-next@16.3.4` |
| H03 | `@next/eslint-plugin-next` | H02 `→ @next/eslint-plugin-next@16.3.4` |
| H04 | `fast-glob` | H03 `→ fast-glob@3.3.1` |
| H05 | `micromatch` | H04 `→ micromatch@4.0.8` |
| H06 | `braces` | H05 `→ braces@3.0.3` |
| H07 | `@babel/core` | `root → @svgr/webpack@8.1.0 → @babel/core@7.28.5`; `root → eslint-config-next@16.3.4 → eslint-plugin-react-hooks@7.0.1 → @babel/core@7.28.5` |
| H08 | `@babel/plugin-transform-modules-systemjs` | `root → @svgr/webpack@8.1.0 → @babel/preset-env@7.28.5 → @babel/plugin-transform-modules-systemjs@7.28.5` |
| H09 | `@humanfs/node` | `root → eslint@9.39.1 → @humanfs/node@0.16.7`; ESLint juga direferensikan peer dari lint config |
| H10 | `ajv` | `root → eslint@9.39.1 → ajv@6.12.6`; `root → eslint@9.39.1 → @eslint/eslintrc@3.3.3 → ajv@6.12.6` |
| H11 | `brace-expansion` | H15 (3.x minimatch) `→ brace-expansion@1.1.12`; H15 (9.x minimatch) `→ brace-expansion@2.0.2` |
| H12 | `browserslist` | `root → @svgr/webpack@8.1.0 → @babel/core@7.28.5 → @babel/helper-compilation-targets@7.27.2 → browserslist@4.28.1`; Babel chain juga dari lint config/preset-env |
| H13 | `flatted` | `root → eslint@9.39.1 → file-entry-cache@8.0.0 → flat-cache@4.0.1 → flatted@3.3.3` |
| H14 | `js-yaml` | `root → eslint@9.39.1 → @eslint/eslintrc@3.3.3 → js-yaml@4.1.1`; `root → @svgr/webpack@8.1.0 → @svgr/core@8.1.0 → cosmiconfig@8.3.6 → js-yaml@4.1.1` |
| H15 | `minimatch` | `root → eslint@9.39.1 → minimatch@3.1.2`; `root → eslint-config-next@16.3.4 → typescript-eslint@8.49.0 → @typescript-eslint/typescript-estree@8.49.0 → minimatch@9.0.5` |
| H16 | `picomatch` | `root → eslint-config-next@16.3.4 → eslint-import-resolver-typescript@3.10.1 → tinyglobby@0.2.15 → picomatch@4.0.3`; juga melalui typescript-estree/tinyglobby. H05 `→ picomatch@2.3.2` untuk instance yang tidak ditandai |
| H17 | `svgo` | `root → @svgr/webpack@8.1.0 → @svgr/plugin-svgo@8.1.0 → svgo@3.3.2` |

Semua nodes yang ditandai vulnerability kecuali Next memiliki `dev: true` dalam lockfile. Dependency tree runtime-only dan full dibandingkan; runtime/dev tidak ditebak dari nama package.

### Multiple installed versions

| Package / instance | Location di lockfile | Parent | Flagged? / fixed instance elsewhere? |
| --- | --- | --- | --- |
| `brace-expansion@1.1.12` | `node_modules/brace-expansion` | `minimatch@3.1.2` | Flagged; tidak ditemukan fixed instance package ini |
| `brace-expansion@2.0.2` | `node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion` | `minimatch@9.0.5` | Flagged; tidak ditemukan fixed instance package ini |
| `minimatch@3.1.2` | `node_modules/minimatch` | `eslint@9.39.1` dan shared paths | Flagged; tidak ditemukan fixed instance package ini |
| `minimatch@9.0.5` | `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch` | `@typescript-eslint/typescript-estree@8.49.0` | Flagged; tidak ditemukan fixed instance package ini |
| `picomatch@4.0.3` | `node_modules/tinyglobby/node_modules/picomatch` | `tinyglobby@0.2.15` | Flagged; tidak ditemukan patched 4.x instance |
| `picomatch@2.3.2` | `node_modules/picomatch` | `micromatch@4.0.8` | Tidak ditandai oleh dua advisories 4.x di audit ini; berbeda major, bukan bukti bahwa 4.x telah diperbaiki |

Seluruh vulnerable package names diperiksa terhadap semua package locations dalam lockfile. Selain tiga packages di tabel, masing-masing hanya memiliki satu installed version. Tidak dilakukan dedupe atau penggantian major untuk menggabungkan instances.

## I. Fix Availability

Kategori:

- **A — PATCH/MINOR CANDIDATE:** versi candidate tanpa major direct change terlihat tersedia; kompatibilitas belum terbukti.
- **B — MAJOR-UPGRADE CANDIDATE:** label kategori task untuk perubahan lintas major/potentially breaking. Pada snapshot ini suggestion npm justru **major downgrade**, bukan upgrade.
- **C — TRANSITIVE / PARENT UPDATE REQUIRED:** remediation perlu mempertimbangkan parent ranges dan resolved transitive lockfile. Tidak berarti setiap parent pasti harus berganti version.
- **D — NO FIX AVAILABLE:** digunakan bila npm `fixAvailable: false`. Tidak ada entry dengan nilai tersebut pada snapshot ini.
- **E — NEEDS HUMAN REVIEW:** metadata/usage/compatibility belum cukup untuk memastikan candidate bisa diterapkan.

Npm menghasilkan **12 nilai `true`** dan **5 object** yang menunjuk lint config `14.2.35`. Boolean `true` tidak menyatakan target version, jumlah package changes, atau keamanan update. Floor candidates yang hanya diturunkan dari affected range adalah inferensi untuk follow-up; ketersediaan registry, parent semver constraints, dan compatibility harus diperiksa pada task remediation.

| Package | Fix Available | Candidate Type | Breaking Risk | Notes |
| --- | --- | --- | --- | --- |
| `next` | `true` | A + E | Patch masih perlu regression checks | Official fixed `16.3.6`, memenuhi `^16.3.4`; actual lock tetap `16.3.4` |
| `eslint-config-next` | `{name: eslint-config-next, version: 14.2.35, isSemVerMajor: true}` | B + E | Lintas major, downgrade, di luar requested range | Tidak direkomendasikan menerapkan suggestion secara otomatis |
| `@next/eslint-plugin-next` | Object yang sama | B + C + E | Parent config downgrade | Severity propagated dari glob chain |
| `fast-glob` | Object yang sama | B + C + E | Parent config downgrade | Tidak diberikan patch target fast-glob |
| `micromatch` | Object yang sama | B + C + E | Parent config downgrade | Tidak diberikan patch target micromatch |
| `braces` | Object yang sama | B + C + E | Parent chain change | Advisory upstream belum mencantumkan patched version; berbeda dari npm parent repair suggestion |
| `@babel/core` | `true` | C + E | Parent/range compatibility belum diverifikasi | Audit aggregate `<=7.29.0`; exact target tidak diberikan |
| `@babel/plugin-transform-modules-systemjs` | `true` | C; patch candidate + E | Parent/preset compatibility | Advisory fixed `7.29.4`; preset-env `7.29.5` membawa patch |
| `@humanfs/node` | `true` | C; patch candidate + E | Parent compatibility | Floor candidate `0.16.8` dari affected range |
| `ajv` | `true` | C; minor candidate + E | ESLint schema/config compatibility | Floor candidate `6.14.0` pada major 6 |
| `brace-expansion` | `true` | C; patch/minor candidates + E | Harus menangani kedua installed majors | Floor candidates `1.1.21` dan `2.1.7` dari gabungan ranges |
| `browserslist` | `true` | C + E | Belum diverifikasi | Perlu target di luar affected `<=4.28.6`; audit tidak memberi exact target |
| `flatted` | `true` | C + E | Lint cache compatibility | Perlu target di luar affected `<=3.4.1`; target exact tidak diberikan |
| `js-yaml` | `true` | C; minor candidate + E | Parser/config compatibility | Floor candidate `4.3.2` untuk gabungan ranges |
| `minimatch` | `true` | C; patch candidates + E | Kedua majors dan parent ranges perlu diperiksa | Floor candidates `3.1.4` dan `9.0.7` |
| `picomatch` | `true` | C; patch candidate + E | Tinyglobby/glob compatibility | Floor candidate `4.0.4`; instance 2.x tidak menyelesaikan finding 4.x |
| `svgo` | `true` | C; patch candidate + E | SVG transform output compatibility | Floor candidate `3.3.5` untuk semua advisories pada snapshot, bukan hanya `3.3.3` |

Tidak ada candidate version yang di-install atau diuji. Tidak ditambahkan `overrides`, tidak diedit lockfile, dan tidak dilakukan audit fix untuk membuktikan classification.

## J. Project Usage Evidence

Source usage audit dilakukan untuk **dua direct vulnerable dependencies**. Transitive paths berasal dari dependency explain/lockfile; additional inspection terbatas SVGR loader membantu menilai syarat advisory Babel.

| Direct vulnerable package | Classification | Actual project evidence |
| --- | --- | --- |
| `next@16.3.4` | **ACTIVELY IMPORTED/USED** | `package.json` dev/build/start memakai Next CLI; `src/app/layout.tsx:2` memakai `next/font/google`; `src/app/(admin)/page.tsx:2` memakai `next/link`; `src/context/SidebarContext.tsx:3` memakai `next/navigation`; komponen juga memakai `next/image` |
| `eslint-config-next@16.3.4` | **CONFIG/BUILD TOOL** (lint tooling) | `eslint.config.mjs:1` import `eslint-config-next/core-web-vitals`; line 2 import `eslint-config-next/typescript`; `npm run lint` menjalankan `eslint .` |

Targeted critical-feature search:

```text
rg -n "ImageResponse|next/og|opengraph|twitter|runtime|openGraph" src next.config.ts
```

Hasil: exit **1**, no matches (expected search absence). `rg --files src/app` memuat layout/pages, `[module]/page.tsx`, about page, globals, not-found, dan static `icon.svg`; tidak menemukan API/OG/Twitter image handler. Static SVG icon bukan bukti penggunaan Node `ImageResponse`.

SVGR evidence tambahan: `next.config.ts:8` dan `:23` mereferensikan `@svgr/webpack` pada webpack/Turbopack loader. `node_modules/@svgr/webpack/dist/index.js:50` mengatur preset-env `{modules: false}`; line 93 default plugins `svgo, jsx`. Tidak dilakukan source audit menyeluruh semua transitive dependencies. Evidence ini tidak cukup untuk memastikan affected transforms/plugins tidak pernah dipanggil melalui path lain.

Tidak adanya import langsung tidak membuktikan sebuah framework/transitive dependency tidak digunakan secara internal. Tidak ada exploitability claim maupun pemeriksaan production endpoint dalam task ini.

## K. Phase 0A Blocker Assessment

**REVIEW REQUIRED BEFORE ADDING DEPENDENCIES**

Rekomendasi engineering ini berdasarkan kombinasi evidence:

1. Baseline memiliki direct runtime finding critical `next@16.3.4`, dengan official patch candidate `16.3.6` pada major yang sama. Pemilik project perlu memutuskan controlled patch task atau acceptance sementara yang dicatat sebelum testing stack mengubah tree.
2. Source search belum menemukan fitur `ImageResponse` yang disebut advisory. Actual exploitability belum ditetapkan; tidak ada evidence kuat pada task ini untuk menyatakan aplikasi dapat dieksploitasi atau menganggap label severity saja sebagai mandatory blocker.
3. Lint chain memiliki suggestion downgrade major ke `14.2.35`, sementara advisory `braces` belum mencantumkan patch. Jalur penanganannya membutuhkan review kompatibilitas dan parent chain, bukan blind audit fix.
4. 16 dev-only findings mencakup lint/build/config processing. Menambah Vitest/Testing Library sekarang akan menghasilkan delta tree baru sebelum keputusan baseline ditetapkan. Laporan ini mempertahankan snapshot sebelum testing bootstrap.

Keputusan manusia yang dibutuhkan untuk follow-up: prioritas controlled Next patch, penanganan/acceptance sementara dev tooling findings, serta urutan testing bootstrap setelah keputusan tersebut. Audit/triage ini selesai sebagai evidence; perbaikan dependency dan Phase 0A Quality Foundation belum dilakukan.

## L. Recommended Follow-Up

**NO fixes performed.** Usulan berikut adalah task terpisah; seluruh candidate membutuhkan pemeriksaan aktual sebelum diterapkan.

1. **Safe update candidate — belum dinyatakan safe:** review controlled patch `next 16.3.4 → 16.3.6`, sesuai official advisory dan existing requested range. Pertahankan baseline/diff agar dependency delta dapat direview. Jangan mengganti React/React DOM tanpa alasan task tersendiri.
2. **Major upgrade review:** review suggestion npm untuk lint config **downgrade** ke `14.2.35`. Periksa alternatif parent release yang kompatibel dengan Next 16, lint config imports, dan ESLint 9. Major change belum disetujui dan belum diterapkan.
3. **Transitive dependency monitoring/remediation:** lacak Babel/preset-env, SVGR/SVGO, ESLint parsers/cache, glob packages, serta kedua majors brace-expansion/minimatch. Verifikasi candidate floors pada I, parent ranges, registry availability, semua instances, dan perubahan hasil SVG/glob/lint. Jangan memakai boolean `fixAvailable: true` sebagai jaminan compatibility.
4. **No-fix advisory:** monitor [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) dan parent chain; advisory belum mencantumkan patch. Catat keputusan manusia jika sementara menerima potential dev tooling exposure. Tidak ada npm entry `fixAvailable: false`; masalah no-patch advisory harus dibedakan dari suggestion parent change npm.
5. **Security verification setelah update:** jalankan lockfile-based install, full/runtime audit, filtered explain/ls untuk memastikan seluruh affected instances ditangani, dan bandingkan terhadap count/hashes laporan ini. Jalankan script checks aktual serta local Next typegen/tsc sesuai contract recovery; setelah foundation tersedia, gunakan lint/typecheck/test/build contract lengkap. Periksa penggunaan/deployment `ImageResponse` serta input trust jika fitur tersebut ada. Simpan delta audit sebelum/ sesudah testing bootstrap dan pertahankan failed/raw evidence yang relevan.

Manual review yang masih diperlukan: keputusan remediation/acceptance pada K, kompatibilitas candidate updates, dan exposure pada deployment aktual. Tidak ada klaim update aman, bebas vulnerability, atau production readiness dari triage ini.

## M. Scope Verification

### Command evidence

Semua shell execution melalui RTK; `proxy` mempertahankan raw output. Berikut command payload yang berhasil dijalankan pada task ini:

| Command / check | Exit | Result |
| --- | ---: | --- |
| `git branch --show-current`, `git status --short`, `git log -1 --oneline` | 0 | **PASS** branch target; initial untracked historical reports; HEAD dicatat |
| `node -v`, `npm -v` | 0 | **PASS** Node 24.19.0, npm 11.6.0 |
| `npm config get registry`, `npm config get package-lock` | 0 | **PASS** registry npm, lock enabled |
| `npx --no-install next --version` | 0 | **PASS** local Next 16.3.4 |
| `npm ci` | 0 | **PASS** install current lock; findings tetap ada |
| `npm audit --json` (TEMP) | 1 | **AUDIT COMPLETE / FINDINGS PRESENT**: 17 package entries |
| `npm audit --omit=dev --json` (TEMP) | 1 | **AUDIT COMPLETE / FINDINGS PRESENT**: 1 critical |
| `npm explain next eslint-config-next @next/eslint-plugin-next fast-glob micromatch braces --json` | 0 | **PASS** filtered path evidence |
| `npm explain @babel/core @babel/plugin-transform-modules-systemjs @humanfs/node ajv brace-expansion browserslist flatted js-yaml minimatch picomatch svgo --json` | 0 | **PASS** tooling path evidence |
| `npm ls next react react-dom eslint-config-next brace-expansion minimatch picomatch --all --json` | 0 | **PASS** filtered versions/tree |
| Targeted `rg` usage/config checks | 0; critical-feature search 1 | Matches ditemukan untuk framework/config; absence search dicatat di J |
| `git diff -- package.json package-lock.json` | 0 | **PASS** empty diff |
| `git status --short --untracked-files=all` | 0 | **PASS** hanya tiga process reports untracked |
| `git diff --stat`, `git diff --cached --stat`, `git diff --check` | 0 | **PASS** empty output, tanpa tracked/staged diff |
| `git rev-parse HEAD` | 0 | **PASS** HEAD tidak berubah |
| Hash comparison empat baseline files | 0 | **PASS** manifest, lockfile, dan kedua historical reports unchanged |
| Report content verification | 0 | **PASS** A–M, 19 direct rows, 17 inventory/fix rows, seluruh audit GHSA IDs, tanpa whitespace/conflict errors |

Tidak dijalankan ulang lint/build/typecheck karena task hanya triage dan report, dengan source/package baseline tetap. `test`/`typecheck` scripts yang belum tersedia merupakan **FOUNDATION PREREQUISITE / GAP**, bukan fresh PASS/FAIL commands. Evidence generated-type recovery tetap berada pada historical report.

### File integrity and final scope

SHA-256 berikut digunakan untuk membandingkan pre/post audit:

| File | Baseline SHA-256 |
| --- | --- |
| `package.json` | `6f3879731be0ad21595a06a30ff45d88e5da112aeb3e99b7e2295d8413331e2d` |
| `package-lock.json` | `c8c944fb07e13f3bf9fa1f9846555166a8a7545b2c7eb2cc2b78084c4c2d0844` |
| `docs/proses/PHASE_0A_AUDIT_REPORT.md` | `eb461112f0fca0c03afe4e7195056a58f1fb9d42a6e1b86ededb3c57c7c53a80` |
| `docs/proses/PHASE_0A_BASELINE_RECOVERY_REPORT.md` | `c0a06aa6a0b8b7b761632912882ff7271c8d4b0041ba5ac03cdaf59bcf4ee1f6` |

Final verification setelah report ditulis menunjukkan tiga process reports untracked, tanpa staged/tracked changes. Manifest/lockfile diff kosong; keempat hash pada tabel cocok dengan baseline. `git diff --check` tidak memeriksa file untracked; isi laporan juga diperiksa langsung untuk trailing whitespace, conflict markers, struktur A–M, serta kelengkapan tabel/advisory IDs.

```text
?? docs/proses/PHASE_0A_AUDIT_REPORT.md
?? docs/proses/PHASE_0A_BASELINE_RECOVERY_REPORT.md
?? docs/proses/PHASE_0A_DEPENDENCY_AUDIT_REPORT.md
```

- Tidak menjalankan `npm audit fix`, force fix, update/upgrade, uninstall, dedupe, prune, atau overrides.
- Tidak memperbarui/menghapus package; required `npm ci` memasang ulang versions dari lockfile existing.
- Tidak mengubah `package.json`, `package-lock.json`, source, `.gitignore`, `.agents/`, atau `skills-lock.json`.
- Tidak menambah Vitest, jsdom, Testing Library, coverage, maupun script foundation.
- Tidak mengubah dua historical reports, tidak memindahkan/menghapus evidence tersebut.
- Satu file baru task ini: `docs/proses/PHASE_0A_DEPENDENCY_AUDIT_REPORT.md`.
- Raw audit JSON tetap di TEMP; tidak ada permanent JSON/helper dalam repository.
- Tidak melakukan staging, commit, push, merge, rebase, atau perubahan remote branches.

**NO FIX · NO COMMIT · NO PUSH · NO MERGE.**
