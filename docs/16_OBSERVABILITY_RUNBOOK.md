# 16 — OBSERVABILITY & RUNBOOK

## 1. Goals

Saat error, tim harus dapat menjawab:

- request apa gagal?
- environment mana?
- commit/deployment mana?
- operasi apa?
- apakah DB/algorithm/UI?
- user-safe impact apa?

## 2. Logging baseline

Gunakan structured logging di server.

Recommended fields:

```text
timestamp
environment
event
request_id
user_id (jika ada, non-sensitive)
scenario_id
benchmark_case_id
experiment_id
algorithm
error_code
```

Jangan log:

- DATABASE_URL;
- OAuth secret;
- full auth token;
- password;
- sensitive cookies.

## 3. Error taxonomy

Contoh:

```text
VALIDATION_ERROR
AUTH_REQUIRED
NOT_FOUND
DB_ERROR
ALGORITHM_INVALID_ROUTE
ALGORITHM_PARAMETER_ERROR
BENCHMARK_INPUT_MISMATCH
RESOURCE_LIMIT_EXCEEDED
```

## 4. Health endpoint

`/api/health` minimal mengembalikan app status tanpa membocorkan secret.

Boleh memisahkan:

- liveness: app process berjalan;
- readiness: DB connectivity bila perlu.

Production health response jangan expose raw DB host/credential.

## 5. Incident response

Jika production gagal:

1. jangan panik-edit production langsung;
2. identifikasi deployment terakhir;
3. cek logs;
4. tentukan code issue vs DB issue vs env issue;
5. rollback code bila aman;
6. jangan rollback DB sembarang;
7. buat hotfix branch bila diperlukan;
8. dokumentasikan cause dan prevention.

## 6. Common incidents

### Deployment build fails

- dependency lock mismatch;
- Node mismatch;
- type error;
- env needed at build missing.

### Runtime DB error

- wrong environment variable;
- credential expired/reset;
- instance unavailable/quota;
- unsupported SQL/migration mismatch.

### Algorithm returns invalid route

Immediately fail request/run and keep evidence. Do not “repair” silently unless repair algorithm is explicit part of method.
