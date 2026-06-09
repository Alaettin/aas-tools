@echo off
setlocal
chcp 65001 >nul
title AAS MCP Server - Einmal-Test mit Claude

REM ============================================================
REM  Startet eine Claude-Code-Session, in der der AAS-MCP-Server
REM  NUR fuer diese Session geladen ist (nichts wird dauerhaft
REM  eingetragen). Nach dem Beenden wird die Temp-Config geloescht.
REM ============================================================

set "BASEURL=https://dti.workspaces.neoception.dev"

REM --- claude-CLI finden (PATH oder ~/.local/bin) ---
set "CLAUDE=claude"
where claude >nul 2>nul || set "CLAUDE=%USERPROFILE%\.local\bin\claude.exe"
if not exist "%CLAUDE%" if /i "%CLAUDE%"=="%USERPROFILE%\.local\bin\claude.exe" (
  echo [FEHLER] claude.exe nicht gefunden: %USERPROFILE%\.local\bin\claude.exe
  echo.
  pause
  exit /b 1
)

REM --- API-Key abfragen ---
set /p APIKEY=API-Key des MCP-Servers (aus Tab "Verbinden"):
if "%APIKEY%"=="" (
  echo [ABBRUCH] Kein API-Key eingegeben.
  echo.
  pause
  exit /b 1
)

set "URL=%BASEURL%/aas-mcp-api/%APIKEY%"
set "CFG=%TEMP%\aas-mcp-test.json"

REM --- temporaere MCP-Config schreiben ---
> "%CFG%" echo {
>>"%CFG%" echo   "mcpServers": {
>>"%CFG%" echo     "aas-repository": {
>>"%CFG%" echo       "type": "http",
>>"%CFG%" echo       "url": "%URL%"
>>"%CFG%" echo     }
>>"%CFG%" echo   }
>>"%CFG%" echo }

echo.
echo ============================================================
echo  MCP-Server nur fuer diese Session geladen:
echo  %URL%
echo.
echo  Beispiel-Prompts:
echo    - "Welche Tools hat aas-repository?"
echo    - "Hol mit aas-repository die submodel-refs der Shell <deine-id>"
echo.
echo  Beenden: /exit eingeben (danach wird nichts gespeichert)
echo ============================================================
echo.

REM --- Claude interaktiv starten, nur mit diesem MCP-Server ---
"%CLAUDE%" --mcp-config "%CFG%" --strict-mcp-config

REM --- aufraeumen ---
del "%CFG%" >nul 2>nul
echo.
echo Session beendet. Temp-Config geloescht - nichts dauerhaft eingetragen.
echo.
pause
