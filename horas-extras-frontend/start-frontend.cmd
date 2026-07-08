@echo off
set PATH=C:\Program Files\nodejs;C:\ProgramData\chocolatey\bin;%PATH%
cd /d "C:\Users\Administrador\Documents\OverTimeBetmarketer\horas-extras-frontend"
set PORT=8080
set NODE_ENV=production
call "C:\ProgramData\chocolatey\bin\pnpm.exe" start