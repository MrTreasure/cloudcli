# Repository guidance

## Backend code

For every task that creates, modifies, refactors, or reviews backend code under `server/`, load and follow `$backend-module-standards` from `.agents/skills/backend-module-standards/SKILL.md`. Apply it only to backend code; do not impose those architecture rules on the frontend.

## Frontend code

For every task that creates, modifies, refactors, or reviews frontend code under `src/`, load and follow `$frontend-module-standards` from `.agents/skills/frontend-module-standards/SKILL.md`. Apply it only to frontend code; do not impose those architecture rules on the backend.

## Running this branch on different computers

- Keep application source shared on the `nas` branch. Do not put a computer's absolute paths, credentials, CLI home, database, or public domain into common runtime defaults.
- On an ordinary computer, use the same-origin setup: install dependencies, copy `.env.example` to a local ignored `.env`, then run `pnpm dev`. Vite proxies API and WebSocket traffic to the local backend. Leave `VITE_API_ORIGIN` and `VITE_STATIC_ASSET_BASE` unset unless that computer has its own split deployment.
- A local production build uses `/` for its assets by default. Set `VITE_STATIC_ASSET_BASE` only when the target deployment actually publishes those assets to that URL. Set `VITE_API_ORIGIN` only when the browser's backend is on a separate origin; configure the backend's `FRONTEND_ORIGIN` to match the frontend origin.
- On this NAS, follow `deploy/README.md` and use `deploy/publish-frontend.py` to inject the NAS API and CDN URLs. The backend service, secrets, data paths, and Nginx setup are NAS-specific deployment state.
- `AGENTS.md` guides the coding agent; it does not configure CloudCLI automatically. Each computer supplies its own ignored `.env`, installed CLIs, credentials, database, and provider session history. Git synchronizes committed source and these instructions, not that runtime state.
