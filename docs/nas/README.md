# NAS 精简分支维护指南

## 2026-10-25 浏览器到后端请求与传输优化

本地修复（无上游 PR），范围为 CORS 预检缓存、自适应状态/排队草稿同步、在途查询合并、隐藏页面历史刷新合并，以及 NAS JSON gzip 和去 query 的字节日志。未改 CloudCLI → CPA 压缩、模型、上下文、权限或历史；所属路径、实测与推算、发布/安全重启状态及成组回退依赖见 [浏览器到后端流量报告](browser-backend-traffic.md)。用户本次授权验证、NAS 部署及推送；真实浏览器交互仍由用户验收。其他 Agent 的未提交源码保留，发布从隔离构建输入执行。


## 2026-10-23 Codex GUI 提问恢复

- 目的：修复“陆战地图”“科技树研发”等 Codex 普通对话缺少可点击选项的问题。此前未开启本机 CLI 0.162.0 的 `default_mode_request_user_input`，且 app-server runtime 未处理 `item/tool/requestUserInput`。
- 所属路径：`server/modules/providers/list/codex/codex-app-server.runtime.ts` 为新建/恢复线程合并提问开关，保留图片上下文配置；请求复用 `AskUserQuestion` 面板，将按问题正文提交的答案映射回原生问题 ID。待答问题按会话隔离，刷新可恢复；回答、跳过、终止时撤销面板并释放原生请求。`src/modules/chat/tools/InteractiveRenderers/AskUserQuestionPanel.tsx` 根据 provider 显示名称。回归位于 providers 的 `codex-app-server.runtime.test.ts` 与 chat 的 `AskUserQuestionPanel.test.tsx`。
- 来源：本地缺陷修复，协议通过本机 `codex app-server generate-ts --experimental` 与 `codex features list` 核对；未合并上游 PR。模型仍自行决定何时调用提问工具，既有纯文本回复不会自动转换为待答按钮。
- 回退依赖：整体回退 runtime 请求处理和开关即可；面板、测试可同时回退。未修改 CLI 全局配置、模型目录、权限模式、数据库或历史 rollout；SDK 显式回退模式不提供这条 app-server 交互链路。构建不等于线上生效，后端需在没有活动任务时重启；前端名称修正需随下次正常发布生效。

保留项与后续官方升级策略的待确认方案见 [同步策略](upstream-sync-policy.md)。确认前不改变现有分支和升级流程。

## 官方基线与历史

- 本分支 `nas-clean-v1.37.5` 直接建立在官方 `v1.37.5`（`0ce5630f46c283653359820870df1afd67cb1cf5`）之上。
- 原 `nas` 的 `2ef0d625` 保留完整旧功能及升级合并历史，作为回退参考；此前官方基线为 `v1.37.4`（`7c3049fe8e157f12b7add3e496d8d2fe6fa5c014`）。本分支没有继承旧 NAS 功能提交。
- 产品功能仅保留 Fast、实时 Todo、基础输入快捷键、界面与文件名字号、仪表盘、上下文百分比及压缩阈值布局，以及隐藏文件展示/多语言依赖过滤、C137 Logo、原用户头像和侧栏推广入口精简。重叠功能优先使用官方实现；消息排队在官方单条持久草稿上补齐发送/实时订阅修复，并按用户后续要求恢复 Codex 原生插入。命令列表、模型目录、认证和工具卡片仍采用官方实现。
- 旧 FIFO 多条队列、原生命令定制/隐藏、品牌/头像设置、额外技能描述截断、Task Queue MCP/其他本地插件不移入本分支。

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
| 隐藏文件与依赖过滤 | 默认展示隐藏配置，不套用完整 gitignore；排除版本控制、Node/Java/Go/Python/Rust/.NET 依赖及构建/缓存目录；`server/modules/file-tree/file-tree.service.ts`、`src/shared/api.ts` 及对应测试 | 原 NAS `5c76762e`，本次恢复 | 前端查询参数与后端过滤需成组回退；配置父目录、普通 `pkg`/`bin`/`packages` 源码保留；不删除磁盘数据。 |
| 上下文布局 | 底部只显示百分比；详情使用 K 缩写，设定/实际两行、可滚动、压缩阈值刻度；`TokenUsageSummary.tsx`、`CommandResultModal.tsx`、共享 context 工具/类型、`codex-context-limits.service.ts`、token usage/history 服务 | 原 NAS 上下文显示系列修改，重新应用于官方 1.37.5 | 前端与元数据读取一起回退。共享 Composer 和 session 服务不能整文件覆盖其他保留项。只展示压缩，不展示摘要、不添加压缩执行入口；不修改本机 CLI 阈值。 |

## 明确使用官方实现的部分

- 官方 1.37.5 的发送、后台任务确认及单条 `session_drafts` 持久排队结构保留；队列分发、草稿竞态与实时订阅已修复，另恢复 `turn/steer` 插入，不移入旧 NAS FIFO 表/队列。
- 命令菜单、模型目录、技能描述、Question 卡片、loading/会话活跃状态、注册/登录按官方实现；Logo、静态用户头像与侧栏推广入口保留 NAS 外观定制。原来隐藏的 `/help`、`/model` 等命令不再由 NAS 定制过滤。
- Codex 历史、分页、文件缓存及引用式 fork 历史继续使用官方 JSONL 读取；没有新增 app-server 历史端点。官方 fork 客户端只适配本机 CLI 入口，不改为共享长连接 fork。
- NAS 分离部署仅额外保留 URL/CORS、自动化 API key 作用域和根工作空间路径的必要适配。普通电脑默认同源；部署脚本中的域名、路径和密码本配置不自动应用于其他电脑。
- 未改动 `.env`、密码本、用户数据库、Codex/Claude 配置、已安装插件和系统服务；旧功能对应的数据库表/偏好数据也未删除。

## 实时 Todo 的恢复边界

本次只接通实时协议，不注入列计划的提示词，不从普通进度文字猜测 Todo。没有计划通知时不创建清单。每轮 ID 固定为 `codex-plan:<threadId>:<turnId>`，跨会话隔离，非法步骤只记诊断。终止后的更新被忽略。

计划通知不新增持久化。现有 WebSocket 事件缓冲可在有效期内支持重连回放，但整页刷新、后端重启或缓冲过期后不能保证恢复该卡片；正常聊天历史仍按官方读取。详见 [运行时说明](../codex-app-server-rollout.md)。

## 回退和后续升级

精简分支仅包含官方基线之后的整理提交，可整体 `git revert <精简提交 SHA>` 回到官方源码。单项回退按上表处理共享文件依赖；完整路径由 [文件索引](file-index.md) 记录。原 `nas` 分支及 `2ef0d625` 不被改写，需要旧功能时切回该分支；不要对远端 `nas` 强推覆盖。

后续升级先比较 `docs/nas/upstream-base.txt` 的官方基线，逐项审核保留项。无功能冲突且行为等价时优先复用官方实现；保留项与官方主分支/发布版本存在功能冲突时，必须先说明差异、影响及可选方案，由用户确认取舍，再合入和发布。未确认期间可以继续处理不受影响的升级工作。最终决定、理由、涉及路径和回退依赖记录在本指南。确认升级完成后再更新基线。提交钩子先检查暂存源码，再重新生成提交记录与文件索引，避免带入旧 NAS 的反复修订历史。

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


### 2026-10-19 恢复左上角原 Logo

