# Versión 0.7 · Bolsas de 12 y 20 litros

Actualizar primero backend y migración V14 del paquete. La carga de camioneta admite solo bidones, máquinas y copas. La producción consume la bolsa de su capacidad. Ver ACTUALIZAR_BOLSAS.md.

# Versión 0.6 · Stock de fábrica

Panel exclusivo del administrador con consulta, búsqueda, ajustes con motivo y producción. Actualizar primero el backend incluido para proteger los reintentos de ajustes. Consultar ACTUALIZAR_STOCK_FABRICA.md en el ZIP.

# Actualización 0.5: cierre de jornada

Esta actualización solo modifica el frontend. Usa los endpoints de cierre ya existentes; no requiere cambios de backend ni migraciones.


Consultar ACTUALIZAR_CIERRE.md incluido en el paquete para instalación y pruebas.

---

# AGUA · Frontend 0.4 · Apertura, cargas, entregas y cobros

Preact + TypeScript + Vite. Requiere el backend existente con sincronización, datos-offline y listado de jornadas. Esta actualización requiere el nuevo endpoint de opciones de apertura incluido en backend/src del ZIP. No requiere migraciones. Actualizar y reiniciar el backend antes de probar el frontend.

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

## Apertura y carga de stock

En Preparar el reparto, Abrir jornada descarga las opciones vigentes. El administrador elige camioneta y repartidor; el repartidor solo puede elegirse a sí mismo. Se indica cuáles ya tienen jornada abierta. Efectivo sugerido24000, editable. Revisar y confirmar; el servidor asigna fecha y controla disponibilidad.

Seleccionar una jornada ABIERTA y pulsar Cargar/recargar stock. Se consultan productos activos y stock de fábrica. Bidones: LLENO; otros productos: DISPONIBLE. Ingresar cantidades enteras, revisar y confirmar. El backend determina INICIAL o RECARGA. No crea stock de fábrica ni produce bidones.

Una respuesta perdida conserva UUID y cuerpo. Si ya se confirmó pero falla refrescar, Actualizar jornada confirmada solo consulta. No se permite iniciar otra operación mientras haya una solicitud pendiente de la otra categoría. Mantener una sola pestaña operativa por usuario.

## Entregas y cobros

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

Los importes se ingresan sin separador de miles; aceptan coma o punto decimal. Cliente inactivo o jornada cerrada: solo consulta. El cierre todavía se realiza por la API; se incorporará en el próximo módulo.

## Solicitud pendiente y recuperación

Antes de enviar se guarda UNA solicitud por usuario en localStorage de este origen, incluyendo UUID, jornada, cliente y cuerpo de la operación. No se guarda contraseña ni Authorization. El envío usa el endpoint de sincronización ya probado, con CSRF y verificación de cupo/importe.

- Confirmación: actualizar saldos/caja y limpiar solicitud.
- Respuesta perdida/timeout/HTTP inesperado: conservar cuerpo y UUID; pulsar Reintentar misma solicitud. No crear otra para reemplazarla.
- Confirmada pero falla la actualización de pantalla: solo actualizar datos, sin otro POST.
- Rechazo explícito: mostrar motivo; Descartar solicitud rechazada y actualizar refresca los datos antes de permitir otra carga.
- Salir o recargar conserva la solicitud; ingresar con el mismo usuario permite recuperarla, incluso antes de seleccionar una jornada. El servidor sigue validando permisos y reintentos tras cierre.
- Si falla guardar la solicitud, no se envía el POST.

Usar una sola pestaña operativa por usuario en esta etapa. No borrar datos del sitio mientras exista una solicitud pendiente. El almacenamiento depende del navegador y del origen: localhost:5173 y localhost:4173 son distintos. El registro de una solicitud pendiente no constituye una cola offline: todavía no se puede iniciar sin Internet, guardar varias operaciones ni instalar como PWA. Los borradores sin confirmar solo existen en memoria.

## Prueba guiada desde la web

1. Ingresar como admin. Si quedó una jornada ABIERTA de la prueba anterior, seleccionarla; no intentar abrir otra con la misma camioneta/repartidor.
2. Cargar/recargar stock: anotar el saldo de fábrica de un producto con existencias. Probar una unidad, revisar y confirmar una sola vez.
3. Debe mostrarse Carga inicial o Recarga registrada. El stock de la jornada aumenta en1 y fábrica disminuye en1. Se puede volver a abrir Cargar/recargar stock para consultar fábrica y cancelar sin registrar nada.
4. Si no hay stock suficiente, no confirmar: el sistema debe impedir la carga. No ajustar existencias automáticamente para pasar la prueba.
5. Para probar apertura, usar una camioneta y repartidor disponibles. Si todos están ocupados es correcto que no permita confirmar; primero hay que cerrar sus jornadas mediante el flujo existente.
6. Repartidor1 solo debe poder elegirse a sí mismo; administrador ve todos los repartidores activos.
7. Elegir cliente en una jornada abierta: los formularios de entrega/cobro siguen disponibles. No repetir pruebas anteriores con importes suponiendo saldos viejos: consultar primero su saldo real.

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

Compilación TypeScript/Vite y 21 pruebas automatizadas de cálculos y flujos en JSDOM con API simulado. No accedimos al servidor local del usuario ni realizamos cargos reales durante estas pruebas. La validación visual y contra Spring Boot real se completa con la prueba guiada. No hay pruebas nuevas de concurrencia entre pestañas. La aplicación sigue siendo con conexión; no incluye gastos/máquinas/altas/administración como formularios todavía.
