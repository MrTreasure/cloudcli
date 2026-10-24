# 浏览器到 CloudCLI 后端的请求与流量优化

日期：2026-10-25。范围仅为浏览器 → CloudCLI API，不修改 CloudCLI → CPA 的 zstd 请求、提示词、模型参数或历史内容。用户明确要求修复、验证、NAS 部署及推送；不运行浏览器自动化。

## 根因与基线

按 **Asia/Shanghai** 汇总现有 Nginx 日志，2026-10-24 共 **24,809** 次请求，其中 OPTIONS **12,375** 次。Nginx 原始时间带 `+0000`，直接按日志日期筛选会误得到 22,892 次。

- `/api/providers/sessions/running`：6,322 次 GET + 6,322 次 OPTIONS；业务查询不能计成 12,644 次。
- `/api/user/drafts`：378 次 GET、971 次 PUT、1 次 DELETE、1,350 次 OPTIONS。自动保存写入与重复读取必须区分，不删去保存来凑请求降幅。
- 分页 messages：843 次成功 GET、1 次 499、839 次 OPTIONS（本次对保存日志的汇总）。
- 原日志没有字节字段，历史总传输量未知；不得用零或估算冒充历史实测流量。
- 原应用未设置 CORS Max-Age；原状态同步每标签页固定 5 秒，没有页面可见性、离线或失败退避，也没有等待请求完成再排下一次。
- 草稿的排队卡片原先另有 5 秒定时器；HTTP 与草稿合并层都缺少并发读取合并。自动保存已经有 debounce、逐 scope 写入串行及版本保护，应保留。
- 历史消息已经按 20 条分页并合并刷新；原来的“隐藏”只指应用标签页，浏览器页面隐藏后仍可能被完成/后台通知触发 HTTP 刷新。
- 实测 NAS TLS 入口接受 gzip 时，普通 JSON 仍未压缩。

## 修改归属

| 层级 | 路径 | 修改 |
| --- | --- | --- |
| 通用后端 | `server/modules/auth/cors-policy.service.ts`、`server/modules/auth/index.ts`、`server/index.ts` | 精确匹配配置的 `FRONTEND_ORIGIN`，合法预检缓存 600 秒；保留方法/请求头反射及必要响应头暴露。同源不需要开启跨域 |
| NAS 配置 | `deploy/agent-api.conf` | 既有合法来源的 OPTIONS 在入口提供 600 秒 Max-Age；隐藏上游同名头，避免后端升级后重复。仅压缩普通 JSON，新增字节统计；保留 Origin 拒绝、鉴权、API 直连及不缓冲设置 |
| 通用请求 | `src/shared/api.ts` | running/drafts 只合并尚未完成的 GET，并等待响应正文完成；按后端 URL 和当前身份隔离，15 秒超时，不保留已完成响应。无正文不添加 JSON Content-Type；Authorization 及 `cache: no-store` 保留，旧身份的响应不能刷新/清除新身份登录 |
| 自适应同步 | `src/shared/hooks/useAdaptivePolling.ts`、`src/shared/context/SessionProtectionContext.tsx`、`src/modules/project-workspace/ProjectWorkspaceRoute.tsx` | 完成后再排下一次、可见性/网络恢复处理、失败退避；复用既有 WebSocket 状态更新，对重连及未知会话发现补权威快照，发现事件节流 5 秒 |
| 快照顺序 | `src/shared/hooks/useSessionProtection.ts`、`src/shared/types.ts` | HTTP 请求开始后发生的 live 状态变化优先，避免慢查询复活已完成任务或丢掉新任务 |
| 草稿 | `src/shared/chatDrafts.ts`、`src/modules/chat/hooks/useChatComposerState.ts`、`src/modules/auth/context/AuthContext.tsx` | 合并同一 store epoch 的 hydrate，保护跨身份及本地编辑；排队卡片自适应校准，恢复可见/焦点/在线时补一次草稿读取。不改变保存、队列认领及取消语义 |
| 历史消息 | `src/modules/chat/hooks/useChatSessionState.ts` | 浏览器隐藏时合并待刷新标记，恢复可见/在线后刷新当前会话；不截断历史、不关闭 WebSocket、不修改分页与上下文 |
| 统计 | `deploy/summarize-cloudcli-traffic.py` | 显式输入日志及日期，按时区、方法、路径类别、状态汇总；未记录字节的历史行标为未知，不建立周期采集任务 |

