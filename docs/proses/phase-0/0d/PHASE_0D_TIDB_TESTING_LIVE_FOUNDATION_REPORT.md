# Phase 0D-3B — TiDB Testing Live Foundation Report

Tanggal evidence: **2026-10-10**, Asia/Jakarta. Kedua human checkpoints tercatat. Testing resource/database dan private dedicated roles tersedia; migration command dijalankan tepat satu kali, lalu read-only ledger/schema/app read/health/readiness PASS. Source docs dan derived pack disinkronkan. Independent fresh-context review PASS dan final safety check PASS; laporan final, pekerjaan STOP sesuai scope.

## A. Verdict

**TIDB TESTING LIVE FOUNDATION VERIFIED**.

Independent Testing Starter Active, exact logical DB, separate dedicated app/migrator usernames/passwords dan least-privilege DB-only grants verified. Kedua human approvals RECORDED. Immediate pre-apply schema kosong, ledger absent; `npm run db:migrate:testing` invocation **exactly 1**, exit **0**. Post-apply ledger 1 record, depots schema parity, app read dan health/readiness PASS. Production NOT PROVISIONED; Vercel NOT CONNECTED; Phase 0D/Gate 1 OPEN; main behavior DEFERRED. Fresh-context independent review **PASS**, tanpa unresolved Critical/Important findings. Source docs/derived pack synced; secret preservation/index/refs/artifact checks PASS.

## B. Repository Baseline

| Item | Evidence aktual |
| --- | --- |
| Branch | feature/phase-0d-tidb-testing-live |
| HEAD / testing / origin/testing / merge-base | cccf724edbecec08c54c020a5e6b4da4e3b514b6 |
| Fresh remote testing ref | SHA sama dengan local testing |
| main / origin/main, local refs | 7836b894c212e951dfe652d30b2531b128f7deff |
| Index | Empty |
| git diff --check | PASS, exit 0 |
| Working tree saat audit ulang | Known human modifications di luar task dan satu report agent; tidak diklaim clean |

Perubahan manusia yang sudah diakui dikecualikan dari scope/output pekerjaan ini dan dipertahankan. Recheck sebelum provisioning pada 2026-10-10T12:24:30.995Z membuktikan **217 source files lainnya dan seluruh 424 current skill files** sesuai sealed snapshot; index kosong dan tidak ada material drift. Resumed baseline check pada 2026-10-10T13:12:36.816Z juga PASS untuk preservasi, refs/merge-base, index kosong, diff check dan private-file ignore rules; kedua private files sekarang ada dan ignored. Agent tidak mengubah skills atau application/migration source. Setelah live success, output project terdiri dari dua belas source docs, dua derived docs dan report ini. Known human changes tetap dipertahankan di luar output task. Sealed baseline/structure/artifact checks PASS lagi tepat sebelum apply; approved pre-apply report SHA-256 **7d96687fb0c4dfbb402fa3c57f193115fd73992ff186ca5566a0b47818021281** disimpan bersama packet authorization di luar Git.

