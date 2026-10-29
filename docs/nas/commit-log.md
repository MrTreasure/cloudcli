# NAS 分支完整提交记录（自动生成）

官方基线：`v1.37.6` (`c17c2f6d5f7e1e1d47fe37144ce0b2030002e331`)。历史覆盖至生成时的 HEAD：`8d2bea1c37ced473d6b1a29b7863151d276fe5b8`。

功能说明和回退依赖见 [维护指南](README.md)，完整净差异见 [文件索引](file-index.md)。不要手动编辑本文件。

## 随本次提交入库的变更

下表来自暂存区，不包含这两个自动生成文件。该提交的 SHA 在提交完成后才产生；下一次生成时会进入下方历史。

| 状态 | 文件 | 原路径 |
| --- | --- | --- |
| M | [docs/nas/README.md](../../docs/nas/README.md) | — |
| M | [server/modules/providers/list/codex/codex-app-server.runtime.ts](../../server/modules/providers/list/codex/codex-app-server.runtime.ts) | — |
| M | [server/modules/providers/tests/codex-app-server.runtime.test.ts](../../server/modules/providers/tests/codex-app-server.runtime.test.ts) | — |

## NAS 主线提交

### 04bb1439 · 2026-10-19 · feat(nas): retain selected customizations on CloudCLI v1.37.5

- 完整提交：`04bb14392e1bf1d8af3166ccc0a1be3b1a3142e1`
- 相对第一父提交涉及文件：

  - `.dockerignore`
  - `.env.example`
  - `.husky/pre-commit`
  - `.oxlintrc.json`
  - `AGENTS.md`
  - `README.md`
  - `deploy/CHANGELOG.md`
  - `deploy/README.md`
  - `deploy/agent-api.conf`
  - `deploy/bootstrap-user.py`
  - `deploy/cache-frontend.py`
  - `deploy/cloudcli-backend.service`
  - `deploy/configure-cloudflare.py`
  - `deploy/frontend.conf`
  - `deploy/publish-frontend.py`
  - `deploy/publish-plugins.py`
  - `deploy/publish-static.mjs`
  - `deploy/run-backend.py`
  - `deploy/static-cdn.json`
  - `deploy/verify-services.py`
  - `docs/codex-app-server-rollout.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/upstream-base.txt`
  - `local-plugins/cloudcli-host-dashboard/README.md`
  - `local-plugins/cloudcli-host-dashboard/icon.svg`
  - `local-plugins/cloudcli-host-dashboard/manifest.json`
  - `local-plugins/cloudcli-host-dashboard/package.json`
  - `local-plugins/cloudcli-host-dashboard/pnpm-lock.yaml`
  - `local-plugins/cloudcli-host-dashboard/pnpm-workspace.yaml`
  - `local-plugins/cloudcli-host-dashboard/src/index.ts`
  - `local-plugins/cloudcli-host-dashboard/src/metrics.test.ts`
  - `local-plugins/cloudcli-host-dashboard/src/metrics.ts`
  - `local-plugins/cloudcli-host-dashboard/src/server.ts`
  - `local-plugins/cloudcli-host-dashboard/tsconfig.json`
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
  - `scripts/record-nas-changes.mjs`
  - `server/index.ts`
  - `server/modules/database/migrations.ts`
  - `server/modules/database/repositories/sessions.db.ts`
  - `server/modules/database/schema.ts`
  - `server/modules/file-tree/tests/file-tree.service.test.ts`
  - `server/modules/notifications/index.ts`
  - `server/modules/notifications/services/notification-orchestrator.service.js`
  - `server/modules/providers/README.md`
  - `server/modules/providers/list/codex/codex-app-server.client.ts`
  - `server/modules/providers/list/codex/codex-app-server.config.ts`
  - `server/modules/providers/list/codex/codex-app-server.process.ts`
  - `server/modules/providers/list/codex/codex-app-server.runtime.ts`
  - `server/modules/providers/list/codex/codex-app-server.transport.ts`
  - `server/modules/providers/list/codex/codex-runtime.provider.ts`
  - `server/modules/providers/list/codex/codex-sessions.provider.ts`
  - `server/modules/providers/provider.routes.ts`
  - `server/modules/providers/services/codex-context-limits.service.ts`
  - `server/modules/providers/services/provider-runtime.service.ts`
  - `server/modules/providers/services/provider-session-settings.service.ts`
  - `server/modules/providers/services/provider-token-usage.service.ts`
  - `server/modules/providers/services/sessions.service.ts`
  - `server/modules/providers/tests/claude-runtime-hold.test.ts`
  - `server/modules/providers/tests/codex-app-server.process.test.ts`
  - `server/modules/providers/tests/codex-app-server.runtime.test.ts`
  - `server/modules/providers/tests/codex-app-server.transport.test.ts`
  - `server/modules/providers/tests/codex-context-limits.service.test.ts`
  - `server/modules/providers/tests/codex-models.test.ts`
  - `server/modules/providers/tests/codex-runtime.test.ts`
  - `server/modules/providers/tests/codex-sessions.test.ts`
  - `server/modules/providers/tests/provider-runtime.service.test.ts`
  - `server/modules/providers/tests/provider-token-usage.service.test.ts`
  - `server/modules/providers/tests/provider.routes.test.ts`
  - `server/modules/websocket/README.md`
  - `server/modules/websocket/services/chat-websocket.service.ts`
  - `server/shared/index.ts`
  - `server/shared/interfaces.ts`
  - `server/shared/tests/read-only-roots.test.ts`
  - `server/shared/types.ts`
  - `server/shared/utils.ts`
  - `server/tsconfig.json`
  - `src/App.tsx`
  - `src/modules/auth/tests/authTokenRefreshRemount.test.tsx`
  - `src/modules/chat/ChatInterface.tsx`
  - `src/modules/chat/composer/ChatComposer.tsx`
  - `src/modules/chat/composer/ComposerMenuPrimitives.tsx`
  - `src/modules/chat/composer/ComposerModelMenu.tsx`
  - `src/modules/chat/composer/PermissionRequestsBanner.tsx`
  - `src/modules/chat/composer/TokenUsageSummary.tsx`
  - `src/modules/chat/hooks/useChatComposerState.ts`
  - `src/modules/chat/hooks/useChatRealtimeHandlers.ts`
  - `src/modules/chat/hooks/useCodexFastState.ts`
  - `src/modules/chat/hooks/useSessionStore.ts`
  - `src/modules/chat/modals/CommandResultModal.tsx`
  - `src/modules/chat/tests/codexFastState.test.ts`
  - `src/modules/chat/tests/composerTextEditing.test.tsx`
  - `src/modules/chat/tests/composerToolsSettingsResolution.test.ts`
  - `src/modules/chat/tests/contextUsageDisplay.test.tsx`
  - `src/modules/chat/tests/permissionRequestsBanner.test.tsx`
  - `src/modules/chat/tests/sessionStoreTruncate.test.tsx`
  - `src/modules/code-editor/CodeEditorBinaryFile.tsx`
  - `src/modules/code-editor/CodeEditorHeader.tsx`
  - `src/modules/code-editor/CodeEditorMediaPreview.tsx`
  - `src/modules/command-palette/CommandPalette.tsx`
  - `src/modules/file-tree/FileTree.tsx`
  - `src/modules/file-tree/FileTreeNode.tsx`
  - `src/modules/i18n/locales/en/chat.json`
  - `src/modules/i18n/locales/en/settings.json`
  - `src/modules/i18n/locales/zh-CN/chat.json`
  - `src/modules/i18n/locales/zh-CN/settings.json`
  - `src/modules/i18n/locales/zh-TW/chat.json`
  - `src/modules/i18n/locales/zh-TW/settings.json`
  - `src/modules/plugins/PluginTabContent.tsx`
  - `src/modules/plugins/tests/hostDashboardPolling.test.ts`
  - `src/modules/settings/Settings.tsx`
  - `src/modules/settings/hooks/useSettingsController.ts`
  - `src/modules/settings/tabs/AppearanceSettingsTab.tsx`
  - `src/modules/settings/tabs/agents-settings/AgentsSettingsTab.tsx`
  - `src/modules/settings/tabs/agents-settings/sections/AgentCategoryContentSection.tsx`
  - `src/modules/settings/tabs/agents-settings/sections/content/PermissionsContent.tsx`
  - `src/modules/settings/tests/codexPermissionsRuntime.test.tsx`
  - `src/modules/settings/tests/fontSizeControls.test.tsx`
  - `src/modules/shell/utils/socket.ts`
  - `src/modules/sidebar/tests/recentConversationTitleSync.test.ts`
  - `src/shared/api.ts`
  - `src/shared/constants.ts`
  - `src/shared/context/UiPreferencesContext.tsx`
  - `src/shared/context/WebSocketContext.tsx`
  - `src/shared/hooks/useFontSizes.ts`
  - `src/shared/tests/fontSizes.test.tsx`
  - `src/shared/types.ts`
  - `src/shared/utils.ts`
  - `tsconfig.json`
  - `vite.config.js`
  - `vitest.setup.ts`

