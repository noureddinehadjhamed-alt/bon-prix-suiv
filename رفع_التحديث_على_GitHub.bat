@echo off
chcp 65001 > nul
title رفع تحديثات Bon Prix Suiv إلى GitHub
cd /d "%~dp0"
echo ======================================================
echo جاري رفع التحديثات الجديدة (مع نظام الدخول عبر Google) إلى GitHub...
echo إذا ظهرت لك نافذة تسجيل الدخول لـ GitHub، اضغط "Sign in with your browser"
echo ======================================================
"C:\Program Files\Git\bin\git.exe" add -A
"C:\Program Files\Git\bin\git.exe" commit -m "Update Bon Prix Suiv with Login Gate and Google Sign-In" 2>nul
"C:\Program Files\Git\bin\git.exe" push --force -u origin main
echo.
echo ======================================================
echo تم الانتهاء! يرجى الانتظار دقيقة واحدة ثم تحديث صفحة GitHub Pages (Ctrl + F5).
echo ======================================================
pause
