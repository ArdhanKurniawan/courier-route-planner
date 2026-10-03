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

Phase 0B menyediakan app-only `GET /api/health`; APP_ENV dibaca dan divalidasi saat invocation. Import/typegen/build tidak membutuhkan APP_ENV atau DB credential.

| Kondisi | HTTP | Exact JSON |
|---|---:|---|
| APP_ENV exact development/testing/production | 200 | `{"status":"ok"}` |
| APP_ENV missing/invalid | 503 | `{"status":"error"}` |

Keduanya application/json dan `Cache-Control: no-store`. Hanya AppEnvValidationError yang dipetakan ke 503; unexpected exception diteruskan ke framework. Route memakai native Response.json dan default request-time GET behavior Next 16.3.6, tanpa dynamic/revalidate/runtime exports atau custom HEAD/OPTIONS.

Health menunjukkan app liveness + config validity lokal. Tidak mengecek DB, network/provider, filesystem, auth/session atau deployment. Tidak mengirim env, app name, timestamp/version, credential, host/path, error detail atau stack. DB readiness tetap pekerjaan Phase 0C; deployment/isolation evidence Phase 0D. Local env workflow: [setup Phase 0B](17_SETUP_FROM_ZERO.md#phase-0b--local-env--app-only-health).

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