### 34c072bf · 2026-10-19 · fix(deploy): publish changed assets and declare YAML dependency

- 完整提交：`34c072bff77936a4b265a3126c627da31494acbc`
- 相对第一父提交涉及文件：

  - `deploy/publish-frontend.py`
  - `deploy/publish-plugins.py`
  - `deploy/publish-static.mjs`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `package.json`
  - `pnpm-lock.yaml`

### 97f1aaa8 · 2026-10-19 · fix(sidebar): restore original C137 logo

- 完整提交：`97f1aaa8b714a4493d87a25e6beb0d5ef2c63612`
- 相对第一父提交涉及文件：

  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `src/assets/c137-logo.webp`
  - `src/modules/sidebar/SidebarHeader.tsx`

### b3023bcc · 2026-10-19 · fix(nas): restore message insertion and C137 branding

- 完整提交：`b3023bcc8842cc5c8e8f184d89ffd5f10656734e`
- 相对第一父提交涉及文件：

  - `README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `index.html`
  - `public/manifest.json`
  - `server/index.ts`
  - `server/modules/providers/list/codex/codex-app-server.runtime.ts`
  - `server/modules/providers/list/codex/codex-runtime.provider.ts`
  - `server/modules/providers/services/provider-runtime.service.ts`
  - `server/modules/providers/tests/codex-app-server.runtime.test.ts`
  - `server/modules/scheduled-messages/scheduled-messages.routes.ts`
  - `server/modules/scheduled-messages/services/scheduled-message-dispatcher.service.ts`
  - `server/modules/scheduled-messages/tests/scheduled-messages.test.ts`
  - `server/modules/user/tests/user.service.test.ts`
  - `server/modules/user/user.service.ts`
  - `server/modules/websocket/services/chat-run-registry.service.ts`
  - `server/modules/websocket/services/chat-session-writer.service.ts`
  - `server/modules/websocket/services/chat-websocket.service.ts`
  - `server/modules/websocket/tests/chat-run-registry.test.ts`
  - `server/shared/index.ts`
  - `server/shared/interfaces.ts`
  - `server/shared/types.ts`
  - `src/assets/user-avatar.jpg`
  - `src/modules/auth/AuthLoadingScreen.tsx`
  - `src/modules/auth/AuthScreenLayout.tsx`
  - `src/modules/chat/ChatInterface.tsx`
  - `src/modules/chat/composer/ChatComposer.tsx`
  - `src/modules/chat/composer/QueuedMessageCard.tsx`
  - `src/modules/chat/hooks/useChatComposerState.ts`
  - `src/modules/chat/tests/composerSendOverBackgroundWork.test.ts`
  - `src/modules/chat/tests/sessionMessageReconciliation.test.ts`
  - `src/modules/chat/transcript/MessageComponent.tsx`
  - `src/modules/chat/utils/sessionMessageReconciliation.ts`
  - `src/modules/i18n/locales/cs/auth.json`
  - `src/modules/i18n/locales/cs/common.json`
  - `src/modules/i18n/locales/cs/sidebar.json`
  - `src/modules/i18n/locales/de/auth.json`
  - `src/modules/i18n/locales/de/common.json`
  - `src/modules/i18n/locales/de/sidebar.json`
  - `src/modules/i18n/locales/en/auth.json`
  - `src/modules/i18n/locales/en/chat.json`
  - `src/modules/i18n/locales/en/common.json`
  - `src/modules/i18n/locales/en/sidebar.json`
  - `src/modules/i18n/locales/es/auth.json`
  - `src/modules/i18n/locales/es/common.json`
  - `src/modules/i18n/locales/es/sidebar.json`
  - `src/modules/i18n/locales/fr/auth.json`
  - `src/modules/i18n/locales/fr/common.json`
  - `src/modules/i18n/locales/fr/sidebar.json`
  - `src/modules/i18n/locales/he/auth.json`
  - `src/modules/i18n/locales/he/common.json`
  - `src/modules/i18n/locales/he/sidebar.json`
  - `src/modules/i18n/locales/id/auth.json`
  - `src/modules/i18n/locales/id/common.json`
  - `src/modules/i18n/locales/id/sidebar.json`
  - `src/modules/i18n/locales/it/auth.json`
  - `src/modules/i18n/locales/it/common.json`
  - `src/modules/i18n/locales/it/sidebar.json`
  - `src/modules/i18n/locales/ja/auth.json`
  - `src/modules/i18n/locales/ja/common.json`
  - `src/modules/i18n/locales/ja/sidebar.json`
  - `src/modules/i18n/locales/ko/auth.json`
  - `src/modules/i18n/locales/ko/common.json`
  - `src/modules/i18n/locales/ko/sidebar.json`
  - `src/modules/i18n/locales/pt-BR/auth.json`
  - `src/modules/i18n/locales/pt-BR/common.json`
  - `src/modules/i18n/locales/pt-BR/sidebar.json`
  - `src/modules/i18n/locales/ru/auth.json`
  - `src/modules/i18n/locales/ru/common.json`
  - `src/modules/i18n/locales/ru/sidebar.json`
  - `src/modules/i18n/locales/tr/auth.json`
  - `src/modules/i18n/locales/tr/common.json`
  - `src/modules/i18n/locales/tr/sidebar.json`
  - `src/modules/i18n/locales/zh-CN/auth.json`
  - `src/modules/i18n/locales/zh-CN/chat.json`
  - `src/modules/i18n/locales/zh-CN/common.json`
  - `src/modules/i18n/locales/zh-CN/sidebar.json`
  - `src/modules/i18n/locales/zh-TW/auth.json`
  - `src/modules/i18n/locales/zh-TW/chat.json`
  - `src/modules/i18n/locales/zh-TW/common.json`
  - `src/modules/i18n/locales/zh-TW/sidebar.json`
  - `src/modules/sidebar/SidebarCollapsed.tsx`
  - `src/modules/sidebar/SidebarFooter.tsx`
  - `src/modules/sidebar/SidebarHeader.tsx`
  - `src/shared/api.ts`
  - `src/shared/chatDrafts.ts`
  - `src/shared/tests/chatDrafts.test.ts`
  - `src/shared/tests/pageTitle.test.ts`
  - `src/shared/utils.ts`

### cb24516c · 2026-10-19 · feat(nas): restore filtered file browsing and retain C137 assets

- 完整提交：`cb24516c2304a29808b0d54cf309e24858449923`
- 相对第一父提交涉及文件：

  - `AGENTS.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/upstream-sync-policy.md`
  - `index.html`
  - `public/favicon-c137-a6353f89.ico`
  - `public/favicon-c137-a6353f89.png`
  - `public/favicon.ico`
  - `public/favicon.png`
  - `public/favicon.svg`
  - `public/icons/c137-a6353f89-128.png`
  - `public/icons/c137-a6353f89-144.png`
  - `public/icons/c137-a6353f89-152.png`
  - `public/icons/c137-a6353f89-180.png`
  - `public/icons/c137-a6353f89-192.png`
  - `public/icons/c137-a6353f89-384.png`
  - `public/icons/c137-a6353f89-512.png`
  - `public/icons/c137-a6353f89-72.png`
  - `public/icons/c137-a6353f89-96.png`
  - `public/icons/icon-128x128.png`
  - `public/icons/icon-144x144.png`
  - `public/icons/icon-152x152.png`
  - `public/icons/icon-180x180.png`
  - `public/icons/icon-192x192.png`
  - `public/icons/icon-384x384.png`
  - `public/icons/icon-512x512.png`
  - `public/icons/icon-72x72.png`
  - `public/icons/icon-96x96.png`
  - `public/logo-128.png`
  - `public/logo-256.png`
  - `public/logo-32.png`
  - `public/logo-512.png`
  - `public/logo-64.png`
  - `public/manifest.json`
  - `public/sw.js`
  - `scripts/generate-brand-icons.mjs`
  - `server/modules/file-tree/file-tree.service.ts`
  - `server/modules/file-tree/tests/file-tree.service.test.ts`
  - `src/shared/api.ts`
  - `src/shared/tests/readApiJson.test.ts`

### 83d3f804 · 2026-10-19 · fix(nas): correct session activity and queued chat behavior

- 完整提交：`83d3f8042e8c4bf4b01ecb873f2d881f59cdf150`
- 相对第一父提交涉及文件：

  - `AGENTS.md`
  - `README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/upstream-sync-policy.md`
  - `server/modules/database/repositories/sessions.db.ts`
  - `server/modules/providers/services/sessions-watcher.service.ts`
  - `server/modules/providers/tests/sessions-watcher.test.ts`
  - `server/shared/utils.ts`
  - `src/modules/chat/ChatInterface.tsx`
  - `src/modules/chat/composer/ChatComposer.tsx`
  - `src/modules/chat/composer/QueuedMessageCard.tsx`
  - `src/modules/chat/hooks/useChatComposerState.ts`
  - `src/modules/chat/tests/composerSendOverBackgroundWork.test.ts`
  - `src/modules/i18n/locales/en/chat.json`
  - `src/modules/i18n/locales/zh-CN/chat.json`
  - `src/modules/i18n/locales/zh-TW/chat.json`

### 574ac952 · 2026-10-19 · feat(codex): reduce historical image uploads with local filtering

- 完整提交：`574ac952effcb88655befdf7278bdf11989ba80a`
- 相对第一父提交涉及文件：

  - `.env.example`
  - `README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `package.json`
  - `pnpm-lock.yaml`
  - `server/modules/database/index.ts`
  - `server/modules/database/repositories/codex-context.db.ts`
  - `server/modules/database/schema.ts`
  - `server/modules/providers/README.md`
  - `server/modules/providers/list/codex/codex-app-server.runtime.ts`
  - `server/modules/providers/list/codex/codex-runtime.provider.ts`
  - `server/modules/providers/list/codex/codex-sessions.provider.ts`
  - `server/modules/providers/provider.routes.ts`
  - `server/modules/providers/services/codex-image-context.service.ts`
  - `server/modules/providers/services/codex-image-proxy.service.ts`
  - `server/modules/providers/services/provider-runtime.service.ts`
  - `server/shared/types.ts`
  - `src/modules/chat/ChatInterface.tsx`
  - `src/modules/chat/hooks/useChatComposerState.ts`
  - `src/modules/chat/modals/CodexContextPanel.tsx`
  - `src/modules/chat/modals/CommandResultModal.tsx`
  - `src/modules/i18n/locales/en/chat.json`
  - `src/modules/i18n/locales/zh-CN/chat.json`
  - `src/modules/i18n/locales/zh-TW/chat.json`
  - `src/shared/api.ts`