新增/更新的回归测试位于 `src/shared/tests/` 与 `server/modules/auth/tests/cors-policy.test.ts`。

## 同步节奏与延迟边界

| 状态 | 配置节奏（从上次请求完成开始计算） |
| --- | --- |
| 可见且有前台/后台任务 | 5 秒 |
| 可见且空闲 | 30 秒，继续发现其他设备启动的任务 |
| 页面隐藏 | 60 秒兜底，不关闭流或取消任务 |
| 浏览器报告离线 | 暂停这些轮询，恢复 online 时补同步 |
| 恢复可见/网络、WebSocket 重连 | 无在途时立即安排，1 秒最小合并窗口；有在途则合并一次尾随请求 |
| 请求失败 | 在正常节奏基础上指数退避并加 0～25% 正抖动，上限 120 秒；成功恢复正常节奏 |
| 401/403 | 停止本次轮询生命周期的重试，重新登录/重新挂载后恢复；不把空响应当成任务完成 |

单次 running/drafts 网络读最多等待 15 秒。健康网络、未冻结的页面，未知状态一般在相应间隔 + 请求耗时内显示（配置上的参考上界为 20/45/75 秒）；失败时为退避间隔 + 请求耗时，最高约 135 秒。浏览器后台节流、页面冻结、离线或服务故障时没有墙钟时间保证。已订阅任务仍由 WebSocket 及时更新，不必等下一次校准。

不引入 BroadcastChannel、Web Locks 或主标签页。每个标签页独立维护状态与兜底，因此请求仍随标签页数量增长；同一页面内相同身份/后端的在途查询合并。没有广播 token、会话正文或其他敏感数据，也不增加另一份调度系统。

## 验证结果

- 前端全量：121 文件，**868 项通过**。
- 后端全量：865 项，**864 通过、1 项既有跳过、0 失败**。
- 类型检查、前后端构建通过；lint 无错误，保留仓库已有警告。另对隔离发布输入完成类型检查及构建。
- 定向测试覆盖慢请求不重叠、失败/恢复及有界退避、可见性/离线/在线、身份切换、草稿并发/写入保护、后台任务与迟到状态快照、分页刷新合并。已有取消、重连、排队等回归继续通过。
- CORS 模拟服务验证合法/非法来源、同源默认、暴露头与非缓存业务响应。NAS 实际 TLS 入口验证合法 OPTIONS 为 204 + Max-Age 600；非法来源为 403 且没有允许来源/Max-Age。应用级同样的头策略在后端安全重启后验证，以运行收据为准。
- NAS TLS WebSocket 两次连接均取得订阅确认，含关闭后重连；没有调用真实收费模型或停止生产任务。
- 隔离 loopback Nginx 使用同样的 JSON gzip/不缓冲设置验证 SSE：首事件约 **1.23 ms**，末事件约 **502.50 ms**，没有 Content-Encoding，首事件在末事件前到达。这是模拟流测试，不是真实模型测速。
- 未运行浏览器自动化；真实浏览器的交互及 CORS 缓存命中率由用户手动验收。

## 对比：实测与推算分开

### 实际 HTTP 回放（不是浏览器测试）

同一 60 秒窗口、两个逻辑标签页、页面隐藏且持有排队卡片，向 NAS TLS 入口读取 running/drafts；登录请求不计入场景。前后分别按旧/新已测试节奏发请求；OPTIONS 由回放客户端显式发送，不是浏览器真实预检缓存测量。

| 指标 | 旧节奏回放 | 新节奏回放 |
| --- | ---: | ---: |
| GET | 48 | 4 |
| OPTIONS | 48 | 4 |
| 响应正文总字节 | 12,776 | 842 |
| 单请求中位耗时 | 53.47 ms | 52.92 ms |
| 单请求最大耗时 | 98.83 ms | 56.48 ms |
| 状态 | 全部 2xx | 全部 2xx |

期间其他真实任务陆续结束，running 返回内容也变小；**正文总字节变化不能全部归因于轮询优化**，更不能推导固定节流比例。耗时样本小、网络和缓存冷热不同，不据此宣称接口加速。

