@echo off
REM connect_with_vpn.bat - Simple wrapper to open an SSH tunnel for VPN sharing and local web access
REM Usage: double-click or run from CMD. Requires OpenSSH (ssh) installed on Windows.

SET HOST=114.115.208.102
SET USER=root
SET LOCAL_PROXY_PORT=7890
SET LOCAL_WEB_PORT=3431

echo ==================================================
echo Connecting to %HOST% and forwarding ports:
echo  - VPN (server -> your local): %LOCAL_PROXY_PORT% -> 127.0.0.1:%LOCAL_PROXY_PORT%
echo  - Web  (local  -> server): 3431 -> 127.0.0.1:3431
echo ==================================================
echo NOTE: Make sure your local VPN/Clash is running on port %LOCAL_PROXY_PORT% and allows local connections.
echo The ssh window will stay open. Close it to stop forwarding.
echo.

REM Build and run SSH command in a new cmd window so it stays interactive
SET CMDLINE=ssh -R %LOCAL_PROXY_PORT%:127.0.0.1:%LOCAL_PROXY_PORT% -L %LOCAL_WEB_PORT%:127.0.0.1:%LOCAL_WEB_PORT% %USER%@%HOST%
start cmd /k "%CMDLINE%"

echo Launched. If connection fails, run the above command manually in a terminal to see errors.
pause
