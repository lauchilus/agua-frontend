AGUA 0.26 — Entrega de copas

Incluye el frontend completo y un parche de backend. Aplicar ambos.

INSTALACION
1. Detener backend y Vite.
2. Copiar el contenido de backend/src dentro de la carpeta src de tu backend,
   respetando las rutas y reemplazando EntregaService.java.
   Se agrega V16__entregas_copas.sql: no editar ni borrar migraciones anteriores.
3. Iniciar el backend desde IntelliJ. Flyway aplica V16 al arrancar.
4. Copiar agua-frontend sobre tu frontend conservando .env y .git.
5. Desde PowerShell, dentro de agua-frontend:
npm.cmd ci
npm.cmd run dev

COMPORTAMIENTO
En Reparto > Clientes del reparto > cliente > Entrega aparecen bidones y copas activos.
Las copas usan stock DISPONIBLE de la camioneta; admiten precio configurado cero.
Se puede indicar precio excepcional para esa entrega, con motivo.
No generan envases pendientes ni consumen cupo del abono.
No tienen campos de vacios/danados devueltos; el backend tambien los rechaza.
Las maquinas siguen en su flujo de entrega/retiro independiente.
Las copas aparecen en ventas y en su Excel; una entrega gratis suma unidades,
pero no aumenta deuda ni caja. Cobrar, si corresponde, sigue siendo otra operacion.
El precio historico de una entrega confirmada no cambia al editar el precio general.
Los reintentos conservan la operacion original y no descuentan stock dos veces.

PRUEBA MANUAL
1. Admin > Administracion > Stock de fabrica: ingresar 3 copas DISPONIBLE
   si no hay stock. Revisar en Precios que COPA tenga precio 0.
2. Abrir o seleccionar una jornada y cargar 2 copas a la camioneta.
3. En el cliente, entregar 1 copa: total $0, deuda sin cambios, stock baja de 2 a 1.
4. Verificar que no aparezca una copa entre los envases pendientes del cliente.
5. Entregar la segunda copa con precio excepcional $500 y motivo "Prueba":
   suma $500 a la deuda y deja stock en cero. No suma efectivo hasta registrar cobro.
6. Consultar Reportes > Ventas por producto filtrando COPA: 2 unidades, $500.
   Descargar Excel y comparar. No deben cambiar los cupos del abono.
7. Intentar otra copa: debe informar stock insuficiente.

Prueba con datos de ensayo; las entregas confirmadas quedan registradas.

Git (ejecutar en cada repositorio modificado):
git add .
git commit -m "feat: entrega de copas no retornables"

Las pruebas Java incluidas usan AGUA_TEST_DB_URL, AGUA_TEST_DB_USER y
AGUA_TEST_DB_PASSWORD, con un esquema aislado. No usan application.yaml.


--- Versiones anteriores ---

AGUA 0.25 — Resumen de cierres de caja

Solo frontend; sin cambios de backend ni migraciones.
Detené Vite y copiá agua-frontend conservando .env y .git.
npm.cmd ci
npm.cmd run dev

Admin > Reportes > Resumen de cierres de caja > Ver resumen de cierres.
Elegí período y fecha de cierre o de jornada; Consultar cierres.
Muestra jornadas encontradas, cierres registrados, cierres con diferencia,
efectivo esperado/contado, faltantes, sobrantes y diferencia neta.
También muestra cobros y gastos por medio.
Descargar Excel completo exporta la consulta mostrada, con cantidades e importes numéricos.

Los importes son sumas de cierres registrados: no incluyen jornadas sin cierre ni gastos generales.
La suma de efectivo esperado incluye el fondo inicial de cada jornada.
No representa dinero disponible acumulado ni conciliación bancaria.
Neto cero puede incluir faltantes y sobrantes: ambos se muestran separados.
Fecha de cierre usa Buenos Aires; fecha de jornada usa el día de reparto.
Para revisar jornadas individuales, usar Historial de jornadas.

