# AGENTS.md

## Project overview

Reflex — a self-modifying web application. A React + Vite SPA embedded with a Monaco Editor lets visitors edit the app's own source (`page.jsx`) in-browser and push changes, triggering a real AWS build/deploy pipeline via CodeBuild. The newly built version goes live on CloudFront.

## Repository structure

```
reflex-web/       ← React 18 + Vite 5 frontend (all commands run from here)
reflex-api/       ← Node 20 Lambda handlers (ES modules, raw handlers)
reflex-infra/     ← Terraform (S3, CloudFront, Lambda, API Gateway, CodeBuild, SSM)
buildspec.yml     ← CodeBuild buildspec at repo root
```

## Commands

All from `reflex-web/`:

```bash
npm run dev      # vite dev server
npm run build    # vite build (produces dist/)
npm run preview  # vite preview (serve built output locally)
```

There are **no test, lint, typecheck, or format commands**.

## Key technical notes

- **React 18 + Vite 5**, plain CSS (no Tailwind, no UI library).
- **No TypeScript** — plain `.js` / `.jsx` throughout.
- **`@monaco-editor/react`** v4 loads the editor in-browser.
- **page.jsx is the editable surface** — the editor loads its source from `/source` at runtime. Pushing overwrites it, triggering a CodeBuild run.

## Backend (Lambda)

- **ES modules only** (`import`/`export`), raw handler functions (no Express/Fastify).
- All handlers return CORS headers from `lib/cors.js`.
- Four handlers: `push`, `currentState`, `reset`, `source`.
- Environment variables are injected by Terraform at deploy time.

## Infrastructure (Terraform)

- Run from `reflex-infra/`.
- Modules: S3 (two prefixes: `stable/` and `live/`), CloudFront, Lambda, API Gateway, CodeBuild, SSM, IAM.
- SSM parameter `/reflex/state` stores `{ state, modifiedBy, modifiedAt }`.
- CodeBuild source is the GitHub repo, reads `buildspec.yml` at repo root.
- The Lambda deployment package is built by `archive_file` from `reflex-api/` at `terraform apply` time.

## Build pipeline flow

1. User edits `page.jsx` in-browser, clicks Push.
2. `push` Lambda calls `codebuild:StartBuild` with `EDITED_SOURCE` env var.
3. CodeBuild runs `buildspec.yml`: writes `EDITED_SOURCE` to `src/page.jsx`, `npm run build`, syncs `dist/` to S3 `live/` prefix, invalidates CloudFront.
4. All visitors now see the modified version.

## Reset flow

1. User clicks Reset.
2. `reset` Lambda sets SSM state to `stable`, invalidates CloudFront `/*`.
3. CloudFront origin points to S3 `stable/` prefix (unchanged original build) — visitors see the original.
