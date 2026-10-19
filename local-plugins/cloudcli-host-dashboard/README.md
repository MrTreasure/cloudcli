# 仪表盘插件

CloudCLI 独立标签页插件，选中仪表盘时每 2 秒刷新运行 CloudCLI 后端的主机资源：CPU 占用、内存占用，以及磁盘卷的使用量和剩余空间。切换到其他标签页后停止请求，浏览器页面进入后台时暂停请求，重新显示时立即刷新。前端通过 CloudCLI 已认证的插件 RPC 读取数据；插件服务只监听本机回环地址，不开放公网端口。

## 平台口径

- Linux / NAS：CPU 使用两次 `os.cpus()` 采样的忙碌时间；内存使用 `/proc/meminfo` 的 `MemAvailable`，避免把可回收缓存算作已用；磁盘显示系统盘 `/`，存在时优先显示 `/vol1` 数据卷。
- macOS：CPU 使用相同采样；内存使用 `vm_stat` 的空闲、非活跃及 speculative 页面估算可用内存；磁盘仅显示启动盘 `/`。若 `vm_stat` 无法读取，回退到 Node 的空闲内存值。
- 其他平台：显示 Node 可读取的 CPU、内存，以及用户目录所在磁盘。

百分比为瞬时观测值。磁盘百分比按可供普通用户使用的空间计算，与 `df` 的 Capacity 列保持同一口径。

## 构建与安装

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run test
```

将本目录（包含 `manifest.json`、`icon.svg` 和 `dist/`）复制到运行 CloudCLI 的机器上的 `~/.claude-code-ui/plugins/cloudcli-host-dashboard/`，刷新插件列表即可使用。每台电脑读取它自己的主机资源，不依赖 NAS 路径或 NAS 凭据。
