@echo off
rem En cmd, desde la raiz del repo: run
rem (Windows no ejecuta .ps1 al escribir "run"; este .cmd es el atajo.)
rem En PowerShell: .\run.ps1
rem Doble clic: igual que "run", y espera Enter al terminar.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" -PauseWhenDone
