# Codex 子 Agent 监控与管理方案

记录日期：2026-10-24。

状态：社区调研与推荐方案已保存，尚未选定最终实施路线。用户本轮仅要求保存方案；没有安装候选工具、修改现有插件或发布服务。以下能力按调研时的上游文档及关键源码记录，未在本机实测兼容性。

## 需求与现状

- 在 CloudCLI 中查看 Codex 自动派出的子 Agent，包括父子关系、任务名称、模型、effort、状态及当前活动。
- 如需控制，能够准确停止指定子 Agent，并区分中断模型轮次和结束其已启动的命令进程。
- 当前安装的 `notetook/cloudcli-plugin-agent-monitor` 上游说明仅支持 Claude Code 进程、子 Agent 与 shell，未确认有可直接升级获得完整 Codex 管理能力的版本。
- 本机 CloudCLI 通过独立 `codex app-server --listen stdio://` 运行 Codex；共享 daemon 的控制工具不能直接假定可控制这个运行实例。

现有插件来源：[notetook/cloudcli-plugin-agent-monitor](https://github.com/notetook/cloudcli-plugin-agent-monitor)。CloudCLI 运行入口见 `server/modules/providers/list/codex/codex-app-server.process.ts`，具体部署与插件安装记录见 [维护指南](README.md)。

## 社区候选

| 项目 | 已核实的能力 | 边界及适用场景 |
| --- | --- | --- |
| [Codex Fleet Monitor](https://github.com/wubowen0528/codex-fleet-monitor) | Linux 自托管网页看板；父子任务树、状态、当前工具/命令、Token 活动及账号额度；以只读方式读取 Codex 数据 | 适合 NAS 上独立部署监控页面；不提供本方案要求的停止子 Agent 控制能力。依赖本地 SQLite/rollout 格式，升级后需验证兼容性 |
| [a0s/agent-monitor](https://github.com/a0s/agent-monitor) | 同时发现 Codex 与 Claude 会话及子 Agent；展示任务、模型、effort 和状态；支持终端显示及 JSON 快照，可选 hooks 补充生命周期事件 | 最适合参考其发现与关系解析逻辑，为现有 CloudCLI 插件增加 Codex 适配；本身不是 CloudCLI 插件，查看能力不能等同于停止能力 |
| [donvito/agent-monitor](https://github.com/donvito/agent-monitor) | 图形化 Agent 树、调用记录、父子导航与 Token/估算成本分析；读取本地 Codex 会话目录 | 实际本地日志发现依赖 Electron；`dev:web` 仅为浏览器演示，不应作为现成 NAS 网页服务推荐 |
| [codexctl](https://github.com/samuelhe52/codexctl) | Python 命令行客户端；通过共享 Codex app-server daemon 查看、启动、插入指令、排队及停止会话 | 控制能力可作协议参考；不是 CloudCLI 插件。默认连接共享 daemon socket，不能直接控制 CloudCLI 当前独立 stdio app-server；README 区分中断轮次与清理命令进程 |

其他调研候选：

- [hoangsonww/Claude-Code-Agent-Monitor](https://github.com/hoangsonww/Claude-Code-Agent-Monitor)：提供独立 Web 面板及 Codex 会话/工具/运行管理。其 Codex runner 有 `turn/interrupt` 调用，但未确认可对 CloudCLI 启动的外部子 Agent 做完整父子监控及逐个停止，不作为即插即用的替代方案。
- [cloudcli-plugin-progress](https://github.com/leigangzhang/cloudcli-plugin-progress)：面向会话进度提取与展示，不作为完整子 Agent 生命周期及停止管理工具推荐。

## 源码核对依据

- [a0s 发现逻辑](https://github.com/a0s/agent-monitor/blob/main/lib/agent-monitor.mjs) 同时解析 `session_meta.parent_thread_id` 和 `session_meta.source.subagent.thread_spawn.parent_thread_id`，并读取子 Agent 昵称、路径及角色。
- [Fleet Monitor 实现](https://github.com/wubowen0528/codex-fleet-monitor/blob/main/codex_monitor.py) 解析 `source.subagent.thread_spawn` 中的父线程 ID 与昵称，构建任务树。
- [donvito Codex 适配器](https://github.com/donvito/agent-monitor/blob/main/src/traces/codex.ts) 读取父线程元数据；[开发说明](https://github.com/donvito/agent-monitor/blob/main/docs/development.md) 明确本地日志发现依赖 Electron。
- [CCAM Codex runner](https://github.com/hoangsonww/Claude-Code-Agent-Monitor/blob/main/server/lib/codex-run-spawner.js) 为自己维护的运行句柄调用 `turn/interrupt`；这不能证明它可以接管其他客户端持有的运行实例。
- [codexctl 说明](https://github.com/samuelhe52/codexctl#behavior-to-know) 记录 daemon socket、轮次中断与命令进程清理之间的区别。

上述链接跟随上游主分支变化。实施前需要重新核对并固定参考版本、许可证与本机 CLI 协议，不能仅凭项目描述认定所有功能已兼容。

## 推荐路线

### 路线 A：先用独立网页监控

选择 Codex Fleet Monitor，读取本机 Codex 数据，验证现有 CloudCLI 会话与子线程均可展示。适合优先获得可用的父子任务树、实时活动和用量看板。

局限：增加一个独立服务，仍需单独规划如何在 CloudCLI 中进入；这一阶段不宣称支持停止子 Agent。不要仅为增加看板而替换现有 Codex 执行器。

### 路线 B：整合到现有 CloudCLI Agent Monitor（优先建议）

保留现有 Claude 能力，参考 a0s 的发现逻辑增加 Codex provider：

1. 发现会话与子线程，建立以线程 ID 为标识的父子树；显示数据来源，不把共享进程 PID 当成子 Agent ID。
2. 合并可用的运行时事件与 rollout 元数据，区分运行、等待输入、完成、失败及无法确认的状态。不能仅凭进程存在或日志短暂静默就认定仍在执行或已结束。
3. 展示名称、任务、模型、effort、工作目录和最近工具调用；缺失字段显示未知，不补造数据。
4. 如需停止功能，通过 CloudCLI 持有的 app-server 连接，针对指定线程/活动轮次操作。先验证子线程控制是否可用，再开放界面按钮；不可用时明确标记只读。
5. 分别验证停止一个子线程对其命令进程、后代线程和父任务的影响。不得用终止共享 app-server 进程替代单个子 Agent 的停止操作。

建议先交付只读发现与展示，再单独接入控制；这只是实施顺序建议，尚未授权开始修改或部署。

## 实施验收与回退要求

- 用本机真实会话验证多层父子关系、不同会话隔离、运行中刷新及完成状态收敛；不将历史遗留线程误标成正在运行。
- 控制功能需验证准确目标、权限、重复请求，以及父任务/其他会话不被误停；命令进程是否被清理必须单独说明。
- 保留现有 Claude 插件能力、认证、模型目录与 provider 偏好。读取数据不能改写 Codex 原始 rollout 或数据库。
- NAS 的 CLI HOME、数据目录与连接信息属于本机配置，不写入公共运行默认值。
- 对现有插件的改动应先备份并记录版本；回退恢复插件版本及配置，不删除 Codex 历史。若采用独立服务，回退其入口及服务即可，不影响原 Codex 执行器。
- 具体安装、代码修改、启用控制及发布范围，在确定实施路线时再落实。本次仅保存文档。
