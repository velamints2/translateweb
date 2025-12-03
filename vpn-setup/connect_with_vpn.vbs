' 自动连接服务器并共享本地VPN (Reverse SSH Tunnel)
' 使用方法: 双击运行
' 功能: 
' 1. 连接到服务器
' 2. 将本地的 7890 端口(Clash默认)共享给服务器
' 3. 服务器可以通过 127.0.0.1:7890 访问外网

Option Explicit

Dim WshShell, strHost, strUser, strKey, strCommand, strLocalProxyPort

' --- 配置区域 ---
strHost = "114.115.208.102"  ' 服务器IP
strUser = "root"             ' 用户名
strKey = "C:\Users\Administrator\.ssh\id_rsa" ' 本地私钥路径(请根据实际情况修改)
strLocalProxyPort = "7890"   ' 本地VPN/代理端口 (Clash默认7890, v2ray默认10809)
' ----------------

Set WshShell = CreateObject("WScript.Shell")

' 构建 SSH 命令
' -R 7890:127.0.0.1:7890  => 将服务器的 7890 端口转发到本地的 7890 端口 (让服务器能上网)
' -L 3431:127.0.0.1:3431  => 将服务器的 3431 端口转发到本地的 3431 端口 (让你能访问网页)
strCommand = "ssh -R " & strLocalProxyPort & ":127.0.0.1:" & strLocalProxyPort & " -L 3431:127.0.0.1:3431 " & strUser & "@" & strHost

MsgBox "即将连接服务器..." & vbCrLf & _
       "1. [VPN共享] 已启用 (端口 " & strLocalProxyPort & ")" & vbCrLf & _
       "2. [网页访问] 已启用 (请访问 http://localhost:3431)", vbInformation, "连接助手"

' 打开 CMD 并运行
WshShell.Run "cmd /k " & strCommand