按用户要求，在精简范围外额外保留原 C137 Logo：`src/assets/c137-logo.webp` 从旧 `nas` 分支复用，`src/modules/sidebar/SidebarHeader.tsx` 的共用 LogoBlock 用它替换默认对话气泡，覆盖桌面、移动端及 PWA 页头。来源为旧 NAS 资源；标题继续使用现有文案，没有恢复品牌设置、头像或其他侧栏定制。回退时将 SidebarHeader 的这一显示片段还原至官方并删除未被引用的图片即可，不依赖后端或数据库。前端重新发布后生效，无需重启后端。

验证：全量前端 118 个文件、825 项测试通过，前后端类型检查及该组件 lint 通过；生产构建确认原始 C137 图片未改变内容。前端已通过标准 NAS 发布器增量上传并原子更新入口，清理入口缓存。本次未重启后端。

## 2026-10-19 队列修复与恢复 Codex 原生插入

目的：修复排队保存/调度/实时接收链路，并恢复运行中输入的原生插入。一次“轮次”从用户发送到 AI 完整回复结束，期间可包含多次工具调用。

- Codex 运行中 Enter 或点击发送：上传附件并保存后，使用本机 Codex 的 `turn/steer`、`threadId`、`expectedTurnId` 向当前轮追加输入。由 Codex 安排在可处理输入的时机消费，不停止工具、不伪造完成、不启动第二轮。模型在纯推理期间何时处理输入由原生运行时决定。
- Codex 运行中 Shift+Enter：保存为官方单条排队消息，当前轮及其后台工作结束后发送。空闲时 Shift+Enter 仍换行。排队卡片增加“立即插入”/“立即发送”，其他 provider 不伪装支持原生插入。
- 保留官方单条队列语义：再次排队会更新该条消息，不承诺多条 FIFO。后台队列独立每秒扫描；某个长轮次不再阻塞其他会话的队列。
- 草稿保存检查 HTTP 状态、按 scope 串行并保护未确认写入；输入文字更新不再重发/清空服务端队列。后台新轮继承同用户的现有 WebSocket 订阅，序号继续递增，旧轮迟到事件被丢弃。
- 原生插入成功只生成一条用户实时回显，忽略 app-server 重复 userMessage 通知；沿用原 NAS 对历史时间回填的限定去重。轮次过期或明确拒绝保留排队消息；确认结果未知时在草稿 options 记录 `_cloudcliSteerOutcomeUnknown` 并阻止自动重发，用户核查对话后可编辑或删除。它是避免重复执行的保护，不是新的跨 Agent 队列。

所属路径：`server/index.ts`（调度器清理移至关闭流程）、`server/modules/scheduled-messages/`（独立队列扫描、原子领取、发送/插入端点）、`server/modules/user/`（文字更新保留队列）、`server/modules/providers/` 与 `server/shared/`（原生 steer 与轮次合同）、`server/modules/websocket/`（订阅继承与跨轮序号）；`src/shared/chatDrafts.ts`、`src/shared/api.ts`，`src/modules/chat/ChatInterface.tsx`、`composer/{ChatComposer,QueuedMessageCard}.tsx`、`hooks/useChatComposerState.ts`、`utils/sessionMessageReconciliation.ts`，中英繁体文案及对应测试。

来源：官方 v1.37.5 的单条持久排队；旧实现 `7bcc9ba2` / 上游 PR #1526 的原生 `turn/steer` 片段与 NAS `e7ee39b7` 去重修复。协议字段通过本机已安装 Codex 的 `app-server generate-json-schema` 核对；没有重新引入旧 FIFO 数据库、Task Queue MCP、额外提示词或模型/认证配置。

回退依赖：插入 UI、API、服务分发、provider runtime/共享合同应成组回退；草稿保存与队列调度/订阅修复可以独立保留。无需迁移数据库；回退前核查含 `_cloudcliSteerOutcomeUnknown` 的草稿，旧调度器不识别此保护标记。共享 Composer/runtime 文件同时包含 Fast/Todo 等保留项，不能整文件恢复旧版本。源码修复与本地构建不会自动更新运行实例，前端发布和后端重启均需另行执行。

验证结果：

| 命令 | 结果 |
| --- | --- |
| `pnpm run test:client` | 118 个文件、839 项全部通过 |
| `pnpm test` | 839 项，838 通过、1 项原有真实 fork 集成测试跳过、0 失败 |
| 队列定向复验 | 快照比较兼容调整后，21 项全部通过 |
| `pnpm run typecheck` | 前后端通过 |
| `pnpm run build` | 前后端构建通过，保留 Vite 大包提示 |
| `pnpm run lint` | 无错误，仍有仓库现有规则警告 |

覆盖草稿确认/失败/请求乱序/会话隔离、长任务不阻塞其他队列、一次领取、后台轮次订阅继承及旧事件隔离、原生 steer 轮次校验/附件/单条回显、拒绝及未知结果、Enter 插入与 Shift+Enter 排队。测试使用隔离数据库及模拟 Codex RPC，没有向真实模型提交任务，也未宣称已完成浏览器端真实会话联调。验证完成时尚未发布；后续已发布并重启，结果见下方发布记录。


## 2026-10-19 保留原头像与侧栏精简

目的：在已恢复 C137 Logo 的基础上，继续保留原 NAS 用户头像，隐藏“报告问题”“加入社区”和 GitHub Star。桌面、手机和折叠侧栏均移除这些入口；设置、版本信息和更新提示继续显示。

所属路径：`src/assets/user-avatar.jpg`（从旧 `nas` 复用）、`src/modules/chat/transcript/MessageComponent.tsx`（静态头像）；`src/modules/sidebar/SidebarHeader.tsx`（移除 GitHubStarBadge 挂载，避免 Star 计数请求）、`SidebarFooter.tsx` 与 `SidebarCollapsed.tsx`（移除报告/社区入口及未使用的图标和地址）。C137 Logo 继续使用 `src/assets/c137-logo.webp`。没有恢复品牌设置面板或修改账户配置。

来源：旧 `nas` 头像资源及用户明确要求保留的外观差异。回退只需恢复上述 UI 片段并移除不再引用的头像资源，勿覆盖消息插入、Fast 等其他保留修改；不依赖后端或数据库。源码修改须发布前端才能生效，本项无需后端重启。验证：全量前端 118 个文件、839 项测试通过；前后端类型检查通过；lint 无错误（保留既有警告）；前端构建通过（保留 Vite 大包提示）。后续已发布前端，结果见下方发布记录。


### 2026-10-19 消息队列、原生插入与外观发布完成

前端通过 NAS 发布器上传变更资源并原子切换入口，后端已由独立 systemd 任务重启。重启后本机健康、版本、账号登录、草稿 API、队列发送端点、Fast 元数据及未认证访问拒绝检查通过。未检测公网首页或逐个探测 CDN 文件，也未向真实模型发送验收任务。部署记录：`/vol1/1000/appdata/cloudcli/operations/queue-branding-20261019-114757/result.json`；发布前备份：`/vol1/1000/appdata/cloudcli/backups/before-queue-branding-20261019-114757`。本次整理提交记录该发布版本的源码，提交包含消息队列修复、Codex 原生插入与保留的外观调整。


### 应用显示名称

按用户要求，应用显示名称统一为“C137控制台”：各语言侧栏标题、登录/加载文案、版本行、空闲/项目浏览器标题、HTML 初始标题、Apple 安装名称和 PWA manifest 同步更新。会话打开时仍以会话标题作为浏览器标题；包名、上游项目引用、接口及认证配置不变。所属路径为 `src/modules/i18n/locales/*/{sidebar,common,auth}.json`、`src/modules/auth/{AuthLoadingScreen,AuthScreenLayout}.tsx`、`src/modules/sidebar/SidebarFooter.tsx`、`src/shared/utils.ts` 及标题测试、`index.html`、`public/manifest.json`。来源为用户 NAS 品牌要求，回退只恢复这些显示字符串，保留 C137 Logo/头像及消息链路修改；发布前端生效，不需要重启后端。

