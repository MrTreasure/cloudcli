# NAS 精简分支维护指南

## 官方基线与历史

- 本分支 `nas-clean-v1.37.5` 直接建立在官方 `v1.37.5`（`0ce5630f46c283653359820870df1afd67cb1cf5`）之上。
- 原 `nas` 的 `2ef0d625` 保留完整旧功能及升级合并历史，作为回退参考；此前官方基线为 `v1.37.4`（`7c3049fe8e157f12b7add3e496d8d2fe6fa5c014`）。本分支没有继承旧 NAS 功能提交。
- 产品功能仅保留 Fast、实时 Todo、基础输入快捷键、界面与文件名字号、仪表盘、上下文百分比及压缩阈值布局。重叠功能使用官方实现，尤其是消息发送/排队、命令列表、模型目录、认证和工具卡片。
- 旧 FIFO/插入队列、原生命令定制/隐藏、品牌/头像设置、额外技能描述截断、隐藏文件过滤规则、Task Queue MCP/其他本地插件不移入本分支。

## 构建及 NAS 部署适配

目的：保留同源开发与 NAS API/CDN 分离部署的能力，不在通用运行默认值中写入本机路径或凭据。

路径：`deploy/`、`vite.config.js`、`src/shared/api.ts`、`src/shared/utils.ts`、WebSocket/终端/插件传输，`server/index.ts` 的显式 CORS 和自动化 API key 作用域；`package.json`、pnpm 锁、TypeScript 配置；模块规范和变更记录脚本。

来源：原 NAS 部署适配，重建于官方 1.37.5。保留 pnpm 12.3.4、TypeScript 7 和 Codex SDK 0.162.0；使用本机安装的 CLI，避免 SDK 再携带一套 CLI。SDK 版本用于 Fast 的 `service_tier` 支持。

回退：可单独回退本次部署适配提交，但之后依赖此 SDK/传输的功能需先回退。普通电脑复制 `.env.example` 到忽略的 `.env`，安装本机 CLI，执行 `pnpm install`、`pnpm dev`；不设置 `VITE_API_ORIGIN`/`VITE_STATIC_ASSET_BASE`。NAS 按 [部署说明](../../deploy/README.md) 发布。

## 验证与生效

本次仅整理源码和提交历史；验证结果见下表。构建不会自动发布前端或重启运行中的后端。部署状态、CLI 配置和数据库不随 Git 同步。

## 保留功能与依赖

