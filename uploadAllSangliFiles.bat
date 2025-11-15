@echo off
echo ========================================
echo  Bulk Upload - All Sangli Files
echo ========================================
echo.
echo This will upload ALL Excel files from:
echo D:\MSEB Project\MSEB_DATA 2025 NOV\SANGLI..=
echo.
echo Press Ctrl+C to cancel, or
pause

node uploadAllSangliFiles.js

echo.
echo ========================================
echo  Upload Complete!
echo ========================================
echo.
pause
