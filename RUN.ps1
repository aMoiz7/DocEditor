$ErrorActionPreference = "Stop"

Write-Host "Starting Ajaia Docs..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required. Install Node.js 20+ from https://nodejs.org/"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is required. Install Node.js 20+ from https://nodejs.org/"
}

if (-not (Test-Path -LiteralPath ".env.local")) {
  Write-Warning ".env.local is missing. Copy .env.example to .env.local and add DATABASE_URL."
  Copy-Item -LiteralPath ".env.example" -Destination ".env.local"
}

if (-not (Test-Path -LiteralPath "node_modules")) {
  Write-Host "Installing dependencies..." -ForegroundColor Yellow
  npm install
}

Write-Host "Opening http://localhost:3000" -ForegroundColor Green
npm run dev
