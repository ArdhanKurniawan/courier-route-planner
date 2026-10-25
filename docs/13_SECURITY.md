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

Current MVP owner decision (2026-10-25): one administrator with username/password; GitHub OAuth DEFERRED. The preferred approach below is retained as historical reasoning, superseded for the MVP by [ADR-009's owner decision](04_TECH_STACK_ADRS.md#adr-009--auth-sebelum-public-mutation).

Historical preferred initial approach:

- Auth.js;
- GitHub OAuth;
- allowlist team/admin account.

Keuntungan: tidak menyimpan password sendiri.

Auth dapat ditunda pada local foundation tetapi **bukan** pada public production admin.

### Single-admin MVP contract

Use the maintained session/KDF libraries, not custom hashing/JWT/session crypto. Store only the private Argon2id PHC hash and username in environment configuration; no plaintext password in source, examples, logs or URLs. Argon2id policy: v19, 19456 KiB, two passes, parallelism one, 32-byte output and at least 16-byte library-generated salt. Real hash/secret creation and entry remain a private human operation after approval.

Session is absolute 43200 seconds from successful login, with library ttl and cookie maxAge 43200, no activity renewal. Server validates typed issuedAt/expiresAt, subject, current environment and credential version before any application DB acquisition. Hosted cookies are HttpOnly, Secure, SameSite=Strict, Path=/, no Domain; HTTP cookie relaxation is local Development only. Logout is a protected POST clearing the browser cookie. Copied cookies may remain usable until the original 12-hour expiry; no immediate per-session revocation claim or session database/registry.

Login/logout/Depot mutations require exact configured Origin and JSON; no public registration/reset, permissive CORS, client role bypass or default administrator. Authentication config and Depot DB target are checked lazily and fail closed. Development, Testing and Production use distinct credentials, secrets, cookies and limiter scopes. Preview never inherits Production config; logical target validation is not direct physical runtime SQL identity proof.

A shared regional limiter is required for deployed login: five syntactically valid attempts per fixed 15-minute window, account/environment key independent of submitted username/IP. Fixed windows can permit ten attempts across an adjacent-window boundary; global bucket exhaustion can deny new logins. Limiter timeouts (including SDK success-with-timeout), service/quota errors or malformed results deny before KDF/session minting. No in-memory fallback or successful-login reset. Upstash provisioning, cost policy and real cross-instance evidence are pending separate approval. Existing valid sessions/logout do not require Redis availability. Runtime/private configuration and manual auth verification remain PENDING; source implementation alone is not release acceptance.

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
