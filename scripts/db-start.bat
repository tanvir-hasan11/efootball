@echo off
setlocal
set "PGBIN=C:\Program Files\PostgreSQL\17\bin"
set "DATA=%~dp0..\.postgres\data"
set "LOG=%~dp0..\.postgres\log.txt"
"%PGBIN%\pg_ctl.exe" -D "%DATA%" -l "%LOG%" -o "-p 5433" start
exit /b %ERRORLEVEL%
