# NAS 分离部署

- 前端：`https://agent.mrtreasure.cc`，CF Tunnel → 宿主机现有静态 Nginx `127.0.0.1:17843`。宿主机使用 pnpm 构建；前端不放入 Docker。
- 后端：`https://agent-api-nas.mrtreasure.cc:15432`，DNS only → IPv6 HTTPS Nginx → NAS 原生后端 `127.0.0.1:18803`。聊天、终端、插件 WebSocket、API、SSE、上传均使用这个地址。
- 静态 JS、CSS、字体、图标和图片发布到 R2 CDN `https://assets.mrtreasure.cc/cloudcli/v1/`。哈希资源缓存一年，固定名称图片缓存一小时；Google 在线字体已改为本地依赖打包到 CDN。
- HTML 在浏览器要求重新验证，首页在 CF 边缘缓存 30 秒。发布后仅清理首页缓存，保留旧哈希资源，避免打开中的页面缺少资源。
- PWA manifest 和 service worker 使用应用域名；manifest 图标来自 CDN，启动地址与安装范围仍为应用域名。
- 后端由 Treasure 用户的 `cloudcli-backend.service` 托管，直接运行 `dist-server/server/index.js` 编译产物；源码在宿主机项目目录维护。用户服务已启用开机启动，Treasure 已启用 linger。
- TypeScript 7.0.2 用于类型检查和后端编译。`typescript-ast` 是微软的 TypeScript 6 API 兼容包，仅供汉化维护脚本解析 AST；项目编译命令使用原生 TypeScript 7。
- Codex SDK 固定 0.162.0，CLI 使用 NAS 的 pnpm 全局安装。默认 GPT-6.1 Sol，保留 5.6 及以上目录。Claude 仅列出 DeepSeek V4 Pro / Flash，使用 DeepSeek 官方 Anthropic 兼容接口。
- 后端直接使用 Treasure 的家目录、数据卷和已有 docker/Administrators 组权限，工作区范围设为 `/`。使用 `/home/Treasure/.codex` 和 NAS CLI 同一份历史；无需容器目录或 Docker socket 挂载。
- TaskMaster CLI 使用 `task-master-ai@0.43.1`，NAS 全局安装与后端运行依赖均通过 pnpm 安装，后端 PATH 包含应用命令目录。
- `PLAYWRIGHT_BROWSERS_PATH` 指向 NAS 缓存 `/vol1/cache/ms-playwright`。匹配的 Chromium 和本机系统库已验证；后续下载使用淘宝镜像 `https://registry.npmmirror.com/-/binary/playwright`。使用 `pnpm exec playwright install chromium` 安装，不运行浏览器自动化验收。
- CloudCLI 账号、附件和插件位于 `/vol1/1000/appdata/cloudcli`，宿主机 `.cloudcli`、`.claude-code-ui` 通过符号链接访问这些目录；Claude 使用宿主机 `.claude`，不再用子挂载遮盖。源码根目录不存运行数据或密钥。
- `PASSWORD_BOOK` 指向 `/home/Treasure/.secrets/passwords.yml`，直接使用宿主机密码本和技能目录，权限遵循 NAS 用户设置。
- 密码本唯一来源 `~/.secrets/passwords.yml`：`services.cloudcli.{username,password,agent_api_key}`、`llm_providers.deepseek.{anthropic_base,api_key}`。`deploy/run-backend.py` 在进程启动时读取并注入环境变量，不在源码或单元文件中保存凭据值。
- 浏览器使用 JWT 认证；额外 API key 只保护 `/api/agent` 自动化接口，不提供给前端。

## 服务安装

```sh
install -m 644 deploy/cloudcli-backend.service ~/.config/systemd/user/cloudcli-backend.service
systemctl --user daemon-reload
systemctl --user enable --now cloudcli-backend.service
```

单元固定使用 NAS Node `/vol1/node/bin/node`，PATH 包含 pnpm、项目 CLI 和系统 Docker。日志通过 `journalctl --user -u cloudcli-backend.service` 查看。