验证与发布：5 项标题测试、类型检查及 lint 通过；NAS 前端构建/增量发布完成，已核对本机页面入口和 manifest 名称为“C137控制台”，入口缓存已清理。此次只更新前端名称，后端沿用已健康重启的运行实例。


## 浏览器与安装图标统一为 C137

目的：修正只替换侧栏 Logo、favicon/PWA 仍显示官方图标的遗漏。`scripts/generate-brand-icons.mjs` 使用 `src/assets/c137-logo.webp` 和已有 sharp 生成多尺寸 PNG、包含 6 个分辨率的真实 ICO、Apple 安装图标和通知图标；同步 `index.html`、`public/manifest.json`、`public/sw.js`。版本文件名使用源图片内容哈希，绕过旧 favicon/CDN 缓存，服务工作线程同时更新缓存名称。旧固定路径 favicon/PNG 也替换为 C137，其他 provider 图标不变。

所属路径：生成脚本、`index.html`、`public/{favicon*,logo-*.png,manifest.json,sw.js}` 和 `public/icons/{c137-*.png,icon-*x*.png}`。来源为本分支原 C137 图片；调整图片后执行 `node scripts/generate-brand-icons.mjs` 并重新发布前端。回退时将图标文件与 HTML/manifest/SW 引用成组恢复，不涉及后端、账户和模型配置。浏览器采用版本化新地址；已安装 PWA 的桌面图标何时刷新由操作系统决定。

验证与发布：8 个 PWA 图标尺寸与 manifest 一致，ICO 内 6 个 PNG 帧尺寸及索引有效，Apple 180px 引用正确，生成脚本及 SW 语法检查通过。前端构建与发布完成，28 个变更资源发布、145 个未变化资源本机跳过，入口缓存已清理，本机入口及 manifest 新图标引用已确认。未检测公网首页、未逐个探测 CDN，未重启后端。


## 补充保留：隐藏文件展示与多语言依赖排除（源码已恢复）

用户补充确认此能力必须长期保留：默认展示隐藏文件/目录，同时排除 `.git`、`node_modules` 及 Java、Go、Python、Rust、C# 等语言的依赖库/缓存目录。应保留 `.env`、`.github`、`.agents`、`.vscode` 及包管理配置，避免按完整 gitignore 或通用名字误过滤正常源码。分语言示例及边界见 [同步策略](upstream-sync-policy.md#文件面板保留规则用户补充确认)。

来源：旧 `nas` 的 `5c76762e`；原所属路径 `server/modules/file-tree/file-tree.service.ts`、`src/shared/api.ts` 和对应测试。已从旧实现恢复默认浏览与分语言过滤：界面 `getFiles` 不再强制 `respectGitignore=true`，后端保留显式 gitignore 查询能力并排除依赖/缓存；隐藏 `.idea` 等配置可见，`.git` 文件（包括 worktree/submodule 指针）也不显示。已恢复对应后端用例，并在现有前端 API 测试中验证请求参数及 AbortSignal。回退时成组恢复默认浏览行为，不删除磁盘数据。若与官方文件浏览行为存在功能冲突，先由用户确认取舍。


### 本次恢复的目录规则

| 范围 | 默认排除 |
| --- | --- |
| 版本控制 / Node | `.git`、`.svn`、`.hg`、`node_modules`；`.yarn/cache`、`.yarn/unplugged` |
| 通用构建/缓存 | `dist`、`build`、`.next`、`.nuxt`、`.cache`、`.parcel-cache`、`coverage`、`.nyc_output` |
| Java | `target`、`.gradle`、`out`、`build`；`.m2/repository` |
| Go | `vendor`、`.gocache`、`.go-build`；`pkg/mod`、`pkg/sumdb`，普通 `pkg` 源码保留 |
| Python | `venv`、`.venv`、`.tox`、`.nox`、`__pycache__`、`.pytest_cache`、`.mypy_cache`、`.ruff_cache`、`__pypackages__`、`site-packages`、`.ipynb_checkpoints` |
| Rust | `target`；`.cargo/registry`、`.cargo/git`，保留 `.cargo/config.toml` |
| C# / .NET | `.vs`、`.nuget/packages`；有 `.csproj`、`.fsproj`、`.vbproj`、`.sln` 或 `.slnx` 的同级目录下排除 `bin`、`obj`、`packages`、`TestResults`；其他普通同名源码目录保留 |

验证：后端文件树定向 13 项、前端 API 定向 5 项通过；全量前端 118 个文件、840 项通过；全量后端 841 项，其中 840 通过、1 项原有真实 fork 集成测试跳过、0 失败。前后端类型检查、完整构建和 lint 通过；保留既有规则警告与 Vite 大包提示。没有新增前端单测文件，API 参数与取消信号回归补在现有 `src/shared/tests/readApiJson.test.ts`。此项尚未发布；源码提交和本地构建不等于当前运行实例已生效。最新图标修复之前已发布，本次不会重复发布或重启。


## 恢复本机自定义模型目录（使用官方配置）

根因：旧 NAS 将 GPT-6.1 Sol 和 DeepSeek 写在 provider 的源码默认模型目录中。精简为官方实现后，这些硬编码随之移除，而本机 `provider_models` 自定义模型表为空、`CUSTOM_MODELS_ONLY` 未设置，界面只显示官方内置模型。这次恢复用户已有模型选择需求，使用官方自定义模型 API，不修改共享源码默认目录或 CLI/认证配置。

- Codex：新增自定义 `gpt-6.1-sol`，显示 GPT-6.1 Sol；推理档位 low/medium/high/xhigh/max，默认 medium。保留原有官方可选模型。
- Claude：新增原 NAS 的 `deepseek-v4-pro` / DeepSeek V4 Pro 与 `deepseek-flash` / DeepSeek Flash；推理档位 low/high/max，默认 high；打开官方“仅自定义模型”开关，目录默认 DeepSeek V4 Pro。
- 路径/来源：官方 `server/modules/providers/services/provider-models.service.ts`、`provider.routes.ts` 及本机 `provider_models`、`app_config`；旧 NAS 模型 ID/档位参考原 provider 目录。此次仅调整运行数据并记录维护说明，没有修改这些模块源码。
- 验证：本机认证 API 回读确认 GPT-6.1 Sol 可选、Claude 仅列出上述两个自定义模型；现有 provider-models 服务 25 项测试通过。未向真实模型发送验收请求，没有改变当前会话模型、CLI 模型配置或任何凭据。本机立即生效，已打开页面需刷新模型目录，不需要发布或重启。
- 操作前后目录与创建记录保存于 `/vol1/1000/appdata/cloudcli/operations/model-catalog-20261019-180446/`。回退通过官方模型管理删除本次新增记录、恢复此前的 custom-only 状态；删除前检查后续会话对这些模型的引用，不直接覆盖整库。

后续升级要核对并保留本机自定义模型记录与各 provider 的 custom-only 设置；源码从旧定制目录迁移到官方模型管理时，必须迁移原选择，不能只移除默认列表。模型配置属于各电脑的运行数据，Git 拉取不自动复制；Mac 若需要同样目录，使用模型库新增上述模型并设置 Claude 的“仅自定义模型”，不要将 NAS 供应商模型写入公共默认值。


## 会话活动时间修复

实际核对发现“CloudCLI更新”“控制台”等 Codex 会话 JSONL 当天持续写入，而数据库 `updated_at` 仍是十月九日。侧栏按 API 的 `lastActivity` 显示旧值，问题发生在索引同步而非相对时间格式化。

