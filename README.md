<div align="center">
 <img src="public/logo.svg" alt="CloudCLI UI" width="64" height="64">
 <h1>Cloud CLI (aka Claude Code UI)</h1>
 <p>A desktop and mobile UI for <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>, <a href="https://docs.cursor.com/en/cli/overview">Cursor CLI</a>, and <a href="https://developers.openai.com/codex">Codex</a>.<br>Use it locally or remotely to view your active projects and sessions from everywhere.</p>
</div>

<p align="center">
 <a href="https://cloudcli.ai">CloudCLI Cloud</a> · <a href="https://cloudcli.ai/docs">Documentation</a> · <a href="https://discord.gg/buxwujPNRE">Discord</a> · <a href="https://github.com/siteboon/claudecodeui/issues">Bug Reports</a> · <a href="CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
 <a href="https://cloudcli.ai"><img src="https://img.shields.io/badge/☁️_CloudCLI_Cloud-Try_Now-0066FF?style=for-the-badge" alt="CloudCLI Cloud"></a>
 <a href="https://discord.gg/buxwujPNRE"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join our Discord"></a>
 <br><br>
 <a href="https://trendshift.io/repositories/15586" target="_blank"><img src="https://trendshift.io/api/badge/repositories/15586" alt="siteboon%2Fclaudecodeui | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>

<div align="right"><i><b>English</b> · <a href="./docs/README.ru.md">Русский</a> · <a href="./docs/README.de.md">Deutsch</a> · <a href="./docs/README.ko.md">한국어</a> · <a href="./docs/README.zh-CN.md">简体中文</a> · <a href="./docs/README.zh-TW.md">繁體中文</a> · <a href="./docs/README.ja.md">日本語</a> · <a href="./docs/README.tr.md">Türkçe</a> · <a href="./docs/README.id.md">Bahasa Indonesia</a></i></div>

---

## Screenshots

<div align="center">

<table>
<tr>
<td align="center">
<h3>Desktop View</h3>
<img src="public/screenshots/desktop-main.png" alt="Desktop Interface" width="400">
<br>
<em>Main interface showing project overview and chat</em>
</td>
<td align="center">
<h3>Mobile Experience</h3>
<img src="public/screenshots/mobile-chat.png" alt="Mobile Interface" width="250">
<br>
<em>Responsive mobile design with touch navigation</em>
</td>
</tr>
<tr>
<td align="center" colspan="2">
<h3>CLI Selection</h3>
<img src="public/screenshots/cli-selection.png" alt="CLI Selection" width="400">
<br>
<em>Select between Claude Code, Cursor CLI and Codex</em>
</td>
</tr>
</table>



</div>

## Features

