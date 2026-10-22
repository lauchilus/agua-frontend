# AGUA 0.29 — prueba desde celular u otra PC

Esta entrega agrega HTTPS para la demo local. No cambia el backend ni la base.
Usar dispositivos propios de prueba en la misma red privada, sin aislamiento de invitados. La PC debe permanecer encendida, con backend y frontend activos. Esto no es un despliegue de producción.

## 1. Actualizar

Sincronizá las operaciones pendientes antes de actualizar o cambiar de dirección. No borres datos del navegador. Copiá el contenido de agua-frontend sobre tu proyecto conservando .env y .git. Cerrá todas las pestañas y ventanas instaladas de AGUA después de sincronizar, para renovar el service worker.

En PowerShell, dentro de tu carpeta del frontend:

```powershell
npm ci
```

Instalá mkcert una sola vez; luego cerrá y abrí PowerShell para actualizar PATH:

```powershell
winget install --exact --id FiloSottile.mkcert
```

Si no tenés winget, obtené el ejecutable Windows desde https://github.com/FiloSottile/mkcert/releases y agregalo al PATH con nombre mkcert.exe.

## 2. Preparar HTTPS

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\preparar-lan.ps1
```

El script muestra las IP privadas: elegí la de Wi-Fi/Ethernet que comparte red con tu celular, no VPN/VirtualBox. Instala una CA de desarrollo en la PC (Windows puede pedir autorización), genera el certificado y muestra una URL como https://192.168.1.50:4173. El permiso de ejecución se aplica solo a ese proceso.

La carpeta .certs queda excluida de Git. Compartí únicamente .certs\agua-ca.cer con tus dispositivos de prueba por un medio propio. Nunca compartas agua-key.pem ni rootCA-key.pem. No subas certificados o claves al repositorio ni a public/.

## 3. Confiar en el certificado en el dispositivo

- Android: copiá agua-ca.cer al teléfono. En Ajustes buscá «Instalar certificado», seleccioná certificado de CA e instalá ese archivo. El recorrido depende del fabricante (Seguridad / Cifrado y credenciales). Usá Chrome y reinicialo después.
- iPhone/iPad: abrí agua-ca.cer, instalá el perfil descargado en Ajustes y luego activá su confianza en Ajustes > General > Información > Ajustes de confianza de certificados.
- Otra PC Windows: abrí agua-ca.cer > Instalar certificado > Usuario actual > Colocar todos los certificados en el siguiente almacén > Entidades de certificación raíz de confianza. Reiniciá Edge/Chrome.

El navegador debe abrir AGUA sin advertencias de certificado. Saltar una advertencia no reemplaza esta configuración. Eliminá esta CA de los dispositivos cuando termines la demo si ya no la vas a usar.

## 4. Permitir acceso en la red privada

Verificá que tu conexión de confianza esté configurada como Privada en Windows. En una consola PowerShell como administrador, una sola vez:

```powershell
New-NetFirewallRule -Name "AGUA-Demo-LAN-4173" -DisplayName "AGUA demo HTTPS LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4173 -Profile Private -RemoteAddress LocalSubnet
```

Si la regla ya existe no hace falta recrearla. No abras puertos del router. El celular usa solo 4173; no necesita acceso a PostgreSQL ni a 8080.

## 5. Arrancar

Dejá el backend funcionando en IntelliJ. Conservá BACKEND_URL=http://localhost:8080 en .env. Desde la carpeta del frontend:

```powershell
npm run build
```

```powershell
npm run preview:lan
```

Abrí en el celular la URL que imprimió el script. No uses localhost desde el celular: apuntaría al propio teléfono. Iniciá sesión con el repartidor y elegí una jornada abierta. Debe aparecer «Respaldo automático activo».

HTTP localhost, HTTPS localhost y HTTPS con IP son direcciones distintas: cada una tiene su propia cola y respaldo. No cambies de dirección con pendientes. Si cambia la IP de la PC, sincronizá primero, repetí preparar-lan.ps1 y usá la nueva URL (el certificado raíz sigue siendo el mismo).

## 6. Probar una interrupción

1. Con conexión, cargá una jornada con stock y cliente de prueba. Esperá a que termine la carga.
2. Conservá la app abierta. Desactivá Wi-Fi y datos móviles del celular.
3. Registrá una entrega pequeña: debe quedar pendiente y reflejarse en los saldos locales.
4. Reactivá Wi-Fi. Sin tocar «Sincronizar», esperá unos segundos con la app visible y sin un formulario en edición.
5. Comprobá que indique «Al día» y verificá desde la PC una única entrega y el stock correcto.

La sincronización automática funciona con la app abierta; el sistema móvil puede suspenderla en segundo plano. Al volver a la app se retoma. No cierres sesión ni borres almacenamiento con pendientes. Para arrancar una sesión nueva se necesita conexión; la copia con PIN sigue siendo de consulta.

## Diagnóstico

- No abre: misma red, IP correcta, PC despierta, preview activo, perfil Privado y firewall. Las redes de invitados pueden impedir conexiones entre dispositivos.
- Certificado inválido: instalar la CA correcta y usar exactamente la IP certificada. Revisar fecha/hora de ambos dispositivos.
- 502 o error de conexión al API: revisar backend en 8080 y BACKEND_URL. Reiniciar preview después de cambiar .env.
- Puerto ocupado: detener el preview anterior con Ctrl+C; no cambiar el puerto porque cambia el origen del respaldo.
- Versión anterior: sincronizar, cerrar todas las pestañas/ventanas de AGUA y abrir nuevamente con conexión. No borrar datos.

Para detener: Ctrl+C en preview. Para retirar la regla, PowerShell administrador:

```powershell
Remove-NetFirewallRule -Name "AGUA-Demo-LAN-4173"
```

Fuentes: https://github.com/FiloSottile/mkcert — https://vite.dev/config/preview-options — https://support.apple.com/en-us/102390
