# 08 — DATABASE DESIGN

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
                  └──< experiments
                          │
                          └──< experiment_runs
                                  │
                                  └──< experiment_route_points
```

## 3. `depots`

```text
id BIGINT PK
name VARCHAR
address TEXT NULL
latitude DECIMAL/DOUBLE
longitude DECIMAL/DOUBLE
is_active BOOLEAN
created_at DATETIME
updated_at DATETIME
```

Constraints:

- valid coordinate range;
- name non-empty.

## 4. `scenarios`

Editable working dataset.

```text
id BIGINT PK
depot_id BIGINT FK
name VARCHAR
distribution_pattern VARCHAR
customer_count INT
radius_min_m INT NULL
radius_max_m INT NULL
generation_seed BIGINT NULL
status VARCHAR
created_at
updated_at
```

`customer_count` dapat dihitung dari orders, tetapi disimpan hanya jika diperlukan untuk config generator; actual count harus tetap diverifikasi dari rows.

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

`input_hash` dibuat dari canonical serialized depot+customer snapshots + relevant metric configuration.

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

## 8. `experiments`

Satu konfigurasi algoritma terhadap satu benchmark case.

```text
id BIGINT PK
benchmark_case_id BIGINT FK
algorithm VARCHAR
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

## 9. `experiment_runs`

```text
id BIGINT PK
experiment_id BIGINT FK
run_number INT
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

Unique:

```text
UNIQUE(experiment_id, run_number)
```

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

## 13. Cascade behavior

Jangan asal `ON DELETE CASCADE` pada history eksperimen.

Rekomendasi:

- deleting scenario yang sudah memiliki benchmark history → soft delete/archive atau block;
- benchmark cases → preserve;
- experiment results → preserve.

## 14. Data retention

Dev/testing boleh reset. Production research history jangan dihapus tanpa backup/export dan approval.
