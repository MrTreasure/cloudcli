# NAS 分支维护与功能回退指南

## 基线与记录范围

本分支共享应用源码，官方基线为 **v1.37.4**，提交 `7c3049fe8e157f12b7add3e496d8d2fe6fa5c014`。
[基线文件](upstream-base.txt)同时记录版本名和完整提交，另一台电脑克隆时无需依赖官方标签存在。

- [完整提交记录](commit-log.md)：包含 NAS 主线和合入 PR 的每个提交、完整 SHA、涉及文件，以及本次提交的暂存变更。
- [完整文件索引](file-index.md)：相对官方基线的全部文件净差异。
- [当前部署说明](../../deploy/README.md)：NAS 原生服务与前后端分离发布方式。
- [历史变更说明](../../deploy/CHANGELOG.md)：早期部署及修复过程。历史 Docker 方案已被原生服务替代。

Git 同步源码、插件源代码和部署脚本；各机器的忽略文件 `.env`、CLI 配置、账号数据库、凭据、会话历史和已安装插件属于本机运行状态。普通电脑按根目录 AGENTS.md 使用同源 `pnpm dev`，NAS 按部署说明发布，不能复制 NAS 域名或绝对路径到公共默认值。

## 功能对照与回退依赖

下表列出功能入口与关键提交；全部细节和导入分支的提交见完整记录。提交号用于 `git show` 和定位差异，不代表每个功能均能用单个 revert 独立移除。

| 功能 | 关键提交 | 维护入口与回退影响 |
| --- | --- | --- |
| NAS 分离部署、中文界面、TypeScript 7 | `939f1c5e`、`603b8df3`、`bf31b640` | `deploy/`、构建配置、`package.json`、锁文件及语言资源；原生服务取代 Docker，回退源码不会恢复旧服务 |
| 本机工作区、共享 CLI 家目录与凭据入口 | `423b270f`、`daa6047a`、`98ea1678`、`49c48670` | 部署启动脚本和 provider 配置；仅保留凭据读取逻辑，不记录凭据值 |
| CDN 请求恢复、直连 API、跨电脑默认值 | `7fd53110`、`4c5ad202` | `deploy/publish-frontend.py`、Vite 配置和共享 API；普通电脑默认资源根路径 `/`，分离域名只由本机配置注入 |
| 本地插件、任务队列、MCP、计划提示界面 | `d52645a0`、`d9a96f70`、`62d03346` | `local-plugins/`、插件模块、任务队列和计划模块；已安装插件副本需要单独更新 |
| 界面和文件名字号 | `4425f26e`、`c53be685` | 设置模块、共享字号 hook、文件树与编辑器标题；账号 UI preferences 持久化 |
| Codex app-server、FIFO 队列与运行中插入 | 合并 PR #1526 `1c427fce` | `server/modules/providers/`、`scheduled-messages`、WebSocket、数据库与聊天模块；参见 `docs/codex-app-server-rollout.md`、`docs/message-queue-steering.md`，回退需审查队列状态及 schema |
| Provider 原生命令目录 | 合并 PR #1441 `73029b4a`、`91543b6d` | providers、命令 API、聊天 slash command hook/menu；合并提交同时包含上下文显示变更，不能整提交回退后只保留其中一部分 |
| 原生上下文压缩与弹窗压缩按钮 | `88adbf6b`、`ebfbce53` | Codex app-server 控制方法及聊天 composer；按钮依赖 provider 压缩支持，先处理按钮再回退底层 |
| 上下文百分比、K 缩写、窗口和压缩阈值 | `88f22a08`、`fadbca93`、`4201baba`、`6b94abbb`、`da11f9fb` | provider usage 事件、共享上下文元数据和 `src/modules/chat/composer/TokenUsageSummary.tsx`；弹窗两行设定/实际值，压缩阈值刻度，底部仅百分比；本机 512K CLI 配置不由 Git 自动设置 |
| 标题、Logo、头像配置 | `7a1cb855` | 设置、认证加载页、侧栏、聊天消息与共享品牌工具；配置保存到账号，创建用户仍遵循原有认证机制 |
| 历史恢复、搜索完成恢复与插入消息去重 | `37c375c0`、`e7ee39b7` | provider 历史读取、聊天状态与 WebSocket；依赖 app-server 事件协议，回退时检查重复显示问题是否重现 |
| 官方升级检查避免 GitHub 403 | `643a6bdb` | 更新检查改为缓存 npm metadata，成功缓存一小时、失败缓存十五分钟；仍提供官方发布页链接 |
| Linux/macOS 仪表盘插件 | `fcbf0846`、`ebfbce53`、`cc383f76`、`d4d35ba7` | `local-plugins/cloudcli-host-dashboard/`；仅选中可见时请求，长路径截断，macOS 只显示启动盘，Linux 保留宿主机相关盘；插件安装副本独立于源码 |
| 命令显示/隐藏与异步用户选择工具 | `52b4be25` | 设置和账号偏好、命令列表、`AsyncQuestionPanel`、provider 问题事件；默认隐藏 help/models/new/resume/fork/model/status/permissions/diff/mention，直接输入命令仍可执行；异步选择答复走插入/队列，不等同于阻塞审批；此提交包含两个功能 |
| 隐藏文件与多语言依赖排除 | 本次提交 `fix(files): show hidden configuration and record NAS changes` | `src/shared/api.ts`、`server/modules/file-tree/file-tree.service.ts`；默认浏览包含隐藏配置且不套用整个 gitignore，依赖/缓存目录仍不递归；规则见下表 |
| 分支变更自动归档 | 同上 | `scripts/record-nas-changes.mjs`、`.husky/pre-commit`、本目录与 AGENTS.md；每次 NAS commit 自动更新历史和暂存树差异，人工指南须同步维护 |

