# 31 — BRANCH PROTECTION & ACCIDENTAL PUSH GUARDS

**Status:** Required baseline control  
**Goal:** mencegah anggota tim, maintainer, atau AI agent tidak sengaja mengubah dan mendorong perubahan langsung ke `main` atau `testing`.

> Prinsip: perlindungan tidak boleh hanya mengandalkan ingatan manusia. Gunakan beberapa lapisan: GitHub server-side protection, local Git guards, AI guardrails, CI, dan deployment isolation.

---

## 1. Threat model

Skenario yang harus dicegah:

1. developer lupa masih berada di `main`;
2. developer mengedit file dan melakukan commit;
3. developer menjalankan `git push` tanpa mengecek branch;
4. developer salah target, misalnya `git push origin HEAD:main`;
5. AI coding agent mengubah file saat current branch adalah `main` atau `testing`;
6. force-push merusak history branch penting;
7. feature yang belum direview masuk production.

Target kita:

```text
feature/* / fix/* / chore/*
        ↓
     Pull Request
        ↓
      testing
 (no approval required)
        ↓
 integration / QA / UAT
        ↓
     Pull Request
        ↓
 minimum 1 human approval
        ↓
       main
```

Tidak ada direct code change ke `main` atau `testing`.

---

## 2. Protection layers

Kita memakai minimum lima lapisan.

### Current Phase 0D-1 CI state

[Quality workflow](../.github/workflows/quality.yml) **IMPLEMENTED LOCALLY — REMOTE VERIFICATION PENDING**: workflow Quality, job ID quality, display/check job Quality Gate. Triggers PR dan push testing/main. Read-only contents, no project/cloud/DB secrets, no deploy/migration. [CI contract](12_CI_CD_RELEASE.md), [implementation report](proses/phase-0/0d/PHASE_0D_CI_IMPLEMENTATION_REPORT.md).

