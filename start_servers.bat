@echo off
echo ====================================================
echo      Starting MathQuest Servers
echo ====================================================
echo.
echo Starting Backend (API)...
start "MathQuest Backend" cmd /k "cd backend && npm run dev"

echo Starting Frontend (Game)...
start "MathQuest Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in new windows!
echo Once they are ready, refresh your browser.
pause
