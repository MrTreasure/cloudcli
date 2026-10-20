# Codex 请求体压缩：配置、验证与发布边界

## 来源与实现

依据 2026-10-20 外部交接文档 `c137_cpa/docs/cloudcli-compression-handoff.md`。
交接所述 CPA 基线为 v7.3.12 / `2eb8dd11d2480c5fd8bc8f2796cec6af534bc3b6`；
当时 CPA 修复仅完成源码和隔离验证，尚未发布。CloudCLI 不修改或部署 CPA。
本文件保留独立运行所需契约，其他电脑无需安装该兄弟仓库。

原代理只按入站 Content-Encoding 重编码：identity 仍是 identity，图片裁剪、
WebP 和 token 缓存都不能替代剩余完整 JSON 的 HTTP 编码。新增编码服务接在
图片处理之后；保留提示词、工具、参数、加密推理、缓存字段和历史原件。

| 本地环境变量 | 默认值与行为 |
| --- | --- |
| `CLOUDCLI_CODEX_REQUEST_COMPRESSION` | `preserve`；也可选 `identity`、`zstd`、`gzip`。preserve 沿用入站编码，不主动压缩 identity |
| `CLOUDCLI_CODEX_REQUEST_GZIP_ORIGINS` | 空；逗号分隔精确 HTTP(S) origin，无路径或凭据。添加表示操作者已确认该 CPA 的 gzip handler 修复上线 |
| `CLOUDCLI_CODEX_PROXY_COMPRESSED_BODY_BYTES` | 16777216（16 MiB）；显式模式压缩体上限，可设 4096–67108864 字节，不收紧 preserve 既有行为 |
| `CLOUDCLI_CODEX_PROXY_BODY_BYTES` | 67108864（64 MiB）；既有入站、解码和最终 JSON 上限 |

zstd/gzip 均为 level 1；原生 zstd 需要 Node 22.15+，以运行时函数检测为准。
缺少 zstd 仅可在发送前对已确认 origin 选择 gzip，否则明确失败。
小于 4 KiB 或无压缩收益时选择 identity。输入先解码，再对最终 JSON 编码一次，
不叠加编码。压缩/容量错误不偷偷发送原文。

同一策略用于 Responses 和 compact，保留 `/v1` 前缀；compact 响应仍为 JSON。
SSE 原样流式传递，取消中止 HTTP 与 zlib codec；共享 WebP 的在途缓存任务可以
完成，但取消后不再遍历后续图片或发出请求。编码、线程及图片 lease 在请求入口固定。
未绑定/子线程透明转发，不套用主会话策略；SDK、模型列表不在此次覆盖范围。
关闭图片过滤后显式编码模式仍可独立运行。

压缩前选定编码和准确长度，移除旧 Transfer-Encoding，保留认证、Thread-Id、
Session-Id、Originator、X-Codex-* 头；已有 X-Request-Id 不覆盖。
不新增重试：400/413/415、503 和 Retry-After 原样传回，网络/5xx/取消不换编码重放。
原生 Codex 自己的既有重试规则不由该代理接管。

## 测量口径

日志仅保存本地生成的关联 ID、编码、最终 JSON 字节、发送体字节、编码耗时和状态，
不记录完整提示词、Base64、Cookie、密钥或 URL。弹窗展示最近值、累计请求体、
平均值与单次最大值；新字段有独立计量起点，不用旧累计数猜测历史最大值。
本地 Node 完成写入的 body 字节是实测值，但不等于远端确认接收，不含 TLS/HTTP 头。
异常中途写入可能不计入已完成请求体累计，不能用它精确结算网卡上传。

仅测 **CloudCLI → 配置上游**。**CPA → ChatGPT** 的压缩需 CPA 独立开启和测量：
两段不可相加当作梯子消耗，也不能用 token/cache 变化推断上传大小。

### 本地模拟数据

