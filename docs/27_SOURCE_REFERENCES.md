# 27 — SOURCE REFERENCES & VERIFICATION BASELINE

**Last web verification:** 2026-09-26.

Dokumen project harus diperbarui bila platform mengubah plan/feature/runtime.

## Internal project sources

- `HANDOFF_RISET_WEB_KURIR_ROUTE_PLANNER(1).md`
- `PROMPT_PENCARIAN_20_JURNAL_ROUTE_PLANNER_4_TAHUN_BAHASA_INDONESIA(1).md`
- `Proyek Informatika.pdf` (RPS)
- materi metodologi/literature review project USM yang tersedia di workspace.

## Official Next.js sources

- Next.js Docs: https://nextjs.org/docs
- App Router Learn: https://nextjs.org/learn/dashboard-app
- Installation / Node minimum: https://nextjs.org/learn/react-foundations/installation

Key verified facts used:

- Next.js adalah full-stack React framework.
- App Router adalah router modern.
- official learning path assumes React/JavaScript foundations.
- current minimum Node documented >=20.9 for modern course/docs.

## Official Vercel sources

- Preview Deployments: https://vercel.com/academy/svelte-on-vercel/preview-deployments
- Environment Variables: https://vercel.com/academy/vercel-foundations/vercel-settings
- Branch-specific env vars: https://vercel.com/changelog/environments-variables-per-git-branch
- Branch Domains: https://vercel.com/blog/branch-domains
- Node 24 support: https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions

Key verified facts used:

- non-production branches can receive Preview deployments;
- Preview variables can be scoped/overridden by branch;
- branch domains exist;
- Node 24 is supported and default for new Vercel projects as of late 2025.

## Official TiDB sources

- Starter FAQ: https://docs.pingcap.com/tidbcloud/serverless-faqs/
- Select plan: https://docs.pingcap.com/tidbcloud/select-cluster-tier/
- TiDB + Vercel: https://docs.pingcap.com/tidbcloud/integrate-tidbcloud-with-vercel/
- Drizzle tutorial: https://docs.pingcap.com/developer/serverless-driver-drizzle-example/
- Starter limitations: https://docs.pingcap.com/tidbcloud/serverless-limitations/

Key verified facts used:

- TiDB Starter current free allowance applies to up to five instances per organization;
- each current free quota includes row/columnar storage and RUs per documented policy;
- `@tidbcloud/serverless` + Drizzle is officially documented;
- connection URL uses MySQL-style format;
- Vercel integration is officially documented.

## Drizzle

- TiDB connector: https://orm.drizzle.team/docs/mysql/connect-tidb

## GitHub

- Rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets

## OpenStreetMap

Sebelum public traffic besar, verifikasi tile usage policy terbaru:

- https://operations.osmfoundation.org/policies/tiles/

## Verification rule

Jika AI membuat claim tentang:

- free tier quota;
- Vercel plan feature;
- Node runtime;
- framework requirement;
- TiDB limitation;

AI wajib memeriksa official source terbaru sebelum mengubah architecture/cost assumption.


## UI template baseline — TailAdmin

- Official Next.js page: https://tailadmin.com/nextjs
- Free download page: https://tailadmin.com/download
- Official GitHub: https://github.com/TailAdmin/free-nextjs-admin-dashboard
- GitHub package snapshot: https://raw.githubusercontent.com/TailAdmin/free-nextjs-admin-dashboard/main/package.json

Verified baseline facts:

- free/open-source Next.js admin template;
- upstream free repository declares MIT License;
- current stack is Next.js + React + TypeScript + Tailwind;
- downloadable via GitHub/official download page;
- upstream dependency snapshot includes ApexCharts, therefore project performs separate dependency/license cleanup.

## Chart licensing references

- ApexCharts license: https://apexcharts.com/license/
- ApexCharts GitHub LICENSE: https://github.com/apexcharts/apexcharts.js/blob/main/LICENSE
- Recharts GitHub: https://github.com/recharts/recharts

Project policy:

- ApexCharts current license is community/revenue-based; not approved as core baseline dependency.
- Recharts upstream declares MIT and is the preferred future candidate if chart visualization is needed.
