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

- Keep application source shared on the NAS feature branch (currently `c137`; `nas-clean-v1.37.5` and original `nas` are rollback references). Do not put a computer's absolute paths, credentials, CLI home, database, or public domain into common runtime defaults.
- On an ordinary computer, use the same-origin setup: install dependencies, copy `.env.example` to a local ignored `.env`, then run `pnpm dev`. Vite proxies API and WebSocket traffic to the local backend. Leave `VITE_API_ORIGIN` and `VITE_STATIC_ASSET_BASE` unset unless that computer has its own split deployment.
- A local production build uses `/` for its assets by default. Set `VITE_STATIC_ASSET_BASE` only when the target deployment actually publishes those assets to that URL. Set `VITE_API_ORIGIN` only when the browser's backend is on a separate origin; configure the backend's `FRONTEND_ORIGIN` to match the frontend origin.
- On this NAS, follow `deploy/README.md` and use `deploy/publish-frontend.py` to inject the NAS API and CDN URLs. The backend service, secrets, data paths, and Nginx setup are NAS-specific deployment state.
- `AGENTS.md` guides the coding agent; it does not configure CloudCLI automatically. Each computer supplies its own ignored `.env`, installed CLIs, credentials, database, and provider session history. Git synchronizes committed source and these instructions, not that runtime state.


## Upstream upgrades and retained features

- Preserve the approved C137 feature list, including TypeScript 7, when upgrading official CloudCLI releases or incorporating upstream main changes.
- When a retained feature conflicts with upstream behavior, present the behavior differences, impact, feasible options, and recommendation. Obtain the user's decision before removing or reducing that feature, changing its interaction, or merging/publishing the conflicting change. Do not resolve functional tradeoffs automatically by preferring upstream or custom code.
- Continue independent upgrade work while the conflicting feature awaits a decision. Ordinary code conflicts with no functional tradeoff may be resolved according to confirmed requirements; uncertain equivalence requires user confirmation.
- Record the user's resolution, rationale, owning paths, and rollback dependencies in `docs/nas/README.md`. Follow the upgrade workflow confirmed on 2026-10-27 in `docs/nas/upstream-sync-policy.md`; deployment remains a separate instruction.

- Retain file-panel browsing of hidden files and directories while excluding `.git`, `node_modules`, and equivalent Java/Go/Python/Rust/.NET dependency or cache directories. Preserve hidden configuration and ordinary source directories; avoid blanket gitignore filtering or language-agnostic exclusion of common names such as `bin`, `pkg`, or `packages`. See the retained-feature policy for scope and restoration status; documentation alone does not mean the implementation has been restored.

- Preserve each computer's existing custom model catalog and provider `CUSTOM_MODELS_ONLY` preferences during upstream upgrades. If replacing a hardcoded deployment catalog with official model management, migrate its entries through the official custom-model API before dropping the old list, then verify model and effort choices. Model catalog data remains machine-local; do not hardcode NAS-specific models into shared application defaults.
