AGUA 0.19 — Gastos generales y reporte por categoría

Solo frontend, sin cambios de backend ni migraciones.
Detené Vite y copiá agua-frontend sobre tu carpeta actual conservando .env y .git.
Dentro de esa carpeta:
npm.cmd ci
npm.cmd run dev

Admin > Administración · Gastos generales y reporte > Administrar gastos generales.
Elegí categoría, fecha, descripción, medio e importe. Revisá y confirmá.
Acepta efectivo, transferencia y Mercado Pago.
Estos gastos no afectan la caja de una jornada específica.
Ante pérdida de respuesta, Reintentar mismo gasto conserva el UUID y el cuerpo.
No borres el almacenamiento del navegador mientras haya un gasto pendiente.
El reporte por fechas incluye gastos generales y de jornadas, agrupados por categoría y medio.
Los nombres de categorías son los actuales.
Consultá otra vez el resumen administrativo tras guardar; su Excel incluirá los nuevos totales.
El Excel del resumen conserva su alcance anterior: totales y medios, sin detalle por categoría.

Prueba:
1. Registrar un gasto general de prueba en Servicios o Varios.
2. Consultar reporte para su fecha; comprobar categoría, ámbito GENERAL y medio.
3. Actualizar resumen administrativo; comprobar totalGastado y gastosGenerales.
4. Verificar que caja de jornada no cambió por ese gasto.
5. Como repartidor, comprobar que no aparezca esta sección.
Validado: build y 85 pruebas automáticas aprobadas.

Después de verificar:
git add .
git commit -m "feat: gastos generales y reporte por categoria"


AGUA 0.18 — Alta de camionetas y repartidores; exportación Excel

Actualización solo de frontend. Usa endpoints ya existentes; no hay migraciones.
1. Detené Vite con Ctrl+C.
2. Copiá agua-frontend sobre tu carpeta actual conservando .env y .git.
3. Ejecutá dentro de la carpeta:
npm.cmd ci
npm.cmd run dev

ALTAS
Admin > Administración · Camionetas y repartidores > Administrar camionetas y repartidores.
- Nueva camioneta: nombre y patente, revisar y confirmar.
- Nuevo repartidor: nombre, usuario y contraseña repetida.
- Contraseña: mínimo 12 caracteres, máximo 72 bytes UTF-8 (las tildes ocupan más de un byte).
- Se crea siempre como REPARTIDOR, nunca administrador.
- Los listados muestran registros activos y disponibilidad para jornadas.
- Las contraseñas no se guardan en localStorage ni se incluyen en reportes.
- Ante respuesta perdida, el formulario bloquea otra creación hasta actualizar el listado.
  Verificá por patente o usuario si el alta ya quedó registrada.
- Actualizá las opciones de apertura de jornada para seleccionar los nuevos registros.
- Este paso agrega altas y consulta; edición, desactivación y cambio de contraseña no están incluidos.

EXCEL
Admin > Administración · Resumen > Ver resumen administrativo.
Elegí período > Consultar resumen > Descargar Excel con gráficos.
Descarga un .xlsx con:
- Resumen: ventas, cargos de abonos, cobros, gastos por medio, cantidades.
- Actuales: deuda, saldo a favor, envases y máquinas.
- Gráficos de facturación por concepto y cobros/gastos por medio.
Se exporta la última consulta mostrada, no los cambios de fecha aún sin consultar.
El archivo no incluye contraseñas ni exporta el detalle individual de todas las operaciones.
Los datos de Actuales no representan el saldo histórico al final del período.
Los gráficos están vinculados a celdas del archivo.
La exportación se genera localmente en el navegador sin agregar dependencias.
Archivo validado estructuralmente con lector independiente; comprobar apertura visual en tu Excel.

PRUEBA
1. Crear una camioneta de prueba con patente nueva.
2. Crear un repartidor con usuario nuevo; cerrar sesión e ingresar con esa cuenta.
3. Verificar que el repartidor no vea las pantallas administrativas.
4. Volver como admin y comprobar ambos en opciones de apertura.
5. Descargar Excel para un período conocido y contrastar cifras con el resumen.
6. Abrir el Excel y verificar los gráficos.
Validación automática: build y 82 pruebas aprobadas.

Después de probar:
git add .
git commit -m "feat: altas de camionetas y repartidores y reporte Excel"


AGUA 0.17 — Historial administrativo de jornadas

Solo frontend; sin cambios en backend ni base de datos.
Detené Vite con Ctrl+C. Copiá agua-frontend sobre tu carpeta actual conservando .env y .git.
Dentro de la carpeta:
npm.cmd ci
npm.cmd run dev

Pruebas:
1. Admin > Administración · Historial de jornadas > Buscar jornadas anteriores.
2. Elegí fechas y estado, pulsá Consultar jornadas.
3. Fecha de la jornada filtra por el día de reparto.
4. Fecha del cierre filtra por el día en que se cerró, en Buenos Aires, y muestra solo cerradas.
5. Verificá camioneta, patente, repartidor, efectivo esperado, contado y diferencia.
6. Las abiertas no muestran valores de cierre; indican Sin cierre registrado.
7. Faltante es diferencia negativa, sobrante positiva y cero indica Sin diferencia.
8. Más jornadas pagina de a 20 conservando los filtros consultados.
9. El repartidor no ve este historial administrativo.
Es una consulta: no reabre ni modifica jornadas. No realiza conciliación bancaria.
Validación: compilación y 76 pruebas automáticas (API simulada en pruebas de interfaz).

