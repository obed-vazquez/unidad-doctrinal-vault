<#
.SYNOPSIS
    Ejecuta el conversor de posturas doctrinales.

.EXAMPLE
    .\scripts\convertir-posturas-creencias.ps1

.EXAMPLE
    .\scripts\convertir-posturas-creencias.ps1 -Strict

    Genera recursos\diagramas\posturas-creencias.mmd y
    recursos\diagramas\posturas-creencias.dag.

.EXAMPLE
    .\scripts\convertir-posturas-creencias.ps1 `
        -MermaidPath .\salidas\posturas.mmd `
        -DagPath .\salidas\posturas.dag
#>
[CmdletBinding()]
param(
    [string]$InputPath,

    [string]$MermaidPath,

    [string]$DagPath,

    [switch]$Strict
)

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$converter = Join-Path $PSScriptRoot 'convertir_posturas_creencias.py'

if (-not $InputPath) {
    $InputPath = Join-Path $repositoryRoot 'recursos\posturas-creencias.md'
}

if (-not (Test-Path -LiteralPath $converter -PathType Leaf)) {
    Write-Error "No se encontró el conversor de Python: $converter"
    exit 1
}

if (-not (Test-Path -LiteralPath $InputPath -PathType Leaf)) {
    Write-Error "No se encontró el documento fuente: $InputPath"
    exit 1
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Error 'No se encontró Python en PATH. Instala Python 3 o agrégalo a PATH.'
    exit 1
}

$arguments = @($converter, $InputPath)
if ($MermaidPath) {
    $arguments += @('--mermaid', $MermaidPath)
}
if ($DagPath) {
    $arguments += @('--dag', $DagPath)
}
if ($Strict) {
    $arguments += '--strict'
}

& $python.Source @arguments
exit $LASTEXITCODE
