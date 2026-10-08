# AGUA · Frontend 0.3 · Entregas y cobros con conexión

Preact + TypeScript + Vite. Requiere el backend existente con sincronización, datos-offline y listado de jornadas. Esta actualización no requiere cambios del backend ni migraciones.

## Actualizar

Detener Vite (Ctrl+C). Copiar el contenido de la carpeta agua-frontend del ZIP sobre el frontend existente, conservando .env y .git. No copiar estos archivos al backend.

Desde PowerShell en agua-frontend, ejecutar cada línea:

```powershell
npm.cmd ci
```

```powershell
npm.cmd run dev
```

Abrir http://localhost:5173, recargar e ingresar con el usuario existente. Node.js24 LTS: https://nodejs.org/es/download. PostgreSQL y Spring Boot deben seguir activos en localhost:8080. El proxy está configurado; no cambiar CORS ni desactivar CSRF. Usar npm.cmd evita el bloqueo de npm.ps1 en PowerShell.

Compilación y pruebas reproducibles (API simulado, no escriben en tu base):

```powershell
npm.cmd test
```

```powershell
npm.cmd run build
```

`npm.cmd run preview` sirve dist en http://localhost:4173 con el mismo proxy. Dev/preview son para pruebas locales; el despliegue final requerirá HTTPS y frontend/API bajo el mismo origen.

## Funciones nuevas

Desde Clientes, elegir un cliente de una jornada ABIERTA. Arriba de su ficha aparecen Entrega/devolución y Cobro.

Entrega:
- Bidones12/20 activos; cantidades entregadas, vacíos y dañados devueltos.
- Verificación local de stock y envases antes de enviar; el backend vuelve a validar.
- Aplicación automática de cupos actuales. Excedentes al precio habitual, precio específico del cliente si está activo o precio excepcional con motivo.
- Abono mensual opcional: precio completo, sin prorrateo; permite cargarlo sin entregar bidones. No permite elegir otra vez el mismo plan ya registrado ese mes.
- Revisión de cantidades, cupos, unidades facturadas, total y saldo estimado antes de confirmar.
- El cargo aumenta la deuda; no registra un pago automáticamente.

Cobro:
- Pago parcial o combinación de efectivo, transferencia y Mercado Pago.
- Referencia opcional de pagos digitales.
- Se registra el importe efectivamente cobrado, sin campos de vuelto. Si supera la deuda se advierte el saldo a favor.
- Confirmar cobro es una operación separada de confirmar entrega.

Los importes se ingresan sin separador de miles; aceptan coma o punto decimal. Cliente inactivo o jornada cerrada: solo consulta. No hay apertura/carga/cierre desde la pantalla todavía.

## Solicitud pendiente y recuperación

Antes de enviar se guarda UNA solicitud por usuario en localStorage de este origen, incluyendo UUID, jornada, cliente y cuerpo de la operación. No se guarda contraseña ni Authorization. El envío usa el endpoint de sincronización ya probado, con CSRF y verificación de cupo/importe.

- Confirmación: actualizar saldos/caja y limpiar solicitud.
- Respuesta perdida/timeout/HTTP inesperado: conservar cuerpo y UUID; pulsar Reintentar misma solicitud. No crear otra para reemplazarla.
- Confirmada pero falla la actualización de pantalla: solo actualizar datos, sin otro POST.
- Rechazo explícito: mostrar motivo; Descartar solicitud rechazada y actualizar refresca los datos antes de permitir otra carga.
- Salir o recargar conserva la solicitud; ingresar con el mismo usuario permite recuperarla, incluso antes de seleccionar una jornada. El servidor sigue validando permisos y reintentos tras cierre.
- Si falla guardar la solicitud, no se envía el POST.

Usar una sola pestaña operativa por usuario en esta etapa. No borrar datos del sitio mientras exista una solicitud pendiente. El almacenamiento depende del navegador y del origen: localhost:5173 y localhost:4173 son distintos. El registro de una solicitud pendiente no constituye una cola offline: todavía no se puede iniciar sin Internet, guardar varias operaciones ni instalar como PWA. Los borradores sin confirmar solo existen en memoria.

## Prueba guiada con tu base de pruebas

Las jornadas anteriores están cerradas. Necesitamos una ABIERTA con BIDON_12 lleno. Estos comandos modifican tu base de pruebas solo al abrir/cargar. No los ejecutes nuevamente si ya tenés una jornada preparada.

1. Autenticación en la consola (si no conservás $headers/$sesion):