### 0eeb3edf · 2026-10-20 · feat(images): share cached WebP conversion across CloudCLI

- 完整提交：`0eeb3edf00f0b5c2f5d1038e0b1b33b89c8e98de`
- 相对第一父提交涉及文件：

  - `.env.example`
  - `README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `package.json`
  - `pnpm-lock.yaml`
  - `server/modules/assets/assets.routes.ts`
  - `server/modules/assets/services/image-assets.service.ts`
  - `server/modules/providers/README.md`
  - `server/modules/providers/services/codex-image-context.service.ts`
  - `server/shared/image-attachments.ts`
  - `server/shared/index.ts`
  - `server/shared/types.ts`
  - `server/shared/utils.ts`

### 704d12e0 · 2026-10-20 · fix(codex): show compaction results and reconcile context actions

- 完整提交：`704d12e089c019c74524f54b2731fb7558f28be1`
- 相对第一父提交涉及文件：

  - `README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `server/modules/providers/list/codex/codex-sessions.provider.ts`
  - `server/modules/providers/tests/codex-sessions.test.ts`
  - `src/modules/chat/hooks/useChatSessionState.ts`
  - `src/modules/chat/tests/leaveSessionWithBackgroundWork.test.tsx`

### bc55622b · 2026-10-20 · feat(codex): add request compression and workspace file access

- 完整提交：`bc55622b4f2611fc7312c919caf41f2f6412643b`
- 相对第一父提交涉及文件：

  - `.env.example`
  - `README.md`
  - `deploy/README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/request-compression.md`
  - `server/modules/file-tree/file-tree.service.ts`
  - `server/modules/file-tree/tests/file-tree.service.test.ts`
  - `server/modules/providers/README.md`
  - `server/modules/providers/services/codex-image-context.service.ts`
  - `server/modules/providers/services/codex-image-proxy.service.ts`
  - `server/modules/providers/services/codex-request-compression.service.ts`
  - `server/modules/providers/tests/codex-request-compression.test.ts`
  - `server/shared/types.ts`
  - `server/shared/utils.ts`
  - `src/modules/chat/modals/CodexContextPanel.tsx`
  - `src/modules/chat/tests/contextUsageDisplay.test.tsx`
  - `src/modules/i18n/locales/en/chat.json`
  - `src/modules/i18n/locales/zh-CN/chat.json`
  - `src/modules/i18n/locales/zh-TW/chat.json`