Prueba:
1. Consultar octubre de 2026 por fecha de cierre y comparar con cierres existentes.
2. Cambiar a fecha de jornada y verificar fechas.
3. Descargar Excel.
4. Consultar un período sin cierres.
5. El repartidor no debe ver este reporte administrativo.

git add .
git commit -m "feat: resumen y Excel de cierres de caja"


AGUA 0.24 — Ventas por producto y Excel

Solo frontend, sin cambios de backend ni migraciones.
Detené Vite, copiá agua-frontend conservando .env y .git:
npm.cmd ci
npm.cmd run dev

Admin > Reportes > Ventas por producto > Ver ventas por producto.
Elegí desde, hasta y producto; Consultar ventas.
Muestra entregadas, incluidas en abonos, facturadas aparte, vacíos, dañados e importe.
El importe no equivale a cobros recibidos y excluye los cargos mensuales de abonos.
La fecha usada es el registro de la entrega en Buenos Aires.
Operaciones incluye devoluciones sin venta.
Clientes y operaciones totales son distintos; no sumar cantidades por producto para obtenerlos.
Descargar Excel completo exporta la consulta mostrada, con todos los productos del resultado.
El archivo incluye importes numéricos y columnas para ordenar y filtrar.

Prueba:
1. Consultar octubre de 2026 y comparar con las entregas de prueba.
2. Filtrar Bidón 12 y Bidón 20.
3. Probar un período vacío.
4. Descargar Excel y comparar unidades, importes y devoluciones.
5. Verificar que el repartidor no vea este reporte.

git add .
git commit -m "feat: reporte y Excel de ventas por producto"


AGUA 0.23 — Reporte de envases en clientes

Solo frontend, sin backend ni migraciones.
Detené Vite, copiá agua-frontend conservando .env y .git:
npm.cmd ci
npm.cmd run dev

Admin > Reportes > Envases en clientes > Ver envases en clientes.
Buscar por nombre, elegir producto y estado del cliente; pulsar Consultar envases.
Totales para todo el filtro; páginas de 20 filas.
Una fila por cliente y producto. El total de clientes cuenta personas distintas.
Muestra tenencias actuales mayores a cero, no movimientos históricos ni deuda monetaria.
Descargar Excel completo respeta los filtros consultados y recorre todas las páginas.
La identidad de cada fila es cliente + producto; un cliente puede tener ambos tamaños.
No se cambia ninguna cantidad desde este reporte.
El repartidor no ve este reporte administrativo.

Prueba:
1. Consultar todos los productos.
2. Filtrar Bidón de 12 y luego Bidón de 20.
3. Buscar un cliente y comparar con su ficha.
4. Descargar Excel y revisar cantidades y teléfonos.
5. Probar un filtro sin resultados y verificar totales cero.

git add .
git commit -m "feat: reporte y Excel de envases en clientes"


AGUA 0.22 — Exportación Excel de reportes

Solo frontend, sin backend ni migraciones.
Detené Vite, copiá agua-frontend conservando .env y .git:
npm.cmd ci
npm.cmd run dev

EXPORTACIONES
- Reportes > Cuentas: consultar filtros > Descargar Excel completo.
  Para deudores elegí Deudores y pulsá Consultar cuentas antes de descargar.
  Incluye todos los clientes filtrados, aunque haya varias páginas.
- Reportes > Historial de jornadas: consultar período y estado > Descargar Excel completo.
  Incluye todas las páginas, efectivo esperado, contado y diferencia.
- Gastos > reporte por categoría: consultar fechas > Descargar Excel completo.
  Exporta los grupos de categoría, ámbito y medio, con cantidades e importes.
- Ficha del cliente > consultar historial > Descargar Excel completo.
  Exporta todos los movimientos del período; no incluye el detalle de envases y máquinas.
- Resumen administrativo: conserva Descargar Excel con gráficos.

