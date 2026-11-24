<#
.SYNOPSIS
    Regenera solo los datos del visor del arbol de posturas, sin sincronizar Drive.

.EXAMPLE
    .\arbol.ps1

    En PowerShell, desde la raiz del repositorio.

.EXAMPLE
    arbol

    En cmd, desde la raiz del repositorio (usa arbol.cmd, que llama a este script).
#>
[CmdletBinding()]
param(
    [switch]$PauseWhenDone
)

$ErrorActionPreference = 'Continue'
$repositoryRoot = $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot

$converter = Join-Path $repositoryRoot 'scripts\convertir-posturas-creencias.ps1'

Write-Host '=== Datos del visor de posturas ==='
& $converter
$convertError = $LASTEXITCODE

Write-Host ''
if ($convertError -ne 0) {
    Write-Host "Resultado: el conversor de posturas fallo (codigo $convertError)."
} else {
    Write-Host 'Listo. Visor: recursos\diagramas\arbol-web\index.html'
}

if ($PauseWhenDone) {
    Write-Host ''
    Read-Host 'Presiona Enter para cerrar esta ventana' | Out-Null
}

exit $convertError
