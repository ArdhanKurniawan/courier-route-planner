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
- [ ] NN directed minimum, depot=0, lowest-index tie;
- [ ] 2-Opt best improvement, full directed recomputation, asymmetric fixtures pass, <= NN distance;
- [ ] ACO Classical Ant System, directed pheromone, seeded reset, all-ant deposit, fixed iterations;
- [ ] tidak ada post-ACO 2-Opt atau invented final numeric defaults.

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
- [ ] OSRM road validation dan Table matrix frozen, meter, directed, no unreachable pair;
- [ ] stable node order dan exact matrix hash cocok di kedua experiments;
- [ ] seeds saved;
- [ ] algorithm parameters saved;
- [ ] machine info saved;
- [ ] commit SHA saved;
- [ ] invalid routes rejected;
- [ ] raw results exported;
- [ ] summary reproducible from raw results.
- [ ] calibration terpisah dan satu global ACO config frozen;
- [ ] main 10/25/50 × 10 random datasets; N=100 conditional, other patterns optional;
- [ ] 30 independent seeded ACO runs dan 30 NN+2-Opt timing samples per dataset;
- [ ] 5 warm-ups per algoritma/dataset dikeluarkan dari statistik;
- [ ] timer hanya algoritma, tanpa OSRM/DB/network/serialization/geometry/rendering;
- [ ] ACO median/mean comparison utama, best tambahan; RQ3 range/SD/CV;
- [ ] dataset adalah unit observasi, repetitions tidak dihitung sebagai independent datasets;
- [ ] failure/poor valid runs disimpan, incomplete datasets dilabeli.

Detail contract: [docs/32](32_RESEARCH_DECISIONS.md), [docs/33](33_ALGORITHM_SPECIFICATION.md), [docs/34](34_OSRM_DISTANCE_CONTRACT.md), [protocol v1](15_RESEARCH_BENCHMARK_PROTOCOL.md).

## 7. Documentation-only DoD

Untuk perubahan yang tidak menyentuh source/package: audit initial branch/status, review changed docs, diff --check, internal links, contradictions, MASTER_GUIDE parity, dan MANIFEST actual bytes/SHA-256. Jalankan existing lint/build bila environment memungkinkan; missing typecheck/test dilaporkan sebagai foundation gap, bukan hasil PASS. Jangan membuat scripts/dependencies hanya untuk menyatakan documentation task lolos application tests.
