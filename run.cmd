@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Follow the first-time setup in README.md to create .venv.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8000 in your browser.
".venv\Scripts\python.exe" app.py
pause
