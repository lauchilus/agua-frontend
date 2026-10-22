param([string]$DireccionIP)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$proyectoAgua = Split-Path $PSScriptRoot -Parent
$mkcertAgua = Get-Command mkcert -ErrorAction SilentlyContinue
if (-not $mkcertAgua) { throw 'Instala mkcert y abre otra consola. Ver PRUEBA-LAN.md.' }
$direccionesAgua = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -and $_.AddressState -eq 'Preferred' })
if ($direccionesAgua.Count -eq 0) { throw 'No se encontro una IPv4 privada. Conecta la PC a la red local.' }
$direccionesAgua | Format-Table InterfaceAlias, IPAddress
if (-not $DireccionIP) { $DireccionIP = Read-Host 'IPv4 de la conexion Wi-Fi o Ethernet compartida con el celular' }
if ($DireccionIP -notin @($direccionesAgua.IPAddress)) { throw 'Elige una de las direcciones privadas mostradas.' }
$certsAgua = Join-Path $proyectoAgua '.certs'
New-Item -ItemType Directory -Force -Path $certsAgua | Out-Null
& $mkcertAgua.Source -install
if ($LASTEXITCODE -ne 0) { throw 'No se pudo instalar la CA local.' }
& $mkcertAgua.Source -cert-file (Join-Path $certsAgua 'agua.pem') -key-file (Join-Path $certsAgua 'agua-key.pem') localhost 127.0.0.1 $DireccionIP
if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar el certificado.' }
$raizAgua = (& $mkcertAgua.Source -CAROOT | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw 'No se pudo localizar la CA.' }
Copy-Item -LiteralPath (Join-Path $raizAgua 'rootCA.pem') -Destination (Join-Path $certsAgua 'agua-ca.cer') -Force
Write-Host "Direccion para abrir desde el celular: https://${DireccionIP}:4173"
Write-Host "Instala SOLO $certsAgua\agua-ca.cer en el dispositivo de prueba. No compartas archivos de claves."
Write-Host 'Luego ejecuta npm run build y npm run preview:lan. Ver PRUEBA-LAN.md para firewall y certificados.'
