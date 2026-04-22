@echo off
echo Starting MEDRoute - Intelligent Emergency Routing System...
echo.
echo [1/2] Starting backend server (port 3001)...
start "Backend Server" cmd /k "cd /d %~dp0server && node server.js"
timeout /t 2 /nobreak >nul
echo [2/2] Starting frontend (port 5173)...
start "Frontend Dev Server" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo ====================================================
echo  App running at: http://localhost:5173
echo  Backend API at: http://localhost:3001/api/health
echo ====================================================
echo.
start http://localhost:5173