Después de probar:
git add .
git commit -m "feat: historial administrativo de jornadas"


AGUA 0.16 — Resumen administrativo

Actualización solo de frontend, sin migraciones ni cambios de backend.
Detené Vite con Ctrl+C y copiá agua-frontend sobre tu carpeta actual, conservando .env y .git.
Dentro de esa carpeta:
npm.cmd ci
npm.cmd run dev

Prueba:
1. Ingresá como admin.
2. Administración · Resumen > Ver resumen administrativo.
3. Elegí Desde y Hasta, luego Consultar resumen.
4. Compará facturado (ventas + abonos), cobrado y gastado con tus operaciones.
5. Revisá cobros y gastos por efectivo, transferencia y Mercado Pago.
6. Deudas, saldos a favor, envases y máquinas son actuales: no se filtran por período.
7. Probá un período vacío; los importes del período deben ser cero, conservando la situación actual.
8. Ingresá como repartidor y verificá que no vea el resumen administrativo.
Esta pantalla consulta datos; no modifica operaciones ni genera cobros.
No es un cálculo de ganancias ni conciliación bancaria. Los gastos incluyen jornadas y generales.

Después de verificar:
git add .
git commit -m "feat: resumen administrativo por periodo"


AGUA 0.15 — Ficha de cuenta del cliente

Solo frontend. Sin cambios de backend ni migraciones.
Detené Vite con Ctrl+C. Copiá agua-frontend sobre tu carpeta actual conservando .env y .git.
Dentro de la carpeta del frontend:
npm.cmd ci
npm.cmd run dev

Prueba como admin o repartidor, incluso sin jornada:
1. Clientes > Gestionar clientes > Ver cuenta de [cliente].
2. Elegí Desde/Hasta y pulsá Consultar cuenta.
3. Verificá deuda o saldo a favor, envases y máquinas actuales.
4. El historial incluye entregas, devoluciones y cobros; los cobros reducen el saldo.
5. Las fechas del historial se muestran con horario de Buenos Aires, en formato de 24 horas.
6. Probá un período sin movimientos y cambiá de cliente.
7. Si hay más de 20 movimientos, usá Más movimientos.
El rango se aplica al historial, no al saldo y tenencias actuales.
Esta ficha es de consulta; no registra cobros ni entregas.
El historial mostrado no incluye movimientos físicos de máquinas; se muestra su tenencia actual.

Validado: build y 67 pruebas de modelos e interfaz con API simulada.
Después de verificar en tu entorno:
git add .
git commit -m "feat: ficha de cuenta e historial de clientes"


AGUA 0.14 — Precios por cliente

Actualización solo de frontend. No requiere migraciones ni cambios de backend.
1. Detené Vite con Ctrl+C.
2. Copiá el contenido de agua-frontend sobre tu carpeta actual. Conservá tu .env y .git.
3. Dentro de esa carpeta ejecutá:
npm.cmd ci
npm.cmd run dev

Prueba:
- Ingresá como admin. Clientes > Gestionar clientes > Precios de [cliente].
- Consultar precios del cliente > Configurar Bidón.
- Indicá precio y motivo, revisá y confirmá.
- Actualizá la jornada para descargar el precio nuevo.
- Una entrega fuera del abono sin precio excepcional debe usar el precio del cliente.
- Si indicás precio excepcional de entrega, este tiene prioridad.
- Para volver al general, desmarcá Usar precio especial e indicá motivo.
- El repartidor no ve el editor permanente; conserva el precio excepcional de entrega.
- No cambia ventas anteriores ni el cargo mensual de abonos.
- Ante conflicto o respuesta perdida, actualizar y verificar; no se reenvía automáticamente.

Validación: compilación y 62 pruebas automáticas de modelos/interfaz con API simulada.
Después de probar:
git add .
git commit -m "feat: precios especiales por cliente en administracion"


# Versión 0.13 · Precios generales

Edición de precios de bidones y copas para administrador. Solo frontend. Ver ACTUALIZAR_PRECIOS.md.

# Versión 0.12 · Planes de abono

Crear y editar planes, precios y cupos; activar y desactivar. Solo frontend. Ver ACTUALIZAR_PLANES.md.

# Versión 0.11 · Categorías de gastos

Administración de categorías: alta, edición, activación y desactivación. Solo frontend; ver ACTUALIZAR_CATEGORIAS.md.

# Versión 0.10 · Máquinas

Entrega y retiro sin cargo desde la ficha del cliente en una jornada abierta. Solo frontend. Ver ACTUALIZAR_MAQUINAS.md.

# Versión 0.9 · Clientes sin jornada

Alta, búsqueda y edición independiente de jornadas. Actualizar backend y migración V15 antes de usar. Ver ACTUALIZAR_CLIENTES.md.

# Versión 0.8 · Gastos de jornada

Registro con categoría, fecha, medio e importe. Consulta paginada y egresos por medio. Solo frontend; ver ACTUALIZAR_GASTOS.md en el ZIP.

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
