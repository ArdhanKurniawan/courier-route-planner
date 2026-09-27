# 13 — SECURITY BASELINE

## 1. Threat model sederhana

Assets:

- database credential;
- environment secrets;
- research data/history;
- admin mutation capability;
- deployment integrity.

Threats:

- secret leak;
- unauthorized mutation;
- SQL injection;
- XSS dari customer/address input;
- destructive operation salah environment;
- dependency vulnerability;
- accidental production DB use from Preview.

## 2. Authentication

Sebelum public mutation dibuka, gunakan authentication.

Preferred initial approach:

- Auth.js;
- GitHub OAuth;
- allowlist team/admin account.

Keuntungan: tidak menyimpan password sendiri.

Auth dapat ditunda pada local foundation tetapi **bukan** pada public production admin.

## 3. Authorization

“Sudah login” belum cukup. Semua mutation harus server-side memverifikasi user/role yang diizinkan.

## 4. Input validation

Gunakan Zod pada server boundary.

Validate:

- string length;
- coordinate bounds;
- counts;
- algorithm parameter range;
- run count limit;
- IDs;
- enums.

Client validation hanya UX, bukan security control.

## 5. XSS

React escape text by default. Hindari `dangerouslySetInnerHTML` kecuali ada sanitization dan alasan terdokumentasi.

## 6. SQL injection

Gunakan Drizzle/parameterized query. Raw SQL harus memakai parameter binding dan review ekstra.

## 7. Secrets

- no secrets in Git;
- no secret in `NEXT_PUBLIC_*`;
- no screenshot credential;
- rotate leaked key immediately.

## 8. Destructive actions

- confirmation dialog;
- server authorization;
- environment guard;
- no “delete all” tanpa explicit elevated flow;
- production seed/reset disabled.

## 9. Rate/resource abuse

ACO dapat menjadi compute-heavy. Batasi input di server:

- max customer for web-triggered run;
- max iterations;
- max ants;
- max run count;
- auth required.

Formal benchmark besar dijalankan melalui controlled CLI, bukan public endpoint.

## 10. Dependency security

Rutin:

```bash
npm audit
```

Jangan auto-upgrade major dependency tanpa test. Dependabot/Renovate boleh ditambah kemudian.

## 11. Security release gate

- [ ] no secret in diff;
- [ ] no production DB on Preview;
- [ ] server-side validation;
- [ ] auth for public mutation;
- [ ] no raw input SQL;
- [ ] no unsafe HTML;
- [ ] resource limits enforced;
- [ ] error message tidak expose secret/stack sensitif ke user.
