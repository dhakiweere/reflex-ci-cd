# Reflex

A self-modifying web application. Visitors see the app's own source code in an embedded Monaco editor, can edit it in-browser, and push changes that trigger a real AWS build-and-deploy pipeline — making their version go live for everyone.

## How it works

1. The browser loads the app's own `page.jsx` source at runtime from the `/source` API endpoint and displays it in a Monaco editor.
2. A visitor edits the code and clicks **Push**. The content is sent as plain text to the `/push` API.
3. The `push` Lambda starts a CodeBuild run with the edited source as an environment variable (`EDITED_SOURCE`), and updates the SSM state parameter to `"modified"`.
4. CodeBuild writes the edited source to `reflex-web/src/page.jsx`, builds the Vite app, syncs the output to the `live/` S3 prefix, and invalidates the CloudFront distribution.
5. All visitors now see the modified version at the same URL.

Anyone can click **Reset** to restore the original stable build — the `reset` Lambda flips SSM state back to `"stable"` and invalidates CloudFront, which falls back to the `stable/` S3 prefix.

## Repository structure

```
reflex-web/       React 18 + Vite 5 frontend (all commands run from here)
reflex-api/       Node 20 Lambda handlers (ES modules, raw handlers)
reflex-infra/     Terraform infrastructure modules
buildspec.yml     CodeBuild buildspec at repo root
```

### reflex-web/

Vite SPA with Monaco editor for editing `page.jsx` in-browser. Plain CSS, no Tailwind, no UI library, no TypeScript.

| File | Purpose |
|------|---------|
| `src/main.jsx` | React entry point |
| `src/App.jsx` | Root component — loads state from `/current-state`, renders editor + action bar |
| `src/page.jsx` | The editable surface — default export rendered below the editor, replaced on push |
| `src/api.js` | `getCurrentState()`, `pushCode()`, `resetToStable()`, `getSource()` — all read `VITE_API_BASE_URL` from env |
| `src/components/Editor.jsx` | Monaco editor wrapper, loads `page.jsx` source from `/source` |
| `src/components/StatusBar.jsx` | Shows "Modified by …" when state is modified, hidden when stable |
| `src/components/ActionBar.jsx` | Push button always visible; Reset button shown conditionally based on owner cookie |

### reflex-api/

Four Lambda handlers sharing a single deployment package zipped by Terraform at apply time.

| File | Purpose |
|------|---------|
| `handlers/push.js` | Parses plain text body, triggers CodeBuild with `EDITED_SOURCE`, writes SSM state to `modified`, returns `Set-Cookie: owner=true` |
| `handlers/currentState.js` | Reads SSM parameter and returns `{ state, modifiedBy, modifiedAt }` |
| `handlers/reset.js` | Sets SSM state to `stable`, invalidates CloudFront `/*`, clears owner cookie |
| `handlers/source.js` | Fetches `page.jsx` from S3 `stable/` prefix, returns as `text/plain` |
| `lib/cors.js` | CORS headers helper with `CLOUDFRONT_DOMAIN` as `Access-Control-Allow-Origin` |
| `lib/ssm.js` | `getState()` / `setState()` wrapping AWS SDK SSM |
| `lib/codebuild.js` | `triggerBuild(editedSource)` calling `codebuild:StartBuild` |
| `lib/cloudfront.js` | `invalidate(paths)` calling `cloudfront:CreateInvalidation` |

### reflex-infra/

Terraform modules for the full AWS stack.

| Module | Resources |
|--------|-----------|
| `s3` | Bucket with `stable/` and `live/` prefixes, static website config, OAI |
| `cloudfront` | Distribution with S3 origin, SPA error pages, HTTPS redirect |
| `lambda` | 4 functions (`push`, `current-state`, `reset`, `source`) from a single zip of `reflex-api/` |
| `api_gateway` | HTTP API with routes `POST /push`, `GET /current-state`, `POST /reset`, `GET /source`, CORS enabled |
| `codebuild` | Project with GitHub source, reads `buildspec.yml`, env vars for S3 + CloudFront |
| `ssm` | Parameter `/reflex/state` initialized to `{ state: "stable" }` |
| `iam` | Roles for Lambda (SSM, S3, CodeBuild, CloudFront, logs) and CodeBuild (S3, CloudFront, logs) |

### buildspec.yml

CodeBuild pipeline phases:
1. **install** — `npm ci` in `reflex-web/`
2. **pre_build** — writes `$EDITED_SOURCE` to `src/page.jsx`
3. **build** — `npm run build` (Vite produces `dist/`)
4. **post_build** — syncs `dist/` to S3 `live/` prefix, invalidates CloudFront `/live/*`

## Prerequisites

- Node.js 20
- AWS CLI configured with credentials
- Terraform >= 1.0

## Setup

### 1. Provision infrastructure

```bash
cd reflex-infra
terraform init
terraform apply \
  -var="aws_region=us-east-1" \
  -var="s3_bucket_name=reflex-prod" \
  -var="github_repo_url=https://github.com/your-org/reflex"
```

Note the API Gateway URL and CloudFront domain from the output — you'll need them next.

### 2. Deploy the stable build

The `stable/` S3 prefix holds the original build. CloudFront serves from this prefix by default and only switches to `live/` after a user push.

```bash
cd reflex-web
npm ci
npm run build
aws s3 sync dist/ s3://<bucket-name>/stable/ --delete
```

### 3. Configure the frontend

For local development, copy the API Gateway URL into a `.env` file:

```bash
echo "VITE_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com" > reflex-web/.env
```

For the deployed version, this is not needed — the Lambda environment variables are injected by Terraform.

## API

| Method | Path             | Request body | Response | Side effects |
|--------|------------------|-------------|----------|--------------|
| GET | `/current-state` | — | `{ state, modifiedBy, modifiedAt }` | None |
| POST | `/push` | Plain text (edited JSX source) | `{ success: true }` | Starts CodeBuild, sets SSM to `modified`, sets `owner` cookie |
| POST | `/reset` | — | `{ success: true }` | Sets SSM to `stable`, invalidates CloudFront, clears `owner` cookie |
| GET | `/source` | — | `text/plain` (original `page.jsx` content) | None |

### Cookie behavior

- After a successful push, the server sets `owner=true; Path=/; Max-Age=86400; SameSite=Lax`. The frontend reads this cookie to show "Reset to original" (owner) vs "Someone modified this — reset it?" (non-owner).
- After reset, the server clears the cookie with `Max-Age=0`.

## Local development

```bash
cd reflex-web
npm install
npm run dev
```

The dev server starts on `http://localhost:5173`. If `VITE_API_BASE_URL` is set, the frontend will call the deployed API. Without it, fetch calls target the same origin (useful for development behind a proxy).

## Architecture overview

```
   Browser                        AWS
   ───────                        ───
  Monaco editor            ┌─────────────────┐
  loads & edits page.jsx   │  API Gateway     │
       │                   │  HTTP API        │
       │  POST /push       │  POST /push      │──→ push Lambda ──→ CodeBuild
       │──────────────────→│  GET /current-state │                   │
       │                   │  POST /reset     │──→ reset Lambda      │
       │                   │  GET /source     │──→ source Lambda     │
       │                   └─────────────────┘                   │
       │                                                         │
       │  CloudFront                                              │
       │  serves from S3 stable/ or live/                        │
       │  ─────────────────────────────────────→ S3 (stable/) ◄─── npm run build
       │                                            (live/)        aws s3 sync
```

## License

MIT
