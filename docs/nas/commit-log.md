# NAS 分支完整提交记录（自动生成）

官方基线：`v1.37.5` (`0ce5630f46c283653359820870df1afd67cb1cf5`)。历史覆盖至生成时的 HEAD：`d0664678288d131b0656af6d64313aea1081ade9`。

功能说明和回退依赖见 [维护指南](README.md)，完整净差异见 [文件索引](file-index.md)。不要手动编辑本文件。

## 随本次提交入库的变更

下表来自暂存区，不包含这两个自动生成文件。该提交的 SHA 在提交完成后才产生；下一次生成时会进入下方历史。

| 状态 | 文件 | 原路径 |
| --- | --- | --- |
| M | [docs/nas/README.md](../../docs/nas/README.md) | — |
| M | [src/modules/chat/tests/fileReferenceLinks.test.tsx](../../src/modules/chat/tests/fileReferenceLinks.test.tsx) | — |
| M | [src/modules/chat/transcript/Markdown.tsx](../../src/modules/chat/transcript/Markdown.tsx) | — |
| A | [src/modules/chat/transcript/WorkspaceFileLink.tsx](../../src/modules/chat/transcript/WorkspaceFileLink.tsx) | — |
| M | [src/modules/code-editor/CodeEditorMediaPreview.tsx](../../src/modules/code-editor/CodeEditorMediaPreview.tsx) | — |
| M | [src/modules/code-editor/hooks/useCodeEditorDocument.ts](../../src/modules/code-editor/hooks/useCodeEditorDocument.ts) | — |
| D | [src/modules/code-editor/utils/binaryFile.ts](../../src/modules/code-editor/utils/binaryFile.ts) | — |
| D | [src/modules/code-editor/utils/previewableFile.ts](../../src/modules/code-editor/utils/previewableFile.ts) | — |
| M | [src/modules/i18n/locales/en/chat.json](../../src/modules/i18n/locales/en/chat.json) | — |
| M | [src/modules/i18n/locales/zh-CN/chat.json](../../src/modules/i18n/locales/zh-CN/chat.json) | — |
| M | [src/modules/i18n/locales/zh-TW/chat.json](../../src/modules/i18n/locales/zh-TW/chat.json) | — |
| M | [src/shared/utils.ts](../../src/shared/utils.ts) | — |

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

## 从 PR / 其他分支合入的提交

