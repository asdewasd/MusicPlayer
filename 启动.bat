@echo off
chcp 65001 >nul
echo ========== MusicFlow 启动中 ==========
cd /d "%~dp0backend"
echo [1/2] 启动后端服务...
start "MusicFlow-Backend" cmd /c "node server.js"
timeout /t 3 /nobreak >nul
echo [2/2] 打开浏览器...
start http://127.0.0.1:3000
echo ========== 服务已启动 ==========
echo 后端: http://127.0.0.1:3000
echo 按任意键关闭后端...
pause >nul
taskkill /FI "WINDOWTITLE eq MusicFlow-Backend*" /F 2>nul
echo 服务已关闭