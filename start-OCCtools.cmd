@echo off
setlocal
cd /d "%~dp0"
node -e "fetch('http://127.0.0.1:8787/OCCtools/api/session').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >nul 2>&1
if not errorlevel 1 (
  start "" "http://127.0.0.1:8787/OCCtools/"
  exit /b 0
)
set "OCC_ORIGIN=http://127.0.0.1:8787"
set "OCC_FLOW_URL_FILE=%~dp0work\flow-url.txt"
set "OCC_RUNITEMS_FLOW_URL_FILE=%~dp0work\runitems-flow-url.txt"
set "OCC_TEMPLATES_FLOW_URL_FILE=%~dp0work\templates-flow-url.txt"
set "OCC_DONE_FLOW_URL_FILE=%~dp0work\done-flow-url.txt"
set "OCC_START_FLOW_URL_FILE=%~dp0work\start-flow-url.txt"
set "OCC_START_READ_READY=1"
set "OCC_LOG_CREATE_FLOW_URL_FILE=%~dp0work\log-create-flow-url.txt"
set "OCC_CHECKLIST_ITEM_FLOW_URL_FILE=%~dp0work\checklist-item-flow-url.txt"
set "OCC_LOGS_FLOW_URL_FILE=%~dp0work\logs-flow-url.txt"
echo Starter OCC-portalen...
node outputs\OCCtools\server.mjs
pause
