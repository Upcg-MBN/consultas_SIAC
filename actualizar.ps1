# Actualización diaria del dashboard SIAC: descarga el Excel, lo valida, regenera datos.js
# y (con -Publicar) lo sube a GitHub para que se actualice el sitio.
# Si falla, datos.js queda como estaba (ver logs\actualizaciones.csv y logs\errores.log);
# con -Publicar se sube igual estado.js, para que el panel avise que la última carga falló.
#
# Programarla (requiere estar en la red del Ministerio: el Excel solo se descarga desde ahí):
#   schtasks /Create /TN "SIAC dashboard" /SC DAILY /ST 07:30 /RL LIMITED /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"<ruta>\actualizar.ps1\" -Python \"<ruta a python.exe>\" -Publicar"
# El Excel se genera ~04:15; 07:30 deja margen. Usar la ruta completa de Python (en una tarea el PATH es otro).
# Para publicar hace falta Git instalado y haber hecho antes un `git push` a mano (guarda la sesión de GitHub).
param([string]$Python = 'python', [string]$Git = '', [switch]$Reprocesar, [switch]$Publicar)
Set-Location $PSScriptRoot
$args2 = @('extraer.py'); if ($Reprocesar) { $args2 += '--reprocesar' }
& $Python @args2
$codigo = $LASTEXITCODE

if ($Publicar) {
    if (-not $Git) {
        $candidatos = @(
            (Get-Command git -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
            "$env:ProgramFiles\Git\cmd\git.exe",
            "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
        ) + @(Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" -ErrorAction SilentlyContinue |
              Sort-Object FullName -Descending | Select-Object -ExpandProperty FullName)
        $Git = $candidatos | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    }
    if (-not $Git) {
        Write-Error 'No se encontró Git: instálelo o pase -Git <ruta a git.exe>.'; exit 1
    }
    # Solo se publican los dos archivos de datos; el resto del repositorio se cambia a mano.
    & $Git add datos.js estado.js
    & $Git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        & $Git commit -m ("Actualización " + (Get-Date -Format 'yyyy-MM-dd HH:mm')) | Out-Null
        & $Git pull --rebase --autostash --quiet
        & $Git push --quiet
        if ($LASTEXITCODE -ne 0) { Write-Error 'No se pudo subir a GitHub (git push falló).'; $codigo = 1 }
        else { Write-Host 'Publicado en GitHub.' }
    } else { Write-Host 'Sin cambios que publicar.' }
}
exit $codigo