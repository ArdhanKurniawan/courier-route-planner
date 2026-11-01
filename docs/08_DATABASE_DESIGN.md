# 08 — DATABASE DESIGN

**Current source status — 2026-10-31:** Phase 1B Scenario CRUD selesai lokal. Migration `0001_scenarios` Development dan Testing beserta schema/FK/index verification PASS berdasarkan evidence apply terpisah yang sudah diterima; ini bukan koneksi atau apply ulang pada penyelarasan dokumentasi ini. Development browser QA 8/8 owner-observed, offline 548/548 dan live integration rerun 1/1 PASS; batas receipt/cleanup tercatat di [Testing QA](14_TESTING_QA.md#18-scenario-integration-rerun--actual-evidence-2026-10-31). Production migration 0001 dan release acceptance masih pending. Gate 1 CLOSED; Gate 2 OPEN. Paragraf foundation di bawah adalah snapshot historis sebelum implementasi Scenario.

**Conceptual target design only.** Pengecualian aktual: **depots saja** di `src/db/schema.ts` dan generated migration `drizzle/0000_dear_rictor.sql`, offline independently verified dan sudah diterapkan sekali pada Dev, Testing (approved 0D-3B), serta Production (approved Checkpoint B, 2026-10-11). Dev LIVE/established; Testing LIVE/migrated once/verified; Production LIVE pada independent Starter, migration invocation 1/retry 0/exit 0. Read-only evidence setiap environment memastikan delapan kolom, PK/index dan masing-masing satu ledger entry cocok dengan source/SQL; BOOLEAN direpresentasikan TiDB sebagai `tinyint(1)` default 1. Production memiliki tepat `depots` dan runner ledger `__drizzle_migrations`, depots row count 0. Semua tabel/relasi lain tetap future conceptual target. Sinkronisasi 2026-10-02 menambahkan frozen matrix storage; Editable Scenario → Immutable Benchmark Case tetap dipertahankan. Phase 0C CLOSED/final independent verification PASS; Vercel NOT integrated/Preview preflight NOT READY; main foundation promotion belum dilakukan/main behavior deferred; Phase 0D/Gate 1 OPEN. [Dev evidence](proses/phase-0/0c/PHASE_0C_DEV_LIVE_VERIFICATION_REPORT.md); [Testing evidence](proses/phase-0/0d/PHASE_0D_TIDB_TESTING_LIVE_FOUNDATION_REPORT.md); [Production evidence](proses/phase-0/0d/PHASE_0D_TIDB_PRODUCTION_LIVE_FOUNDATION_REPORT.md). Closure hanya memakai evidence tersimpan, tanpa DB connection atau migration baru.

## 1. Design goals

- simple untuk tim S1;
- menjaga history eksperimen;
- editable operational scenario;
- immutable benchmark snapshot;
- reproducible research;
- tidak over-normalized.

## 2. Conceptual ERD

```text
depots
  │
  └──< scenarios
          │
          └──< orders
          │
          └──< benchmark_cases
                  │
                  └──< benchmark_case_points
                  │
                  └──< distance_matrices (immutable; referenced by experiments)
                  │
                  └──< experiments
                          │
                          └──< experiment_runs
                                  │
                                  └──< experiment_route_points
```

## 3. `depots`

```text
id BIGINT AUTO_INCREMENT PK NOT NULL
name VARCHAR(255) NOT NULL
address TEXT NULL
latitude DOUBLE NOT NULL
longitude DOUBLE NOT NULL
is_active BOOLEAN NOT NULL DEFAULT true
created_at DATETIME(3) NOT NULL
updated_at DATETIME(3) NOT NULL
```

Stage 1 actual contract:

- ID server-side bigint; future client/API serializes decimal string, tanpa arbitrary Number conversion.
- Timestamp UTC-by-convention, explicit future application values, tanpa DB timestamp default/on-update.
- Hanya PK; tanpa seed, FK, extra index, unique/global active-depot constraint atau coordinate CHECK.
- Coordinate range dan non-empty name adalah future mutation/Zod concern; belum ada CRUD.

## 4. `scenarios`

Editable working dataset. Source Phase 1B memakai sebelas kolom di bawah; tabel selain `depots`/`scenarios` pada dokumen ini tetap conceptual target.

```text
id BIGINT AUTO_INCREMENT PK NOT NULL
depot_id BIGINT NOT NULL FK depots.id ON DELETE RESTRICT ON UPDATE RESTRICT
name VARCHAR(255) NOT NULL
distribution_pattern VARCHAR(32) NOT NULL
customer_count INT NOT NULL
radius_min_m INT NULL
radius_max_m INT NULL
generation_seed BIGINT NULL
status VARCHAR(32) NOT NULL DEFAULT 'draft'
created_at DATETIME(3) NOT NULL
updated_at DATETIME(3) NOT NULL
```

`customer_count` adalah configured count, bukan actual Order count; Phase 1B belum membuat Orders. Count/radius integer 0–2147483647 (batas storage, bukan pembatasan desain eksperimen); kedua radius non-null wajib min ≤ max, null berarti unspecified. Pattern: random/clustered/circular/directional; seed nullable signed BIGINT, id/seed memakai decimal string pada API tanpa Number conversion. Status hanya `draft`, diset server dan tidak dapat diubah klien; freeze/transisi ditunda.

Index `scenarios_depot_id_idx` mendukung FK. Create/pergantian depot memerlukan depot aktif melalui conditional insert/update atomik; depot lama yang kemudian nonaktif boleh dipertahankan saat edit. FK mencegah penghapusan depot yang direferensikan. Scenario tanpa child boleh dihapus secara fisik; future Order/benchmark migrations wajib memakai relasi RESTRICT nyata dan proof tersendiri, tanpa cascade atau fabricated history precheck.

Migration `drizzle/0001_scenarios.sql`, snapshot baru dan journal append disiapkan offline, tidak mengubah migration 0000 atau tabel depots. Sebelum live apply: owner mereview target/history, grants migrator, urutan CREATE → FK → index dan approval per environment. DDL dapat berhasil parsial; bila gagal/ambigu STOP, inspeksi state dengan approval baru, tanpa retry otomatis atau drop data. Mitigasi setelah apply adalah rollback release aplikasi yang belum memakai Scenario; jangan drop tabel berisi data sebagai rollback otomatis. Application credential tetap scoped CRUD; tidak digunakan untuk DDL.

## 5. `orders`

```text
id BIGINT PK
scenario_id BIGINT FK
order_code VARCHAR
customer_name VARCHAR
address TEXT NULL
latitude DECIMAL/DOUBLE
longitude DECIMAL/DOUBLE
source VARCHAR  -- dummy/manual
created_at
updated_at
```

Unique recommendation:

```text
UNIQUE(scenario_id, order_code)
```

## 6. `benchmark_cases`

Immutable snapshot metadata.

```text
id BIGINT PK
scenario_id BIGINT FK
name VARCHAR
input_hash CHAR(64)
distance_metric VARCHAR
distance_metric_version VARCHAR
coordinate_method VARCHAR
point_count INT
created_by BIGINT NULL
frozen_at DATETIME
git_commit_sha VARCHAR NULL
notes TEXT NULL
```

`input_hash` dibuat dari canonical serialized ordered depot+customer snapshots + relevant input configuration sesuai [docs/34](34_OSRM_DISTANCE_CONTRACT.md). Formal distance_metric adalah OSRM road-network distance, canonical meter; coordinate_method mencatat input geographic coordinates dan routability procedure, bukan raw-degree Cartesian distance.

## 7. `benchmark_case_points`

Snapshot input, tidak berubah walau order diedit.

```text
id BIGINT PK
benchmark_case_id BIGINT FK
source_order_id BIGINT NULL
point_role VARCHAR  -- depot/customer
point_key VARCHAR
customer_name_snapshot VARCHAR NULL
address_snapshot TEXT NULL
latitude_snapshot DECIMAL/DOUBLE
longitude_snapshot DECIMAL/DOUBLE
sort_key INT
```

Rules:

- tepat satu depot snapshot;
- customer snapshot unik berdasarkan point key;
- row tidak diedit setelah freeze.
- sort_key/node order menetapkan depot index 0 dan customer indices 1..n secara stabil.

## 7A. `distance_matrices`

Frozen road-network matrix milik satu benchmark case:

```text
id BIGINT PK
benchmark_case_id BIGINT FK
provider VARCHAR
profile VARCHAR
node_order_json JSON
distance_matrix_json JSON
input_hash CHAR(64)  -- coordinate/input hash, sama dengan benchmark case
matrix_hash CHAR(64)
generated_at DATETIME
```

Metadata pendamping perlu merekam unit=meter, directed semantics, serialization/contract version, provider request options, original/snapped-coordinate evidence, serta OSRM/network version/extract provenance bila tersedia. Detail penyimpanan metadata ditetapkan saat task schema; jangan menganggap informasi unavailable sebagai known.

Rules: NxN termasuk depot, diagonal zero, finite nonnegative values, no null/unreachable; no symmetry requirement. Common ACO eligibility mengikuti docs/33. Snapshot/hash bersifat immutable. Matrix regeneration menciptakan row/snapshot baru, tidak mengubah history. Jangan menghitung ulang matrix lama lewat OSRM pada saat replay benchmark.

## 8. `experiments`

Satu konfigurasi algoritma terhadap satu benchmark case.

```text
id BIGINT PK
benchmark_case_id BIGINT FK
algorithm VARCHAR
distance_matrix_id BIGINT FK
matrix_hash CHAR(64)
algorithm_version VARCHAR
parameters_json JSON
planned_run_count INT
status VARCHAR
best_distance_m DOUBLE NULL
mean_distance_m DOUBLE NULL
median_distance_m DOUBLE NULL
stddev_distance_m DOUBLE NULL
mean_execution_time_ms DOUBLE NULL
created_at
completed_at NULL
```

Algorithm initial values:

```text
NN_2OPT
ACO
```

Application wajib memastikan distance_matrix_id milik benchmark_case_id yang sama dan recorded matrix_hash sesuai content. Experiments NN_2OPT dan ACO yang dibandingkan mereferensikan matrix snapshot/hash yang sama. Node mapping diperiksa terhadap benchmark_case_points; FK ID saja tidak membuktikan fairness.

parameters_json menyimpan seluruh explicit ACO configuration, PRNG/version dan run policy. Calibration/evaluation case identities harus terpisah pada experiment metadata. Planned formal counts: 30 ACO measured runs dan 30 NN_2OPT timing repetitions; satu deterministic route quality NN cukup. Catat 5 warm-ups secara terpisah dari measured results dan tandai run role bila disimpan. Jangan menghitung warm-up sebagai measured run.

## 9. `experiment_runs`

```text
id BIGINT PK
experiment_id BIGINT FK
run_number INT
run_role VARCHAR  -- measured/warmup
attempt INT  -- starts at 1; append on retry, never overwrite
random_seed BIGINT NULL
status VARCHAR
total_distance_m DOUBLE NULL
execution_time_ms DOUBLE NULL
iteration_count INT NULL
route_hash CHAR(64) NULL
error_code VARCHAR NULL
error_message TEXT NULL
started_at
completed_at NULL
```

`iteration_count` adalah optional diagnostic ACO yang memetakan `diagnostics.iterationsCompleted` sesuai [docs/33](33_ALGORITHM_SPECIFICATION.md#6-output-and-routevalidator); untuk NN_2OPT tetap NULL. Jangan menyimpan twoOptPasses atau acceptedImprovements sebagai iteration_count. Penyimpanan diagnostic lain ditetapkan hanya bila diperlukan pada task schema.

Unique:

```text
UNIQUE(experiment_id, run_role, run_number, attempt)
```

run_number mengidentifikasi planned run dalam role-nya. Retry run measured #7 tetap memakai run_number=7 dan predetermined seed yang sama, dengan attempt baru; record failed sebelumnya dipertahankan. Export menyertakan role/attempt, dan summary hanya memakai satu resolved successful attempt per planned measured run, bukan menghitung retries sebagai tambahan sample. Attempt selection/resolution dan alasan rerun dicatat. Warm-up memakai role tersendiri jika dipersist; tidak masuk planned measured count atau statistik. Ini klarifikasi conceptual storage untuk retention policy, bukan migration aktual atau schema benchmark_batches baru.

Simpan semua successful, poor-valid, failed/interrupted run records beserta predetermined seed dan failure reason. Failure tidak diberi distance/time nol palsu. Ringkasan dapat direkomputasi dari raw runs: quality mean/median/best/worst/SD/range/CV dan timing mean/median/SD. Field ringkasan tambahan boleh dihitung dari raw data; tidak memerlukan pemaksaan tabel besar baru.

## 10. `experiment_route_points`

```text
id BIGINT PK
experiment_run_id BIGINT FK
sequence_number INT
benchmark_case_point_id BIGINT FK
distance_from_previous_m DOUBLE NULL
created_at
```

Closed tour dapat direkonstruksi dari sequence.

## 11. Optional `users`

Tambahkan saat auth diaktifkan.

Jangan implement custom password auth asal-asalan hanya untuk mengejar fitur.

## 12. Immutable research rule

Dilarang:

```text
update benchmark_case_points set latitude = ...
```

Jika input berubah, buat **benchmark case baru**.

Frozen distance_matrices juga tidak boleh di-update atau cascade-delete bersama editable orders. Experiment harus tetap dapat merekonstruksi route + exact directed matrix, termasuk return edge.

## 13. Cascade behavior

Jangan asal `ON DELETE CASCADE` pada history eksperimen.

Rekomendasi:

- deleting scenario yang sudah memiliki benchmark history → soft delete/archive atau block;
- benchmark cases → preserve;
- experiment results → preserve.

## 14. Data retention

Dev/testing boleh reset. Production research history jangan dihapus tanpa backup/export dan approval.

## 15. Optional future consideration

`benchmark_batches` boleh dievaluasi nanti untuk pengelompokan eksperimen. Bukan schema wajib yang telah disetujui dan tidak menggantikan scenario/case/matrix/experiment boundaries. Tidak ada actual migration pada task documentation sync.
