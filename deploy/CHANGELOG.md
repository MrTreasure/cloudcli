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
