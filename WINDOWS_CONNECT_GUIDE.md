# Windows 同事一键连接指南

为了让你的 Windows 同事能够最方便地连接，这里提供两种方法。

## 方法一：使用自动输入密码脚本 (最简单，但不够安全)

我已经为你生成了一个脚本文件 `connect_tunnel.vbs`。

1. **下载脚本**：
   将项目根目录下的 `connect_tunnel.vbs` 文件发送给你的同事。
   或者让他在电脑上新建一个文本文件，粘贴以下内容，并保存为 `connect_tunnel.vbs` (注意后缀是 .vbs 不是 .txt)。

   ```vbscript
   Set WshShell = WScript.CreateObject("WScript.Shell")
   WshShell.Run "cmd /k ssh -L 5173:localhost:3431 root@114.67.169.78", 1
   WScript.Sleep 2000 
   WshShell.SendKeys "Zhou@2002"
   WshShell.SendKeys "{ENTER}"
   ```

2. **使用方法**：
   - 双击 `connect_tunnel.vbs`。
   - 它会自动打开黑框，自动输入密码。
   - **注意**：如果网络较慢，密码输入太快可能会失败。可以修改脚本中的 `WScript.Sleep 2000` (2秒) 为 `3000` 或 `5000`。

---

## 方法二：配置免密登录 (最推荐，稳定且安全)

这是 IT 行业标准的做法，配置一次，永久不需要密码，真正的一键连接。

### 第1步：同事在 Windows 上生成密钥
让同事打开 PowerShell (按 Win+X 选择 PowerShell)，输入：
```powershell
ssh-keygen -t rsa -b 4096
```
(一路按回车即可)

然后查看公钥内容：
```powershell
cat ~/.ssh/id_rsa.pub
```
让他把显示出来的以 `ssh-rsa` 开头的一长串字符发给你。

### 第2步：你在服务器上添加公钥
你拿到那一串字符后，在你的服务器终端运行：
```bash
echo "同事发来的ssh-rsa那一整串内容" >> /root/.ssh/authorized_keys
```

### 第3步：同事一键连接
配置好后，同事只需要创建一个简单的 `start.bat` 文件：
```batch
ssh -L 5173:localhost:3431 root@114.67.169.78
```
双击即可直接连上，完全不需要输入密码，也不会有脚本输入延迟的问题。
