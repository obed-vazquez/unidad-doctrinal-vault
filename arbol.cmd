@echo off
rem En cmd, desde la raiz del repo: arbol
rem Regenera solo el visor del arbol a partir de recursos\posturas-creencias.md
rem (no sincroniza Google Drive; para eso esta "run").
rem En PowerShell: .\arbol.ps1
rem Doble clic: igual que "arbol", y espera Enter al terminar.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0arbol.ps1" -PauseWhenDone