## 文件面板排除规则

隐藏配置（如 `.env`、`.github`、`.agents`、`.vscode`、`.idea`）可见。排除只影响默认列表，不删除磁盘数据。

| 范围 | 排除目录 |
| --- | --- |
| 版本控制 / Node | `.git`、`.svn`、`.hg`、`node_modules`；`.yarn/cache`、`.yarn/unplugged` |
| 通用构建和缓存 | `dist`、`build`、`.next`、`.nuxt`、`.cache`、`.parcel-cache`、`coverage`、`.nyc_output` |
| Java | `target`、`.gradle`、`out`、`build`；`.m2/repository` |
| Go | `vendor`、`.gocache`、`.go-build`；`pkg/mod`、`pkg/sumdb`，普通 `pkg` 源码保留 |
| Python | `venv`、`.venv`、`.tox`、`.nox`、`__pycache__`、`.pytest_cache`、`.mypy_cache`、`.ruff_cache`、`__pypackages__`、`site-packages`、`.ipynb_checkpoints` |
| Rust | `target`；`.cargo/registry`、`.cargo/git`，保留 `.cargo/config.toml` |
| C# / .NET | `.vs`、`.nuget/packages`；同目录存在 `.csproj`、`.fsproj`、`.vbproj`、`.sln` 或 `.slnx` 时排除 `bin`、`obj`、`packages`、`TestResults`；其他项目的普通 `bin` / `packages` 保留 |

`.m2`、`.nuget`、`.cargo` 等父目录保留配置文件，缓存子目录不进入。明确请求 `respectGitignore=true` 的其他 API 消费者仍可使用 gitignore 过滤；界面默认不请求该模式。

## 官方升级时的操作顺序

1. 确认工作树干净，备份本机数据库与 CLI 配置，在 `nas` 当前提交上创建升级审查分支。
2. 获取官方目标版本，在审查分支比较/合并官方更新；按功能表逐项确定已有官方替代、仍需保留和需要适配的差异。
3. 参考文件索引定位全量差异，参考完整提交记录定位修改原因、PR 导入及依赖顺序。不要直接切换官方 main 覆盖 nas 定制。
4. 修复冲突，运行相关测试、类型检查和构建；验证 provider 会话、命令、压缩、插件和跨电脑部署入口。
5. 只有官方升级已合入且审核完成，才将 `upstream-base.txt` 两行更新为新版本名与真实提交 SHA，并重新生成记录。历史记录可从升级前 Git 提交查看。
6. 完成后将审查结果合入 nas。前端按部署说明发布，后端在运行会话结束后激活；另一台电脑拉取源码后使用自己的本机运行配置。

## 单个功能回退参考

以下命令供未来审查使用，本次未执行回退：

```sh
git switch -c review/revert-feature nas
git show --stat <commit-sha>
git revert <ordinary-commit-sha>
# 合并提交：先确认第一父提交是 NAS 主线，再决定是否整体撤销
git revert -m 1 <merge-commit-sha>
```

按从新到旧的顺序撤销依赖修复，再撤销功能引入。一个提交包含多个功能时，应生成并审查针对性补丁；直接 revert 会一起撤销。合并 PR 的整体回退也会影响后续修复，不能仅根据 PR 编号盲目执行。

