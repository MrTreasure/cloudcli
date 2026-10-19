# NAS 分离部署

NAS 分支全部源码变更、官方升级及功能回退参考：[维护指南](../docs/nas/README.md)、[完整提交记录](../docs/nas/commit-log.md)、[文件索引](../docs/nas/file-index.md)。

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

前端发布时先上传静态资源并校验发布内容，再原子更新 `/vol1/1000/nginx/public/cloudcli/index.html`，无需重建或重启后端。

CDN 配置在 `deploy/static-cdn.json`，R2 凭据从密码本 `cloudflare.r2_admin` 读取；仅操作公开 bucket 的 `cloudcli/v1/` 前缀，保留其他应用 CORS 规则。现有不可变对象必须内容一致，固定文件使用 ETag 条件更新。`deploy/frontend.conf` 安装到现有静态 Nginx 的 sites 目录。

`deploy/agent-api.conf` 放在 HTTPS proxy 的 http 块内。使用现有证书与 IPv6 15432；访问日志不记录查询字符串，以免持久保存 WS/SSE 的 JWT。

首次发布先完成本地账号初始化。`python3 deploy/configure-cloudflare.py` 配置域名、Tunnel 和静态缓存，保留其他站点设置并备份到 appdata。先验证 Nginx 配置再 reload。

## 插件及验证

本精简分支只维护 `local-plugins/cloudcli-host-dashboard`；使用 `python3 deploy/publish-plugins.py` 发布插件产物。安装后端插件时需要本机构建依赖，遵循官方插件安装流程。

验证源码使用 `pnpm run test:client`、`pnpm test`、`pnpm run typecheck`、`pnpm run build`、`pnpm run lint`；不访问公网首页、不逐个检测 CDN 文件。部署只在明确要求发布时执行，界面交互由用户验收。

## NAS Codex 单一安装

- Codex CLI 只通过 NAS 的 pnpm 全局安装维护，入口为 `/vol1/pnpm/bin/codex`。
- 后端设置 `CODEX_CLI_PATH=/vol1/pnpm/bin/codex`，SDK 与 app-server 共用该入口；网页终端通过 PATH 使用相同全局入口。
- 项目仅依赖 Codex SDK。`pnpm-workspace.yaml` 的 `overrides` 中 `@openai/codex: "-"` 排除 SDK 与其他依赖携带的 CLI，避免项目安装再生成重复二进制。
- 更新 CLI 使用 `pnpm add -g @openai/codex@<版本>`，随后重启使用旧进程的服务；版本检查使用 `codex --version`。
- NAS daemon 的 `~/.codex/packages/app-server-daemon/current` 链接到全局 CLI 的原生 vendor 目录，共用二进制和配套资源。更新全局 CLI 后需同步该链接，再执行 `codex app-server daemon restart`；不要另行安装 daemon 包生成副本。
