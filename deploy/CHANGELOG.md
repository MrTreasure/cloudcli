# 2026-10-09 NAS 部署与本地修复

## 修改

- 宿主机发布前端，CF Tunnel 转发 `agent.mrtreasure.cc`；只有后端编译产物在 Docker 中运行。
- API、SSE、上传、聊天与终端 WebSocket 均使用 `agent-api-nas.mrtreasure.cc:15432` 的 IPv6 HTTPS 直连。
- 注册与登录使用 JWT；自动化 API key 限于 `/api/agent`。运行目录、密码和插件持久化，密钥由密码本注入。
- 共享 NAS Codex 历史及其 sessions 符号链接目标，完成一次全量导入。
- 中文覆盖全部 8 个资源模块，补上 Git 模块和硬编码界面文案；新用户默认中文。
- Codex 默认 GPT-6.1 Sol，目录保留 5.6 及以上；Claude 目录仅保留 DeepSeek V4 Pro / Flash。自动修正不在目录内的旧模型选择。
- 插件安装与更新使用 pnpm，显式关闭 production 依赖过滤，保留构建所需开发依赖；读取安装错误输出，避免管道阻塞。
- TypeScript 编译器升级至 7.0.2，移除 baseUrl 和过期编译选项。汉化 AST 脚本使用独立 API 兼容包，编译、类型检查使用 TypeScript 7。

## 验证

- 同机全项目类型检查：5.9.3 为 18.09 秒，7.0.2 为 2.86 秒，约 6.3 倍。单次测量，非运行时接口性能指标。
- 前端 Vite 构建、后端编译、Docker 镜像构建通过；没有运行浏览器自动化。
- 登录、未登录 API 401、模型目录、项目与共享会话读取通过。
- HTTPS 证书验证、CORS 204、聊天和终端 WebSocket 101、终端实际输出通过。
- 公网 HTML 200；入口和 React 哈希资源 CF HIT、一年 immutable；公网 API 200 且无 cf-ray。
- Task Queue 0.12.0 在 NODE_ENV=production 的容器内成功安装、类型检查和 esbuild 构建，重建容器后仍可读取且插件服务运行。
- GitHub 直连曾有间歇性超时。构建验证使用宿主机取得的同一公开仓库本地副本；安装后的 origin 已恢复官方仓库。容器 Git 固定 HTTP/1.1。

界面交互留给用户手动验收。

## 首页加载优化与 CDN 发布

- 源站本地资源约 0–10ms；CF LAX 回源波动，首页实测 3.68 秒，部分静态资源请求超时。
- 所有 171 个公开静态资源迁移到既有 R2 CDN 的 cloudcli/v1 前缀，包含启动模块、CSS、字体和图片。JS/CSS gzip 压缩，字体使用 font-display: swap。
- 入口 JS 从约 3.44MB 压缩为约 1.01MB，CDN 完整下载校验实测 2.1 秒。全部资源检查 MIME、跨域读取和内容哈希后才发布 HTML。
- Google 字体不再通过外部 CSS 请求加载；PWA manifest 留在应用源站、图标使用 CDN。
- 首页公开 HTML 在 CF 边缘缓存 30 秒，发布后仅清理两个入口 URL，未修改其他站点规则。
- 前端类型检查和构建通过，后端容器继续运行。

## TaskMaster、Chromium 与 NAS 工作区

- 通过 pnpm 全局安装 TaskMaster AI CLI 0.43.1，同时加入后端依赖，使 WebUI 和终端能直接找到 task-master。
- 共享 NAS Chromium 缓存，补齐 Playwright 1.64 对应的 Chromium 1248；在镜像构建阶段安装 Chromium 系统库。浏览器运行时安装流程改为 pnpm，普通运行用户不再尝试执行 apt 安装。
- 工作区范围设为 /，挂载 /vol1、/vol2、/vol00 并使用 NAS 管理员附加组。修复根路径比较产生 // 导致拒绝所有子目录的问题；根目录可用于文件导航，项目创建沿用独立校验。
- 原有 Codex 历史、账号数据库、插件和前端 CDN 保持各自运行目录。

