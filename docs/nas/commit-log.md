# NAS 分支完整提交记录（自动生成）

官方基线：`v1.37.5` (`0ce5630f46c283653359820870df1afd67cb1cf5`)。历史覆盖至生成时的 HEAD：`04bb14392e1bf1d8af3166ccc0a1be3b1a3142e1`。

功能说明和回退依赖见 [维护指南](README.md)，完整净差异见 [文件索引](file-index.md)。不要手动编辑本文件。

## 随本次提交入库的变更

下表来自暂存区，不包含这两个自动生成文件。该提交的 SHA 在提交完成后才产生；下一次生成时会进入下方历史。

| 状态 | 文件 | 原路径 |
| --- | --- | --- |
| M | [deploy/publish-frontend.py](../../deploy/publish-frontend.py) | — |
| M | [deploy/publish-plugins.py](../../deploy/publish-plugins.py) | — |
| M | [deploy/publish-static.mjs](../../deploy/publish-static.mjs) | — |
| M | [docs/nas/README.md](../../docs/nas/README.md) | — |
| M | [package.json](../../package.json) | — |
| M | [pnpm-lock.yaml](../../pnpm-lock.yaml) | — |

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

## 从 PR / 其他分支合入的提交