根因有两处：NAS 的 `~/.codex/sessions` 是符号链接，watcher 设置 `followSymlinks:false`，未跟进真实根目录；补偿扫描 `findFilesRecursivelyCreatedAfter` 只比较 birthtime，持续追加的老文件被已推进的扫描游标排除。

所属路径及修复：

- `server/modules/providers/services/sessions-watcher.service.ts`：先 realpath 解析可信 provider 监听根目录，保持目录内部不跟随符号链接；启动时只 stat 已登记的 transcript，补回较新的文件修改时间，并广播 session_upserted。不会重读所有历史正文或重置全局游标。
- `server/shared/utils.ts`：增量发现兼顾创建与修改时间，捕获旧会话的新内容，供各 provider 的补偿同步使用。
- `server/modules/database/repositories/sessions.db.ts`：新增单调递增的活动时间更新，只更新 timestamp，不修改标题、映射、模型或归档状态。
- `server/modules/providers/tests/sessions-watcher.test.ts`：隔离 HOME 和数据库；覆盖老文件新增内容的发现、未变文件排除、真实符号链接根目录的追加事件、启动旧时间校正及不回退时间/不改标题。NAS 临时目录的 ACL 可能呈现 mode 000，测试 fixture 显式设置 owner-read 位以符合真实 Codex 文件权限，没有修改运行目录权限。

来源为本次本机实测与现有官方 watcher/增量索引实现。回退应一并处理 watcher、共享文件发现工具、活动时间 DB 方法和对应测试；已校正的时间数据无须恢复旧值，不删除日志。已有模型配置通过官方目录管理保留，CLI 中已配置的模型不会自动进入官方静态模型选项，此行为与本次时间修复分开处理。

验证：两项定向测试通过（包含真实符号链接、真实文件追加监听及启动修复）；全量前端 840 项通过；后端 843 项中 842 通过、1 项原有真实 fork 集成测试跳过，0 失败。类型检查、前后端构建和 lint 通过（保留既有警告）。启动校正将补回旧会话时间，后续写入由 watcher 同步。此次无前端功能改动，不需要单独更新前端来修复活动时间。运行实例状态另见重启操作记录，不将构建完成视为已经生效。


活动时间后端修复已重启生效：本机健康、旧会话活动时间校正、最近会话 API、GPT-6.1 Sol 和 Claude 自定义目录检查通过。操作记录：`/vol1/1000/appdata/cloudcli/operations/session-activity-20261019-181707/result.json`。只重启后端，未重新发布前端；当时源码尚未提交，后续提交见 Git 变更记录。


## 2026-10-19 修复换行冲突并调整为先排队、手动立即发送

用户最终确认交互：默认 Enter/发送按钮在空闲时直接发送，响应中只将消息加入官方单条队列；点击队列卡片“立即发送”，Codex 才通过原生 `turn/steer` 插入当前轮。若不点击，保留已有整轮（含后台工作）结束后的自动分发。Shift+Enter 在空闲、运行中及候选菜单打开时始终交由 textarea 原生换行；已有 Ctrl+Enter 发送偏好仍生效。撤回未发布的独立“排队”按钮方案，队列卡片统一显示“立即发送”。

- 目的/取舍：用户希望先检查队列内容，再主动选择立即插入；因此删除普通提交后的自动 send-now 调用，保留卡片显式动作、失败保护与原生插入能力。不修改后端队列调度或会话隔离，不停止正在执行的工具。
- 来源：本次用户交互确认，基于官方 v1.37.5 单条队列及此前恢复的 Codex 原生插入，不是新增上游 PR。此前章节中 Enter 插入、Shift+Enter 排队属于旧交互，本节与保留项策略表为当前要求。
- 所属路径：`src/modules/chat/hooks/useChatComposerState.ts`（放行换行，响应中提交只入队）、`src/modules/chat/ChatInterface.tsx`、`src/modules/chat/composer/ChatComposer.tsx`（连接动作与入队提示）、`src/modules/chat/composer/QueuedMessageCard.tsx`（统一“立即发送”）；`src/modules/i18n/locales/{en,zh-CN,zh-TW}/chat.json`；现有 `composerSendOverBackgroundWork.test.ts` 回归测试。没有新增前端测试文件。
- 回退：整体回退上述前端动作、卡片、翻译和测试，并恢复相应文档；不回退后端 steer/队列修复，不清除用户已排队消息。仍沿用官方单条队列，新消息更新该草稿，没有引入多条 FIFO。
- 验证：37 项定向测试通过，覆盖响应中 Enter/提交仅入队、耐久附件、卡片“立即发送”触发插入、不重复 chat.send、失败后保留草稿及提示、Shift+Enter 放行、空闲正常发送和基本编辑快捷键；全量前端 118 个文件、843 项全部通过，类型检查、前端构建和 lint 通过（保留既有 lint 警告与 Vite 大包提示）。
- 发布状态：源码已修复；本轮只改前端，无须重启后端，尚未发布当前界面；本次与此前已验证的模型维护记录和活动时间修复一并提交；提交与推送不表示已发布。

## 2026-10-19 Codex 历史图片本地过滤与上下文按钮（已发布并重启）

### 用户确认和实际发送链路

用户确认采用“CloudCLI 本地转发 + 图片本地缓存 + 按需读回”，要求 NAS、Mac 不依赖 R2。先前文字交接/自动新线程草案未提交、未发布，已替换；不再把临时授权重确认和历史编辑限制施加到普通发送或自动图片裁剪。未部署 task-queue-mcp，没有跨 Agent 队列，没有改变模型库、全局 CLI 配置或认证文件。

实际链路：浏览器只上传当前附件，`chat.send` 经 WebSocket 附件校验和会话准入进入 Codex runtime；`thread/resume` 恢复原生上下文，Codex 把历史截图（包括 `compacted.payload.replacement_history` 中的 Base64）再次组装到 HTTP 请求。CloudCLI 在 Codex 请求离开本机前过滤其实际 JSON，才转发配置上游；只改聊天渲染或附件上传接口不能消除这些历史字节。

本机 Codex CLI/SDK 0.162.0 支持线程级 `config` 临时覆盖。通过 `config/read` 解析当前 cwd 的有效 provider：自定义 provider 保留 ID、认证、请求头及上游；内置 OpenAI 使用 `openai_base_url` 和本地 HTTP 426 触发原生 HTTP 回退，**不使用临时 provider 别名**，避免影响 CLI 会话选择及重启恢复。内置 provider 表不允许直接覆盖，普通 400/404 会造成 WebSocket 重试，实测 426 可立即回退并保留 Authorization。全局 `config.toml`、`auth.json` 和模型目录不写入代理地址或其他修改。

### 所属路径与策略

