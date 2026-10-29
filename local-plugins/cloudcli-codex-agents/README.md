# Codex 原生子 Agent 插件

在 CloudCLI 标签页中查看这台机器的 Codex 原生子 Agent：运行中、已结束、待确认分组；按项目筛选、搜索已加载任务、分页查看历史；展开任务查看父会话、模型、命令、文件改动和 Agent 回复。

## 数据与状态

- 只读当前 `CODEX_HOME`（默认 `~/.codex`）的最新 `state_*.sqlite` 和其 `sessions` / `archived_sessions` 中的原生 rollout。允许上述目录自身是软链接，拒绝索引指向这些目录之外的文件。不会读取 Codex 凭据文件，不修改会话、创建 Agent 或调用模型。
- 使用原生 `subagent` / `thread_spawn` 记录；内部 guardian/review 等非派遣线程不混入任务列表。支持旧式 response_item 和新式 item_completed 活动，过滤派生线程携带的父线程历史。
- 完成、停止依据原生结束事件。近期开始/工具事件且无结束记录标为运行中；超过两分钟没有记录的任务标为待确认，不将“未发现完成”当作进程仍然存活的保证。文件不存在时保留索引信息并明确提示。
- 列表每页 40 条，每个 rollout 列表读取尾部最多 128 KiB；详情最多读取尾部 1 MiB、展示最近 80 条、每条文本最多 4000 字符。不展示 base instructions、加密内容或原始思考正文；仅对已知 bearer/key/base64 模式做显示脱敏，不将原始内容打印到日志。
- 插件打开时：运行中 5 秒、空闲 20 秒、页面隐藏 60 秒同步；离线暂停，恢复可见/网络恢复立即校准，失败使用现有有上限退避。切换出插件卸载并停止请求。每轮只发一次 RPC，详情使用 revision 避免重复传输未变化的内容；无独立定时业务任务。
- 这是查看面板，不提供未经原生控制通道确认的终止/发消息操作。

## 构建和安装

需要 Node >=22.13（内置只读 SQLite；NAS 使用 Node 26），以及本仓库前端依赖。使用 pnpm：

```sh
pnpm install --frozen-lockfile
pnpm run build
```

将本目录的 `manifest.json` 与 `dist` 复制到 `~/.claude-code-ui/plugins/cloudcli-codex-agents/`，刷新插件列表，并在设置的插件页启用 `subAgent`。其服务只监听回环地址，通过现有 CloudCLI 鉴权 RPC 对外提供数据。NAS 发布时先发布主程序前端资源，再安装/启用插件；用启停插件重载 worker，无需中断模型任务。

C137 前端内置同一 UI 的动态入口，由 Vite 随主程序发布到 Cloudflare。普通外部插件仍保留原有加载机制；本插件也构建 standalone entry 供本地同源环境使用。所有机器使用自己的 Codex 数据，没有 NAS 域名、绝对路径或凭据写入默认值。

回退：在插件设置停用 `codex-agents` 即可；删除安装副本后刷新插件列表。不会删除任何 Codex 原生会话或执行记录。

## 项目活动与清除记录

主项目头显示活动摘要，与面板共享一份同步状态。默认只看当前项目，历史默认折叠，详情命令输出可展开。清除只移出本插件已结束的面板记录，不删除 Codex 原始历史、不停止或释放原生线程；任务再次活动或记录变更时恢复显示。标记按宿主认证账户持久保存在 `~/.claude-code-ui/plugin-state/codex-agents/`，不保存 token 或会话正文。

清除需要新版宿主传入经认证的内部账户头；旧宿主仍可读取，清除返回需更新后端的提示。原生执行资源由所属 Codex 管理，插件不通过另起 CLI 或直接修改 SQLite 假称释放。
