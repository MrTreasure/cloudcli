# Repository guidance

## NAS change records

- Maintain `docs/nas/README.md` when a feature is added, changed, removed, or merged from an upstream PR. Record its purpose, owning paths, upstream source, and rollback dependencies.
- The `nas` pre-commit hook regenerates `docs/nas/commit-log.md` and `docs/nas/file-index.md` from Git history plus the staged changes. Keep all intended source changes staged before committing. The generated files record the current commit's staged paths separately because its SHA does not exist yet.
- `docs/nas/upstream-base.txt` identifies the official comparison baseline. Change it only after an official upgrade has been merged and reviewed; retain previous baseline references in the guide.
- If hooks are bypassed, run `node scripts/record-nas-changes.mjs` after staging and add the generated records to the commit. Generated records must not replace the maintained feature/rollback guide.

## Backend code

For every task that creates, modifies, refactors, or reviews backend code under `server/`, load and follow `$backend-module-standards` from `.agents/skills/backend-module-standards/SKILL.md`. Apply it only to backend code; do not impose those architecture rules on the frontend.

## Frontend code

For every task that creates, modifies, refactors, or reviews frontend code under `src/`, load and follow `$frontend-module-standards` from `.agents/skills/frontend-module-standards/SKILL.md`. Apply it only to frontend code; do not impose those architecture rules on the backend.

## Running this branch on different computers

- Keep application source shared on the NAS feature branch (currently `nas-clean-v1.37.5`; original `nas` is the rollback reference). Do not put a computer's absolute paths, credentials, CLI home, database, or public domain into common runtime defaults.
- On an ordinary computer, use the same-origin setup: install dependencies, copy `.env.example` to a local ignored `.env`, then run `pnpm dev`. Vite proxies API and WebSocket traffic to the local backend. Leave `VITE_API_ORIGIN` and `VITE_STATIC_ASSET_BASE` unset unless that computer has its own split deployment.
- A local production build uses `/` for its assets by default. Set `VITE_STATIC_ASSET_BASE` only when the target deployment actually publishes those assets to that URL. Set `VITE_API_ORIGIN` only when the browser's backend is on a separate origin; configure the backend's `FRONTEND_ORIGIN` to match the frontend origin.
- On this NAS, follow `deploy/README.md` and use `deploy/publish-frontend.py` to inject the NAS API and CDN URLs. The backend service, secrets, data paths, and Nginx setup are NAS-specific deployment state.
- `AGENTS.md` guides the coding agent; it does not configure CloudCLI automatically. Each computer supplies its own ignored `.env`, installed CLIs, credentials, database, and provider session history. Git synchronizes committed source and these instructions, not that runtime state.
