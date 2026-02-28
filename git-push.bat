@echo off
chcp 65001 > nul 2>&1
setlocal enabledelayedexpansion

echo ========================================
echo       GitHub Auto Push Script
echo ========================================
echo.

:: Check for changes
echo [1/4] Checking changes...
git status --porcelain > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not a Git repository
    pause
    exit /b 1
)

git diff --quiet && git diff --cached --quiet
if not errorlevel 1 (
    echo [OK] No changes to commit
    pause
    exit /b 0
)

echo [OK] Changes detected
echo.

:: Show changes
echo [2/4] Viewing changes:
echo ----------------------------------------
git status --short
echo ----------------------------------------
echo.

:: Get commit message
set /p commit_msg="Enter commit message (press Enter for default): "

if "%commit_msg%"=="" (
    set commit_msg=Update code
)

echo.
echo [3/4] Adding and committing changes...
git add .
if errorlevel 1 (
    echo [ERROR] Failed to add files
    pause
    exit /b 1
)

git commit -m "%commit_msg%"
if errorlevel 1 (
    echo [ERROR] Commit failed (maybe empty commit)
    pause
    exit /b 1
)

echo [OK] Committed successfully
echo.

:: Push to GitHub
echo [4/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo [WARNING] Push failed, may need to pull remote changes
    echo.
    set /p retry="Try force push? (y/n): "
    if /i "%retry%"=="y" (
        git push -u origin main --force
        if errorlevel 1 (
            echo [ERROR] Force push failed
            pause
            exit /b 1
        )
    ) else (
        echo [INFO] Push cancelled
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo [SUCCESS] Pushed to GitHub!
echo ========================================
echo.

:: Show repo info
echo Repository: https://github.com/liujianbo2013/smail-dianwang-new.git
echo Branch: main
echo Commit: %commit_msg%
echo.

pause