- **Responsive Design** - Works seamlessly across desktop, tablet, and mobile so you can also use Agents from mobile 
- **Interactive Chat Interface** - Built-in chat interface for seamless communication with the Agents
- **Integrated Shell Terminal** - Direct access to the Agents CLI through built-in shell functionality
- **File Explorer** - Interactive file tree with syntax highlighting and live editing
- **Git Explorer** - View, stage and commit your changes. You can also switch branches 
- **Browser Use** - Open browser sessions for web research, testing, and agent-driven browser tasks
- **Session Management** - Resume conversations, manage multiple sessions, and track history
- **Plugin System** - Extend CloudCLI with custom plugins — add new tabs, backend services, and integrations. [Build your own →](https://github.com/cloudcli-ai/cloudcli-plugin-starter)
- **TaskMaster AI Integration** *(Optional)* - Advanced project management with AI-powered task planning, PRD parsing, and workflow automation
- **Model Compatibility** - Works with Claude and GPT model families (the full list of supported models is available at runtime via `GET /api/providers/:provider/models`)


## Quick Start

### CloudCLI Cloud (Recommended)

The fastest way to get started — no local setup required. Get a fully managed, containerized development environment accessible from the web, mobile app, API, or your favorite IDE.

**[Get started with CloudCLI Cloud](https://cloudcli.ai)**

### Self-Hosted (Open source)

#### npm

Try CloudCLI UI instantly with **npx** (requires **Node.js** v22+):

```
npx @cloudcli-ai/cloudcli
```

Or install **globally** for regular use:

```
npm install -g @cloudcli-ai/cloudcli
cloudcli
```

Open `http://localhost:3001` — all your existing sessions are discovered automatically.

Visit the **[documentation →](https://cloudcli.ai/docs)** for full configuration options, PM2, remote server setup and more.

#### Docker Sandboxes (Experimental)

Run agents in isolated sandboxes with hypervisor-level isolation. Starts Claude Code by default. Requires the [`sbx` CLI](https://docs.docker.com/ai/sandboxes/get-started/).

```
npx @cloudcli-ai/cloudcli@latest sandbox ~/my-project
```

Supports Claude Code and Codex. See the [sandbox docs](docker/) for setup and advanced options.

### Desktop Companion App

CloudCLI Desktop is an optional native companion for CloudCLI Cloud and Local CloudCLI. It ships from this repository's GitHub Releases and keeps CloudCLI available from your menu bar or tray.

- **[macOS](https://cloudcli.ai/download/macos)**
- **[Windows](https://cloudcli.ai/download/windows)**
- **[Download page](https://cloudcli.ai/download)** · **[GitHub Releases and checksums](https://github.com/siteboon/claudecodeui/releases)**

Use it to open CloudCLI Cloud environments, switch between local and remote workspaces, and copy mobile/browser URLs. To work locally, choose **Local CloudCLI** in the desktop app; it will use your running local server or start one for you.


---

## Which option is right for you?

CloudCLI UI is the open source UI layer that powers CloudCLI Cloud. You can self-host it on your own machine, run it in a Docker sandbox for isolation, or use CloudCLI Cloud for a fully managed environment.

| | Self-Hosted (npm) | Self-Hosted (Docker Sandbox) *(Experimental)* | CloudCLI Cloud |
|---|---|---|---|
| **Best for** | Local agent sessions on your own machine | Isolated agents with web/mobile IDE | Teams who want agents in the cloud |
| **How you access it** | Browser via `[yourip]:port` | Browser via `localhost:port` | Browser, any IDE, REST API, n8n |
| **Setup** | `npx @cloudcli-ai/cloudcli` | `npx @cloudcli-ai/cloudcli@latest sandbox ~/project` | No setup required |
| **Isolation** | Runs on your host | Hypervisor-level sandbox (microVM) | Full cloud isolation |
| **Machine needs to stay on** | Yes | Yes | No |
| **Mobile access** | Any browser on your network | Any browser on your network | Any device |
| **Desktop companion** | Optional. Choose Local CloudCLI | Optional. Choose Local CloudCLI | Optional. Opens cloud environments |
| **Agents supported** | Claude Code, Cursor CLI, Codex | Claude Code, Codex | Claude Code, Cursor CLI, Codex |
| **File explorer and Git** | Yes | Yes | Yes |
| **MCP configuration** | Synced with `~/.claude` | Managed via UI | Managed via UI |
| **REST API** | Yes | Yes | Yes |
| **Team sharing** | No | No | Yes |
| **Platform cost** | Free, open source | Free, open source | Starts at €7/month |

> All options use your own AI subscriptions (Claude, Cursor, etc.) — CloudCLI provides the environment, not the AI.

---

## Security & Tools Configuration

**🔒 Important Notice**: All Claude Code tools are **disabled by default**. This prevents potentially harmful operations from running automatically.

### Enabling Tools

To use Claude Code's full functionality, you'll need to manually enable tools:

1. **Open Tools Settings** - Click the gear icon in the sidebar
2. **Enable Selectively** - Turn on only the tools you need
3. **Apply Settings** - Your preferences are saved locally

<div align="center">

![Tools Settings Modal](public/screenshots/tools-modal.png)
*Tools Settings interface - enable only what you need*

</div>

**Recommended approach**: Start with basic tools enabled and add more as needed. You can always adjust these settings later.

---

## Plugins

CloudCLI has a plugin system that lets you add custom tabs with their own frontend UI and optional Node.js backend. Install plugins from git repos directly in **Settings > Plugins**, or build your own.

### Available Plugins

| Plugin | Description |
|---|---|
| **[Project Stats](https://github.com/cloudcli-ai/cloudcli-plugin-starter)** | Shows file counts, lines of code, file-type breakdown, largest files, and recently modified files for your current project |
| **[Web Terminal](https://github.com/cloudcli-ai/cloudcli-plugin-terminal)** | Full xterm.js terminal with multi-tab support |
| **[CloudCLI Scheduler](https://github.com/grostim/cloudcli-cron)** | Create workspace-scoped scheduled prompts and execute them through a local CLI such as Codex or Claude Code |
| **[PRISM CloudCLI](https://github.com/jakeefr/cloudcli-plugin-prism)** | Session intelligence for Claude Code inside CloudCLI, including token burn visibility |
| **[Sessions](https://github.com/strykereye2/cloudcli-plugin-session-manager)** | View, manage, and kill active Claude Code sessions |
| **[Token Cost Calculator](https://github.com/NightmareAway/cloudcli-plugin-token-cost-calculator)** | Calculate API costs from model prices and token usage, with preset model pricing support |
| **[Task Queue](https://github.com/TadMSTR/cloudcli-plugin-task-queue)** | Task queue dashboard to view, filter, and launch agent tasks |
| **[GitHub Issues Board](https://github.com/szmidtpiotr/claude-github-issue)** | Kanban board for GitHub Issues with bidirectional TaskMaster sync and /github-task CLI skill auto-install |

### Build Your Own

**[Plugin Starter Template →](https://github.com/cloudcli-ai/cloudcli-plugin-starter)** — fork this repo to create your own plugin. It includes a working example with frontend rendering, live context updates, and RPC communication to a backend server.

**[Plugin Documentation →](https://cloudcli.ai/docs/plugin-overview)** — full guide to the plugin API, manifest format, security model, and more.

### Private Repositories

The server installs and updates plugins with `git clone` and `git pull`, using the git credentials of the operating-system user it runs as (for a systemd service, the unit's `User=`). The server cannot answer a password or passphrase prompt during an install, so set up credentials for that user before installing from a private repository:

- **`https://` URLs:** configure a git credential helper, for example `gh auth login` followed by `gh auth setup-git`, or a token in `~/.git-credentials` with `git config --global credential.helper store`.
- **`git@` URLs:** give that user an SSH key the git host accepts and that works without a prompt: either it has no passphrase, or it is loaded into an `ssh-agent` whose `SSH_AUTH_SOCK` the server process inherits. Also add the host to that user's `~/.ssh/known_hosts`, for example by running `ssh -T git@github.com` once as that user.

Without credentials, an `https://` install fails with a message saying that the repository is private or does not exist. Most git hosts, GitHub included, answer the same way for both. If the host rejects the credentials (wrong, expired or revoked), or ssh cannot log in for a `git@` URL, the message says so.

---
## FAQ

<details>
<summary>How is this different from Claude Code Remote Control?</summary>

Claude Code Remote Control lets you send messages to a session already running in your local terminal. Your machine has to stay on, your terminal has to stay open, and sessions time out after roughly 10 minutes without a network connection.

CloudCLI UI and CloudCLI Cloud extend Claude Code rather than sit alongside it — your MCP servers, permissions, settings, and sessions are the exact same ones Claude Code uses natively. Nothing is duplicated or managed separately.

Here's what that means in practice:

- **All your sessions, not just one** — CloudCLI UI auto-discovers every session from your `~/.claude` folder. Remote Control only exposes the single active session to make it available in the Claude mobile app.
- **Your settings are your settings** — MCP servers, tool permissions, and project config you change in CloudCLI UI are written directly to your Claude Code config and take effect immediately, and vice versa.
- **Works with more agents** — Claude Code, Cursor CLI and Codex, not just Claude Code.
- **Full UI, not just a chat window** — file explorer, Git integration, MCP management, and a shell terminal are all built in.
- **CloudCLI Cloud runs in the cloud** — close your laptop, the agent keeps running. No terminal to babysit, no machine to keep awake.

</details>

<details>
<summary>Do I need to pay for an AI subscription separately?</summary>

Yes. CloudCLI provides the environment, not the AI. You bring your own Claude, Cursor, or Codex subscription. CloudCLI Cloud starts at €7/month for the hosted environment on top of that.

</details>

<details>
<summary>Can I use CloudCLI UI on my phone?</summary>

Yes. For self-hosted, run the server on your machine and open `[yourip]:port` in any browser on your network. For CloudCLI Cloud, open it from any device — no VPN, no port forwarding, no setup. A native app is also in the works.

</details>

<details>
<summary>Will changes I make in the UI affect my local Claude Code setup?</summary>

Yes, for self-hosted. CloudCLI UI reads from and writes to the same `~/.claude` config that Claude Code uses natively. MCP servers you add via the UI show up in Claude Code immediately and vice versa.

</details>

---

## Community & Support

- **[Documentation](https://cloudcli.ai/docs)** — installation, configuration, features, and troubleshooting
- **[Discord](https://discord.gg/buxwujPNRE)** — get help and connect with other users
- **[GitHub Issues](https://github.com/siteboon/claudecodeui/issues)** — bug reports and feature requests
- **[Contributing Guide](CONTRIBUTING.md)** — how to contribute to the project

## License

GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later) — see [LICENSE](LICENSE) for the full text, including additional terms under Section 7.

This project is open source and free to use, modify, and distribute under the AGPL-3.0-or-later license. If you modify this software and run it as a network service, you must make your modified source code available to users of that service.

CloudCLI UI - (https://cloudcli.ai).

## Acknowledgments

### Built With
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropic's official CLI
- **[Cursor CLI](https://docs.cursor.com/en/cli/overview)** - Cursor's official CLI
- **[Codex](https://developers.openai.com/codex)** - OpenAI Codex
- **[React](https://react.dev/)** - User interface library
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[CodeMirror](https://codemirror.net/)** - Advanced code editor
- **[TaskMaster AI](https://github.com/eyaltoledano/claude-task-master)** *(Optional)* - AI-powered project management and task planning


### Sponsors
- [Siteboon - AI powered website builder](https://siteboon.ai)
---

<div align="center">
 <strong>Made with care for the Claude Code, Cursor and Codex community.</strong>
</div>

## NAS 精简分支

本分支基于官方 v1.37.5，仅保留约定的 NAS 功能；范围、路径、测试及回退依赖见 [维护指南](docs/nas/README.md)，跨电脑开发与 NAS 发布见 [部署说明](deploy/README.md)。


### Codex 运行中插入与排队

默认 Enter/发送按钮在空闲时直接发送，响应中将消息加入官方单条持久队列，等待整轮（含后台工作）结束后自动发送。需要在响应中立即插入时，点击队列卡片的“立即发送”，Codex 使用原生 `turn/steer` 追加输入；Shift+Enter 始终换行。启用 Ctrl+Enter 发送设置时，发送与入队均使用该组合键。队列仍为单条草稿，不是多条 FIFO；插入不会停止当前工具，消费时机由 Codex 决定。调度修复、验证及回退依赖见 [NAS 维护指南](docs/nas/README.md#2026-10-19-队列修复与恢复-codex-原生插入)。此次交互调整只需发布前端，后端原生插入接口已存在。

NAS 外观继续保留 C137 Logo 和原用户头像，并隐藏侧栏的报告问题、加入社区及 GitHub Star 入口（含手机和折叠侧栏）。


### CloudCLI 公共 WebP 图片转换

公共 `optimizeImageBuffer`（`server/shared/utils.ts`，从 shared 入口导出）供上传、Provider 及其他后端功能复用。`/api/assets/images`、`/api/assets/files` 上传图片时预生成缓存，返回的原图路径、MIME、大小不变；Claude 构造图片内容和 Codex app-server 实际 HTTP 请求过滤调用同一转换，不各自实现编码。默认图片读取仍返回原图，认证后的 `/api/assets/images/:filename?format=webp` 可获取更小的 WebP 预览副本；无收益或不支持时返回原格式，应以响应 Content-Type 为准。

PNG 使用**无损 WebP**，JPEG 使用默认**质量 85**，不缩小分辨率，按 EXIF 修正方向；仅在转换后更小时采用。GIF、SVG、已有 WebP、动画、超过 32 MP/64 MiB 的输入及解码失败均保留原格式，不让转换失败中断对话。上传文件、原生既有历史、Codex 原图档案不改写。Claude 新写入的原生历史包含实际发送的 WebP 内容，上传原文件仍保留在附件目录；这不是批量改写旧历史。Cursor/OpenCode 的本地路径读取和显式 Codex SDK 模式尚未自动接入该转换；公共函数和预览接口可供后续功能直接复用。

默认开启，环境变量：`CLOUDCLI_IMAGE_WEBP_ENABLED=false` 关闭全部接入处；`CLOUDCLI_IMAGE_WEBP_QUALITY=85` 调整 JPEG 质量（1–100）；`CLOUDCLI_IMAGE_WEBP_CACHE_BYTES=268435456` 设置副本缓存上限（默认 256 MiB）；`CLOUDCLI_IMAGE_WEBP_CACHE_DIR` 可选择本机缓存目录，默认 `~/.cloudcli/image-variants`。按原始内容、编码器版本和质量缓存，不重复压缩同图；原图预览不依赖缓存。最多同时编码 2 张、排队共 32 张，超额回退原格式。缓存淘汰仅删除可再生成的副本，不删除原图；缓存不随 Git 同步。`sharp` 已改为生产依赖，随各台电脑的 pnpm 安装提供对应平台二进制。

Codex 先按原有原图 JSON 字节预算决定保留项，再压缩实际保留/勾选的图片，避免编码已经过期的历史图；预算准入保持保守，实际发送和超额提示按转换后大小统计。现有 HTTP 字节统计同时反映历史裁剪和 WebP 转换，不能据此单独断言 CPA 下游或模型 token 同比例减少。浏览器首次上传原图到 CloudCLI 的流量不因服务端转换减少。

### Codex 长会话图片上下文

Codex app-server 会把历史 `input_image`（包括压缩后的 `replacement_history` 中的 Base64）再次带入模型请求。CloudCLI 通过仅监听本机回环地址的 HTTP 转发，在**实际发往上游的请求体**中把过期图片替换为可追溯的本地引用。原始 rollout JSONL 和聊天界面图片不变，不依赖 NAS、R2 或额外 MCP 服务。

默认保留最近 **3 张历史图**，历史图片 JSON 预算 **1 MiB**。当前用户消息、刚返回的工具图片、无法可靠确定已被模型处理的图片和显式勾选的对比图保留；最新一张历史图单独超预算时也仍可处理，并在弹窗展示超额。设置在下一轮开始时生效，正在响应的对话仍保护本轮图片。

配置入口：输入框的上下文百分比 → Token 用量弹窗 → **图片上下文**。可调整近期数量、字节预算，勾选历史图并保存后，下次发送将重新附带该图。被移除的图像位置保留原图路径；会话图片目录包含编号、内容哈希和本地路径，模型可按明确需要读取目录并使用原生 `view_image` 重新查看。读回的工具图片视为本轮新图。对比结束后取消勾选即可恢复预算管理。

普通发送和 **压缩上下文**沿用同一个原生线程，保留加密摘要、推理内容和原生临时授权；压缩调用原生 `thread/compact/start`，其 HTTP 图片输入也经过过滤。**清理上下文**是显式开启空线程，保留完整聊天历史，取消对比图选择；旧分段可阅读，当前分段正常编辑。清理可能重新请求原生临时授权，原有模型、Fast 和 UI 权限模式不变。任务进行中禁用这两个按钮，未发送草稿保留。

压缩完成时展示 `Context compacted` 通知，刷新后也从 Codex 的原生 `compacted` 边界恢复该通知，不展示内部摘要或 `replacement_history`。手动上下文操作期间每 5 秒通过既有会话订阅核对任务状态并补播遗漏事件；仅以后端空闲确认结束 loading，不按经过时间强行完成任务。网络不可用时仍可能等待连接恢复。

新会话策略默认值可通过 `CLOUDCLI_CODEX_HISTORY_IMAGES=3`、`CLOUDCLI_CODEX_HISTORY_IMAGE_BYTES=1048576` 配置；会话已保存的值优先。原图按内容哈希归档在数据库目录旁的 `codex-context-images/`，默认总容量 **512 MiB**（`CLOUDCLI_CODEX_IMAGE_CACHE_BYTES`）；满时明确报错，不自动删除旧图或悄悄转发大请求。单个压缩前后 HTTP 请求体均限制为 **64 MiB**（`CLOUDCLI_CODEX_PROXY_BODY_BYTES`），可按需要调整。缓存及数据库属于每台电脑自己的运行数据，不随 Git 同步。

转发地址仅通过线程参数临时覆盖，不写 `config.toml`、`auth.json` 或模型库。自定义 provider 保留原 ID、认证和请求头；内置 OpenAI 使用官方 `openai_base_url` 临时覆盖，并由本地 426 响应触发原生 HTTP 回退，保留 provider ID 和原生 AuthManager。此路径使用 HTTP/SSE，原先支持 WebSocket 的 provider 在线程内切换为 HTTP；浏览器 WebSocket、消息插入和工具权限交互不变。支持 gzip/deflate/br/zstd 请求，保持相同压缩格式转发；zstd 需要 Node 22.15+。使用宿主机 HTTP_PROXY/HTTPS_PROXY/ALL_PROXY/NO_PROXY 环境，只有 Codex 子进程增加本机回环绕过规则。

可观测性记录实际 HTTP 请求体序列化字节（过滤前后、保持原压缩格式）、解压后的 JSON 字节、图数和累计净减少字节。它们是 Codex→CloudCLI→配置上游这一段的请求体测量，不含 TLS/协议头，也不是 CPA→模型的后续网络流量。日志只包含统计元数据，不记录 Base64、完整提示词、Cookie 或密钥。

边界：此功能只支持默认 app-server 模式；显式 SDK 模式不进行过滤。子 Agent 或不匹配当前线程的请求透明转发，不混用主会话图片策略。文件 ID 和未知图片表示保持原样；本机原生接口拒绝远程图片 URL，因此没有上传历史截图到 R2。本方案降低模型外发图片量，不改写原始历史，也不解决 Codex 自身 rollout 的磁盘增长。关闭 `CLOUDCLI_CODEX_IMAGE_CONTEXT_ENABLED=false` 并重启可停用自动过滤，保留历史读取及手动操作。

测试数据、所属路径、回退依赖及 NAS 发布状态见 [维护指南](docs/nas/README.md)。源码修复和本地构建不等于已发布；界面由用户手动验收。