ALCANCE
Los filtros exportados son los de la consulta aplicada, no cambios aún sin consultar.
Cuentas, jornadas e historial del cliente se vuelven a consultar al descargar.
Resumen y gastos exportan la consulta mostrada.
Cada XLSX incluye título, contexto/filtros y fecha de generación.
Los archivos tabulares tienen encabezados inmovilizados y autofiltro.
Importes son números; textos se exportan literalmente; campos sin dato quedan vacíos.
Los saldos negativos son a favor y las diferencias negativas de cierre son faltantes.
Solo el resumen incluye gráficos; los demás son listados completos.
La exportación paginada detecta cambios de cantidad o IDs duplicados y no entrega un archivo parcial.
No es una instantánea transaccional única entre páginas; si otros usuarios modifican datos durante la descarga, consultá nuevamente.
No requiere instalar Excel ni bibliotecas adicionales en el servidor.

PRUEBA
1. Filtrar deudores y descargar. Comparar filas, nombres y saldos.
2. Si hay más de 20, verificar que estén incluidos todos.
3. Cambiar un filtro sin consultar y descargar: debe mantener la consulta aplicada.
4. Descargar jornadas, gastos e historial del cliente.
5. Abrir los archivos en Excel y probar ordenar/filtrar.
Validación: compilación, 94 pruebas automáticas y lectura independiente del formato XLSX.

git add .
git commit -m "feat: exportacion Excel completa de reportes"


AGUA 0.21 — Reporte de cuentas de clientes

Solo frontend, sin cambios de backend ni base de datos.
Detené Vite, copiá agua-frontend conservando .env y .git y ejecutá:
npm.cmd ci
npm.cmd run dev

Admin > Reportes > Cuentas de clientes > Ver cuentas de clientes.
Buscá por nombre y filtrá por:
- Todos, deudores, saldo a favor o saldados.
- Activos, inactivos o todos.
Consultar cuentas muestra totales de todo el filtro y páginas de 20 clientes.
Más cuentas conserva los filtros de la última consulta.
Consultar ficha abre saldo, tenencias e historial del cliente; pulsá Consultar cuenta para cargarlo.
Es información actual, sin filtro de período para saldos.
Los saldos a favor se presentan en positivo con su etiqueta.
Este reporte no registra cobros. Los cobros siguen en Reparto.
El repartidor no tiene acceso a este reporte administrativo.
No se cambia el alcance del Excel del resumen en este paso.

Prueba:
- Consultar todos, luego deudores y saldo a favor.
- Comparar totales con el resumen administrativo sin filtros.
- Abrir la ficha de un cliente y consultar su historial.
- Verificar navegación entre páginas si hay más de 20 clientes.
- Ingresar como repartidor y verificar que no vea Reportes.
Build y 91 pruebas aprobadas.

git add .
git commit -m "feat: reporte de cuentas de clientes"


AGUA 0.20 — Navegación por secciones

Solo frontend. Detené Vite y copiá agua-frontend conservando .env y .git.
npm.cmd ci
npm.cmd run dev

Secciones:
Reparto: apertura, carga, entregas, cobros, gastos de jornada y cierre.
Clientes: búsqueda, alta, edición, cuenta y precios especiales.
Reportes (admin): resumen, Excel e historial de jornadas.
Gastos (admin): gastos generales, reporte por categoría y categorías.
Administración (admin): camionetas, repartidores, precios, planes y fábrica.

Cambiar de sección conserva los formularios montados y solicitudes pendientes.
Durante una operación la navegación queda bloqueada.
Al ingresar se abre Reparto.
El repartidor solo ve Reparto y Clientes.
Dentro del reparto, la pestaña de selección de clientes se llama Clientes del reparto.
La gestión independiente de clientes está en Clientes del menú principal.

Prueba:
- Cambiar entre secciones y comprobar que solo una sea visible.
- Abrir un formulario sin confirmar, cambiar de sección y volver; sus datos deben conservarse.
- Consultar reportes y descargar Excel.
- Probar en pantalla angosta o celular.
- Entrar como repartidor y comprobar las dos secciones permitidas.

git add .
git commit -m "feat: navegacion por secciones para admin y reparto"


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
