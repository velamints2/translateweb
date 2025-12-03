# 服务器 VPN/代理 配置指南

为了让服务器能够访问 OpenAI、Github 等外部资源，我们需要配置网络代理。
这里提供两种最简单的方案。

## 方案一：共享你本地电脑的 VPN (推荐 🌟)

如果你本地电脑（Windows/Mac）已经开了 VPN (如 Clash, v2ray)，你可以直接把这个网络"共享"给服务器，而不需要在服务器上安装任何软件。

### 步骤：

1. **确保本地 VPN 已开启**
   - 确认你的 Clash/v2ray 正在运行。
   - 默认端口通常是 `7890` (Clash) 或 `10809` (v2ray)。

2. **使用带代理转发的脚本连接**
   - 我为你准备了一个新的连接脚本：`vpn-setup/connect_with_vpn.vbs`
   - 将它下载到你的 Windows 电脑上。
   - 双击运行。它会自动执行 `ssh -R 7890:127.0.0.1:7890 ...`。

3. **在服务器上启用代理**
   - 连接成功后，在服务器终端运行：
     ```bash
     cd /root/translateweb/vpn-setup
     chmod +x enable_proxy.sh
     ./enable_proxy.sh
     ```
   - 这会将服务器的系统代理指向 `127.0.0.1:7890` (也就是你本地电脑的 VPN)。

4. **测试**
   - 运行 `curl -I https://www.google.com`
   - 如果返回 `HTTP/1.1 200 OK`，说明配置成功！

---

## 方案二：在服务器上安装 Clash (如果你有订阅链接)

如果你希望服务器独立联网，不依赖本地电脑，可以在服务器上安装 Clash。

### 步骤：

1. **下载 Clash**
   ```bash
   # 下载 (如果服务器无法下载，请先用方案一，或者在本地下载后上传)
   wget https://github.com/Dreamacro/clash/releases/download/v1.18.0/clash-linux-amd64-v1.18.0.gz
   gzip -d clash-linux-amd64-v1.18.0.gz
   mv clash-linux-amd64-v1.18.0 /usr/local/bin/clash
   chmod +x /usr/local/bin/clash
   ```

2. **配置订阅**
   - 你需要将你的订阅链接转换成 `config.yaml` 文件。
   - 将配置文件上传到 `/root/.config/clash/config.yaml`。

3. **启动 Clash**
   ```bash
   nohup clash &
   ```

4. **启用系统代理**
   ```bash
   ./vpn-setup/enable_proxy.sh
   ```

---

## 如何关闭代理？

如果想恢复默认网络设置，运行：

```bash
./vpn-setup/disable_proxy.sh
```