### 固定历史响应的传输样本

同一会话前 20 条消息的 JSON 为 **26,826 字节**。原入口请求 gzip 仍传 26,826 字节；开启 JSON gzip 后传 **7,730 字节**，解码后仍为 26,826 字节。小于 1 KiB 的 running/drafts 样本未压缩，避免压缩小响应增加开销。此结果不是全站流量比例，也没有删除历史、图片或上下文。

### 逻辑时钟测试与预期

相同 5 分钟、单标签页、无额外事件且请求即时成功，自动化逻辑时钟测试读数：活跃 60 次、空闲 10 次、隐藏 5 次；原固定 5 秒策略为 60 次。实际浏览器会受到请求耗时、事件、后台调度与错误影响。

600 秒预检缓存只覆盖浏览器认为匹配的来源、URL、方法、请求头及缓存分区等条件。更换 URL、请求头、设备、分区，浏览器限制或缓存清理都会触发新 OPTIONS，不承诺全部消失。

## 统计字段与隐私

日志新增 `request_length`、`body_bytes_sent`、`bytes_sent`、`request_time`、`upstream_time`、`content_encoding`、`gzip_ratio`，路径继续使用不带 query 的 `$uri`。不记录 Authorization、Cookie、URL token、正文、提示词、图片 Base64 或 WebSocket 消息。

`request_length` 包括请求行和请求头，不是纯正文。Nginx 字节不含完整 TLS/TCP 开销，不等于运营商计费流量。WebSocket 耗时通常是连接生存期，不能当成接口处理慢。历史缺失字段为未知；需要积累新日志后才能按相同场景比较实际浏览器流量。

示例：`python3 deploy/summarize-cloudcli-traffic.py --log <日志路径> --day 2026-10-24 --timezone Asia/Shanghai`。这是手动工具，没有新增周期业务任务。

## NAS 发布、状态与回退

- 本次使用 `.worktrees/browser-traffic-20261025` 的 detached 隔离构建，不新建功能分支。只加入本次源码，额外保留已经发布的 Esc 调整；排除其他未提交的下载 UI、路径迁移等开发内容。没有覆盖这些工作区改动。
- 通过既有 `deploy/publish-frontend.py` 发布，资源先上传并做真实公网字节/CORS 校验，再原子切换 HTML；沿用 `agent.mrtreasure.cc`、`assets.mrtreasure.cc/cloudcli/v2/` 与 API 直连。Cloudflare 边缘入口的状态/哈希见操作目录 `frontend-edge.json`。
- Nginx 只替换 CloudCLI 配置块，配置检查通过后平滑 reload；其他应用配置字节保持不变，未重启 CPA、Muse 或其他应用。原宿主机配置权限已恢复。
- 起初有 4 个活动会话，后续只剩本次对话。后端只能在所有前台/后台任务均为空时安装已构建 CORS 模块并重启；不为了结束本次对话而强杀服务。安全维护任务的最终结果以操作目录 `backend-restart-result.json` 为准；安排任务不等同于已经完成重启。
- 操作记录：`/vol1/1000/appdata/cloudcli/operations/browser-traffic-20261025-003543/`。保留发布前 HTML/PWA 文件、Nginx 配置、测试/回放摘要及待安装模块备份。收据不含凭据或会话正文。
- 回退前端：恢复操作目录 `frontend-before/` 对应入口/PWA，按现有 Cloudflare 同步流程发布；保留新旧哈希资源，不整体回退共享资产 Worker，避免影响其他应用。
- 回退 Nginx：仅恢复备份中的 CloudCLI 块，保留其他应用的后续修改；先 `nginx -t` 再平滑 reload。
- 回退后端：在空闲窗口恢复本次备份的入口、auth barrel 及对应 maps，再重启 CloudCLI；新 CORS 模块不再引用后可移除。无 DB/schema、模型目录或历史迁移。
- Mac/Windows 需要同步源码、重新构建前端，并在采用通用后端 CORS 修改时重启各自后端。同源开发默认不变；NAS 的 Nginx、公开域名、运行目录与本机凭据不会随源码自动生效。

不承诺固定流量节省比例；这些改动不保证运营商无法识别服务。
