@echo off
REM Doppelklick-Wrapper für test-mcp.ps1 — fragt fehlende Werte interaktiv ab.
REM Optional koennen Parameter durchgereicht werden, z.B.:
REM   test-mcp.bat -BaseUrl https://aas-tools.example.com -ApiKey 1234-... -AasIdentifier https://example.com/aas/1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-mcp.ps1" %*
echo.
pause