### f9d27de2 · 2026-10-20 · perf(codex): use zstd compression level 3

- 完整提交：`f9d27de2a166930aae631b477ab1599f980dd234`
- 相对第一父提交涉及文件：

  - `README.md`
  - `deploy/README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/request-compression.md`
  - `server/modules/providers/README.md`
  - `server/modules/providers/services/codex-request-compression.service.ts`

### 3ea21f17 · 2026-10-22 · fix(codex): filter large histories before limits and compress proxy requests

- 完整提交：`3ea21f17afde7cc3ac194eb4212edbc7d565423c`
- 相对第一父提交涉及文件：

  - `.env.example`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/request-compression.md`
  - `server/modules/providers/README.md`
  - `server/modules/providers/services/codex-image-proxy.service.ts`
  - `server/modules/providers/tests/codex-request-compression.test.ts`

### c225cfbe · 2026-10-23 · fix(codex): restore GUI questions in default chat mode

- 完整提交：`c225cfbe9d808528c11444f7b9c7e631025af463`
- 相对第一父提交涉及文件：

  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `server/modules/providers/list/codex/codex-app-server.runtime.ts`
  - `server/modules/providers/tests/codex-app-server.runtime.test.ts`
  - `src/modules/chat/tests/AskUserQuestionPanel.test.tsx`
  - `src/modules/chat/tools/InteractiveRenderers/AskUserQuestionPanel.tsx`

### fcd4fc32 · 2026-10-25 · perf(sync): reduce browser polling and preflight traffic

- 完整提交：`fcd4fc325d97e34323b8c1daa8028d96df517af3`
- 相对第一父提交涉及文件：

  - `deploy/agent-api.conf`
  - `deploy/summarize-cloudcli-traffic.py`
  - `docs/nas/README.md`
  - `docs/nas/browser-backend-traffic.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `server/index.ts`
  - `server/modules/auth/cors-policy.service.ts`
  - `server/modules/auth/index.ts`
  - `server/modules/auth/tests/cors-policy.test.ts`
  - `src/modules/auth/context/AuthContext.tsx`
  - `src/modules/chat/hooks/useChatComposerState.ts`
  - `src/modules/chat/hooks/useChatSessionState.ts`
  - `src/modules/project-workspace/ProjectWorkspaceRoute.tsx`
  - `src/shared/api.ts`
  - `src/shared/chatDrafts.ts`
  - `src/shared/context/SessionProtectionContext.tsx`
  - `src/shared/hooks/useAdaptivePolling.ts`
  - `src/shared/hooks/useSessionProtection.ts`
  - `src/shared/tests/adaptivePolling.test.tsx`
  - `src/shared/tests/backgroundSessionActivity.test.tsx`
  - `src/shared/tests/chatDrafts.test.ts`
  - `src/shared/tests/snapshotRequests.test.ts`
  - `src/shared/types.ts`

### d0664678 · 2026-10-25 · fix(cors): allow preflight reuse without caching API responses

