# 10 — ENVIRONMENTS & SECRETS

## 1. Environment matrix

| Environment | Code | DB | Tujuan |
|---|---|---|---|
| Local | developer branch | TiDB Dev | coding |
| Preview | feature/fix/testing | TiDB Testing | review/integration |
| Production | main | TiDB Production | demo/live |

## 2. Required environment variables

Initial:

```text
DATABASE_URL=
APP_ENV=development|testing|production
```

Future auth:

```text
AUTH_SECRET=
GITHUB_ID=
GITHUB_SECRET=
```

Optional:

```text
NEXT_PUBLIC_APP_NAME=Courier Route Planner
```

## 3. Rules

- `.env.local` never commit.
- `.env.example` commit, **tanpa nilai secret**.
- `DATABASE_URL` tidak pernah prefix `NEXT_PUBLIC_`.
- production credential hanya Production scope.
- Preview menggunakan testing DB credential.
- dev laptop menggunakan dev DB credential.

## 4. `.env.example`

```dotenv
DATABASE_URL=mysql://USER:PASSWORD@HOST/DATABASE
APP_ENV=development
NEXT_PUBLIC_APP_NAME=Courier Route Planner
```

## 5. Secret rotation

Rotate jika:

- tercommit;
- muncul di screenshot/public chat;
- anggota tim keluar;
- device hilang;
- dicurigai bocor.

Setelah rotate:

1. update TiDB credential;
2. update Vercel env;
3. update local developer secrets;
4. redeploy;
5. revoke old credential;
6. document incident.

## 6. Prevent accidental production access

Server startup/health diagnostics harus mengetahui `APP_ENV`.

Tambahkan guard pada script destructive seed/reset:

```text
if APP_ENV === production → ABORT
```

Script reset database production harus tidak tersedia atau membutuhkan explicit double confirmation.

## 7. Preview DB collision

Semua feature Preview memakai TiDB Testing secara default. Untuk menghindari collision:

- gunakan test data dengan prefix/owner;
- jangan truncate global table dari preview;
- migration coordinated via testing branch;
- feature yang butuh incompatible schema harus ditunda merge atau memakai temporary TiDB instance bila quota memungkinkan.
