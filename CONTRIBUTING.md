# CONTRIBUTING.md

## Branch policy

- `main`: live/production-demo.
- `testing`: integration/testing branch.
- `feature/*`: fitur baru, dibuat dari `testing`.
- `fix/*`: bug non-production, dibuat dari `testing`.
- `hotfix/*`: bug kritis production, dibuat dari `main`.
- `chore/*`: tooling/docs/maintenance.

## Normal flow

```text
testing
  ↓
feature/* / fix/* / chore/*
  ↓
Pull Request
  ↓
testing
  ↓
integration test / QA
  ↓
Pull Request
  ↓
1 human approval
  ↓
main
```

## Aturan commit

Gunakan commit kecil dan fokus. Format yang dianjurkan:

```text
feat: add depot CRUD
fix: prevent duplicated route customer
refactor: extract distance matrix service
test: add two-opt invariant tests
docs: update TiDB setup guide
chore: configure lint script
```

## PR minimum

PR wajib memiliki:

- tujuan;
- scope;
- perubahan utama;
- screenshot untuk UI;
- evidence test;
- migration note jika DB berubah;
- risk;
- rollback note jika relevan.

Gunakan `templates/PULL_REQUEST_TEMPLATE.md`.

## Sebelum buka PR

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Jangan mengandalkan “jalan di laptop saya”.

## Review rule

Reviewer mengecek:

1. correctness;
2. scope creep;
3. security;
4. test coverage yang masuk akal;
5. schema/migration safety;
6. UX regression;
7. algorithm invariants jika menyentuh routing;
8. tidak ada secret.

## Approval policy

### Pull Request ke `testing`

Tujuan `testing` adalah integration/testing branch.

Ketentuan:

- Pull Request wajib;
- human approval tidak diwajibkan;
- author tetap wajib melakukan self-review pada tab **Files changed** sebelum merge;
- seluruh automated CI checks wajib lulus setelah workflow CI tersedia;
- PR tidak boleh mengandung secret, credential, `.env`, atau perubahan di luar scope.

### Pull Request ke `main`

`main` adalah production/release branch.

Ketentuan:

- Pull Request wajib;
- minimal **1 human approval** wajib;
- author Pull Request tidak boleh menggantikan approval reviewer lain;
- approval lama harus dianggap tidak berlaku ketika terdapat commit baru yang mengubah PR;
- push terbaru harus sudah termasuk dalam review;
- seluruh unresolved review conversations harus diselesaikan sebelum merge;
- automated CI checks wajib lulus setelah workflow CI tersedia;
- merge hanya dilakukan setelah QA/release verification selesai.

## Merge strategy

Untuk tim kecil, gunakan **Squash and Merge** agar history `testing`/`main` bersih, kecuali ada alasan teknis menyimpan commit terpisah.

## Hotfix

```text
main → hotfix/... → PR main → deploy → sinkronkan kembali ke testing
```

Jangan memperbaiki production hanya di `main` lalu lupa membawa perubahan ke `testing`.


## Protected branch safety

- Jangan commit/push langsung ke `main` atau `testing`.
- Aktifkan repository hooks dengan `git config core.hooksPath .githooks` setelah hooks tersedia.
- Semua perubahan masuk melalui PR sesuai `docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md`.