源码回退不会自动撤销数据库迁移、恢复已完成的上下文压缩、改变 CLI 配置、卸载插件或修改 NAS systemd/Nginx/CDN 状态。数据库变更需按兼容性单独决定，部署仍遵循 deploy/README.md。

## 日常记录维护

在 nas 修改功能时同步更新本指南的目的、入口、关键提交及回退依赖。先暂存要提交的源码和文档；pre-commit 在 lint-staged 成功后自动运行：

```sh
node scripts/record-nas-changes.mjs
git add docs/nas/commit-log.md docs/nas/file-index.md
```

若跳过 hooks，也须手动执行。生成器仅读取 Git 和暂存区，不读取运行数据，不访问网络。历史覆盖到生成时的 HEAD；当前 commit 的 SHA 尚未产生，改动先记录于“随本次提交入库”，下次提交自动补齐 SHA。两份生成文档本身不重复列入暂存变更，避免自引用。


## Codex 每会话“请求 Fast”

来源：本地产品接入说明 `admin-console/docs/cloudcli-fast-agent-prompt.md`，CloudCLI 自行实现；CPA 总许可与额度保护由已有服务端执行，本次不修改 CPA / Orbit / 凭据。

- 输入区模型选择菜单新增 Fast 开关（请求 Fast），默认关闭，只在 Codex 显示。模型、推理强度和权限选择保留，主模型仍为 `gpt-6.1-sol`。
- 元数据保存到 `sessions.codex_fast`（SQLite INTEGER 默认 0）。新、旧、fork 会话均默认关闭；已选会话独立保存，刷新、切换和另一个浏览器重新打开同一应用会话可恢复。历史同步/native thread ID 绑定不覆盖该值。
- 新会话草稿不会变成全局默认。创建会话的 HTTP 请求携带 `codexFast`，后端分配稳定应用 ID 后保存；首条 WebSocket 请求保留原发送快照，草稿重置为关闭。
- GET / PATCH `/api/providers/sessions/:sessionId/codex-fast` 使用现有 CloudCLI 鉴权，仅操作会话意图。参数须为 boolean，未知会话或非 Codex 会话拒绝；不调用 CPA 管理写接口、不传管理密钥。
- UI 元数据加载/保存时暂缓新发送，失败时在开关显示错误状态并提供点击重试；旧会话迟到响应不能改变当前会话，保存期间切走再回来会等写入完成再读。
- `buildSendOptions` 统一捕获 Fast、模型、effort、权限和 SDK/app-server 选择。FIFO 队列、队列编辑、计划消息、编辑重发和问题答复/继续发送保留各自快照；历史队列缺少该字段时按关闭处理。队列执行不会回写最新会话 Fast 选择。
- 切换只保存选择，不取消或调整当前 turn。插入到当前 turn 的消息继续使用该 turn 的档位；其快照不会被用于偷偷改变当前 turn。若要应用新的档位，等待下一轮请求开始。

### 源码与协议兼容性

| 范围 | 文件 |
| --- | --- |
| 会话状态及 UI | `src/modules/chat/hooks/useCodexFastState.ts`、`ChatInterface.tsx`、`composer/ChatComposer.tsx` |
| 发送/计划快照 | `src/modules/chat/hooks/useChatComposerState.ts`、`src/shared/types.ts`、`src/shared/api.ts` |
| 会话 API 与服务 | `server/modules/providers/provider.routes.ts`、`services/provider-session-settings.service.ts` |
| SQLite 持久化/兼容迁移 | `server/modules/database/schema.ts`、`migrations.ts`、`repositories/sessions.db.ts` |
| 原生运行路径 | `server/modules/providers/list/codex/codex-app-server.runtime.ts`、`codex-runtime.provider.ts` |
| 实际协议回归脚本 | `scripts/verify-codex-fast.mjs` |

核对本机 CLI / SDK **0.162.0**。通过 `codex app-server generate-ts` 导出的稳定协议确认 thread/start、thread/resume 支持 `serviceTier`，turn/start 支持 `serviceTier` 和 `serviceTierForTurn`，标准档为 `default`。app-server 每次 start/resume/turn 显式发送 priority 或 default，SDK 通过实际存在的 `CodexOptions.config.service_tier` 覆盖，未向 ThreadOptions 添加虚构属性。关闭值 default 在真实 CLI 请求中被消去，而非继续继承全局/native thread priority。

新功能需要同时更新前后端；NAS 使用既有发布流程，后台等待所有正在运行的会话结束后再激活，避免中断当前任务。普通电脑拉取源代码后构建/启动即可，不复制 NAS 配置。最低验证版本为 0.162.0；更早 CLI 若不接受字段，应升级或适配其真实协议，不能静默省略关闭覆盖。

