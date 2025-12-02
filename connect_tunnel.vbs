' ==========================================
' 自动连接 TranslateWeb 服务的脚本
' 使用方法：双击运行此文件
' ==========================================

Set WshShell = WScript.CreateObject("WScript.Shell")

' 启动 SSH 连接命令
' cmd /k 保持窗口打开
' ssh -L 建立隧道
WshShell.Run "cmd /k ssh -L 5173:localhost:3431 root@114.67.169.78", 1

' 等待 2 秒让服务器提示输入密码 (如果网络慢可以把 2000 改成 3000 或 5000)
WScript.Sleep 2000 

' 模拟键盘输入密码
WshShell.SendKeys "Zhou@2002"
WshShell.SendKeys "{ENTER}"

' 提示用户
WScript.Sleep 1000
WshShell.SendKeys "echo Connection established! Keep this window open."
WshShell.SendKeys "{ENTER}"
