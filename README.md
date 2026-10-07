# AGUA · Frontend inicial 0.1

Preact + TypeScript + Vite. Interfaz responsive de consulta conectada al backend Spring Boot existente. No modifica PostgreSQL ni registra entregas, cobros o cierres.

## Requisitos

- Windows con Node.js 24 LTS y npm: https://nodejs.org/es/download (instalador Windows x64, opciones predeterminadas). Abrir una nueva PowerShell después de instalar.
- Backend con el módulo datos-offline funcionando en http://localhost:8080 y PostgreSQL iniciado, tal como en las pruebas anteriores.
- Usuario admin o repartidor y su contraseña. Repartidor solo consulta sus propias jornadas.

## Instalación paso a paso (PowerShell)

1. Extraer el ZIP. Debe quedar `agua-frontend` con package.json dentro, separada de la carpeta del backend. Por ejemplo: `C:\Users\ama3485\Desktop\agua-frontend`.
2. Abrir PowerShell en esa carpeta. Cada comando es una sola línea:

```powershell
Set-Location "$env:USERPROFILE\Desktop\agua-frontend"
```

```powershell
node --version; npm.cmd --version
```

```powershell
npm.cmd ci
```

```powershell
npm.cmd run dev
```

3. Dejar esa terminal abierta. Abrir http://localhost:5173 en Chrome o Edge.
4. Ingresar usuario y contraseña en el formulario de la aplicación. No hay ventana externa para credenciales.
5. Pegar el ID de jornada y pulsar Consultar jornada. Para la prueba existente: `30bc9931-0557-404b-b642-fc8917cccdef`.
6. Probar Resumen, Clientes, búsqueda, ficha de cliente y Stock. La jornada anterior debe figurar CERRADA, efectivo esperado $28.000, total cobrado $4.000. Cliente prueba sincronizacion: deuda $3.000 y dos envases de 12 litros. Cliente original: deuda $29.000.
7. Reducir el ancho de la ventana o activar el modo dispositivo del navegador (F12, Ctrl+Shift+M) para revisar la vista de celular sin exponer credenciales por la red local.
8. Ctrl+C en la terminal detiene el frontend. El backend sigue funcionando en su propia terminal/IDE.

## Compilación y vista del resultado

```powershell
npm.cmd run build
```

Genera `dist`. Para probarlo localmente (también necesita el backend):

```powershell
npm.cmd run preview
```

Abrir http://localhost:4173. No abrir index.html con doble clic. Vite dev/preview son herramientas locales, no el despliegue final.

## Si tu backend utiliza otra dirección

Copiar `.env.example` a `.env` y cambiar BACKEND_URL. Es una configuración del proxy, no lleva credenciales. Reiniciar Vite después de modificarla.

```powershell
Copy-Item .env.example .env
```

Las solicitudes del navegador van a /api. Vite las reenvía al backend. No se requieren cambios de CORS ni desactivar CSRF. Solo se realizan GET; el manejo de CSRF para escrituras se incorporará con los formularios de operaciones.

## Errores habituales

- `node` no se reconoce: instalar Node.js y abrir una terminal nueva.
- PowerShell bloquea npm.ps1: usar `npm.cmd` como en esta guía; no cambiar la política de ejecución.
- `npm ci` falla: comprobar conexión a Internet, estar en la carpeta con package.json y conservar package-lock.json. No borrar el lockfile como primer recurso.
- Puerto 5173 ocupado: detener otra instancia de este frontend con Ctrl+C.
- No conecta / HTTP 500 o 502: comprobar backend en puerto8080 y PostgreSQL; revisar su consola.
- 401: revisar credenciales. 403 en la jornada: usar el repartidor asignado o admin. 404: revisar el UUID y que el backend incluya datos-offline.
- Al recargar la página pide ingreso nuevamente: comportamiento previsto; las credenciales y los datos solo se mantienen en memoria.
- Los nombres se ven bien en el navegador aunque PowerShell mostrara BidÃ³n: el frontend interpreta JSON como UTF-8.

## Alcance real de esta entrega

Incluye login Basic, consulta por UUID, caja, catálogo, stock, clientes compartidos, búsqueda, saldos, envases, máquinas, abonos/cupos actuales y precios especiales vigentes. Usa datos reales del API; no contiene datos simulados en el producto.

La caja se consulta por separado de datos-offline; ambas lecturas pueden diferir levemente en tiempo si la jornada está abierta. La descarga completa tiene su propia vista consistente de base. Se muestran explícitamente datos actuales del cliente y la caja de la jornada seleccionada.

Las credenciales Basic se mantienen únicamente en memoria, nunca en localStorage/sessionStorage/IndexedDB. Salir limpia la memoria de la interfaz; no es todavía un endpoint de revocación de sesiones en el backend. No introducir contraseñas en .env, Git ni archivos. Para producción se configurará HTTPS y el frontend/API bajo el mismo origen.

Pendiente: selección automática de jornada, apertura/carga/cierre desde pantalla, edición/alta de clientes, entregas/cobros/gastos, cola persistente con UUID, IndexedDB, PWA instalable y panel administrativo. No permite operar sin conexión ni conserva información al cerrar o recargar la pestaña. Una consulta fallida conserva la última vista cargada y la identifica como anterior.

## Git

Desde esta carpeta, si se usa un repositorio separado:

```powershell
git init
```

```powershell
git add .
```

```powershell
git diff --cached --stat
```

```powershell
git commit -m "feat: frontend inicial de consulta para reparto"
```

Si la carpeta está dentro de un repositorio existente, omitir git init y agregarla desde ese repositorio. node_modules, dist y .env se excluyen de Git.