| 功能 | 目的及所属路径 | 来源 | 回退依赖 |
| --- | --- | --- | --- |
| Fast | 每个 Codex 会话独立保存开关，模型菜单顶部切换、开启时黄色闪电；`useCodexFastState.ts`、`ComposerModelMenu.tsx`、`useChatComposerState.ts`、`provider-session-settings.service.ts`、`sessions.db.ts`、数据库迁移与两个 Codex runtime | NAS 原 `642b476b`、`19474bd7`、`59c632fb`、`7a79aa69` 的必要部分 | UI/API/持久化和请求参数应一起回退；保留已增加的 `codex_fast` 列无害。排队和定时发送保留点击时的开关快照。CPA 总开关、额度、认证和模型配置没有改动。 |
| 实时 Todo | `codex-app-server.runtime.ts` 接收独立 `turn/plan/updated`，经 `codex-sessions.provider.ts` 的 TodoWrite 映射和 `useSessionStore.ts` 同 ID 原位更新，使用官方 `TodoList.tsx`/`TodoListContent.tsx` | 原 NAS `e5c0b2ec`；必要的 app-server 管理/审批桥接来自上游 PR [#1526](https://github.com/siteboon/claudecodeui/pull/1526)，仅取 FIFO 之前的运行时实现并裁剪历史接口 | 实时计划依赖 app-server；如删除该运行时，应先移除计划通知接收及设置入口。旧 SDK boolean 清单仍可渲染。写入操作完成不等于所有步骤完成，中断不强制完成。 |
| 基础快捷键 | 原生 textarea 的 Ctrl+K 删除至行尾、Ctrl+U 删除至行首（有选区时只删选区）；保留原生 Home/End、移动、撤销及 IME；`useChatComposerState.ts`、`CommandPalette.tsx` | 原 NAS `e5c0b2ec` 的编辑部分 | Composer 同时含 Fast 选项，单项回退需只移除键盘处理相关片段，避免覆盖其他保留功能。没有引入 CodeMirror 输入框。 |
| 字号 | 界面与文件名字号独立持久化、默认 16px；`useFontSizes.ts`、`App.tsx`、外观设置、文件树、编辑器文件名头部、`UiPreferencesContext.tsx` | 原 NAS `c53be685` | 回退 CSS token 的消费者后移除 hook 和设置；保留旧偏好数据不会影响官方默认值。修改其他外观开关时仍保留字号偏好。 |
| 仪表盘 | 独立插件 `local-plugins/cloudcli-host-dashboard/`，仅选中且页面可见时请求 CPU、内存、磁盘；Linux 使用可用内存口径，macOS 仅读启动盘且长路径省略 | 原 NAS `fcbf0846`、`ebfbce53`、`cc383f76`、`d4d35ba7` 的仪表盘部分 | 与核心功能独立，可禁用/移除该插件。没有引入 task-queue-mcp、项目统计、任务队列或定时提示插件。 |
| 上下文布局 | 底部只显示百分比；详情使用 K 缩写，设定/实际两行、可滚动、压缩阈值刻度；`TokenUsageSummary.tsx`、`CommandResultModal.tsx`、共享 context 工具/类型、`codex-context-limits.service.ts`、token usage/history 服务 | 原 NAS 上下文显示系列修改，重新应用于官方 1.37.5 | 前端与元数据读取一起回退。共享 Composer 和 session 服务不能整文件覆盖其他保留项。只展示压缩，不展示摘要、不添加压缩执行入口；不修改本机 CLI 阈值。 |

## 明确使用官方实现的部分

- 官方 1.37.5 的消息发送、后台任务确认及单条持久排队消息完整保留，不移入 NAS FIFO 或 `turn/steer`。
- 命令菜单、模型目录、技能描述、Question 卡片、loading/会话活跃状态、文件浏览过滤、注册/登录与品牌样式按官方实现。原来隐藏的 `/help`、`/model` 等命令不再由 NAS 定制过滤。
- Codex 历史、分页、文件缓存及引用式 fork 历史继续使用官方 JSONL 读取；没有新增 app-server 历史端点。官方 fork 客户端只适配本机 CLI 入口，不改为共享长连接 fork。
- NAS 分离部署仅额外保留 URL/CORS、自动化 API key 作用域和根工作空间路径的必要适配。普通电脑默认同源；部署脚本中的域名、路径和密码本配置不自动应用于其他电脑。
- 未改动 `.env`、密码本、用户数据库、Codex/Claude 配置、已安装插件和系统服务；旧功能对应的数据库表/偏好数据也未删除。

## 实时 Todo 的恢复边界

本次只接通实时协议，不注入列计划的提示词，不从普通进度文字猜测 Todo。没有计划通知时不创建清单。每轮 ID 固定为 `codex-plan:<threadId>:<turnId>`，跨会话隔离，非法步骤只记诊断。终止后的更新被忽略。

计划通知不新增持久化。现有 WebSocket 事件缓冲可在有效期内支持重连回放，但整页刷新、后端重启或缓冲过期后不能保证恢复该卡片；正常聊天历史仍按官方读取。详见 [运行时说明](../codex-app-server-rollout.md)。

## 回退和后续升级

精简分支仅包含官方基线之后的整理提交，可整体 `git revert <精简提交 SHA>` 回到官方源码。单项回退按上表处理共享文件依赖；完整路径由 [文件索引](file-index.md) 记录。原 `nas` 分支及 `2ef0d625` 不被改写，需要旧功能时切回该分支；不要对远端 `nas` 强推覆盖。

后续升级先比较 `docs/nas/upstream-base.txt` 的官方基线，优先采用官方重叠实现，再逐项审核上表。确认升级完成后再更新基线。提交钩子先检查暂存源码，再重新生成提交记录与文件索引，避免带入旧 NAS 的反复修订历史。

运行实例生效需要单独发布前端并重启后端。插件变更需独立构建/发布插件；切换源代码、创建提交或完成构建均不等于运行实例已更新。


## 2026-10-19 验证结果

| 命令 | 结果 |
| --- | --- |
| `pnpm run test:client` | 118 个文件、825 项测试通过，0 失败 |
| `pnpm test` | 828 项：827 通过、0 失败、1 跳过；跳过的是官方真实 fork 集成测试，前置检测依赖已排除的项目内置 `@openai/codex` CLI。实际运行使用各主机自己的 CLI；本次未声称验证了真实模型/完整 fork 联调。 |
| `pnpm run typecheck` | 前后端通过 |
| `pnpm run build` | 前后端构建通过；Vite 保留大包体积提示 |
| `pnpm run lint` | 退出码 0，无错误，存在官方及 React 规则警告 |
| 仪表盘目录 `pnpm run test` / `pnpm run build` | 4 项指标测试通过，类型检查及独立前后端构建通过 |
| Fast 定向验证 | 16 项通过，包括顶部开关/黄色闪电、会话隔离、加载/保存竞态，以及官方排队消息的参数快照 |

审查同时确认官方发送/后台任务对话框、命令/模型目录、认证、Question/Todo 渲染器和文件过滤模块未被旧 NAS 功能覆盖。只有 Todo 的协议适配/存储原位替换以及 app-server 必需审批字段有定制。

验证日志为本机 `/tmp/cloudcli-clean-{client,server,types,build,lint,fast-tests,dashboard-tests,dashboard-build}.log`，不纳入源码。没有访问公网首页、逐项探测 CDN、发布前端、推送分支或重启服务。源码与本机构建已完成，运行实例尚未应用精简分支。

### 发布脚本依赖及增量上传

部署检查发现发布器直接导入 `yaml`，精简依赖清单需要显式保留此开发依赖；已补齐以支持新电脑的干净安装。`deploy/publish-frontend.py` 将上次成功发布的本地目录交给 `deploy/publish-static.mjs`，先在本机比较资源内容，只为变更资源请求 R2。不会检测公网首页或逐个请求未变化的 CDN 文件。回退该部署修复时同时处理依赖清单和两个发布脚本；产品功能不受影响。

插件发布器只处理同时含 `package.json` 与 `manifest.json` 的源码目录，跳过切换分支后遗留的旧插件构建缓存；不会重新发布已移出分支的插件。

### 2026-10-19 精简分支发布

已重新构建并发布 NAS 前端、57 个变更静态资源，101 个未变化资源仅在本机比较后跳过，页面入口已原子替换并清理边缘入口缓存；仪表盘插件已单独构建发布，后端编译完成。未检测公网首页或遍历探测全部 CDN 资源。

后端通过独立的 systemd 用户任务重启（避免当前对话所在服务停止时中断重启），本机健康、1.37.5 版本、原账号初始化状态、登录、受保护 API 和 Fast 元数据检查结果写入 `/vol1/1000/appdata/cloudcli/operations/clean-1375-20261019-110757/result.json`，以其中 `status=healthy` 为实际激活成功依据。数据库、旧前端入口和仪表盘产物备份在同名的 `backups/before-clean-1375-20261019-110757` 目录。没有推送分支。