Stage ini tidak push/create PR atau mengubah protections. Baseline read-only audit mengamati protect-main/protect-testing active dengan PR/force/delete rules; tidak ada required-status-check rule pada dua rulesets yang terbaca, sedangkan classic/bypass state belum terverifikasi. Lihat [bounded baseline evidence](proses/phase-0/0d/PHASE_0D_BASELINE_AUDIT_REPORT.md#g-current-github-actions-state).

Phase 0D-2 harus terlebih dahulu menjalankan real Linux Actions, membaca exact check name/app/context untuk current SHA, lalu meminta explicit human approval sebelum mengatur required checks testing/main. Jangan menyatakan enforcement sudah aktif dari file YAML lokal. Pending/cancelled/failed quality run belum memenuhi merge gate. Local hooks tetap control terpisah dan tidak diganti oleh workflow.

### Layer A — GitHub server-side branch protection (authoritative)

Protected branch:

```text
main
testing
```

### Important GitHub plan note

Pada GitHub saat ini, protected branches/rulesets tersedia untuk public repository pada GitHub Free. Untuk private repository, enforcement branch protection/ruleset tersedia pada GitHub Pro/Team/Enterprise.

Untuk mahasiswa terverifikasi, GitHub Student Developer Pack menyediakan GitHub Pro secara gratis selama status mahasiswa memenuhi syarat. Karena project ini adalah project mahasiswa, tim sebaiknya mengecek GitHub Education lebih dulu bila repository ingin tetap private tanpa biaya.

Jika repository private + GitHub Free tanpa Pro, local guards di bawah tetap wajib tetapi **bukan pengganti sempurna** server-side enforcement.

---

## 3. Local guard 1 — block commits on protected branches

Git hooks tidak otomatis ikut aktif hanya karena file hook ada di repository. Setelah repository siap, tim akan menyimpan hooks pada:

```text
.githooks/
├── pre-commit
└── pre-push
```

Lalu setiap clone harus mengaktifkan:

```bash
git config core.hooksPath .githooks
```

### `.githooks/pre-commit`

```sh
#!/bin/sh

branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"

case "$branch" in
  main|testing)
    echo ""
    echo "BLOCKED: commit langsung pada branch '$branch' tidak diizinkan."
    echo "Buat feature/fix/hotfix/chore branch terlebih dahulu."
    echo "Contoh: git switch -c feature/nama-fitur"
    echo ""
    exit 1
    ;;
esac

exit 0
```

Hasilnya:

```text
main + git commit
        ↓
      BLOCKED
```

Ini mencegah kesalahan lebih awal sebelum push terjadi.

> Hook dapat dilewati secara sengaja dengan opsi Git tertentu. Karena itu server-side GitHub protection tetap menjadi otoritas utama.

---

## 4. Local guard 2 — block any push targeting main/testing

### `.githooks/pre-push`

```sh
#!/bin/sh

while read local_ref local_sha remote_ref remote_sha
do
  case "$remote_ref" in
    refs/heads/main|refs/heads/testing)
      echo ""
      echo "BLOCKED: direct push ke '$remote_ref' tidak diizinkan."
      echo "Gunakan Pull Request."
      echo ""
      exit 1
      ;;
  esac
done

exit 0
```

Guard ini tidak hanya menangkap:

```bash
git push origin main
```

melainkan juga salah target seperti:

```bash
git push origin HEAD:main
```

Normal push yang diizinkan:

```bash
git push -u origin feature/depot-crud
```

---

## 5. Required developer setup command

Setelah hooks dibuat di repository, setiap anggota menjalankan satu kali per clone:

```bash
git config core.hooksPath .githooks
```

Verify:

```bash
git config --get core.hooksPath
```

Expected:

```text
.githooks
```

Sebelum anggota dianggap onboarding-complete, tes berikut wajib dilakukan:

```bash
git switch main
# buat perubahan dummy yang aman atau gunakan dry-run test procedure
```

Jangan meninggalkan perubahan dummy di history.

Tim harus membuktikan bahwa commit/push protected branch diblokir.

---

## 6. Optional automated setup

Setelah `package.json` stabil, buat script repository misalnya:

```json
{
  "scripts": {
    "setup:git-hooks": "git config core.hooksPath .githooks"
  }
}
```

Developer baru cukup menjalankan:

```bash
npm run setup:git-hooks
```

Boleh juga digabung ke onboarding/bootstrap script, tetapi jangan membuat install dependency diam-diam mengubah Git global config.

---

## 7. AI agent guard

Sebelum AI mengubah file, AI wajib menjalankan:

```bash
git branch --show-current
git status --short
```

Rules:

- jika branch = `main`: **STOP**;
- jika branch = `testing`: **STOP** untuk coding biasa;
- AI hanya boleh melanjutkan setelah manusia membuat branch kerja;
- AI tidak boleh otomatis membuat branch jika task tidak mengizinkannya;
- AI tidak boleh push, merge, force-push, atau mengubah protections tanpa instruksi eksplisit manusia.

Recommended first line pada prompt implementasi:

```text
MANDATORY SAFETY CHECK:
Sebelum mengubah file apa pun, jalankan `git branch --show-current` dan `git status --short`.
Jika current branch adalah `main` atau `testing`, STOP dan laporkan. Jangan lakukan perubahan kode.
```

---

## 8. Vercel deployment isolation

Git safety diperkuat deployment safety:

```text
main       → Vercel Production
testing    → persistent Preview/Testing
feature/*  → Preview Deployment
```

Feature branch tidak boleh menjadi Production Branch.

Dengan demikian feature push normal tidak langsung menjadi production release.

Tetapi Vercel **bukan pengganti Git protection**. Jika seseorang berhasil memasukkan commit ke `main`, deployment production dapat berjalan. Karena itu `main` harus dilindungi dari sumbernya.

---

## 9. Recovery — lupa branch tetapi belum commit

Misalnya sedang di:

```text
main
```

dan sudah mengedit beberapa file tetapi belum commit.

JANGAN hapus perubahan.

Langsung buat branch baru:

```bash
git switch -c feature/nama-fitur
```

Working tree biasanya ikut pindah ke branch baru.

Kemudian:

```bash
git status
git add ...
git commit ...
git push -u origin feature/nama-fitur
```

---

## 10. Recovery — sudah commit di main, push ditolak

Misalnya:

```text
main
A -- B -- C
          ^ accidental local commit
```

Jangan langsung `reset --hard`.

Pertama selamatkan commit:

```bash
git switch -c feature/nama-fitur
```

Pastikan commit terlihat:

```bash
git log --oneline -5
```

Kemudian kembalikan local `main` ke remote:

```bash
git switch main
git fetch origin
git reset --hard origin/main
```

Lalu lanjutkan pekerjaan di feature branch.

**Warning:** `git reset --hard` destructive. Jalankan hanya setelah memastikan perubahan penting sudah tersimpan pada branch/commit lain.

---

## 11. Recovery — accidental push benar-benar sudah masuk main

Jika server-side protection belum aktif dan direct push terlanjur berhasil:

1. **STOP** deployment/change berikutnya;
2. jangan force-push untuk “menghapus jejak”;
3. catat commit SHA yang salah;
4. review apakah sudah terdeploy production;
5. gunakan `git revert <sha>` melalui recovery branch + PR bila memungkinkan;
6. smoke-test production;
7. aktifkan/fix branch protection;
8. tulis incident note singkat agar tidak berulang.

Default recovery adalah **revert**, bukan rewrite history.

---

## 12. Daily branch sanity habit

Sebelum coding:

```bash
git branch --show-current
git status --short
git fetch origin
```

Expected branch untuk feature work:

```text
feature/*
fix/*
hotfix/*
chore/*
```

Bukan:

```text
main
testing
```

Optional: tampilkan current Git branch pada terminal prompt agar branch selalu terlihat.

---

## 13. Pre-PR checklist

Sebelum PR:

- [ ] current branch bukan `main`/`testing`;
- [ ] branch berasal dari base yang benar;
- [ ] `git status` bersih;
- [ ] tidak ada `.env*` atau secret;
- [ ] diff sudah dibaca;
- [ ] lint lulus;
- [ ] typecheck lulus;
- [ ] tests lulus;
- [ ] build lulus;
- [ ] PR target benar (`feature/* → testing` atau `testing → main`).

---

## 14. Repository admin checklist

Sebelum coding tim dimulai:

- [ ] repository visibility ditentukan;
- [ ] jika private, eligibility GitHub Pro/Student dicek;
- [ ] `main` protected;
- [ ] `testing` protected;
- [ ] PR required;
- [ ] required status checks configured;
- [ ] force-push blocked;
- [ ] deletion blocked;
- [ ] bypass seminimal mungkin;
- [ ] Vercel Production Branch = `main`;
- [ ] local hooks masuk repository;
- [ ] seluruh anggota telah mengaktifkan `core.hooksPath`;
- [ ] test accidental commit/push sudah dilakukan;
- [ ] AI instructions memiliki branch safety check.

---

## 15. Acceptance criteria

Protection dianggap benar jika:

1. commit langsung di local `main` ditolak hook;
2. commit langsung di local `testing` ditolak hook;
3. push yang menargetkan remote `main` ditolak local hook;
4. push yang menargetkan remote `testing` ditolak local hook;
5. jika hook dilewati/missing, GitHub tetap menolak direct protected-branch push bila server-side protection tersedia;
6. feature push berhasil;
7. perubahan ke protected branch hanya melalui PR;
8. CI wajib hijau sebelum merge;
9. production deployment hanya berasal dari `main`;
10. tim tahu recovery procedure jika salah branch.

---

## 16. Final policy

Kita tidak menggunakan model keamanan:

> “Ingat ya, jangan push ke main.”

Kita menggunakan model:

```text
Human habit
    +
Local pre-commit guard
    +
Local pre-push guard
    +
GitHub branch protection
    +
CI required checks
    +
Vercel production isolation
```

Human error diasumsikan **akan terjadi**. Sistem harus membuat human error sulit berubah menjadi production incident.