- 完整提交：`d0664678288d131b0656af6d64313aea1081ade9`
- 相对第一父提交涉及文件：

  - `docs/nas/README.md`
  - `docs/nas/browser-backend-traffic.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `server/index.ts`
  - `server/modules/agent/agent.routes.ts`
  - `server/modules/auth/index.ts`
  - `server/modules/auth/response-cache.middleware.ts`
  - `server/modules/auth/tests/cors-policy.test.ts`
  - `server/modules/projects/project-clone.routes.ts`
  - `server/modules/providers/provider.routes.ts`
  - `src/modules/auth/tests/authTokenRefreshRemount.test.tsx`
  - `src/modules/plugins/tests/pluginGitErrors.test.tsx`
  - `src/shared/api.ts`
  - `src/shared/tests/authenticatedFetch.test.ts`
  - `src/shared/tests/snapshotRequests.test.ts`

### 6b02975b · 2026-10-25 · fix(chat): publish authenticated file download actions

- 完整提交：`6b02975b6bdf8f62c6bb02a444e7ee2462a1c553`
- 相对第一父提交涉及文件：

  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `src/modules/chat/tests/fileReferenceLinks.test.tsx`
  - `src/modules/chat/transcript/Markdown.tsx`
  - `src/modules/chat/transcript/WorkspaceFileLink.tsx`
  - `src/modules/code-editor/CodeEditorMediaPreview.tsx`
  - `src/modules/code-editor/hooks/useCodeEditorDocument.ts`
  - `src/modules/code-editor/utils/binaryFile.ts`
  - `src/modules/code-editor/utils/previewableFile.ts`
  - `src/modules/i18n/locales/en/chat.json`
  - `src/modules/i18n/locales/zh-CN/chat.json`
  - `src/modules/i18n/locales/zh-TW/chat.json`
  - `src/shared/utils.ts`

### 2dd64b5e · 2026-10-27 · chore(nas): preserve current customizations before upstream upgrade

- 完整提交：`2dd64b5e65fd4ff1dd8029e3b5706e06a8f99ace`
- 相对第一父提交涉及文件：

  - `.env.example`
  - `deploy/README.md`
  - `deploy/cache-frontend.py`
  - `deploy/cloudcli-backend.service`
  - `deploy/publish-frontend.py`
  - `deploy/publish-static.mjs`
  - `deploy/run-backend.py`
  - `deploy/static-cdn.json`
  - `deploy/verify-services.py`
  - `docs/nas/README.md`
  - `docs/nas/codex-agent-monitor-plan.md`
  - `server/shared/tests/workspace-path-map.test.ts`
  - `server/shared/utils.ts`
  - `src/modules/chat/ChatInterface.tsx`
  - `src/modules/chat/composer/ActivityIndicator.tsx`
  - `src/modules/chat/tests/activityIndicatorBackground.test.tsx`
  - `src/modules/chat/tests/markdownImage.test.tsx`
  - `src/modules/quick-settings-panel/QuickSettingsPanelView.tsx`

### f04d065a · 2026-10-27 · merge: upgrade CloudCLI to v1.37.6 and bound history processing

- 完整提交：`f04d065a0fe2612bb0099afd23540d0e80722d70`（合并提交，整体回退应使用 `git revert -m 1`）
- 相对第一父提交涉及文件：

  - `AGENTS.md`
  - `CHANGELOG.md`
  - `docs/architecture/01-websocket-transport.md`
  - `docs/architecture/04-message-store-and-lazy-loading.md`
  - `docs/architecture/README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/upstream-1376-memory.md`
  - `docs/nas/upstream-sync-policy.md`
  - `package.json`
  - `server/modules/database/repositories/scheduled-messages.db.ts`
  - `server/modules/database/repositories/session-drafts.db.ts`
  - `server/modules/database/tests/user-preferences.db.integration.test.ts`
  - `server/modules/file-tree/file-tree.service.ts`
  - `server/modules/file-tree/tests/file-tree.service.test.ts`
  - `server/modules/providers/README.md`
  - `server/modules/providers/list/claude/claude-auth.provider.ts`
  - `server/modules/providers/list/claude/claude-runtime.provider.js`
  - `server/modules/providers/list/claude/claude-runtime.provider.ts`
  - `server/modules/providers/list/codex/codex-auth.provider.ts`
  - `server/modules/providers/list/codex/codex-sessions.provider.ts`
  - `server/modules/providers/list/cursor/cursor-auth.provider.ts`
  - `server/modules/providers/list/opencode/opencode-auth.provider.ts`
  - `server/modules/providers/provider.routes.ts`
  - `server/modules/providers/services/codex-history-images.service.ts`
  - `server/modules/providers/services/codex-history-reader.service.ts`
  - `server/modules/providers/services/codex-image-context.service.ts`
  - `server/modules/providers/services/provider-cli.service.ts`
  - `server/modules/providers/services/session-history-cache.service.ts`
  - `server/modules/providers/services/sessions-watcher.service.ts`
  - `server/modules/providers/tests/claude-auth.test.ts`
  - `server/modules/providers/tests/claude-sdk-env.test.ts`
  - `server/modules/providers/tests/claude-sessions.test.ts`
  - `server/modules/providers/tests/codex-history-memory.test.ts`
  - `server/modules/providers/tests/provider-cli.service.test.ts`
  - `server/modules/providers/tests/provider.routes.test.ts`
  - `server/modules/providers/tests/session-history-cache.service.test.ts`
  - `server/modules/providers/tests/sessions-watcher.test.ts`
  - `server/modules/scheduled-messages/services/scheduled-message-dispatcher.service.ts`
  - `server/modules/scheduled-messages/services/scheduled-messages.service.ts`
  - `server/modules/scheduled-messages/tests/scheduled-messages.test.ts`
  - `server/modules/user/tests/user.routes.test.ts`
  - `server/modules/user/tests/user.service.test.ts`
  - `server/modules/user/user.module.ts`
  - `server/modules/user/user.routes.ts`
  - `server/modules/user/user.service.ts`
  - `server/modules/websocket/services/chat-websocket.service.ts`
  - `server/modules/websocket/tests/chat-stop-task.test.ts`
  - `server/shared/interfaces.ts`
  - `server/shared/tests/read-queued-chat-message.test.ts`
  - `server/shared/types.ts`
  - `server/shared/utils.ts`
  - `src/modules/chat/ChatInterface.tsx`
  - `src/modules/chat/composer/ChatComposer.tsx`
  - `src/modules/chat/composer/ComposerPermissionMenu.tsx`
  - `src/modules/chat/composer/QueuedMessageCard.tsx`
  - `src/modules/chat/composer/useScheduledMessages.ts`
  - `src/modules/chat/hooks/useChatComposerState.ts`
  - `src/modules/chat/hooks/useChatRealtimeHandlers.ts`
  - `src/modules/chat/hooks/usePermissionNameFit.ts`
  - `src/modules/chat/tests/backgroundWorkAfterComplete.test.tsx`
  - `src/modules/chat/tests/chatInterfaceScheduledMessagesSubscribe.test.tsx`
  - `src/modules/chat/tests/composerPermissionMenu.test.tsx`
  - `src/modules/chat/tests/composerQueuedFollowUps.test.ts`
  - `src/modules/chat/tests/composerSendOverBackgroundWork.test.ts`
  - `src/modules/chat/tests/composerToolsSettingsResolution.test.ts`
  - `src/modules/chat/tests/scheduledMessagesLiveUpdates.test.tsx`
  - `src/modules/chat/tests/useScheduledMessagesSessionSwitch.test.tsx`
  - `src/modules/i18n/config.ts`
  - `src/modules/i18n/locales/cs/chat.json`
  - `src/modules/i18n/locales/cs/settings.json`
  - `src/modules/i18n/locales/de/chat.json`
  - `src/modules/i18n/locales/de/settings.json`
  - `src/modules/i18n/locales/en/chat.json`
  - `src/modules/i18n/locales/en/settings.json`
  - `src/modules/i18n/locales/es/auth.json`
  - `src/modules/i18n/locales/es/chat.json`
  - `src/modules/i18n/locales/es/codeEditor.json`
  - `src/modules/i18n/locales/es/common.json`
  - `src/modules/i18n/locales/es/git.json`
  - `src/modules/i18n/locales/es/settings.json`
  - `src/modules/i18n/locales/es/sidebar.json`
  - `src/modules/i18n/locales/es/tasks.json`
  - `src/modules/i18n/locales/fr/chat.json`
  - `src/modules/i18n/locales/fr/settings.json`
  - `src/modules/i18n/locales/he/chat.json`
  - `src/modules/i18n/locales/he/settings.json`
  - `src/modules/i18n/locales/id/chat.json`
  - `src/modules/i18n/locales/id/settings.json`
  - `src/modules/i18n/locales/it/chat.json`
  - `src/modules/i18n/locales/it/settings.json`
  - `src/modules/i18n/locales/ja/chat.json`
  - `src/modules/i18n/locales/ja/settings.json`
  - `src/modules/i18n/locales/ko/chat.json`
  - `src/modules/i18n/locales/ko/settings.json`
  - `src/modules/i18n/locales/pt-BR/chat.json`
  - `src/modules/i18n/locales/pt-BR/settings.json`
  - `src/modules/i18n/locales/ru/chat.json`
  - `src/modules/i18n/locales/ru/settings.json`
  - `src/modules/i18n/locales/tr/chat.json`
  - `src/modules/i18n/locales/tr/settings.json`
  - `src/modules/i18n/locales/zh-CN/chat.json`
  - `src/modules/i18n/locales/zh-CN/git.json`
  - `src/modules/i18n/locales/zh-CN/settings.json`
  - `src/modules/i18n/locales/zh-TW/chat.json`
  - `src/modules/i18n/locales/zh-TW/git.json`
  - `src/modules/i18n/locales/zh-TW/settings.json`
  - `src/modules/i18n/tests/translationCoverage.test.ts`
  - `src/modules/project-workspace/hooks/useProjectsState.ts`
  - `src/modules/project-workspace/tests/projectsStateScheduledAnnouncement.test.ts`
  - `src/modules/provider-auth/hooks/useProviderAuthStatus.ts`
  - `src/modules/provider-auth/tests/useProviderAuthStatusSubscriptionOverride.test.ts`
  - `src/modules/settings/hooks/useProviderCliVersion.ts`
  - `src/modules/settings/tabs/AppearanceSettingsTab.tsx`
  - `src/modules/settings/tabs/agents-settings/sections/content/AccountContent.tsx`
  - `src/modules/settings/tabs/agents-settings/sections/content/ProviderCliVersion.tsx`
  - `src/modules/settings/tests/accountContentSubscriptionOverride.test.tsx`
  - `src/modules/settings/tests/fontSizeControls.test.tsx`
  - `src/modules/settings/tests/providerCliVersion.test.tsx`
  - `src/modules/sidebar/Sidebar.tsx`
  - `src/modules/sidebar/hooks/useSidebarController.ts`
  - `src/modules/sidebar/tests/loadMoreProjectSessions.test.ts`
  - `src/modules/sidebar/tests/sessionBulkSelection.test.ts`
  - `src/shared/api.ts`
  - `src/shared/chatDrafts.ts`
  - `src/shared/tests/chatDrafts.test.ts`
  - `src/shared/tests/uiPreferences.test.ts`
  - `src/shared/types.ts`
  - `src/shared/uiPreferences.ts`
  - `.dockerignore`
  - `.env.example`
  - `.husky/pre-commit`
  - `.oxlintrc.json`
  - `README.md`
  - `deploy/CHANGELOG.md`
  - `deploy/README.md`
  - `deploy/agent-api.conf`
  - `deploy/bootstrap-user.py`
  - `deploy/cache-frontend.py`
  - `deploy/cloudcli-backend.service`
  - `deploy/configure-cloudflare.py`
  - `deploy/frontend.conf`
  - `deploy/publish-frontend.py`
  - `deploy/publish-plugins.py`
  - `deploy/publish-static.mjs`
  - `deploy/run-backend.py`
  - `deploy/static-cdn.json`
  - `deploy/summarize-cloudcli-traffic.py`
  - `deploy/verify-services.py`
  - `docs/codex-app-server-rollout.md`
  - `docs/nas/browser-backend-traffic.md`
  - `docs/nas/codex-agent-monitor-plan.md`
  - `docs/nas/request-compression.md`
  - `docs/nas/upstream-base.txt`
  - `index.html`
  - `local-plugins/cloudcli-host-dashboard/README.md`
  - `local-plugins/cloudcli-host-dashboard/icon.svg`
  - `local-plugins/cloudcli-host-dashboard/manifest.json`
  - `local-plugins/cloudcli-host-dashboard/package.json`
  - `local-plugins/cloudcli-host-dashboard/pnpm-lock.yaml`
  - `local-plugins/cloudcli-host-dashboard/pnpm-workspace.yaml`
  - `local-plugins/cloudcli-host-dashboard/src/index.ts`
  - `local-plugins/cloudcli-host-dashboard/src/metrics.test.ts`
  - `local-plugins/cloudcli-host-dashboard/src/metrics.ts`
  - `local-plugins/cloudcli-host-dashboard/src/server.ts`
  - `local-plugins/cloudcli-host-dashboard/tsconfig.json`
  - `package-lock.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
  - `public/favicon-c137-a6353f89.ico`
  - `public/favicon-c137-a6353f89.png`
  - `public/favicon.ico`
  - `public/favicon.png`
  - `public/favicon.svg`
  - `public/icons/c137-a6353f89-128.png`
  - `public/icons/c137-a6353f89-144.png`
  - `public/icons/c137-a6353f89-152.png`
  - `public/icons/c137-a6353f89-180.png`
  - `public/icons/c137-a6353f89-192.png`
  - `public/icons/c137-a6353f89-384.png`
  - `public/icons/c137-a6353f89-512.png`
  - `public/icons/c137-a6353f89-72.png`
  - `public/icons/c137-a6353f89-96.png`
  - `public/icons/icon-128x128.png`
  - `public/icons/icon-144x144.png`
  - `public/icons/icon-152x152.png`
  - `public/icons/icon-180x180.png`
  - `public/icons/icon-192x192.png`
  - `public/icons/icon-384x384.png`
  - `public/icons/icon-512x512.png`
  - `public/icons/icon-72x72.png`
  - `public/icons/icon-96x96.png`
  - `public/logo-128.png`
  - `public/logo-256.png`
  - `public/logo-32.png`
  - `public/logo-512.png`
  - `public/logo-64.png`
  - `public/manifest.json`
  - `public/sw.js`
  - `scripts/generate-brand-icons.mjs`
  - `scripts/record-nas-changes.mjs`
  - `server/index.ts`
  - `server/modules/agent/agent.routes.ts`
  - `server/modules/assets/assets.routes.ts`
  - `server/modules/assets/services/image-assets.service.ts`
  - `server/modules/auth/cors-policy.service.ts`
  - `server/modules/auth/index.ts`
  - `server/modules/auth/response-cache.middleware.ts`
  - `server/modules/auth/tests/cors-policy.test.ts`
  - `server/modules/database/index.ts`
  - `server/modules/database/migrations.ts`
  - `server/modules/database/repositories/codex-context.db.ts`
  - `server/modules/database/repositories/sessions.db.ts`
  - `server/modules/database/schema.ts`
  - `server/modules/notifications/index.ts`
  - `server/modules/notifications/services/notification-orchestrator.service.js`
  - `server/modules/projects/project-clone.routes.ts`
  - `server/modules/providers/list/codex/codex-app-server.client.ts`
  - `server/modules/providers/list/codex/codex-app-server.config.ts`
  - `server/modules/providers/list/codex/codex-app-server.process.ts`
  - `server/modules/providers/list/codex/codex-app-server.runtime.ts`
  - `server/modules/providers/list/codex/codex-app-server.transport.ts`
  - `server/modules/providers/list/codex/codex-runtime.provider.ts`
  - `server/modules/providers/services/codex-context-limits.service.ts`
  - `server/modules/providers/services/codex-image-proxy.service.ts`
  - `server/modules/providers/services/codex-request-compression.service.ts`
  - `server/modules/providers/services/provider-runtime.service.ts`
  - `server/modules/providers/services/provider-session-settings.service.ts`
  - `server/modules/providers/services/provider-token-usage.service.ts`
  - `server/modules/providers/services/sessions.service.ts`
  - `server/modules/providers/tests/claude-runtime-hold.test.ts`
  - `server/modules/providers/tests/codex-app-server.process.test.ts`
  - `server/modules/providers/tests/codex-app-server.runtime.test.ts`
  - `server/modules/providers/tests/codex-app-server.transport.test.ts`
  - `server/modules/providers/tests/codex-context-limits.service.test.ts`
  - `server/modules/providers/tests/codex-models.test.ts`
  - `server/modules/providers/tests/codex-request-compression.test.ts`
  - `server/modules/providers/tests/codex-runtime.test.ts`
  - `server/modules/providers/tests/codex-sessions.test.ts`
  - `server/modules/providers/tests/provider-runtime.service.test.ts`
  - `server/modules/providers/tests/provider-token-usage.service.test.ts`
  - `server/modules/scheduled-messages/scheduled-messages.routes.ts`
  - `server/modules/websocket/README.md`
  - `server/modules/websocket/services/chat-run-registry.service.ts`
  - `server/modules/websocket/services/chat-session-writer.service.ts`
  - `server/modules/websocket/tests/chat-run-registry.test.ts`
  - `server/shared/image-attachments.ts`
  - `server/shared/index.ts`
  - `server/shared/tests/read-only-roots.test.ts`
  - `server/shared/tests/workspace-path-map.test.ts`
  - `server/tsconfig.json`
  - `src/App.tsx`
  - `src/assets/c137-logo.webp`
  - `src/assets/user-avatar.jpg`
  - `src/modules/auth/AuthLoadingScreen.tsx`
  - `src/modules/auth/AuthScreenLayout.tsx`
  - `src/modules/auth/context/AuthContext.tsx`
  - `src/modules/auth/tests/authTokenRefreshRemount.test.tsx`
  - `src/modules/chat/composer/ActivityIndicator.tsx`
  - `src/modules/chat/composer/ComposerMenuPrimitives.tsx`
  - `src/modules/chat/composer/ComposerModelMenu.tsx`
  - `src/modules/chat/composer/PermissionRequestsBanner.tsx`
  - `src/modules/chat/composer/TokenUsageSummary.tsx`
  - `src/modules/chat/hooks/useChatSessionState.ts`
  - `src/modules/chat/hooks/useCodexFastState.ts`
  - `src/modules/chat/hooks/useSessionStore.ts`
  - `src/modules/chat/modals/CodexContextPanel.tsx`
  - `src/modules/chat/modals/CommandResultModal.tsx`
  - `src/modules/chat/tests/AskUserQuestionPanel.test.tsx`
  - `src/modules/chat/tests/activityIndicatorBackground.test.tsx`
  - `src/modules/chat/tests/codexFastState.test.ts`
  - `src/modules/chat/tests/composerTextEditing.test.tsx`
  - `src/modules/chat/tests/contextUsageDisplay.test.tsx`
  - `src/modules/chat/tests/fileReferenceLinks.test.tsx`
  - `src/modules/chat/tests/leaveSessionWithBackgroundWork.test.tsx`
  - `src/modules/chat/tests/markdownImage.test.tsx`
  - `src/modules/chat/tests/permissionRequestsBanner.test.tsx`
  - `src/modules/chat/tests/sessionMessageReconciliation.test.ts`
  - `src/modules/chat/tests/sessionStoreTruncate.test.tsx`
  - `src/modules/chat/tools/InteractiveRenderers/AskUserQuestionPanel.tsx`
  - `src/modules/chat/transcript/Markdown.tsx`
  - `src/modules/chat/transcript/MessageComponent.tsx`
  - `src/modules/chat/transcript/WorkspaceFileLink.tsx`
  - `src/modules/chat/utils/sessionMessageReconciliation.ts`
  - `src/modules/code-editor/CodeEditorBinaryFile.tsx`
  - `src/modules/code-editor/CodeEditorHeader.tsx`
  - `src/modules/code-editor/CodeEditorMediaPreview.tsx`
  - `src/modules/code-editor/hooks/useCodeEditorDocument.ts`
  - `src/modules/code-editor/utils/binaryFile.ts`
  - `src/modules/code-editor/utils/previewableFile.ts`
  - `src/modules/command-palette/CommandPalette.tsx`
  - `src/modules/file-tree/FileTree.tsx`
  - `src/modules/file-tree/FileTreeNode.tsx`
  - `src/modules/i18n/locales/cs/auth.json`
  - `src/modules/i18n/locales/cs/common.json`
  - `src/modules/i18n/locales/cs/sidebar.json`
  - `src/modules/i18n/locales/de/auth.json`
  - `src/modules/i18n/locales/de/common.json`
  - `src/modules/i18n/locales/de/sidebar.json`
  - `src/modules/i18n/locales/en/auth.json`
  - `src/modules/i18n/locales/en/common.json`
  - `src/modules/i18n/locales/en/sidebar.json`
  - `src/modules/i18n/locales/fr/auth.json`
  - `src/modules/i18n/locales/fr/common.json`
  - `src/modules/i18n/locales/fr/sidebar.json`
  - `src/modules/i18n/locales/he/auth.json`
  - `src/modules/i18n/locales/he/common.json`
  - `src/modules/i18n/locales/he/sidebar.json`
  - `src/modules/i18n/locales/id/auth.json`
  - `src/modules/i18n/locales/id/common.json`
  - `src/modules/i18n/locales/id/sidebar.json`
  - `src/modules/i18n/locales/it/auth.json`
  - `src/modules/i18n/locales/it/common.json`
  - `src/modules/i18n/locales/it/sidebar.json`
  - `src/modules/i18n/locales/ja/auth.json`
  - `src/modules/i18n/locales/ja/common.json`
  - `src/modules/i18n/locales/ja/sidebar.json`
  - `src/modules/i18n/locales/ko/auth.json`
  - `src/modules/i18n/locales/ko/common.json`
  - `src/modules/i18n/locales/ko/sidebar.json`
  - `src/modules/i18n/locales/pt-BR/auth.json`
  - `src/modules/i18n/locales/pt-BR/common.json`
  - `src/modules/i18n/locales/pt-BR/sidebar.json`
  - `src/modules/i18n/locales/ru/auth.json`
  - `src/modules/i18n/locales/ru/common.json`
  - `src/modules/i18n/locales/ru/sidebar.json`
  - `src/modules/i18n/locales/tr/auth.json`
  - `src/modules/i18n/locales/tr/common.json`
  - `src/modules/i18n/locales/tr/sidebar.json`
  - `src/modules/i18n/locales/zh-CN/auth.json`
  - `src/modules/i18n/locales/zh-CN/common.json`
  - `src/modules/i18n/locales/zh-CN/sidebar.json`
  - `src/modules/i18n/locales/zh-TW/auth.json`
  - `src/modules/i18n/locales/zh-TW/common.json`
  - `src/modules/i18n/locales/zh-TW/sidebar.json`
  - `src/modules/plugins/PluginTabContent.tsx`
  - `src/modules/plugins/tests/hostDashboardPolling.test.ts`
  - `src/modules/plugins/tests/pluginGitErrors.test.tsx`
  - `src/modules/project-workspace/ProjectWorkspaceRoute.tsx`
  - `src/modules/quick-settings-panel/QuickSettingsPanelView.tsx`
  - `src/modules/settings/Settings.tsx`
  - `src/modules/settings/hooks/useSettingsController.ts`
  - `src/modules/settings/tabs/agents-settings/AgentsSettingsTab.tsx`
  - `src/modules/settings/tabs/agents-settings/sections/AgentCategoryContentSection.tsx`
  - `src/modules/settings/tabs/agents-settings/sections/content/PermissionsContent.tsx`
  - `src/modules/settings/tests/codexPermissionsRuntime.test.tsx`
  - `src/modules/shell/utils/socket.ts`
  - `src/modules/sidebar/SidebarCollapsed.tsx`
  - `src/modules/sidebar/SidebarFooter.tsx`
  - `src/modules/sidebar/SidebarHeader.tsx`
  - `src/modules/sidebar/tests/recentConversationTitleSync.test.ts`
  - `src/shared/constants.ts`
  - `src/shared/context/SessionProtectionContext.tsx`
  - `src/shared/context/UiPreferencesContext.tsx`
  - `src/shared/context/WebSocketContext.tsx`
  - `src/shared/hooks/useAdaptivePolling.ts`
  - `src/shared/hooks/useFontSizes.ts`
  - `src/shared/hooks/useSessionProtection.ts`
  - `src/shared/tests/adaptivePolling.test.tsx`
  - `src/shared/tests/authenticatedFetch.test.ts`
  - `src/shared/tests/backgroundSessionActivity.test.tsx`
  - `src/shared/tests/fontSizes.test.tsx`
  - `src/shared/tests/pageTitle.test.ts`
  - `src/shared/tests/readApiJson.test.ts`
  - `src/shared/tests/snapshotRequests.test.ts`
  - `src/shared/utils.ts`
  - `tsconfig.json`
  - `vite.config.js`
  - `vitest.setup.ts`