- `server/modules/providers/services/codex-image-proxy.service.ts`：仅监听 `127.0.0.1` 随机端口，每个稳定应用 session 有不可猜测的路由 token；转发 `/responses`、`/responses/compact` 和 `/models`，不暴露通用目标 URL 入口。匹配原生 thread header/请求 cache key 后才应用该会话策略。子 Agent、错误线程和无活跃过滤 lease 的请求透明转发，不混入主会话图片目录或指定对比图。
- HTTP 保持 gzip、deflate、br、zstd 原压缩格式，直接流式转发上游响应，不缓冲整段 SSE。原生取消关闭上游连接；不额外施加整轮超时，继续沿用 Codex 的 deadline。新增生产依赖 `proxy-agent@6.5.0`（复用锁文件已有版本）继承宿主机 HTTP_PROXY/HTTPS_PROXY/ALL_PROXY/NO_PROXY；只为 Codex 子进程补充回环 NO_PROXY，不修改宿主机环境。zstd 要求 Node 22.15+，缺失能力时明确报告，不偷偷发回大请求。
- `server/modules/providers/services/codex-image-context.service.ts`：只识别 typed inline `input_image`，归档后把可过期图替换为编号/哈希/原文件引用；图片后存在模型响应或 compaction 边界才视为已消费。保留当前用户和运行中插入消息的图片；刚返回、尚未消费的工具图片保留，后续已消费工具图可按预算裁剪。显式勾选对比图始终保留，若压缩后请求不含该图则从本地档案重新附带。重复历史图片尽量只留一份。未知图片格式和 `file_id` 不擅自移除。
- 默认近期 **3 张历史图**、历史图片 JSON **1 MiB**，可在 Token 弹窗逐会话设置。当前输入及指定对比图豁免；单张最新历史图大于预算仍保留，并显示实际超额。设置在下一次普通发送开始时冻结为该轮 lease，进行中的设置变更不让正在看的图片突然消失。
- 原图按 SHA256 保存在数据库目录旁 `codex-context-images/`，目录 0700、文件 0600，以临时文件原子重命名写入；相同图片复用副本。`catalogs/<session-hash>.json` 保存本会话编号、哈希、大小和原图路径，模型只在有明确需要时读目录并调用原生 `view_image`，沿用现有权限。无需新 MCP 服务或 R2。图片缓存总量默认 **512 MiB**，不会自动删除旧图；满时明确报错，历史原图仍留在原 rollout/附件中。请求体压缩前后均限制 **64 MiB**，避免无限制内存缓冲。
- 环境默认值见 `.env.example`、根 README：`CLOUDCLI_CODEX_HISTORY_IMAGES`、`CLOUDCLI_CODEX_HISTORY_IMAGE_BYTES`、`CLOUDCLI_CODEX_IMAGE_CACHE_BYTES`、`CLOUDCLI_CODEX_PROXY_BODY_BYTES`。会话已保存值优先。所有数据目录根据本机 DB 路径推导，不把 NAS 路径、凭据或域名放进公共默认值。
- `server/modules/database/{schema.ts,index.ts,repositories/codex-context.db.ts}` 和 `server/shared/types.ts`：`codex_context_state` 保存每会话策略、图片索引、统计和显式清理产生的历史分段。模型选择、effort、Fast、UI 权限及普通轮次原生临时授权不变；自动过滤和压缩都不切换 native thread。
- `server/modules/providers/{services/provider-runtime.service.ts,list/codex/codex-app-server.runtime.ts,list/codex/codex-runtime.provider.ts}`：通过 runtime context 接入，避免 provider registry 循环依赖。`thread/resume.excludeTurns:true` 减少本地 IPC 载入，不宣称它减少模型请求。保护已有活动线程、运行中插入和并发会话；SDK 模式不启用此过滤，手动上下文命令显式报告不支持，不作为普通提示词发送。
- `server/modules/providers/provider.routes.ts`、`src/shared/api.ts`：认证后的会话图片策略 GET/PATCH；组件不自行散布 endpoint。
- `src/modules/chat/{modals/CodexContextPanel.tsx,modals/CommandResultModal.tsx,hooks/useChatComposerState.ts,ChatInterface.tsx}` 及三种聊天语言包：增加图片数量/预算、历史图片对比勾选、请求统计、**压缩上下文**和**清理上下文**。操作沿用现有 chat.send 的准入、流和取消链路，进行中禁用，不消耗编辑中的草稿。
- 压缩调用原生 `thread/compact/start`，同线程内过滤图片并保留原生加密摘要。只有用户显式清理才通过 `thread/start` + `thread/inject_items` 建立空任务上下文，清除图片勾选，并事务性保存原 rollout 分段、superseded 标记和新映射。`codex-sessions.provider.ts` 读取完整分段历史、隐藏内部清理标记，旧分段只读、当前分段仍正常编辑。清理后原生临时授权必要时重新确认；缺失历史源明确报错，不伪装为空会话。

### 社区与官方来源