## 更新

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
python3 deploy/publish-frontend.py
pnpm run build:server
systemctl --user restart cloudcli-backend.service
python3 deploy/bootstrap-user.py
systemctl --user status cloudcli-backend.service
```

前端发布时先上传静态资源并校验 HTTP、MIME、解压后 SHA256 和跨域 CORS，再原子更新 `/vol1/1000/nginx/public/cloudcli/index.html`，无需重建或重启后端。

CDN 配置在 `deploy/static-cdn.json`，R2 凭据从密码本 `cloudflare.r2_admin` 读取；仅操作公开 bucket 的 `cloudcli/v1/` 前缀，保留其他应用 CORS 规则。现有不可变对象必须内容一致，固定文件使用 ETag 条件更新。`deploy/frontend.conf` 安装到现有静态 Nginx 的 sites 目录。

`deploy/agent-api.conf` 放在 HTTPS proxy 的 http 块内。使用现有证书与 IPv6 15432；访问日志不记录查询字符串，以免持久保存 WS/SSE 的 JWT。

首次发布先完成本地账号初始化。`python3 deploy/configure-cloudflare.py` 配置域名、Tunnel 和静态缓存，保留其他站点设置并备份到 appdata。先验证 Nginx 配置再 reload。

## 汉化与插件

`node scripts/localization/collect-interface-labels.mjs` 收集界面静态文案；修改后应检查 diff、运行 typecheck 并手动验收。`python3 scripts/localization/complete-zh-cn.py` 从密码本读取 DeepSeek 凭据，补齐中文资源并校验插值变量。翻译缓存位于 appdata，不提交。

插件安装和更新执行 `pnpm install --config.production=false --ignore-scripts`，显式保留 TypeScript、类型包和 esbuild 等 devDependencies，再执行插件声明的 build。生产环境不再跳过构建依赖。

## 验证

使用类型检查、构建和服务探测：登录、未认证 API 401、项目和历史读取、模型目录、CORS、WebSocket、终端、Task Queue 实际构建、前端静态文件与 CF 缓存。界面与交互由用户手动验收，不运行浏览器自动化。

上游：https://github.com/siteboon/claudecodeui 。遵循原项目 AGPL-3.0-or-later。

### 已维护的三个中文插件

`local-plugins/` 保存项目统计、任务队列、定时提示词的完整源码，独立使用 pnpm 12.3.4 和 TypeScript 7.0.2 构建。执行 `python3 deploy/publish-plugins.py` 发布编译产物和中文 manifest，然后重启 `cloudcli-backend.service`。上游插件更新会覆盖运行目录的汉化，更新后需合并源码并重新发布。

### Task Queue MCP

- 源码：`../task-queue-mcp`，版本 0.13.0。Python 虚拟环境：`/vol1/1000/appdata/cloudcli/taskqueue-venv`；依赖快照：`deploy/taskqueue-requirements.lock`。
- `taskqueue-mcp.service` 为 Treasure 用户服务，监听 `127.0.0.1:8485`，不公开网络端口；任务数据位于 `~/.claude/task-queue`。
- 密码本唯一持久来源：`services.task_queue.{cloudcli_token,codex_token,claude_token}`。启动时生成临时目录 `/run/user/1000/cloudcli-taskqueue/token`，以 600 权限供插件读取；`~/.config/cloudcli-plugin-task-queue` 指向该临时目录。HTTP 服务仅持有 WebUI token 的摘要，代理 token 分别绑定 Codex 和 Claude 身份。
- 两个 Agent 的用户级 MCP 配置通过本机 stdio 桥接脚本 `deploy/taskqueue-mcp-client.py` 接入，配置中不保存 token。现有会话需重开才能加载新增 MCP。
- 安装服务：复制 `deploy/taskqueue-mcp.service` 到 `~/.config/systemd/user/`，执行 `systemctl --user daemon-reload` 和 `systemctl --user enable --now taskqueue-mcp.service`。
- 已接通队列查询、审批等控制 API 及 MCP 工具。插件上游的自动任务启动依赖 Forge 的 `~/scripts/agent-launch.yml` 和 Agent 启动配置；当前未部署 Forge 调度器，不把队列 MCP 等同于自动调度系统。

TaskMaster 是需求拆解、任务依赖与进度管理工具；Task Queue 是 Agent 之间的任务投递和状态队列。TaskMaster 初始化及后端命令统一调用已安装的 `task-master`，无需 npx 临时安装或启动。

## NAS Codex 单一安装

- Codex CLI 只通过 NAS 的 pnpm 全局安装维护，入口为 `/vol1/pnpm/bin/codex`。
- 后端设置 `CODEX_CLI_PATH=/vol1/pnpm/bin/codex`，SDK 与 app-server 共用该入口；网页终端通过 PATH 使用相同全局入口。
- 项目仅依赖 Codex SDK。`pnpm-workspace.yaml` 的 `overrides` 中 `@openai/codex: "-"` 排除 SDK 与其他依赖携带的 CLI，避免项目安装再生成重复二进制。
- 更新 CLI 使用 `pnpm add -g @openai/codex@<版本>`，随后重启使用旧进程的服务；版本检查使用 `codex --version`。
- NAS daemon 的 `~/.codex/packages/app-server-daemon/current` 链接到全局 CLI 的原生 vendor 目录，共用二进制和配套资源。更新全局 CLI 后需同步该链接，再执行 `codex app-server daemon restart`；不要另行安装 daemon 包生成副本。
