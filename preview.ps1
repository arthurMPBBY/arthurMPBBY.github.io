$ErrorActionPreference = 'Stop'
$runtime = Get-Command node -ErrorAction SilentlyContinue
if ($runtime) {
    & $runtime.Source (Join-Path $PSScriptRoot 'preview-server.cjs')
} else {
    $electron = Join-Path $env:LOCALAPPDATA 'Programs\t3code\T3 Code (Beta).exe'
    if (-not (Test-Path -LiteralPath $electron)) {
        throw 'Node.js nao encontrado. Instale Node.js ou sirva a pasta dist com um servidor HTTP.'
    }
    $env:ELECTRON_RUN_AS_NODE = '1'
    & $electron (Join-Path $PSScriptRoot 'preview-server.cjs')
}
