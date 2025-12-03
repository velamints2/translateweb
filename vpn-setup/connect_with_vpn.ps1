# connect_with_vpn.ps1 - PowerShell helper to open SSH reverse & local tunnels
# Usage: Right-click -> Run with PowerShell, or run from an elevated PowerShell
param(


 Write-Host '============================================' -ForegroundColor Yellow
 Write-Host "Connecting to $Host and forwarding ports:" -ForegroundColor Cyan
 Write-Host " - VPN (server -> your local): $LocalProxyPort -> 127.0.0.1:$LocalProxyPort" -ForegroundColor Green
 Write-Host " - Web  (local  -> server): $LocalWebPort -> 127.0.0.1:$LocalWebPort" -ForegroundColor Green
 Write-Host '============================================' -ForegroundColor Yellow

 Write-Host "Note: Ensure your local VPN/Clash is running on port $LocalProxyPort." -ForegroundColor White
 Write-Host "The SSH session will remain open; close it to stop forwarding." -ForegroundColor White

 $sshArgs = "-R $LocalProxyPort:127.0.0.1:$LocalProxyPort -L $LocalWebPort:127.0.0.1:$LocalWebPort $User@$Host"
 Write-Host "Running: ssh $sshArgs" -ForegroundColor Magenta

 # Start interactive SSH in the same PowerShell session so user can see messages and close when done
 & ssh $sshArgs

 if ($LASTEXITCODE -ne 0) {
     Write-Host "SSH exited with code $LASTEXITCODE" -ForegroundColor Red
 } else {
     Write-Host "SSH session ended." -ForegroundColor Green
 }
    [string]$Host = '114.115.208.102',
    [string]$User = 'root',
    [int]$LocalProxyPort = 7890,
    [int]$LocalWebPort = 3431
)