- [Codex Model Router 作者说明](https://marketplace.visualstudio.com/items?itemName=koupualen.codex-model-router) 已有“本地图片缓存、转发前按预算裁剪、历史图片按需读回”的社区架构。此次参考其思路，在 CloudCLI 内实现，不安装 VS Code 扩展、不复制其运行配置。其文档预算不当作服务商上限。
- 官方 [#40994](https://github.com/openai/codex/pull/40994) 已将 `compaction_image_budget` 默认开启，本机也是 `stable true`；token/压缩预算不是序列化上传字节预算。社区 [#33493](https://github.com/openai/codex/issues/33493)、[#41338](https://github.com/openai/codex/issues/41338) 报告这一区别及持续保留图片的问题。
- 官方 [#45794](https://github.com/openai/codex/pull/45794) 支持 `fileId` / `file_id`；本次保持这类引用，不声称 CPA 文件上传端到端已经验证。原生 `turn/start` / `thread/inject_items` 实测拒绝远程图片 URL，不等于只支持 Base64；此次没有上传截图到 R2。
- 原生 HTTP 回退和 provider 身份约束参考社区 [#27381](https://github.com/openai/codex/issues/27381)、[#43194](https://github.com/openai/codex/issues/43194)，并以本机实测为准。没有 fork/替换 Codex 二进制，没有合并额外上游 PR。

### 测量、验证与边界

日志只记录会话 ID、图片数、过滤前后 HTTP 请求体及解压后 JSON 的实际字节、请求数、累计净减少字节和压缩/清理统计。不记录 Base64、完整提示词、Cookie、密钥或上游 URL。请求体大小在写入上游请求后统计，不等于已被远端确认接收的网络字节；不含 TLS/协议头，也不能直接测得 CPA→chatgpt.com 的后续上传。没有证据将此前的问题归为重试风暴。

| 验证方式 | 过滤前 | 过滤后 | 说明 |
| --- | --- | --- | --- |
| 安装的 Codex → 本地过滤 → 隔离 Responses 模拟端，HTTP 请求体实测 | 10 张历史图 + 当前 1 张，2,954,555 字节 | 3 张历史图 + 当前 1 张，1,114,637 字节 | **减少 62.3%**，同一次请求前后比较，原线程不变；不是 CPA 公网抓包 |
| 生产长会话同一快照只读 JSON 重建 | 25 张图，4,847,623 字节 | 3 张图，1,616,180 字节 | **估算减少 66.7%**；保留全部文字和加密摘要，不进行有损文字交接；没有对真实会话发模型请求 |

隔离服务/原生协议验证通过：10 张历史截图、当前图片、勾选最早图片读回、模型实际调用 `view_image` 读回、最新图超预算、SSE 流式回复、取消抵达上游、原生压缩同线程、显式清理才切线程、重启恢复、原历史截图完整可读、源 rollout 已有前缀字节不变、模型/effort/Fast 保留、gzip/zstd 转发、加密 compaction 内容不变、子线程透明转发、两会话并发图片/策略/计数隔离，以及禁止跨会话选择他人档案图片。内置 OpenAI 另外验证 426→HTTP、API key 原样传递、provider 保持 openai、原配置/auth 文件不变及重启恢复；使用临时假凭据与本地模拟端，没有真实 OAuth 或 CPA 模型调用。

现有 runtime/history 定向 **81 项通过**；全量前端 **118 个文件、843 项通过**；全量后端 **843 项中 842 通过、1 项原有集成测试跳过、0 失败**。最终类型检查、前后端构建、lint 与 `git diff --check` 均通过；保留既有 lint 和 Vite 大包提示。按父 AGENTS 约定不新增仓库单测文件，隔离服务验证脚本/报告留在 NAS 临时目录；没有浏览器自动化。

功能边界：只处理 CloudCLI 管理的 app-server 流量，不接管其他终端独立启动的 Codex 或显式 SDK 模式。子 Agent 流量不应用主会话裁剪。保留原始历史意味着 Codex 自身 JSONL 磁盘膨胀仍可能存在；本功能不会 vacuum、改写或删除它。图片字节缓存不随 Git 迁移，Mac 使用自身缓存、数据库和已有 CLI 配置；跨电脑共享同一会话历史仍需单独迁移运行数据。Mac 真机界面及真实 CPA 上游仍需发布后手动验收，不以 Linux 隔离验证宣称已经完成这两项。

### 发布与回退

用户已确认采用本地过滤方案，并授权发布、重启及提交。**源码已修复，前端已发布，后端已完成构建和重启，NAS 运行实例已加载本次修改。** 按 `deploy/README.md` 发布：57 个变更资源上传、116 个未变资源在本地跳过，原子替换入口并清理 HTML 缓存；没有检测公网首页或逐个检测 CDN 文件。后端 PID 从 459995 变为 654187，启动迁移已创建状态表。本机健康、登录、项目、草稿、最近会话、需认证的图片策略接口及默认 3 张/1 MiB 策略检查通过；发布前后 Codex/Claude 模型目录内容一致，前端产物包含上下文按钮。操作记录、数据库和旧入口备份位于 NAS 运行数据目录 `operations/image-context-release-20261019-235008/`，该目录不随 Git 同步。源码与维护记录作为本次功能提交，提交和推送结果以 Git 历史为准。

运行实例生效不代表已完成真实 CPA 上传量和 Mac 真机验收。界面仍由用户手动验收：Token 弹窗按钮、忙碌禁用、草稿保留、历史图对比、清理确认结果、刷新和切会话。

即时停用：设置 `CLOUDCLI_CODEX_IMAGE_CONTEXT_ENABLED=false` 并重启后端，恢复直接原生上游；共享 config/auth 文件无需恢复。普通图片过滤没有切换原生线程，无须迁移模型历史。若用户执行过显式清理，完整历史读取依赖 `codex_context_state` 的分段和原始 rollout；保留表、superseded 映射及图片目录。完全回退源码前备份数据库及这些文件，迁移或导出完整历史，不能仅指回最早 rollout 后隐藏后续对话。回退应整体考虑两个图片服务、runtime 接线、DB/共享类型、API、弹窗、语言包、依赖锁文件和历史 reader；不要编辑运行中的源会话文件。删除缓存会使已经提供的本地引用失效，不应当作常规回退步骤。

## 2026-10-20 CloudCLI 公共 WebP 图片转换（已发布并重启）

- 目的与用户确认：用户要求在 CloudCLI 公共层转换，供多处复用。编码不放入 Codex 专属服务：上传预处理、Claude 图片内容和 Codex 实际 HTTP 过滤复用同一函数；原始附件及既有会话记录不覆盖。未合并上游 PR，使用仓库已有 `sharp` 0.34.5，将其从开发依赖移至生产依赖以支持 NAS、Mac 等目标机安装。
- 所属路径：`server/shared/{utils.ts,index.ts,types.ts}` 提供 `optimizeImageBuffer` 及结果契约；`server/shared/image-attachments.ts` 接入 Claude 内容构造；`server/modules/assets/{assets.routes.ts,services/image-assets.service.ts}` 上传时预生成缓存，普通读取保持原图，认证图片接口可选 `?format=webp`；`server/modules/providers/services/codex-image-context.service.ts` 只转换实际保留及补回的指定图，先归档原图；`package.json`、`pnpm-lock.yaml` 维护生产依赖；`.env.example`、根 README、Providers README 说明公共入口、配置及边界。没有新增前端组件或改动模型、Fast、认证和权限配置。
- 默认策略：PNG 无损 WebP，JPEG 质量 85，不降分辨率并按 EXIF 修正方向；仅使用更小结果。GIF、SVG、已有 WebP、动画、32 MP/64 MiB 以上输入及错误均回退原图。小于 256 字节的微小输入直接保留。全局 `CLOUDCLI_IMAGE_WEBP_ENABLED=false` 可关闭，JPEG 质量由 `CLOUDCLI_IMAGE_WEBP_QUALITY` 设置。编码最多同时 2 张、32 张不同图片在途，超额回退原格式。
- 缓存：默认 `~/.cloudcli/image-variants`，可用 `CLOUDCLI_IMAGE_WEBP_CACHE_DIR` 选择本机目录；内容、编码器版本和质量构成键，重复图片共用结果，重启后可重用。`CLOUDCLI_IMAGE_WEBP_CACHE_BYTES` 默认 256 MiB，写入时淘汰较旧副本；目录 0700、文件 0600、原子重命名发布；缓存错误不阻断发送。该目录只存可再生成的编码副本/无收益标记，不记录 Base64 提示词或凭据。可以清理该副本目录，不可混同此前不可随意删除的 `codex-context-images` 原图档案。
- 兼容边界：上传返回值的原始路径、MIME、大小和默认原图读取均保持；Claude 新生成的原生历史记录实际发送的 WebP，原始上传文件仍在，已有历史不批量修改。Codex 原图 ID 和档案路径不变，历史保留准入仍用原图 JSON 预算，保留/当前字节统计反映转换后大小。Cursor/OpenCode 的路径读取及显式 Codex SDK 模式尚未自动转换，但可复用公共函数/预览接口。服务端转换不减少浏览器首次上传原图的流量，不宣称 token 或 CPA 下游流量同比下降。
- 验证：现有附件/资源定向 26 项通过，全量后端 843 项中 842 通过、1 项既有集成测试跳过、0 失败。隔离服务实际验证 PNG 43,388 → 16,138 字节且像素逐字节一致，JPEG 90,077 → 37,034 字节且分辨率保留；上传两个入口保留原文件，默认预览仍为原图，可选预览为 WebP；Claude 内容 MIME 和数据一致；重复/并发同图复用缓存；不支持/损坏/关闭时回退；Codex → 本地模拟上游的实际 HTTP 请求体 58,001 → 22,003 字节且归档原图哈希不变。这是隔离本机请求体测量，不是生产 CPA 抓包。没有新增仓库单测或浏览器自动化。类型检查、前后端构建、lint 和 `git diff --check` 通过，保留既有 lint 警告和 Vite 大包提示；未改前端源码，不重复运行全量前端测试。
- 发布状态：源码已提交为 `0eeb3edf`；本次随压缩完成通知修复重启 NAS 后端，运行实例已加载公共 WebP 转换。实际认证预览接口将原图 32,616 字节转换为 9,448 字节 WebP，原文件字节保持不变。其他电脑仍需 pnpm 安装生产依赖、构建后端并重启；Mac 真机及真实模型图片识别效果由用户验收。
- 回退：设置 `CLOUDCLI_IMAGE_WEBP_ENABLED=false` 并重启即可整体停用转换，不影响此前的 Codex 历史裁剪；也可整体撤回本节公共函数/类型/导出、上传与预览接入、Claude 构造和 Codex 转换调用及依赖变动。没有新增 DB 表或原生线程映射迁移。公共函数被三个入口共用，不能单独删除实现却保留消费者；副本缓存可删除并自动重建，原始附件、Codex 原图档案和 rollout 必须保留。


## 2026-10-20 Codex 压缩完成通知与状态恢复（已发布并重启）

- 现场：用户报告压缩超过 5 分钟无结果。本机最近一次手动压缩的原生记录从 `2026-10-20T03:11:07.807Z` 开始，于 `03:13:02.844Z` 写入 `compacted`，`03:13:02.859Z` 写入 `task_complete`，约 115 秒；检查时后端运行会话列表已无该任务。能够确认原生已完成，不能仅据截图确认浏览器遗漏完成帧的具体网络原因。检查期间没有取消真实任务、改写 rollout 或重启服务。
- 确定缺陷及修复：`server/modules/providers/list/codex/codex-sessions.provider.ts` 原来丢弃实时 `context_compaction`，历史 reader 也只识别旧 `event_msg/context_compacted`，漏读本机 0.162.0 的原生 `compacted` 边界。现复用已有 `task_notification` 展示 `Context compacted`，历史边界使用稳定 ID；不把 Base64、内部摘要和 `replacement_history` 放入聊天通知，不假造压缩比例或进度。
- 状态恢复：`src/modules/chat/hooks/useChatSessionState.ts` 仅在手动压缩/清理的活动状态下，每 5 秒及窗口重新聚焦时重发现有 `chat.subscribe`，携带已知 seq，补播遗漏结果并接受后端空闲确认。沿用既有迟到 idle ack 保护；不追加模型调用，不因超时强制 idle，不改变普通响应和自动压缩的生命周期；离开该操作或组件卸载时停止检查。网络不可用仍需恢复连接。
- 验证：在现有后端 `codex-sessions.test.ts` 覆盖实时完成通知、原生边界刷新恢复和不泄漏内部历史；在现有前端 `leaveSessionWithBackgroundWork.test.tsx` 验证按 seq 核对及空闲后停止检查，没有新增测试文件或浏览器自动化。全量前端 118 个文件、844 项通过；全量后端 845 项中 844 通过、1 项既有集成测试跳过，0 失败。初次直接运行 Vitest 继承生产环境触发 React act 错误，改用仓库 `pnpm run test:client` 的既定测试环境后通过，没有修改 React 或注入 preload。类型检查、前后端构建、lint 和 `git diff --check` 通过，保留既有 lint 警告及 Vite 大包提示。
- 发布与回退：用户授权重启后提交并同步。前端已发布（56 个变更资源上传、117 个资源本地跳过），后端构建产物已重启加载，PID 由 654187 变为 1293126。本机健康、登录、项目、草稿、最近会话、图片策略、WebP 接口及原生压缩完成历史通知验证通过，自定义模型目录前后相同；未重复向真实会话发起压缩或模型请求。记录与数据库/入口备份位于 NAS 运行数据目录 `operations/compact-webp-release-20261020-125519/`，不随 Git 同步。初次验证只查最近 100 条未覆盖早先的压缩边界，改为读取该会话完整历史后确认完成通知存在；未将采样范围问题归为服务故障。源码及发布记录本次一并提交，SHA 与推送状态以 Git 历史为准。界面由用户刷新后手动验收；不检测公网首页或逐个检查 CDN 文件。回退成组撤回 reader/normalizer、手动操作订阅 effect、相应测试和文档并重新发布/重启；无 DB/schema、权限、模型、原生线程和图片缓存迁移。


## 2026-10-20 按工作区放行跨项目文件查看与编辑（已重启生效）

- 用户确认与目的：用户要求放开聊天引用项目外文件时的 `Path must be under project root` 错误，示例为另一个项目中的 Markdown 文档。将现有工作区权限用于绝对文件引用，不修改系统目录权限、模型权限或认证，不在源码硬编码 NAS 路径或把所有电脑默认工作区改为 `/`。这是本地功能修复，未合并上游 PR。
- 所属路径：`server/modules/file-tree/file-tree.service.ts` 用 `resolveEditorPath` 统一文本读取、内容流和保存；项目外现有文件先 `realpath`，再通过注入的工作区 validator，工作区外或系统目录返回 403。`server/shared/{types.ts,utils.ts}` 更新工作区/只读例外契约注释；现有 `server/modules/file-tree/tests/file-tree.service.test.ts` 覆盖授权边界；根 README 记录跨机配置和生效要求。
- 范围：NAS 已有部署 `WORKSPACES_ROOT=/`，允许服务用户有权限的其他项目文件；普通电脑仍使用自身工作区根，默认用户主目录。只有绝对路径的现有文件可跨项目读取、预览和保存；相对路径不能通过 `../` 逃出项目。创建、上传、重命名和删除不扩大范围；项目外只读临时/Claude 输出路径继续拒绝保存。跨项目符号链接按目标真实路径校验，不能将 `/etc` 等被禁止的目的地藏在允许目录中。已有项目内路径行为保持。
- 验证：现有文件服务/路由定向 19 项通过，覆盖跨项目读取、流式预览与保存、外部只读输出、相对路径越界、结构操作边界及符号链接真实目标拒绝。隔离服务使用 NAS 相同 `WORKSPACES_ROOT=/` 策略成功读取截图所示 6,092 字节文档并校验流式内容哈希，原文件未改；另用运行数据目录下的自建文件验证项目外保存，并验证 `/etc/passwd` 及指向该路径的链接在读取/写入前被拒绝。类型检查、后端构建、lint、`git diff --check` 通过；保留既有 lint 警告。未改前端、未新增测试文件或浏览器自动化。
- 发布与回退：随请求体压缩一起重启后端，PID 1555414 已加载；实际认证 API 可跨项目读取交接文档，内容与原文件一致，`/etc/passwd` 仍返回 403。此功能本身只需后端重启。用户要求 commit/push，提交及同步以 Git 历史为准。回退 `resolveEditorPath` 及三处调用、相应测试和文档即可恢复原项目范围；无 DB、工作区配置、系统权限或原文件迁移，不能通过回退去删除其他项目文件。

## 2026-10-20 Codex 完整 HTTP 请求体压缩（已发布并开启 zstd）

- 目的与来源：按外部 `c137_cpa/docs/cloudcli-compression-handoff.md` 对接双段压缩。本地改造，未合并上游 PR。原代理只沿用入站编码，identity 请求不会主动压缩；在既有图片裁剪/WebP 后编码完整 JSON，保留工具、加密推理和缓存字段。交接当时 CPA 未部署，随后用户确认 CPA 已支持压缩并要求配套开启，本次据此开启 CloudCLI zstd，不修改 CPA。
- 所属路径：`server/modules/providers/services/codex-request-compression.service.ts` 提供原生 codec 和配置校验（初版 level 1，后按用户要求将 zstd 调至 level 3）；`codex-image-proxy.service.ts` 接入冻结的每轮策略、准确头、SSE/取消和无重放转发；`codex-image-context.service.ts` 与 `server/shared/types.ts` 保存独立起点的传输计量。`src/modules/chat/modals/CodexContextPanel.tsx` 及三种语言包展示累计请求体、平均、最大和最近编码/耗时/状态；`.env.example`、根 README、providers README 和 [详细记录](request-compression.md) 说明配置与边界。
- 策略：默认 `CLOUDCLI_CODEX_REQUEST_COMPRESSION=preserve`，显式支持 identity/zstd/gzip。小于 4 KiB 或无收益时发送前选择 identity；缺少 zstd 只向已确认部署 gzip 修复的精确 origin 降级，否则发送前失败。显式压缩体默认 16 MiB，既有入站/JSON 默认 64 MiB；不新增重试、不在错误后换编码重放。普通及 compact 共用规则，保留 `/v1`，子线程不继承主会话策略；显式 SDK 和模型列表不覆盖。
- 验证：新后端定向 10 项通过，全量后端 857 项中 856 通过、1 项既有跳过；全量前端 118 文件、845 项通过，类型检查、前后端构建和 lint 通过。模拟混合图片/不透明状态样本 420,871 字节，经 zstd 为 316,665 字节（减少 24.76%，5 次平均编码 2.019 ms）；仅本地编码实测，不能当作生产流量或 Mac 性能。未调用真实收费模型、未测 CPA→ChatGPT 流量。日志只记统计元数据，两段不相加作为梯子用量。
- 发布与回退：用户授权开启后，前端发布 56 个变更资源、117 个资源本地跳过，后端 PID 1293126 → 1555414；本地用户服务 drop-in `30-request-compression.conf` 设置 zstd，新进程环境、编译产物 codec、健康/登录/项目/草稿/最近会话及模型目录不变验证通过。不主动调用收费模型；CPA 下游真实流量未测。记录和备份在 appdata `operations/request-compression-release-20261020-165226/`。NAS 已生效，Mac 仍需自行配置部署；公共默认 preserve 不变，gzip origin 确认列表未开启。用户要求本批变更一起提交推送，SHA/同步状态以 Git 为准。设置 preserve 并重启可撤回主动压缩，identity 可明确关闭本段编码；回退 CPA 前先停用 gzip/fallback 并检查原生入站。源码回退须成组撤回 codec/proxy/metrics/弹窗/语言包及测试，无 schema/历史迁移，不删除原图或覆盖其他保留项。

## 2026-10-20 zstd 等级调整为 3（已重启生效）

- 用户要求将当前压缩等级设为 3。`server/modules/providers/services/codex-request-compression.service.ts` 的原生 zstd 参数从 1 改为 3；gzip/deflate 保持 1，编码选择、预算、取消及无重放规则不变。此为本地参数调整，无上游 PR。
- 根 README、providers README、部署指南和 `docs/nas/request-compression.md` 同步当前等级；原 level 1 基准保留并明确标记为历史数据，不冒充 level 3 性能。
- 验证：10 项请求压缩定向测试、类型检查、后端构建及 lint 通过。额外核对编译产物与同参数异步 zstd level 3 输出一致、与 level 1 输出不同，且解压逐字节恢复输入；初次同步/异步编码字节比较因帧格式不同而失败，改为同一异步 API 验证后通过，并非请求体损坏。未调用真实模型。
- NAS 已重启，PID 1555414 → 1562460，健康正常、运行模式 zstd，记录在 appdata `operations/zstd-level3-20261020-170015/`。无需前端发布；源码变更需 Git 提交供其他电脑同步，其后仍需各自构建和重启。回退仅将 zstd 参数改回 1 并构建重启，无数据或配置迁移。

## 2026-10-22 大历史请求接收与网络代理前压缩（待部署）

- 目的与来源：用户报告“科技树研发”多次无回复，定位为旧图片与工具裁图在过滤前超过 64 MiB；用户要求优化并在梯子代理转发前完成压缩。本分支本地修复，未合并上游 PR。
- 所属路径：`server/modules/providers/services/codex-image-proxy.service.ts` 将本机原生历史接收/解码预算独立为 `CLOUDCLI_CODEX_PROXY_INCOMING_BODY_BYTES`（默认 256 MiB，可设 1–256 MiB）；原 `CLOUDCLI_CODEX_PROXY_BODY_BYTES` 仍限制过滤后最终 JSON（默认 64 MiB）。图片归档/过滤、WebP、最终 JSON 校验、zstd 和压缩体校验全部在 `ProxyAgent`/上游请求创建前完成。显式压缩模式补齐子线程及关闭图片 lease 后的出站编码，保持其 JSON 内容和父线程图片/计量隔离。接收超限时先关闭迭代器再丢弃剩余本地输入，保证返回明确 413，避免 socket reset 隐藏错误。
- 配置与兼容：其他电脑仍默认 preserve，不假定其上游支持 zstd；NAS 现有用户服务已设 zstd，CPA 容器健康且其出站 zstd 开关已启用。本次未改 CPA、梯子、模型、认证或历史图片保留策略；最终 JSON/压缩体限制和压缩失败不发送原文保持。`.env.example`、providers README、[压缩说明](request-compression.md) 同步新预算和覆盖范围。
- 验证：`codex-request-compression.test.ts` 定向 12 项通过，覆盖原始/zstd 大历史先过滤、最终/解码/原始接收超限、网络代理收到压缩体、父/子线程/关闭 lease、错误不重放、SSE、取消和计量隔离。只向本地模拟上游回放真实上下文：70,109,695 字节 → 过滤后 3,878,728 字节 → zstd 2,551,798 字节（约减少 96.4%），归档替换 91 个图片项，保留当前 8 个和历史 3 个；原生 rollout 未改。该测量不是生产公网/CPA 出站流量，也未调用真实模型。
- 部署与回退：源码、定向测试、类型检查和构建可审查，运行实例尚未更新。按 `deploy/README.md` 仅在用户明确授权发布后更新后端，无需发布前端。只回退代理接收/编码逻辑与相关测试/配置说明即可；无 DB schema 或线程迁移，不删除图片档案/rollout。不覆盖同工作区已有的目录迁移及部署改动；完全回退图片/压缩体系仍须遵循前文成组依赖。

### 2026-10-25：预检缓存后续修复

用户确认由服务器禁止业务响应缓存，替代请求侧强制 no-store，以允许 Chromium 复用跨域预检许可。入口 `/api` 的响应缓存中间件覆盖成功与错误，SSE 保持实时；前端固定版本参数避开旧缓存。归属：`server/modules/auth/response-cache.middleware.ts`、`server/index.ts`、三个 SSE 路由、`src/shared/api.ts`。来源：本地排查 Chromium 预检控制器；无上游合并。前后端需配套升级，回滚须恢复前端 no-store，NAS 继续保留 Nginx no-store。详见 [请求流量记录](browser-backend-traffic.md)。

## 2026-10-25 对话文件下载入口发布修复

- 目的：修复下载入口只在工作区、未包含在发布前端的问题。项目内文件链接右侧常驻“下载”按钮；ZIP 等浏览器无法预览的已识别二进制文件点击名称也直接下载，文本、图片、PDF 和支持的音视频继续打开既有编辑器/预览，目录仍打开文件树，外部网站链接保持浏览器跳转。
- 所属路径：`src/modules/chat/transcript/{Markdown,WorkspaceFileLink}.tsx` 复用 `MarkdownWorkspaceContext` 和 `api.readFileBlob`；`src/shared/utils.ts` 集中既有文件格式/预览能力判断，编辑器消费者同步引用，避免聊天和编辑器判断漂移；`src/modules/i18n/locales/{en,zh-CN,zh-TW}/chat.json` 提供下载、等待和错误文案；回归在 `src/modules/chat/tests/fileReferenceLinks.test.tsx`。
- 安全与行为：下载读取原始字节，移除编辑器行列号，解码中文/空格文件名；携带既有 Authorization，请求 URL 不放 token，不把私人文件上传 Cloudflare。保留工作区访问规则、等待状态、重复点击保护、错误重试及延后释放的对象 URL；按钮只在项目上下文内显示，不自动将目录打包，也不把浏览器触发保存当作磁盘写入已完成。
- 来源：本地功能修复，用户以 40 MB 素材包缺失下载按钮说明问题；未合并上游 PR，未新增后端端点或权限规则。
- 验证与发布：前端 121 文件 / 869 项测试、类型检查、lint 通过；使用已有 NAS 发布器发布前端，不重启后端。现有本机文件 API 用含中文/空格名称的模拟 ZIP 验证原始字节一致、Cache-Control no-store、未鉴权 401；临时文件已删除，不调用模型，不运行浏览器自动化。
- 回退：成组恢复 Markdown 链接组件、共享格式判断及其编辑器消费者、语言文案和测试，并重新构建/发布前端；旧哈希资源保留。无数据库、模型配置或历史文件迁移。

