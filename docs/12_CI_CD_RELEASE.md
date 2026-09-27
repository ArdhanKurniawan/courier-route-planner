# 12 — CI/CD & RELEASE

## 1. Separation of responsibility

**GitHub Actions:** quality gate.  
**Vercel Git Integration:** deployment.

Jangan duplikasi deployment melalui Actions tanpa kebutuhan khusus.

## 2. CI triggers

Minimal:

- pull request ke `testing`;
- pull request ke `main`.

Optional push check pada `testing`/`main`.

## 3. CI stages

```text
checkout
→ setup Node 24
→ npm ci
→ lint
→ typecheck
→ unit/integration tests
→ build
```

Tambahkan Playwright terpisah ketika E2E stabil.

## 4. Required npm scripts

Target:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "e2e": "playwright test"
  }
}
```

Sesuaikan dengan tooling actual hasil bootstrap.

## 5. Deploy model

```text
feature branch → Vercel Preview
 testing       → Vercel Preview stable branch
 main          → Vercel Production
```

## 6. Database migration in deploy

Jangan otomatis menjalankan destructive migration pada setiap Preview build.

Policy awal:

- dev migrations manual/controlled;
- testing migration setelah review;
- production migration sebagai release step terencana.

Setelah tim matang, automation dapat ditambah dengan ADR.

## 7. Release checklist

Sebelum testing → main:

- [ ] CI green;
- [ ] QA checklist green;
- [ ] migration applied to testing;
- [ ] UAT/smoke testing selesai;
- [ ] no open blocker;
- [ ] backup/export bila migration risky;
- [ ] environment variables verified;
- [ ] production domain known;
- [ ] rollback path known.

## 8. Post-deploy smoke

Minimal:

1. home/dashboard load;
2. health endpoint;
3. DB read;
4. safe write/read/delete on production demo data bila sesuai;
5. map render;
6. run small NN+2Opt scenario;
7. run small ACO scenario;
8. verify no console/server critical error.

## 9. Rollback principle

Code rollback di Vercel relatif mudah melalui previous deployment/revert commit. Database rollback **tidak otomatis**.

Karena itu schema change harus backward-compatible sebisa mungkin.

Recommended expand/contract:

```text
add new column
→ deploy code supporting both
→ migrate data
→ switch reads
→ later remove old column
```
