Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  主数据管理平台 (MDM System) 本地启动服务" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Start Backend in separate process
Write-Host "[1/2] 启动后端服务 (FastAPI on http://localhost:8000)..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd backend; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -PassThru

# 2. Start Frontend
Write-Host "[2/2] 启动前端服务 (Vite on http://localhost:5173)..." -ForegroundColor Green
Write-Host "正在打开前端终端..." -ForegroundColor Yellow
cd frontend
npm run dev