### 41134cbe · 2026-10-27 · docs(nas): finalize verified v1.37.6 baseline

- 完整提交：`41134cbe82ba2190778c15880ee0c4e274ce4bbc`
- 相对第一父提交涉及文件：

  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/upstream-base.txt`
  - `docs/nas/upstream-sync-policy.md`

### 11e96994 · 2026-10-27 · docs(nas): record authorized v1.37.6 runtime deployment

- 完整提交：`11e96994090ae86da8409dee6467ec086dd64a4b`
- 相对第一父提交涉及文件：

  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/upstream-1376-memory.md`

### e7256018 · 2026-10-27 · fix(sidebar): check deployed version before offering updates

- 完整提交：`e725601899a9c2fddfc72bd533629329b915832a`
- 相对第一父提交涉及文件：

  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `docs/nas/upstream-1376-memory.md`
  - `src/modules/sidebar/SidebarFooter.tsx`
  - `src/shared/api.ts`
  - `src/shared/hooks/useAdaptivePolling.ts`
  - `src/shared/hooks/useVersionCheck.ts`
  - `src/shared/tests/useVersionCheck.test.tsx`
  - `src/shared/tests/versionApi.test.ts`

### 9139e428 · 2026-10-28 · fix(chat): sync gateway models and restore interactive workflows