[PR #14](https://github.com/ArdhanKurniawan/courier-route-planner/pull/14) closed/merged pada 2026-10-04T16:12:47Z; merge SHA sesuai baseline. Fresh GET [Quality push run 37215930610](https://github.com/ArdhanKurniawan/courier-route-planner/actions/runs/37215930610) menunjukkan testing, SHA yang sama, attempt 1, completed/success. [Quality Gate check 111476313268](https://github.com/ArdhanKurniawan/courier-route-planner/actions/runs/37215930610/job/111476313268) completed/success, app github-actions. Fresh checkpoint GET pada **2026-10-10 13:26:52 UTC** juga mengonfirmasi current remote testing SHA sama dan Quality run attempt 1 completed/success. Direct standalone check-run endpoint ditolak connector; check evidence sebelumnya tidak diklaim sebagai fresh GET endpoint itu. Final read-only GET pada **2026-10-10 13:54:12 UTC** mengonfirmasi SHA testing yang sama dan Quality push run completed/success. Ini remote merged baseline evidence; fresh local quality reproduction dicatat terpisah pada section N.

AGENTS.md, RTK.md, task lengkap dan laporan tooling 0D-3A dibaca; laporan 0C/0D yang relevan diperiksa. Skills: using-superpowers, verification-before-completion, requesting-code-review dan computer-use; systematic-debugging digunakan untuk kesalahan variabel lokal pada pengumpul metadata, yang sudah dikoreksi dan diverifikasi lewat GET ulang. Shell dan child verification commands memakai RTK. Tidak ada skill installation atau Git mutation.

Current Testing tooling dipertahankan: `db:migrate:testing` memuat `.env.migrations.testing.local` dan `drizzle.testing.config.ts`; pure guard memerlukan exact `APP_ENV=testing` dan decoded DB `courier_route_planner_testing`, dengan `ssl.rejectUnauthorized: true`. Dev guard/config, offline config dan runtime HTTP client tetap utuh. Tidak ada generic/Production apply path.

## C. Provider Preflight

Browser authenticated oleh manusia. Preflight awal membaca inventory, payment-method view dan form provisioning tanpa Create. Setelah approval, inventory dan form diperiksa kembali sebelum satu Create. Tidak ada credential atau API token yang dibaca/disalin oleh agent.

| Item | Observasi sebelum Create |
| --- | --- |
| Context | Organization milik manusia; default project |
| Inventory tanpa filter | Total 1 resource |
| Resource existing | DevCourierRoute, Active, STARTER |
| Dev cloud / region | AWS / Tokyo (ap-northeast-1) |
| Testing existing | Tidak terlihat dalam inventory yang diperiksa |
| Proposed form | Starter, MySQL Compatible, default project |
| Proposed cloud / region | AWS / Tokyo (ap-northeast-1) |
| Spending limit / summary | $0 per month / $0.00 maximum per month |
| Payment requirement | No credit card required; payment-method view tidak menampilkan saved card |
| Form eligibility | Create enabled, tanpa quota/name validation warning |

Account UI menawarkan satu tambahan Starter pada spending limit 0. Recheck form tetap **$0/month**, **$0.00 max/month**, **No credit card required**, tanpa quota/name warning. Create dilakukan sekali setelah Checkpoint A. Inventory sesudahnya menunjukkan **Total 2**, yaitu DevCourierRoute dan route-planner-testing, keduanya Active/STARTER/AWS Tokyo. Tidak ada paid upgrade atau card addition. Tidak menyimpulkan seluruh kebijakan billing/account dari satu tampilan payment methods.

Official sources diperiksa pada **2026-10-10**:

- [Create Starter](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/?plan=starter): resource creation, region/project dan spending limit; 0 menggunakan free quota, limit berbayar memerlukan kartu.
- [Select a plan](https://docs.pingcap.com/tidbcloud/select-cluster-tier/): default lima free Starter dan unique username prefix yang wajib dipakai saat membuat maupun menggunakan SQL user.
- [Starter limitations](https://docs.pingcap.com/tidbcloud/serverless-limitations/): free quota, connection limits, quota exhaustion dan unavailable database audit logging. Limit 0 berarti workload dapat ditolak/throttled saat quota habis.
- [TLS](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/): TLS dan certificate validation untuk koneksi Starter.
- [CREATE USER](https://docs.pingcap.com/tidbcloud/sql-statement-create-user/), [GRANT](https://docs.pingcap.com/tidbcloud/sql-statement-grant-privileges/) dan [privilege management](https://docs.pingcap.com/tidb/stable/privilege-management/): syntax, database privilege scope, wildcard escaping, minimum privileges dan self SHOW GRANTS.

## D. Human Provisioning Authorization

**RECORDED**: manusia mengirim exact `YES PROVISION TESTING RESOURCE`, dengan resource name, tier, region, spending limit, database dan dua reviewed roles yang spesifik. Manusia juga menegaskan larangan migration, Production, Vercel, source changes, Git mutation dan credential disclosure. Baseline dan provider form diperiksa kembali tanpa material drift sebelum Create.

Approval tersebut hanya mencakup satu resource Testing independen, logical DB yang disebutkan, dua SQL users terpisah dan grant yang direview di bawah. Password creation/entry/copy dilakukan manusia secara privat. Migration memerlukan checkpoint terpisah.

## E. Testing Resource

**PROVISIONED; ACTIVE**: satu TiDB Cloud Starter bernama `route-planner-testing`, default project, AWS Tokyo (ap-northeast-1), MySQL Compatible. Reviewed form spending limit **0**; resource Create invocation **1**. Ready state dibaca sebelum SQL provisioning. Tidak ada paid upgrade, card addition atau resource kedua yang dibuat agent. Safe inventory screenshot tersedia di host-local evidence, di luar Git.

## F. Resource Isolation

**VERIFIED**. Fresh provider inventory tetap Total 2: DevCourierRoute dan route-planner-testing, keduanya Active/STARTER/AWS Tokyo. SQL Editor resource baru sebelumnya menghasilkan unique instance prefix SHA-256 **e2e4a84949834096fe189c53660812af4e7d55e7a53bf8fade44f0326eaf81bb** tanpa menampilkan username. Kedua private env dan kedua authenticated CURRENT_USER principals cocok dengan intended dedicated user dan fingerprint prefix tersebut. Host/port kedua env sama; actual hostname tidak dicatat. Ini mengikat credential ke independent Testing resource, tanpa membaca private Dev env atau mengandalkan logical DB/region/gateway hostname saja. Post-apply provider inventory pada **2026-10-10T13:50:58.600Z** menunjukkan dua Active Starter resources yang sama; tidak ada resource ketiga. Safe screenshot `tidb-testing-final-inventory.jpg` disimpan di luar Git.

## G. Logical Database

**CREATED; READBACK VERIFIED**: exact `courier_route_planner_testing` pada resource Testing. Query log mencatat CREATE DATABASE tersebut, Query OK, 0 rows affected, duration 119 ms; metadata readback menampilkan exact schema dan table_count **0**. Tidak ada manual application table atau ledger.

SQL Editor sempat bermasalah sebelum keberhasilan ini. Ada **3 UI Run attempts dengan intended CREATE text**, tetapi hanya **1 CREATE yang terkonfirmasi di query log dengan success dan readback**. Dua attempt awal tidak memperoleh DDL confirmation; fresh SHOW DATABASES dan query SCHEMATA kemudian membuktikan database masih absent. Salah satu schema refresh awal melaporkan provider error `[49900001] Failed to connect to cluster. Cause: get db account failed!`. Setelah credential admin awal disimpan privat oleh manusia, read-only queries berjalan. Penggantian teks melalui setValue mengubah visible editor sementara query log mempertahankan SQL sebelumnya; keyboard input kemudian terbukti mencatat dan menjalankan SQL yang benar. Tidak mengklaim jumlah server-side DDL attempts yang tidak dapat diamati. CREATE tidak diulang setelah successful readback.

## H. Application Role

**VERIFIED**: dedicated Testing application user, terpisah dari migrator. Human membuat credential dan grants secara privat. Safe env guard dan CURRENT_USER predicate membuktikan intended application principal; username tidak ditampilkan. Self SHOW GRANTS melalui unchanged HTTP source factory menunjukkan exact **SELECT, INSERT, UPDATE, DELETE**, hanya database **courier_route_planner_testing**, dengan setiap underscore escaped. Tidak ada actual global privileges, GRANT OPTION, CREATE USER atau schema administration. Global USAGE row tidak memberikan elevated capabilities. Tidak menguji write grants dengan DML atau dangerous DDL.

Reviewed/verified grant template, tanpa actual prefix:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE
ON `courier\_route\_planner\_testing`.*
TO '<Testing instance prefix>.testing_app'@'%';
```

## I. Migrator Role

**VERIFIED**: separate dedicated Testing migrator user. Safe env guard dan CURRENT_USER predicate membuktikan intended principal tanpa menampilkan username. Self SHOW GRANTS melalui mysql2 menunjukkan exact **CREATE, SELECT, INSERT**, hanya escaped target database scope; tidak ada actual global privileges, GRANT OPTION, ALL, ALTER atau DROP.

Installed versions cocok lockfile: drizzle-kit 0.31.11, drizzle-orm 0.45.3, mysql2 3.24.5, @tidbcloud/serverless 0.3.0. Reviewed Kit MySQL path memakai mysql2 + ORM migrator: CREATE ledger IF NOT EXISTS, SELECT latest ledger, reviewed initial CREATE depots, INSERT ledger. Minimum privilege set ini cukup untuk current history; future history harus direview lagi. Tidak mengadopsi broad historical Dev grants.

```sql
GRANT CREATE, SELECT, INSERT
ON `courier\_route\_planner\_testing`.*
TO '<Testing instance prefix>.testing_migrator'@'%';
```

## J. Private Env Handling

**PASS**. Kedua intended private files ada dan ignored; manusia mengonfirmasi penyimpanan users/grants/env dan koreksi password migrator. Admin/root tetap human provisioning only; private env guard membuktikan dua intended dedicated usernames.

Structural check awal menemukan decoded passwords identik. Agent STOP sebelum dedicated connectivity, meminta private correction, dan tidak mengubah credential. Human mengonfirmasi **password migrator Testing sudah dibedakan**. Fresh structural check pada **2026-10-10T13:19:21.670Z** PASS: exact APP_ENV testing, exact logical DB, URL parsing/guard, usernames berbeda, passwords berbeda, host/port sama, kedua resource-prefix hashes cocok dan configured rejectUnauthorized true. Password validity kemudian dibuktikan melalui actual authenticated connections. Tidak menampilkan username/password/host/full URL.

RTK launcher membuat clean child environment dengan menghapus inherited APP_ENV, DATABASE_URL, NODE_ENV, NODE_OPTIONS, NODE_TLS_REJECT_UNAUTHORIZED dan SSLKEYLOGFILE case-insensitively. Worker membersihkan target env lagi sebelum process.loadEnvFile tiap intended file dan memakai unchanged getTestingMigrationCredentials. TypeScript source ditranspile in-memory; server-only alias mengikuti actual installed Next server alias. Private values tidak diserialisasi, raw errors disembunyikan. Report diperiksa terhadap exact private values melalui presence-only boolean, selain bounded pattern scan. Tidak mengimpor drizzle.testing.config atau menjalankan migrator pada checks ini.

## K. Read-Only Application Connectivity

**PASS**, 2026-10-10T13:21:31.262Z, child exit 0. Unchanged **src/db/client.ts createDatabase** memakai actual @tidbcloud/serverless + Drizzle HTTP, default fetch, debug/logger false, tanpa mock. SELECT 1 PASS; DATABASE() exact **courier_route_planner_testing**; CURRENT_USER matches intended app principal; self SHOW GRANTS expected. INFORMATION_SCHEMA menunjukkan 0 tabel. HTTPS path digunakan tanpa disabling certificate validation. No INSERT/UPDATE/DELETE/CREATE/ALTER/DROP.

Percobaan sandbox awal gagal pada koneksi karena DNS restriction. Control lookup endpoint Testing dan official PingCAP domain sama-sama ENOTFOUND dalam sandbox, lalu resolved di approved network execution. Check read-only di luar sandbox berhasil. Tidak menyebut kegagalan awal sebagai perubahan server atau migration failure.

## L. Read-Only Migrator Connectivity

**PASS**, 2026-10-10T13:21:36.785Z, child exit 0. Installed mysql2 memakai unchanged Testing guard dan **ssl.rejectUnauthorized: true**. Actual socket encrypted **true**, authorized **true**, protocol **TLSv1.3**. SELECT 1 PASS; DATABASE() exact target; CURRENT_USER matches intended migrator principal; self SHOW GRANTS expected; INFORMATION_SCHEMA 0 tabel. Tidak ada DDL, DML, Drizzle config import atau migration invocation. Initial sandbox ENOTFOUND ditangani melalui approved read-only network execution sebagaimana section K.

Batas metadata: SHOW GRANTS tidak mengekspos REQUIRE SSL. Optional admin metadata query untuk mysql.user.ssl_type gagal **Unknown column 'ssl_type' in 'where clause'**; tidak mengklaim server-side per-user SSL flag terverifikasi. Human melaporkan REQUIRE SSL dari private setup/correction; actual TLS certificate validation terbukti pada koneksi migrator, dan app memakai HTTPS. Tidak menampilkan SHOW CREATE USER/authentication hashes untuk melengkapi evidence ini.

## M. Pre-Migration Schema / Ledger

**PASS — EMPTY**, diperiksa lewat kedua dedicated credentials sesudah private setup. Query INFORMATION_SCHEMA.TABLES untuk exact database mengembalikan **0 rows**. Depots **absent**, __drizzle_migrations **absent**, unexpected user tables **0**. Tidak ada applied migration ledger yang dapat dibaca karena tabelnya belum ada. Admin metadata sebelumnya juga menunjukkan table_count 0. Tidak membuat application tables atau ledger secara manual. Immediate recheck dalam approved one-shot runner pada **2026-10-10T13:39:45.906Z** juga PASS: 0 tabel, depots absent, ledger absent; dedicated migrator identity/grants/TLS sesuai. Recheck ini selesai sebelum invocation start 2026-10-10T13:39:46.064Z.

## N. Migration Artifact Review

Final pure offline reader/artifact recheck tepat sebelum apply pada **2026-10-10T13:39:44.353Z** PASS; config tidak diimpor dan migrator tidak dijalankan.

Fresh offline review: satu migration `0000_dear_rictor`, journal idx 0, timestamp **1791072707266**. Snapshot dan source sama-sama memiliki sole depots table, delapan columns dan id primary key. SQL tidak berisi destructive/data mutation statements.

| Artifact | Raw bytes | SHA-256 current file |
| --- | ---: | --- |
| drizzle/0000_dear_rictor.sql | 341 | 64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577 |
| drizzle/meta/0000_snapshot.json | 2129 | 9d3a7d20deacbd8ab4e85b4fba5cbc0a51b787a3800969cffaafdbb23ddfe584 |
| drizzle/meta/_journal.json | 200 | 9e3ed23ec5e1bb4fbce6a8b4a3f06362cbd38f29ccbb428392fa20b4324578b8 |

Installed pure `readMigrationFiles` returns one statement and SQL hash **64a93fe...** matching the current UTF-8 file with 11 CRLF line endings. LF-normalized reference hash is **557fbc895d535904f390f99cc3cc7b41b7e0659c1b155b205c1987d8bdb9ba29**; it is not the current reader hash. Pure reader review tersebut tidak mengeksekusi migrator; artifacts direfreeze pada approved packet sebelum official apply yang dicatat di section P. File bytes/hash tetap dipertahankan.

RTK-wrapped `npm run db:check` PASS, exit 0, offline config, without private env. Actual Node v24.19.0, npm 11.6.0. Fresh offline quality pada salinan **217 public baseline files dengan identical source bytes**, existing installed node_modules copied, tanpa private env maupun inherited APP_ENV dan DATABASE_URL. Hasil: **lint, typecheck, test (10 files / 212 tests), db:check, build dan post-build typecheck PASS**, semua exit 0. Tidak melakukan npm ci, coverage atau audit ulang; jangan menyebutnya fresh full CI suite. Initial typecheck attempt gagal karena Windows sandbox menolak SWC canonicalize candidate baseUrl (Access is denied). Readback error mengidentifikasi environment restriction; command yang terhalang dan checks berikutnya berhasil dengan approved execution access, tanpa code change. Initial failure tetap dicatat pada evidence; tidak diklasifikasikan sebagai application defect. Verification selesai 2026-10-10T13:55:34.560Z.

## O. Human Migration Authorization

**RECORDED**: manusia menjawab exact **YES APPLY TESTING MIGRATION** pada permintaan Checkpoint B setelah pre-apply packet PASS. Approval hanya satu kali `npm run db:migrate:testing` pada Testing. Packet recording time **2026-10-10T13:39:46.060Z**; approved report SHA-256 **7d96687fb0c4dfbb402fa3c57f193115fd73992ff186ca5566a0b47818021281**. Immediate pre-apply rechecks untuk branch/refs/index, sealed source/skills, ignored files, distinct private roles, exact Testing target, empty schema/ledger dan exact artifact hashes PASS. Tidak menginfer approval dari Checkpoint A.

## P. Migration Apply

**PASS — invocation count exactly 1**.

| Item | Actual apply evidence |
| --- | --- |
| Command | npm run db:migrate:testing |
| Script | node --env-file=.env.migrations.testing.local ./node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.testing.config.ts |
| Target | APP_ENV testing / courier_route_planner_testing; dedicated migrator only |
| Start / end, UTC | 2026-10-10T13:39:46.064Z / 2026-10-10T13:39:54.896Z |
| Exit / success marker | 0 / migrations applied successfully observed |
| Invocation count | 1 |
| Second migration / manual equivalent / db:push | 0 / 0 / 0 |

RTK runner scrubbed inherited target/TLS bypass env sebelum Node memuat intended migration file. Marker durable dibuat sebelum process start, memakai exclusive-create dan menolak invocation kedua. Raw CLI output/errors disembunyikan; hanya safe exit/marker metadata dicatat. Official script/config/history tidak diubah. Drizzle membuat ledger dan depots, kemudian satu ledger row; post-live inspection membuktikan hasil di sections Q/R. Tidak ada retry/idempotence test. TiDB DDL dapat autocommit; failure pada migration berikutnya memerlukan STOP, read-only partial-state inspection dan separately approved remediation; [transaction overview](https://docs.pingcap.com/tidb/stable/transaction-overview/).

## Q. Post-Migration Ledger

**PASS**, 2026-10-10T13:41:18.224Z, dedicated migrator read-only. Exactly **1** `__drizzle_migrations` row: id **1**, hash **64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577**, created_at **1791072707266**. Hash sesuai installed reader terhadap current CRLF UTF-8 file; berbeda dari LF-normalized reference sebagaimana section N. Timestamp sesuai journal. Tidak ada ledger/manual row yang dibuat di luar official command.

## R. Live Schema Verification

**PASS**, actual information_schema COLUMNS/TABLES/STATISTICS read pada 2026-10-10T13:41:18.224Z. Hanya `depots` + `__drizzle_migrations`; application table count **1**, tanpa unexpected table. Source schema, reviewed SQL dan snapshot delapan columns cocok dengan live metadata.

| Column | Live type | Nullable | Default / key |
| --- | --- | --- | --- |
| id | bigint, signed | NO | no default; PRIMARY, auto_increment |
| name | varchar(255) | NO | no default |
| address | text | YES | NULL |
| latitude | double | NO | no default |
| longitude | double | NO | no default |
| is_active | tinyint(1), boolean mapping | NO | 1 |
| created_at | datetime(3) | NO | no DB default/on-update |
| updated_at | datetime(3) | NO | no DB default/on-update |

Sole depot index PRIMARY(id), unique; datetime precision **3**; boolean true default sesuai migration. UTC tetap application convention, tidak dibuktikan melalui write test. Tidak ada DDL/DML pada verification ini.

## S. Application Read Verification

**PASS**, 2026-10-10T13:41:18.357Z. Dedicated APPLICATION credential, unchanged `src/db/client.ts createDatabase`, actual @tidbcloud/serverless + Drizzle HTTP, unchanged `src/db/schema.ts depots` binding. ORM SELECT id FROM depots LIMIT 1 berhasil, **0 rows**; tidak membutuhkan admin/migrator credential. DATABASE/CURRENT_USER dan self grants diulang read-only; exact Testing identity dan app-only grant set tetap cocok. No INSERT/UPDATE/DELETE test.

## T. Health / Readiness

**PASS**, isolated local Testing server. Actual `npm run dev -- --port 3103 --hostname 127.0.0.1`, APP_ENV testing dengan dedicated APPLICATION private URL, inherited target env scrubbed sebelum intended file dimuat; NODE_ENV development dikelola untuk local dev server. No Vercel/production port.

| Endpoint | HTTP | Exact JSON | Cache-Control | Result |
| --- | --- | --- | --- | --- |
| GET /api/health | 200 | {"status":"ok"} | no-store | PASS |
| GET /api/ready | 200 | {"status":"ok"} | no-store | PASS |

Server verification 2026-10-10T13:42:24.874Z sampai 2026-10-10T13:42:45.810Z. Response keys/body cocok secara exact tanpa env/provider details. Captured server output dicek melalui presence-only private-value assertions, tidak diserialisasi; PASS. Server tree terminated dengan taskkill exit 0; process closed dan port 3103 closed terverifikasi.

Installed `next dev` sempat menambahkan automatic nextjs-agent-rules block pada AGENTS.md. Cause diverifikasi pada `node_modules/next/dist/server/lib/generate-agent-files.js`; hanya generated addition tersebut dihapus, dengan sealed SHA-256 equality untuk original bytes sebelum write. AGENTS.md kembali persis baseline; derived block/hash diregenerasi sesudah restoration. Tidak memakai Git restore atau mengubah instruksi manusia.

## U. Role Isolation

**PASS untuk intended role/credential isolation**. Kedua authenticated principals berbeda, decoded passwords berbeda, Testing DB/resource-prefix identity sama. App hanya SELECT/INSERT/UPDATE/DELETE; migrator hanya CREATE/SELECT/INSERT pada exact escaped DB scope. Self SHOW GRANTS tidak menunjukkan elevated global privileges atau GRANT OPTION; USAGE-only global row tidak diklasifikasikan sebagai elevated grant. Tidak melakukan write/denial/destructive tests. Batas observasi per-user server SSL flag dicatat pada section L; actual migrator TLS dan app HTTPS diverifikasi.

## V. Security / Secret Preservation

Agent resource Create **1**, confirmed CREATE DATABASE **1**, user/grant mutations **0** (human private setup), migration invocation **1**, Production/Vercel/Git mutations **0**. Admin credential tetap human-only dan tidak dibaca/disalin. Private app/migrator env dimuat hanya ke memori untuk target validation dan koneksi; username/password/host/full URL tidak dicetak/diserialisasi. Source/config/tests/package/lock/workflow/migration artifacts dan known human changes dipertahankan; AGENTS automatic dev block dikembalikan ke exact baseline sebagaimana T. Final safety check setelah independent review pada 2026-10-10T14:04:08.343Z **PASS**: 203 baseline files di luar approved docs/human change tetap identik, 424 skill files preserved, ignored private files, refs/index/diff check sesuai, artifacts unchanged, bounded report patterns **0 potential secrets**, exact private values absent dari seluruh **15 task outputs**. Credential-bearing raw errors/server outputs disembunyikan. Scanner sempat menandai generic env-name/colon pada quality prose sebagai possible assignment. Exact private-value assertions sudah PASS sebelum pattern check; prose diperjelas tanpa mengurangi scanner. Fresh bounded scan kemudian PASS. Report finalized setelah independent review; final scan/preservation command diulang terhadap current final content. Safe evidence/screenshot berada di luar Git.

## W. Documentation Sync

**SYNCED AFTER LIVE PASS**: README.md; docs/04_TECH_STACK_ADRS.md; docs/08_DATABASE_DESIGN.md; docs/09_REPO_STRUCTURE.md; docs/12_CI_CD_RELEASE.md; docs/07_TIDB_GUIDE.md; docs/10_ENVIRONMENTS_SECRETS.md; docs/14_TESTING_QA.md; docs/17_SETUP_FROM_ZERO.md; docs/18_ROADMAP_BACKLOG.md; docs/19_DEFINITION_OF_DONE.md; docs/23_PHASE_GATES_CHECKLISTS.md.

State: Phase 0C CLOSED; Testing PROVISIONED, migration APPLIED ONCE, Testing live verification PASS; Production NOT PROVISIONED; Vercel NOT CONNECTED; Phase 0D OPEN; Gate 1 OPEN; main behavioral proof DEFERRED. Exact target/role/private-env/one-shot history dan raw-vs-normalized hash relation tercatat. Full multi-environment Database DoD tetap pending. Historical process reports tidak diubah. Application/test/package/config/workflow/migration code tidak diubah.

## X. MASTER / MANIFEST

**PASS**. Existing ordered-source derivation dipakai: LF normalization, repository-root rebased relative links, trimEnd + one LF. MASTER warning/source precedence retained; regeneration date 2026-10-10. Scope tetap **45 MASTER source blocks / 46 MANIFEST entries**, process reports excluded. Actual-byte SHA-256 dan sizes dihitung ulang.

Fresh verifier 2026-10-10T14:02:16.574Z: **0 missing, 0 size mismatch, 0 hash mismatch, 0 material parity mismatch, 0 broken local derived links**; 49 unique local links diperiksa termasuk Markdown fragments. Ini bounded inline/local-link verification, bukan exhaustive external-link/renderer test.

## Y. Independent Review

**PASS — fresh-context independent reviewer** `/root/phase0d3b_final_reviewer`, dispatched with no inherited transcript. Review result recorded 2026-10-10 14:04:03 UTC. Reviewed task/AGENTS, current docs/report diff, safe connection/approval/apply/ledger/schema/health evidence and harness source. Recomputed migration artifact bytes/hashes; checked refs, index empty, diff check and independently verified derived pack through an in-memory read-only verifier. Follow-up reviewed final one-line docs/08 state correction and regenerated derived pack.

**0 unresolved Critical, 0 Important, 0 Minor findings**. Review supports Testing physical isolation, dedicated role/password separation, exact escaped grants, pre-apply empty state, explicit human approval, actual single invocation, ledger raw hash/timestamp, live schema/app read, health/readiness and server termination, private files/secret preservation and accurate Phase 0D/Gate 1 status.

Reviewer declined live SQL, migration reruns, credential inspection, server/tests/provisioning, Production/Vercel and Git mutation because review was read-only. These remain outside reviewer scope. Review PASS does not authorize merge or further operations; parent completed final report/preservation scan after review.

## Z. Remaining Phase 0D Work

Phase 0D tetap OPEN: Vercel Preview integration/environment scope/DB isolation, controlled Production foundation/tooling, real main behavioral proof pada testing → main promotion, second-member reproduction dan Gate 1 review masih memerlukan task/authorization lanjutan. Phase 0C tetap CLOSED. Current task **STOP** setelah independent review/final report; tidak melakukan Git integration, Production atau Vercel.

Risks/limits: Starter spending limit 0 dapat menolak workload ketika free quota habis; physical isolation/read-only grants terverifikasi tetapi server-side per-user REQUIRE SSL flag tidak tersedia pada metadata yang dicoba (section L). Actual migrator TLS certificate validation PASS. DML/CRUD, deployment isolation, rollback dan Production behavior belum diuji pada task ini. Private files tetap perlu disimpan manusia dengan aman dan migration berikutnya memerlukan reviewed history/approval baru.

## AA. Recommendation

**READY FOR PHASE 0D-4 — VERCEL PREVIEW INTEGRATION**.

| Item | Actual evidence |
| --- | --- |
| Testing resource / distinct from Dev | VERIFIED / YES |
| Logical DB | courier_route_planner_testing |
| Application / migrator roles | VERIFIED / VERIFIED |
| Pre-migration empty state | PASS; 0 tables, ledger absent |
| Human provisioning / migration approvals | RECORDED / RECORDED |
| Migration invocation | exactly 1; exit 0 |
| Ledger / schema parity | PASS / PASS |
| Application read | PASS; 0 rows |
| GET health / ready | PASS / PASS; 200, exact minimal JSON, no-store |
| Private env / credentials | ignored, separate; values suppressed |
| MASTER / MANIFEST | PASS; zero mismatches/broken local derived links |
| Secret scan / private values absent from outputs | PASS / PASS |
| Offline lint/typecheck/test/db:check/build | PASS; 10 files / 212 tests |
| Independent review | PASS; 0 unresolved Critical/Important/Minor |

Fresh-context review dan final safety PASS. Recommendation: **READY FOR PHASE 0D-4 — VERCEL PREVIEW INTEGRATION**. Ini recommendation tahap berikutnya; tidak mengotorisasi Vercel, Production, Git mutation atau migration kedua. STOP setelah final report.