### 验证与手动入口

1. 在 Codex 输入框底部打开模型选择菜单，再切换 Fast 开关；A 打开、B 保持关闭，刷新或使用另一浏览器打开 A，确认仍为开启；新建 C 应保持关闭。
2. 队列或计划一条 Fast 消息后关掉开关：该条仍按排队时的选择运行，之后的新消息使用关闭值。编辑队列保留原快照，编辑已发送消息重发使用本次提交时的选择。
3. 正在运行时切换，当前回复应继续，下一轮才应用。实际加速取决于 CPA 许可、额度保护、模型和上游；开关仅声明请求意图。
4. 如需检查真实请求字段，可执行 `node scripts/verify-codex-fast.mjs`。它使用临时 CODEX_HOME 和 loopback 测试上游，不读取/修改生产认证或 CLI 配置。
5. 可选 `--cpa-binary /path/to/CLIProxyAPI` 会启动隔离的 CPA 测试实例，验证总开关关闭、低额度、额度未知、恢复许可对应的过滤规则。四种真实 CLI wire 快照（app-server / SDK × 开/关）分别经过 CPA 校验。它不调整生产总开关和阈值，也不宣称生产实时额度已验证；生产额度轮询可能延迟 60 秒。

此次验证：会话状态/发送相关前端测试通过，provider/队列/计划/编辑网关相关后端测试通过；真实 0.162.0 CLI 两条路径开启均发送 priority、关闭均不携带 service_tier，且原配置设为 priority 时仍能关闭。隔离 CPA 7.3.12 过滤矩阵通过；同时只读调用现有服务端阈值判定函数，确认 disabled / quota_low / quota_unknown / active 对应规则。生产 CPA 配置及凭据未改动。

### 回退依赖

先移除 UI、发送快照和会话路由，再移除 provider tier 覆盖；若只回退 provider 覆盖，UI 的关闭状态会与实际继承的 priority 不一致。数据库列为新增默认 0、旧代码可忽略，无需破坏性删除；如回退数据库 schema，须同步修改 SELECT 列和元数据服务。CPA 许可/额度保护独立继续生效，不随 CloudCLI 回退改变。功能提交：`feat(codex): add session-scoped Fast requests`；完整涉及文件由 NAS hook 自动归档，提交 SHA 在下一次生成记录时补齐。


## Fast 菜单入口与技能描述预览

- Codex 的 Fast 控件仅收纳在模型/推理菜单，使用滑动开关，移除输入区独立按钮；开关操作同一会话值，保留加载/保存禁用及失败重试；维护入口为 `ComposerModelMenu.tsx`、`ComposerMenuPrimitives.tsx`、`ChatComposer.tsx`，依赖上述会话 Fast 服务，回退菜单入口不影响底层选择。
- 技能卡片、命令显示/隐藏设置、快捷命令列表和 composer 命令菜单统一使用 `src/shared/utils.ts` 的 `descriptionPreview`：最多 200 个 Unicode 字符，超出追加省略号，后端元数据、完整描述搜索和技能调用保持完整。源码涉及 `src/modules/skills/ProviderSkills.tsx`、settings/quick-settings-panel 命令列表与 `CommandMenu.tsx`。这是本地 UI 优化，未合入额外上游 PR；回退这些展示调用即可。
- 核对本机 finesse-ui SKILL.md：YAML 顶层 description 本身包含完整长介绍，metadata.short-description 另有简短描述；CloudCLI 读取的是顶层 description，描述为 4,160 个 Unicode 字符，解析结果与原始 YAML 字段完全一致，没有混入正文。未修改本机技能源文件。


### Fast 顶部开关与精简文案

Fast 滑动开关移到模型/推理菜单最顶部，正常文案仅“更快响应 · 更高用量”，错误文案为“设置失败，点击重试”。修改 `ComposerModelMenu.tsx` 和中英 chat 语言资源，保留原有会话保存与请求行为；回退仅影响排序及说明。