```powershell
$baseUrl = "http://localhost:8080"; $usuario = Read-Host "Usuario admin"; $clave = Read-Host "Contraseña" -AsSecureString; $cred = [System.Management.Automation.PSCredential]::new($usuario, $clave); $basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(("{0}:{1}" -f $usuario, $cred.GetNetworkCredential().Password))); $headers = @{ Authorization = "Basic $basic" }; $csrf = Invoke-RestMethod -Uri "$baseUrl/api/v1/csrf" -Headers $headers -SessionVariable sesion -ErrorAction Stop; $headers[$csrf.headerName] = $csrf.token
```

2. Consultar abiertas antes de crear otra:

```powershell
$jornadasWeb = Invoke-RestMethod -Uri "$baseUrl/api/v1/jornadas?estado=ABIERTA&tamanio=100" -Headers $headers -WebSession $sesion -ErrorAction Stop; $jornadasWeb.contenido | Format-Table id, fecha, camionetaNombre, repartidorNombre
```

Si hay una abierta para Camioneta1/Repartidor1, usar su ID en $jornadaWebId y consultar su stock. No volver a abrirla ni cargar si ya tiene stock suficiente.

3. SOLO si no hay abierta, preparar el cuerpo una vez y enviar:

```powershell
$bodyJornadaWeb = @{ operacionId = [guid]::NewGuid().ToString(); camionetaId = "a86d856e-cc0f-4493-8c60-0a4481914c62"; repartidorId = "b0d2ba1b-ab31-4c5d-88a4-0b897478e90e"; efectivoInicial = 24000 } | ConvertTo-Json
```

```powershell
$jornadaWeb = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/jornadas" -Headers $headers -WebSession $sesion -ContentType "application/json" -Body $bodyJornadaWeb -ErrorAction Stop
```

```powershell
$jornadaWebId = $jornadaWeb.id; $jornadaWeb | Format-List
```

Si falla la apertura, no continuar con cargas usando una variable anterior. Consultar abiertas y revisar el error. Ante pérdida de respuesta, reenviar el mismo cuerpo sin generar otro UUID.

4. Consultar fábrica y jornada antes de cargar:

```powershell
$fabricaWeb = Invoke-RestMethod -Uri "$baseUrl/api/v1/stock/fabrica" -Headers $headers -WebSession $sesion -ErrorAction Stop; $fabricaWeb | Where-Object { $_.codigo -eq "BIDON_12" } | Format-Table codigo, estado, cantidad
```

```powershell
Invoke-RestMethod -Uri "$baseUrl/api/v1/jornadas/$jornadaWebId/stock" -Headers $headers -WebSession $sesion -ErrorAction Stop | Format-Table codigo, estado, cantidad
```

Según el último estado conocido, fábrica tenía2 BIDON_12 llenos. Si la nueva jornada está vacía y fábrica tiene al menos2, preparar una vez:

```powershell
$bodyCargaWeb = @{ operacionId = [guid]::NewGuid().ToString(); items = @(@{ productoId = "00000000-0000-4000-8000-000000000001"; cantidad = 2 }) } | ConvertTo-Json -Depth 5
```

```powershell
Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/jornadas/$jornadaWebId/cargas" -Headers $headers -WebSession $sesion -ContentType "application/json" -Body $bodyCargaWeb -ErrorAction Stop | ConvertTo-Json -Depth 5
```

5. En la web, Actualizar lista, elegir la jornada ABIERTA. Cliente prueba sincronizacion tenía deuda3000 y2 envases12; comprobar antes de continuar. Si el estado es diferente, los resultados deben calcularse a partir de ese estado real.
6. Clientes → Cliente prueba sincronizacion → Entrega/devolución. No cargar abono. BIDON_12: entregados1; vacíos0; dañados0. Sin precio excepcional. Revisar: total3500, facturados1, incluidos0. Confirmar una sola vez.
7. Resultado esperado: deuda6500, envases12=3, stock12lleno=1, caja sin cambios.
8. Cobro → Efectivo1000 → Revisar → Confirmar. Resultado esperado: deuda5500; ingresos efectivo1000; efectivo esperado25000 si la jornada inició con24000 y sin otros movimientos.
9. Si se pierde una respuesta, usar exclusivamente el botón Reintentar misma solicitud. No volver a llenar el formulario.

## Git

Después de probar, desde el frontend:

```powershell
git add src tests package.json package-lock.json README.md
```

```powershell
git diff --cached --stat
```

```powershell
git commit -m "feat: entregas y cobros con confirmacion e idempotencia"
```

## Validación y límites

Compilación TypeScript/Vite y pruebas automatizadas de cálculos y flujos en JSDOM con API simulado. No accedimos al servidor local del usuario ni realizamos cargos reales durante estas pruebas. La validación visual y contra Spring Boot real se completa con la prueba guiada. No hay pruebas nuevas de concurrencia entre pestañas. La aplicación sigue siendo con conexión; no incluye gastos/máquinas/altas/administración como formularios todavía.
