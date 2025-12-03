Windows users: if you see garbled characters when running the VBS script, use the provided .bat or .ps1 instead.

Quick steps:
1. Double-click `connect_with_vpn.bat` (recommended) or run `connect_with_vpn.ps1` with PowerShell.
2. On the server: `cd /root/translateweb/vpn-setup && chmod +x enable_proxy.sh && ./enable_proxy.sh`
3. Open browser on your local machine: http://localhost:3431

Reason: Some Windows machines display garbled text for `.vbs` files when the file encoding doesn't match the system code page. The `.bat` uses ASCII and avoids this problem.