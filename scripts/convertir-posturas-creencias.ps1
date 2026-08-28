<#
.SYNOPSIS
    Ejecuta el conversor de posturas doctrinales.

.EXAMPLE
    .\scripts\convertir-posturas-creencias.ps1

.EXAMPLE
    .\scripts\convertir-posturas-creencias.ps1 -Strict

    Genera recursos\diagramas\posturas-creencias.mmd,
    recursos\diagramas\posturas-creencias.dag,
    recursos\diagramas\posturas-creencias.gv,
    recursos\diagramas\posturas-creencias.svg y los datos del visor web
    recursos\diagramas\arbol-web\datos\posturas-creencias.json.

.EXAMPLE
    .\scripts\convertir-posturas-creencias.ps1 -Format png -Dpi 300

    Renderiza un PNG de 300 ppp en lugar del SVG.

.EXAMPLE
    .\scripts\convertir-posturas-creencias.ps1 `
        -MermaidPath .\salidas\posturas.mmd `
        -DagPath .\salidas\posturas.dag

.NOTES
    Si falta Graphviz (el programa `dot`) y se necesita una imagen, este script
    intenta instalarlo solo con winget. Puede aparecer un aviso de Windows
    pidiendo permiso de administrador; es normal, acéptalo para continuar.
    Usa -NoAutoInstallGraphviz para desactivar ese intento.
#>
[CmdletBinding()]
param(
    [string]$InputPath,

    [string]$MermaidPath,

    [string]$DagPath,

    [string]$GraphvizPath,

    [string]$ImagePath,

    [string]$JsonPath,

    [ValidateSet('svg', 'png', 'pdf')]
    [string]$Format,

    [int]$Dpi,

    [switch]$NoImage,

    [switch]$NoJson,

    [switch]$NoAutoInstallGraphviz,

    [switch]$Strict,

    [switch]$Interactive
)

function Find-Dot {
    $existing = Get-Command dot -ErrorAction SilentlyContinue
    if ($existing) {
        return $existing.Source
    }
    $candidates = @(
        "$env:ProgramFiles\Graphviz\bin\dot.exe",
        "${env:ProgramFiles(x86)}\Graphviz\bin\dot.exe",
        "$env:LOCALAPPDATA\Programs\Graphviz\bin\dot.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }
    return $null
}

function Update-SessionPathFromRegistry {
    # winget actualiza el PATH del sistema, pero este proceso ya arrancó con
    # el PATH anterior. Lo recargamos para no pedirle al usuario que reabra
    # la terminal.
    $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = ($machinePath, $userPath, $env:Path) -join ';'
}

function Install-GraphvizSilently {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Warning 'No se encontró winget; no se puede instalar Graphviz automáticamente.'
        return $false
    }
    Write-Host 'Graphviz no está instalado. Instalándolo automáticamente (puede pedir permiso de administrador; acepta el aviso de Windows para continuar)...'
    & $winget.Source install --id Graphviz.Graphviz --exact --silent `
        --accept-source-agreements --accept-package-agreements
    $installExitCode = $LASTEXITCODE
    Update-SessionPathFromRegistry

    # El instalador de Graphviz sigue escribiendo archivos un momento después
    # de que winget devuelve el control (especialmente si hubo que esperar al
    # aviso de administrador), así que no basta con revisar una sola vez.
    Write-Host 'Esperando a que la instalación de Graphviz termine...'
    for ($attempt = 1; $attempt -le 15; $attempt++) {
        if (Find-Dot) {
            return $true
        }
        Start-Sleep -Seconds 2
    }

    if ($installExitCode -ne 0) {
        Write-Warning "winget devolvió un error (código $installExitCode). Es posible que se haya cancelado el aviso de permisos de administrador."
    }
    return $false
}

function Find-DotAndTrustPath {
    $dot = Find-Dot
    if ($dot) {
        $dotDirectory = Split-Path -Parent $dot
        if ($env:Path -notlike "*$dotDirectory*") {
            $env:Path = "$dotDirectory;$env:Path"
        }
    }
    return $dot
}

function Ensure-Dot {
    param([switch]$AllowInstall)

    $dot = Find-DotAndTrustPath
    if ($dot -or -not $AllowInstall) {
        return $dot
    }
    Install-GraphvizSilently | Out-Null
    return Find-DotAndTrustPath
}

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

if (-not $NoImage) {
    Ensure-Dot -AllowInstall:(-not $NoAutoInstallGraphviz) | Out-Null
}

$arguments = @($converter, $InputPath)
if ($MermaidPath) {
    $arguments += @('--mermaid', $MermaidPath)
}
if ($DagPath) {
    $arguments += @('--dag', $DagPath)
}
if ($GraphvizPath) {
    $arguments += @('--graphviz', $GraphvizPath)
}
if ($ImagePath) {
    $arguments += @('--imagen', $ImagePath)
}
if ($JsonPath) {
    $arguments += @('--json', $JsonPath)
}
if ($NoJson) {
    $arguments += '--sin-json'
}
if ($Format) {
    $arguments += @('--formato', $Format)
}
if ($Dpi) {
    $arguments += @('--dpi', $Dpi)
}
if ($NoImage) {
    $arguments += '--sin-imagen'
}
if ($Strict) {
    $arguments += '--strict'
}

& $python.Source @arguments
$exitCode = $LASTEXITCODE

if ($Interactive) {
    if ($exitCode -eq 0 -and -not $NoImage) {
        $imageFormat = if ($Format) { $Format } elseif ($ImagePath) { [IO.Path]::GetExtension($ImagePath).TrimStart('.') } else { 'svg' }
        $resolvedImagePath = if ($ImagePath) {
            $ImagePath
        } else {
            Join-Path (Join-Path (Split-Path -Parent $InputPath) 'diagramas') "$([IO.Path]::GetFileNameWithoutExtension($InputPath)).$imageFormat"
        }
        if (Test-Path -LiteralPath $resolvedImagePath) {
            Write-Host "Abriendo $resolvedImagePath ..."
            Invoke-Item -LiteralPath $resolvedImagePath
        }
    }
    Write-Host ''
    Read-Host 'Presiona Enter para cerrar esta ventana' | Out-Null
}

exit $exitCode