2026-10-13 核对 [OpenAI Codex Speed](https://learn.chatgpt.com/docs/agent-configuration/speed)：1.5× 速度明确对应 GPT-5.6 / GPT-5.5；受支持模型的订阅内用量倍率为 2.5×，购买 credits / Enterprise 按量额度为 2×。API 按模型 token 价格计算，[GPT-6.1 Sol 模型页](https://developers.openai.com/api/docs/models/gpt-6.1-sol)的 Fast 价格为标准档 2×，未承诺其固定速度倍率。CloudCLI 当前通过 NAS CPA，请求意图不等于上游实际档位，也无法仅凭客户端确定账号计费方式，因此不在开关中统一承诺“2×额度、1.5×速度”。


## 前端测试语言与 NAS Provider 回归修复

- 目的：修正默认中文界面导致的 65 项英文断言失败，以及已禁用 Cursor/OpenCode 导致的 4 项测试数据不一致；保留业务测试覆盖。
- 维护路径：`vitest.setup.ts` 在语言实例初始化和每项测试开始时固定英文，不提前导入应用或偏好模块，专门的语言测试仍可主动切换；`package.json` 的 `test:client` 通过已有 cross-env 固定 `NODE_ENV=test`，避免生产 shell 干扰依赖加载与 React act。
- Provider 测试：`src/shared/tests/useSelectedProvider.test.tsx`、`selectedProvider.test.ts` 与 `src/modules/chat/tests/chatProviderModels.test.ts` 使用 Claude/Codex 验证通知和模型隔离，并显式检查禁用 Provider 回退、旧存储不被恢复。
- 模型标签测试：`src/modules/chat/tests/messageModelLabel.test.tsx` 覆盖中英两种语言，使用对应的无障碍名称验证正反向显示；用户行携带模型时仍不得显示响应模型，修正英文选择器在中文下可能错误通过的盲点。
- 上下文弹窗测试：`src/modules/chat/tests/contextUsageDisplay.test.tsx` 精确匹配设定/当前值行名，避免英文 Configured 同时匹配模型窗口字段而报多个元素。
- 测试运行兼容：`vitest.setup.ts` 显式使用 jsdom 的 localStorage/sessionStorage，避免 Node 26 未配置原生存储路径时覆盖浏览器存储；`src/modules/auth/tests/authTokenRefreshRemount.test.tsx` 精确检查 auth/status、auth/user 重复初始化，并保留 workspace 挂载/加载次数断言，允许过半有效期 Token 正常触发 auth/refresh，消除计时器竞态误报。
- 来源：NAS 本地测试维护，未合并额外上游 PR。生产默认中文、Provider 启用列表及运行服务配置继续由原功能负责。
- 验证：本机直接执行 `pnpm run test:client`，123 个文件、814 项全部通过（原 809 项，新增 5 项中英标签与禁用 Provider 回归用例）；类型检查和前端构建通过，lint 无错误，保留仓库既有警告。Mac 使用相同源码和测试入口，本次未在 Mac 实机重跑。
- 回退依赖：可以独立回退测试和 Vitest 配置；回退后中文文案及 Provider 相关失败会恢复。未来调整默认语言或启用 Provider 时，需要同步审查这些明确的测试约定。

## Fast 开启状态图标

- 模型选择按钮在当前 Codex 会话开启 Fast 时，于模型文字前显示黄色实心闪电，深浅主题分别使用 yellow-400 / yellow-600；关闭或切换到不支持 Fast 的 Provider 时隐藏。
- 维护路径：`src/modules/chat/composer/ComposerModelMenu.tsx`，复用现有 Zap 图标及受控会话状态；来源为 NAS 本地 UI 调整，无额外上游 PR。
- 回退仅需移除按钮内的条件图标，依赖已有 Fast 会话状态，菜单开关与请求行为由原功能负责。


## 用户选择卡片简化

- 目的：精简聊天中的用户提问卡片，统一使用主题色、轻边框、小圆角和清楚的选项/操作层次；移除渐变顶线、脉冲圆点、入场位移动画与重复 Enter 提示，兼容深浅主题和长问题换行。
- 没有预设选项的问题直接展示并聚焦自由输入，不再要求先选择“0 / 其他”；有选项时继续支持单选、多选和自定义答案，多题切换保留各题选择和草稿。空回答的 Enter 与禁用提交按钮保持一致，跳过操作继续独立可用。
- 维护路径：`src/modules/chat/tools/InteractiveRenderers/AskUserQuestionPanel.tsx`、`src/modules/chat/tests/asyncQuestionPanel.test.tsx`；Claude 权限提问和 Codex 异步提问复用同一卡片，回答仍由既有权限/异步通道处理。
- 验证：816 项全量前端测试通过，覆盖无选项直接输入、空回答 Enter 不发送、多题返回后保留多选和草稿；类型检查、构建及涉及文件 lint 通过。NAS 前端已增量发布，未运行浏览器自动化。
- 来源：NAS 本地 UI 优化，无额外上游 PR。回退卡片组件及对应测试即可恢复旧交互，依赖既有 Question 类型及 AsyncQuestionPanel，不涉及数据库或后端迁移。
