@echo off
setlocal
set "PGBIN=C:\Program Files\PostgreSQL\17\bin"
set "DATA=%~dp0..\.postgres\data"
"%PGBIN%\pg_ctl.exe" -D "%DATA%" stop
exit /b %ERRORLEVEL%
