<#
.SYNOPSIS
    Sincroniza Drive y regenera los datos del visor de posturas.

.EXAMPLE
    .\run.ps1

    En PowerShell, desde la raíz del repositorio.

.EXAMPLE
    run

    En cmd, desde la raíz del repositorio (usa run.cmd, que llama a este script).
#>
[CmdletBinding()]
param(
    [switch]$PauseWhenDone
)

$ErrorActionPreference = 'Continue'
$repositoryRoot = $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Error 'No se encontró Python en PATH. Instala Python 3 o agrégalo a PATH.'
    if ($PauseWhenDone) {
        Write-Host ''
        Read-Host 'Presiona Enter para cerrar esta ventana' | Out-Null
    }
    exit 1
}

$syncScript = Join-Path $repositoryRoot 'scripts\sync_drive_markdown.py'
$converter = Join-Path $repositoryRoot 'scripts\convertir-posturas-creencias.ps1'

Write-Host '=== 1/2 Sincronizar Google Drive ==='
& $python.Source $syncScript
$syncError = $LASTEXITCODE
if ($syncError -ne 0) {
    Write-Host ''
    Write-Host 'Fallo la sincronizacion de Drive. Revisa Python, las dependencias'
    Write-Host '(pip install -r scripts\requirements-sync-drive.txt) y'
    Write-Host 'GOOGLE_APPLICATION_CREDENTIALS. Ver README.md.'
}

Write-Host ''
Write-Host '=== 2/2 Datos del visor de posturas ==='
& $converter
$convertError = $LASTEXITCODE
if ($convertError -ne 0) {
    Write-Host ''
    Write-Host 'Fallo el conversor de posturas.'
}

Write-Host ''
if ($syncError -ne 0) {
    Write-Host "Resultado: la sincronizacion de Drive fallo (codigo $syncError)."
}
if ($convertError -ne 0) {
    Write-Host "Resultado: el conversor de posturas fallo (codigo $convertError)."
}
if ($syncError -eq 0 -and $convertError -eq 0) {
    Write-Host 'Listo. Visor: recursos\diagramas\arbol-web\index.html'
}

if ($PauseWhenDone) {
    Write-Host ''
    Read-Host 'Presiona Enter para cerrar esta ventana' | Out-Null
}

if ($syncError -ne 0) {
    exit $syncError
}
exit $convertError
