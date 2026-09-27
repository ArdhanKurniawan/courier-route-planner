# 19 — DEFINITION OF DONE

## 1. Task DoD

Task selesai bila:

- [ ] Acceptance Criteria terpenuhi;
- [ ] code reviewed sendiri (`git diff`);
- [ ] lint pass;
- [ ] typecheck pass;
- [ ] relevant tests pass;
- [ ] build pass;
- [ ] docs updated bila contract berubah;
- [ ] no secret;
- [ ] manual check dilakukan;
- [ ] known limitation dicatat.

## 2. Feature DoD

Tambahkan:

- [ ] Preview deployment dapat diuji;
- [ ] error/empty/loading state;
- [ ] security boundary checked;
- [ ] integration test bila menyentuh DB;
- [ ] screenshot/evidence PR;
- [ ] migration reviewed bila ada.

## 3. Algorithm DoD

- [ ] valid closed tour;
- [ ] customer exactly once;
- [ ] depot start/end;
- [ ] recomputed distance same;
- [ ] edge cases;
- [ ] deterministic seed test where applicable;
- [ ] no framework dependency;
- [ ] complexity/risk documented;
- [ ] parameter contract documented.

## 4. Database DoD

- [ ] schema migration documented;
- [ ] dev applied;
- [ ] testing applied;
- [ ] no destructive prod action;
- [ ] indexes justified;
- [ ] rollback/mitigation known.

## 5. Release DoD

- [ ] CI green;
- [ ] testing QA green;
- [ ] UAT evidence;
- [ ] prod env checked;
- [ ] prod migration executed safely;
- [ ] smoke test after deploy;
- [ ] release note;
- [ ] no blocker.

## 6. Research benchmark DoD

- [ ] case frozen;
- [ ] input hash;
- [ ] same matrix both algorithms;
- [ ] seeds saved;
- [ ] algorithm parameters saved;
- [ ] machine info saved;
- [ ] commit SHA saved;
- [ ] invalid routes rejected;
- [ ] raw results exported;
- [ ] summary reproducible from raw results.
