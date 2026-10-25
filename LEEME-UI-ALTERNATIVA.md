# Agua de los Santos — UI alternativa

Versión 0.30.0-ui.1. Frontend completo e independiente. Conserva tu logo y las funciones existentes; no requiere cambios en el backend.

## Instalación sin reemplazar la actual

1. Extraé la carpeta `agua-de-los-santos-ui` junto a tu carpeta actual `agua-frontend`. No copies encima de la anterior.
2. Copiá tu archivo `.env` (y `.env.local` si lo usás) y la carpeta `.certs` de la versión actual a la nueva. Los certificados existentes sirven para la misma IP o nombre, aunque cambie el puerto. No compartas certificados privados ni los agregues a Git.
3. Dejá el backend funcionando como hasta ahora. Abrí PowerShell dentro de la nueva carpeta y ejecutá cada línea:

```powershell
npm ci
```

```powershell
npm run build
```

```powershell
npm run preview:lan
```

Abrí `https://localhost:4174` en la PC o `https://IP-DE-TU-PC:4174` en el celular. Usá la misma IP que ya funcionaba, cambiando el puerto a 4174. La versión anterior conserva el puerto 4173.

Si el firewall impide entrar desde el celular, ejecutá una vez en PowerShell como administrador (red privada):

```powershell
New-NetFirewallRule -Name "AGUA-UI-4174" -DisplayName "Agua de los Santos UI alternativa" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4174 -Profile Private -RemoteAddress LocalSubnet
```

Si cambió la IP o necesitás generar certificados, seguí PRUEBA-LAN.md. Para desarrollo local usá `npm run dev` (puerto 5174).

## Qué cambia

- Azul y blanco con tu logo original.
- Menú lateral en PC y menú desplegable en celular.
- Inicio administrativo con accesos a tareas frecuentes.
- Reportes, gastos y administración muestran una tarea a la vez.
- Clientes más compactos; acciones Ver cuenta, Editar y Precios.
- Formularios de entrega y cobro junto al cliente seleccionado.
- Nombres más claros: Iniciar reparto, Cargar camioneta y Finalizar reparto.

## Datos y comparación

Ambas interfaces usan el mismo backend y la misma base: las operaciones se registran realmente. Probá con clientes de prueba. Antes de cambiar de interfaz, sincronizá los pendientes en la versión donde los creaste. Las colas offline y sesiones se guardan por puerto: no se trasladan entre ambas interfaces. Evitá registrar operaciones offline desde ambas a la vez.

Para volver, detené la alternativa con Ctrl+C y abrí tu versión habitual. No borres almacenamiento si hay operaciones pendientes.

## Revisión sugerida

Ingresá como admin: revisá Inicio, Clientes, Reportes y Administración. Ingresá como repartidor: seleccioná reparto y cliente, comprobá entrega/cobro, sincronización y cierre. En celular revisá el menú y que las tablas puedan desplazarse sin desbordar la página.

Compilación correcta y 130 pruebas automatizadas aprobadas. No se completaron capturas con navegador real por una restricción del entorno: falta tu revisión visual en PC y celular.