- 完整提交：`9139e428b139909a570ef6ab472ccaaeccdd9bd3`
- 相对第一父提交涉及文件：

  - `deploy/README.md`
  - `deploy/publish-static.mjs`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `server/modules/providers/list/codex/codex-app-server.runtime.ts`
  - `server/modules/providers/list/codex/codex-models.provider.ts`
  - `server/modules/providers/list/codex/codex-sessions.provider.ts`
  - `server/modules/providers/list/opencode/opencode-sessions.provider.ts`
  - `server/modules/providers/services/provider-models.service.ts`
  - `server/modules/providers/services/sessions.service.ts`
  - `server/modules/providers/tests/codex-app-server.runtime.test.ts`
  - `server/modules/providers/tests/codex-models.test.ts`
  - `server/modules/providers/tests/codex-sessions.test.ts`
  - `server/modules/providers/tests/opencode-sessions.test.ts`
  - `server/modules/providers/tests/provider-models.service.test.ts`
  - `server/shared/interfaces.ts`
  - `server/shared/types.ts`
  - `src/modules/chat/ChatInterface.tsx`
  - `src/modules/chat/composer/ComposerModelMenu.tsx`
  - `src/modules/chat/composer/ModelGroupList.tsx`
  - `src/modules/chat/context/TranscriptSessionContext.ts`
  - `src/modules/chat/hooks/useChatComposerState.ts`
  - `src/modules/chat/hooks/useChatMessages.ts`
  - `src/modules/chat/hooks/useChatProviderState.ts`
  - `src/modules/chat/hooks/useSessionStore.ts`
  - `src/modules/chat/modals/CommandResultModal.tsx`
  - `src/modules/chat/tests/AsyncQuestionCard.test.tsx`
  - `src/modules/chat/tests/chatProviderModels.test.ts`
  - `src/modules/chat/tests/composerQueuedFollowUps.test.ts`
  - `src/modules/chat/tests/fileReferenceLinks.test.tsx`
  - `src/modules/chat/transcript/AsyncQuestionCard.tsx`
  - `src/modules/chat/transcript/MessageComponent.tsx`
  - `src/modules/chat/transcript/WorkspaceFileLink.tsx`
  - `src/modules/i18n/locales/en/chat.json`
  - `src/modules/i18n/locales/zh-CN/chat.json`
  - `src/modules/i18n/locales/zh-TW/chat.json`
  - `src/shared/types.ts`

