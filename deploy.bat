@echo off
echo Starting deployment...

git add .
if %errorlevel% neq 0 (
    echo Error: Failed to stage changes
    exit /b %errorlevel%
)

git commit -m "error_fix_commit"
if %errorlevel% neq 0 (
    echo Error: Failed to commit changes
    exit /b %errorlevel%
)

git push -u origin main
if %errorlevel% neq 0 (
    echo Error: Failed to push changes
    exit /b %errorlevel%
)

echo Deployment completed successfully!