NAS Node v26.0.0，同一最终 JSON 分别 identity、gzip level 1、zstd level 1，
每种压缩 5 次取平均编码时间，解压后逐字节一致；全程模拟数据，无真实模型请求。
混合样本包含 4 张不同的已处理图片及随机不透明状态。文本和工具样本重复度高，
不能将其压缩率外推为真实会话收益或公网延迟提升。

| 合成样本 | identity 字节 | gzip 字节 / 减少 / 平均耗时 | zstd 字节 / 减少 / 平均耗时 |
| --- | ---: | --- | --- |
| 长文本 | 1,335,401 | 27,101 / 97.97% / 2.426 ms | 12,812 / 99.04% / 1.227 ms |
| 结构化工具记录 | 1,143,531 | 53,607 / 95.31% / 2.612 ms | 21,507 / 98.12% / 1.271 ms |
| 图片及不透明状态 | 420,871 | 317,117 / 24.65% / 11.582 ms | 316,665 / 24.76% / 2.019 ms |

以上为本地编码实测；未测生产 CPA 解码、CPA → ChatGPT 请求体、真实收费模型、
公网流量、端到端延迟和 Mac 性能，不能宣称线上节省了这些数值。

## 验证与运行状态

- 新后端定向 10 项通过：三种编码逐字节一致、头和路径、已编码输入、compact、
  小请求/无收益、最终 WebP、原图不变、各类错误不重放、缺失 codec、SSE 首帧、
  HTTP/codec 取消、并发会话隔离、子线程透明、旧计量兼容及日志脱敏。
- 全量后端 857 项：856 通过、1 项既有测试跳过、0 失败。
- 全量前端 118 个文件、845 项通过，含弹窗新计量范围及平均/最大显示。
- `pnpm run typecheck`、`pnpm run build`、`pnpm run lint` 通过，保留既有 lint
  警告和 Vite 大包提示；最后代理微调另做定向测试、类型检查和后端构建。
- 源码及构建完成。用户确认 CPA 已支持压缩后，NAS 前端已发布（56 个变更资源，
  117 个资源本地跳过），后端于 2026-10-20 16:53 重启，PID 1293126 → 1555414。
  新进程环境已核对 `CLOUDCLI_CODEX_REQUEST_COMPRESSION=zstd`，编译产物编码验证
  通过；健康、登录、项目、草稿、最近会话、原模型目录不变均验证通过。
  未额外调用真实收费模型，也未测生产 CPA→ChatGPT；提交与推送以 Git 历史为准。

## 启用与回退

先核对实际目标 CPA 的部署版本和支持编码，再在每台电脑本地选择模式。
推荐已确认支持的目标用 zstd；若需 gzip，必须先部署 CPA 修复，再填写确认 origin。
前端计量按 NAS 既有发布流程发布，后端构建后重启；Mac 自行安装、构建、重启及
核对日志。NAS 本次仅在用户服务本地 drop-in `30-request-compression.conf` 中开启
zstd，没有设置 gzip 确认列表或改变公共源码默认值；未改认证、模型，不做公网首页/
CDN 逐项探测。运行记录及入口/数据库备份位于 NAS appdata 的
`operations/request-compression-release-20261020-165226/`，不随 Git 同步。

回退主动压缩：设置 `CLOUDCLI_CODEX_REQUEST_COMPRESSION=preserve` 并重启；
若需明确禁用本段所有请求编码，设 `identity`。退回不支持 gzip 的 CPA 之前，
必须先停用显式 gzip 和 zstd 的 gzip fallback，核对原生入站也未带 gzip。
CPA 自身的上游 zstd 开关独立处理，不因 CloudCLI 改回 preserve 自动关闭。

撤回源码时成组回退 codec、proxy、metrics 共享类型/服务、弹窗、语言包与相关测试。
无数据库 schema 或原生线程映射迁移，已有可选 transport 字段可保留；不要删除
原附件、图片档案、rollout 或尚未提交的跨项目文件权限改动。