### 6efc19a6 · 2026-10-29 · feat(codex): add native subagent panel and immediate question answers

- 完整提交：`6efc19a61f24ef871000696c822a486598888d85`
- 相对第一父提交涉及文件：

  - `.finesse/log.json`
  - `deploy/README.md`
  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `local-plugins/cloudcli-codex-agents/README.md`
  - `local-plugins/cloudcli-codex-agents/manifest.json`
  - `local-plugins/cloudcli-codex-agents/package.json`
  - `local-plugins/cloudcli-codex-agents/pnpm-lock.yaml`
  - `local-plugins/cloudcli-codex-agents/pnpm-workspace.yaml`
  - `local-plugins/cloudcli-codex-agents/src/history.ts`
  - `local-plugins/cloudcli-codex-agents/src/index.ts`
  - `local-plugins/cloudcli-codex-agents/src/reader.ts`
  - `local-plugins/cloudcli-codex-agents/src/server.ts`
  - `local-plugins/cloudcli-codex-agents/tsconfig.json`
  - `local-plugins/cloudcli-host-dashboard/src/server.ts`
  - `server/modules/plugins/plugin-process.service.ts`
  - `server/modules/plugins/plugins.routes.ts`
  - `server/modules/plugins/tests/plugins.service.test.ts`
  - `server/modules/providers/list/codex/codex-app-server.runtime.ts`
  - `server/modules/providers/provider.routes.ts`
  - `server/modules/providers/services/provider-runtime.service.ts`
  - `server/modules/providers/tests/codex-app-server.runtime.test.ts`
  - `server/modules/providers/tests/provider.routes.test.ts`
  - `src/modules/chat/context/TranscriptSessionContext.ts`
  - `src/modules/chat/hooks/useChatComposerState.ts`
  - `src/modules/chat/tests/AsyncQuestionCard.test.tsx`
  - `src/modules/chat/tests/composerQueuedFollowUps.test.ts`
  - `src/modules/chat/transcript/AsyncQuestionCard.tsx`
  - `src/modules/codex-agents/CodexAgentsActivity.tsx`
  - `src/modules/codex-agents/CodexAgentsPanel.tsx`
  - `src/modules/codex-agents/CodexAgentsPlugin.tsx`
  - `src/modules/codex-agents/context/CodexAgentsContext.tsx`
  - `src/modules/codex-agents/index.ts`
  - `src/modules/codex-agents/tests/codexAgentsState.test.tsx`
  - `src/modules/plugins/PluginIcon.tsx`
  - `src/modules/plugins/PluginTabContent.tsx`
  - `src/modules/project-workspace/WorkspaceHeader.tsx`
  - `src/modules/project-workspace/WorkspaceMain.tsx`
  - `src/shared/api.ts`
  - `src/shared/types.ts`

### 1d65b64c · 2026-10-29 · fix(codex): allow clearing unconfirmed subagent records

- 完整提交：`1d65b64ccbd334b59d5dd31c22b46d1d93dc197a`
- 相对第一父提交涉及文件：

  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `local-plugins/cloudcli-codex-agents/README.md`
  - `local-plugins/cloudcli-codex-agents/src/history.ts`
  - `local-plugins/cloudcli-codex-agents/src/reader.ts`
  - `local-plugins/cloudcli-codex-agents/src/server.ts`
  - `src/modules/codex-agents/CodexAgentsPanel.tsx`

### 8d2bea1c · 2026-10-29 · feat(settings): add default directory and fix localized folder browsing

- 完整提交：`8d2bea1c37ced473d6b1a29b7863151d276fe5b8`
- 相对第一父提交涉及文件：

  - `docs/nas/README.md`
  - `docs/nas/commit-log.md`
  - `docs/nas/file-index.md`
  - `server/modules/file-tree/file-tree.service.ts`
  - `src/modules/i18n/locales/en/common.json`
  - `src/modules/i18n/locales/en/settings.json`
  - `src/modules/i18n/locales/zh-CN/common.json`
  - `src/modules/i18n/locales/zh-CN/settings.json`
  - `src/modules/i18n/locales/zh-TW/common.json`
  - `src/modules/i18n/locales/zh-TW/settings.json`
  - `src/modules/project-creation-wizard/FolderBrowserModal.tsx`
  - `src/modules/project-creation-wizard/utils/workspaceApi.ts`
  - `src/modules/settings/DefaultDirectorySetting.tsx`
  - `src/modules/settings/tabs/AppearanceSettingsTab.tsx`
  - `src/shared/hooks/useDefaultDirectory.ts`
  - `src/shared/userSettings.ts`

## 从 PR / 其他分支合入的提交

