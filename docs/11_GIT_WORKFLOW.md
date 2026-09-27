# 11 — GIT WORKFLOW

## 1. Branch model

```text
main        = production
 testing    = integration/staging-like preview
 feature/*  = fitur
 fix/*      = bug biasa
 hotfix/*   = bug production kritis
 chore/*    = tooling/docs
```

## 2. Create feature

```bash
git checkout testing
git pull origin testing
git checkout -b feature/depot-crud
```

## 3. Daily sync

Jika `testing` berubah banyak:

```bash
git fetch origin
git rebase origin/testing
```

atau merge sesuai kemampuan tim. Tim harus memilih satu gaya dan konsisten. Untuk pemula, merge `origin/testing` ke feature lebih mudah dipahami tetapi history lebih ramai.

## 4. Feature flow

```text
feature/x
→ push feature branch
→ Vercel Preview
→ Pull Request ke testing
→ automated CI checks
→ author self-review
→ merge
→ testing integration/QA
```

## 5. Release flow

```text
testing
→ freeze release candidate
→ full QA/UAT
→ Pull Request testing → main
→ automated CI checks
→ minimum 1 human approval
→ resolve all review conversations
→ merge
→ Vercel Production
→ production smoke test
```

## 6. Hotfix

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-name
```

Setelah merge ke main, sinkronkan hotfix ke testing.

## 7. Branch naming examples

```text
feature/dummy-generator
feature/leaflet-map
feature/nearest-neighbor
feature/two-opt
feature/aco
fix/route-duplicate-customer
hotfix/prod-env-misconfiguration
chore/update-docs
```

## 8. No direct push policy

**Mandatory:**

- `main`: no direct commit / no direct push;
- `testing`: no direct commit / no direct push;
- feature/fix/hotfix/chore branches: direct push allowed;
- protected branches hanya berubah melalui Pull Request.

Perlindungan tidak boleh hanya menjadi aturan lisan. Wajib gunakan layered protection:

1. GitHub branch protection/ruleset jika tersedia pada plan;
2. local `pre-commit` guard untuk memblok commit pada `main`/`testing`;
3. local `pre-push` guard untuk memblok push yang menargetkan `main`/`testing`;
4. CI required checks;
5. Vercel Production Branch hanya `main`.

Panduan implementasi, recovery, dan acceptance test lengkap:

```text
docs/31_BRANCH_PROTECTION_AND_PUSH_GUARDS.md
```

## 8.1 Branch review policy

| Target branch | Pull Request | Human approval | Direct push | CI |
|---|---|---:|---|---|
| `testing` | Required | Not required | Prohibited | Required setelah CI tersedia |
| `main` | Required | Minimum 1 | Prohibited | Required setelah CI tersedia |

Tujuan kebijakan ini:

- `testing` tetap cepat sebagai integration branch;
- setiap perubahan tetap memiliki jejak Pull Request;
- `main` memiliki human gate sebelum perubahan menjadi production release;
- automated checks tidak menggantikan human review pada `main`.

## 9. Commit policy

Commit harus menjawab satu ide perubahan.

Bad:

```text
update project
fix all
final
```

Good:

```text
feat: add scenario creation validation
test: cover closed-tour route invariants
fix: prevent production DB usage in preview
```

## 9.1 Merge strategy

Gunakan strategi berikut:

| Source | Target | Strategy |
|---|---|---|
| `feature/*` | `testing` | Squash and Merge |
| `fix/*` | `testing` | Squash and Merge |
| `chore/*` | `testing` | Squash and Merge |
| `testing` | `main` | Merge Commit |
| `hotfix/*` | `main` | Merge Commit atau strategi yang menjaga sinkronisasi dengan `testing` |

Untuk long-lived branch `testing` dan `main`, hindari Squash and Merge pada release PR `testing → main`, karena ancestry branch perlu dipertahankan agar release berikutnya tetap bersih.

## 10. Pull request rule

Tidak merge bila:

- CI merah setelah CI workflow tersedia;
- migration yang berisiko belum diperiksa;
- preview tidak bisa dibuka untuk perubahan yang membutuhkan preview;
- acceptance criteria belum lulus;
- terdapat secret atau credential;
- algorithm tests gagal pada perubahan routing;
- scope PR bercampur dengan pekerjaan lain yang tidak relevan.

Tambahan khusus PR menuju `main`:

- belum memperoleh minimal **1 human approval**;
- terdapat unresolved review conversation;
- latest reviewable push belum memperoleh review yang dipersyaratkan.