# 21 — AI OPERATING MODEL

AI boleh membantu coding, tetapi **manusia tetap pemilik keputusan dan verification gate**.

## 1. Golden workflow

```text
CONTEXT
→ AUDIT
→ PLAN
→ IMPLEMENT SMALL
→ AUTOMATED CHECKS
→ AI VERIFICATION
→ HUMAN VERIFICATION
→ PR
→ REVIEW
→ MERGE
```

## 2. Jangan gunakan one-shot mega prompt

Bad:

> “Buat website route planner production grade lengkap.”

Risiko:

- scope drift;
- dependency berlebihan;
- schema salah;
- code sulit direview;
- AI menyelesaikan masalah yang belum disepakati.

## 3. Satu prompt = satu bounded task

Contoh:

> “Implement foundation DB connection only. Jangan membuat CRUD, auth, map, atau algorithm.”

## 4. Mandatory AI prompt clauses

Setiap implementation prompt sebaiknya berisi:

- inspect `AGENTS.md` dulu;
- untuk research: baca docs/32, docs/33, docs/34 dan protocol v1 docs/15; gunakan README untuk membedakan approved target dari implemented state;
- audit existing state dulu;
- scope dan out-of-scope;
- acceptance criteria;
- mandatory checks;
- no commit/push;
- jangan mengubah docs/source-of-truth tanpa alasan;
- laporkan changed files;
- laporkan test results.

## 5. Separate implementer vs verifier

Ideal:

1. AI/model A implement.
2. AI/model B atau sesi baru audit hasil tanpa asumsi implementer.

Verifier harus diminta mencari kegagalan, bukan memuji.

## 6. Evidence, not confidence

Jangan percaya output:

> “Semua sudah benar.”

Percaya evidence:

```text
npm run lint → exit 0
npm run typecheck → exit 0
npm test → 42 passed
npm run build → exit 0
preview smoke → PASS
```

## 7. Ask AI to inspect diff

Prompt reviewer harus meminta:

```bash
git status
git diff --stat
git diff
```

Dan fokus pada perubahan task saja.

## 8. Stop conditions

AI harus berhenti dan meminta manusia jika:

- source-of-truth conflict;
- destructive migration;
- production credential/action;
- requirement ambiguous yang mengubah scope;
- dependency besar baru;
- security design choice;
- research method decision yang belum disetujui;
- test gagal dan fix memerlukan perubahan contract.

## 9. AI-generated docs

AI boleh membuat walkthrough/verification, tetapi data claim harus berasal dari actual commands/files.

## 10. Standard task artifacts

Untuk task besar, simpan:

```text
docs/worklogs/<task>/task.md
docs/worklogs/<task>/walkthrough.md
docs/worklogs/<task>/verification.md
```

Minimal isi:

- requirement;
- changed files;
- decisions;
- tests;
- manual checks;
- unresolved issues.