## C137 品牌与插件认证

- 侧栏、登录页、加载页使用 C137 实验室 Logo；更新网页 ICO、PNG 图标与 PWA 图标。新素材采用新文件名避免旧 CDN 缓存。
- 移除 GitHub 收藏徽标，以及桌面、移动和折叠侧栏中的报告问题、加入社区入口。
- 插件 Provider 在登录验证后才挂载；迟到的旧请求认证错误不能清除新登录令牌。
- Chromium 后续下载使用淘宝镜像，系统依赖通过阿里云 Debian 镜像构建。

## 本次验证

- TypeScript 检查、前端构建和后端镜像构建通过，Docker 健康检查 healthy。
- NAS 全局与容器 task-master 均为 0.43.1，安装状态接口识别已安装。
- Chromium 156.0.8078.4 与 Headless Shell 依赖库检查通过；浏览器状态 enabled/available/playwrightInstalled/chromiumInstalled 均为 true，未启动浏览器自动化。
- /vol1、/vol2、/vol00 的工作区校验与读写权限检查通过，目录浏览接口均为 200，默认根目录导航正常。
- 插件直连 HTTPS 列表携带 JWT 返回 200，CORS 正常；安装接口通过认证并以 400 拒绝空 URL，匿名请求仍为 401。
- 183 个静态资源通过 CDN 内容与类型校验；公开首页引用 C137 ICO 和 Logo。界面交互由用户手动验收。

## CloudCLI 会话读取 NAS 密码本

- 补充宿主机 .secrets 和 .claude/skills 的只读挂载，设置 PASSWORD_BOOK；修复 Codex 凭据技能符号链接在容器中失效的问题。
- 容器内以运行用户验证密码本可读、YAML 有效、凭据技能可读，两处挂载均为只读；未输出凭据内容。

## 完整共享 Treasure 家目录

- 完整读写挂载 /home/Treasure，移除原有遮盖宿主机 .claude 的运行目录挂载。密码本目录继续只读。
- .cloudcli 和 .claude-code-ui 创建宿主机符号链接至现有 appdata，账号和插件继续使用已有数据。
- 宿主机与容器家目录 60 个顶层项一致，运行用户读写检查通过；已有账号登录、插件与 Chromium 状态接口正常。

## 迁移 NAS 原生后端

- 以 Treasure 用户运行编译后的后端，新增 systemd 用户单元和运行时凭据注入启动器，启用开机启动与异常重启。
- 完成账号数据库备份；账号、附件、插件和 Codex 历史继续使用现有目录。
- 后端仍监听 127.0.0.1:18803，前端 CDN 和直连 API 地址继续工作。
- 类型检查、后端构建、登录、HTTPS/CORS、聊天/终端 WebSocket 通过；网页终端实测 Docker 控制和密码本访问正常。Chromium、TaskMaster 0.43.1、已有插件识别正常，未启动浏览器自动化。
- 删除 cloudcli-backend Docker 容器及旧 Compose、Dockerfile、Compose helper，改用 cloudcli-backend.service 管理服务。

## 静态 CSS 请求失败处理

- 用户反馈 index-9lQ0NYQn.css ERR_FAILED；服务器侧 200、内容 SHA256、gzip 与 CORS 正常，截图未提供具体浏览器错误原因，不能据此确认根因。
- 更新 Service Worker 缓存版本，跳过错误和不匹配的 opaque 响应；缓存读写失败不阻断网络下载，失败下载绕过浏览器 HTTP 缓存重试一次。
- 清理该 CSS 的普通及 Origin CDN 缓存版本，并发布新 Service Worker；清理后 CSS 为 MISS/200，跨域头正确。最终浏览器恢复情况由用户手动刷新确认。
