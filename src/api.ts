import type { User, Snapshot, Caja } from "./types";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let authorization = "";
export function clearAuth() {
  authorization = "";
}
export function basic(username: string, password: string) {
  if (username.includes(":"))
    throw new Error("El usuario no puede contener dos puntos.");
  return (
    "Basic " +
    btoa(
      Array.from(new TextEncoder().encode(`${username}:${password}`), (b) =>
        String.fromCharCode(b),
      ).join(""),
    )
  );
}
async function get<T>(
  path: string,
  signal?: AbortSignal,
  auth = authorization,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      headers: { Authorization: auth, Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: signal ?? AbortSignal.timeout(20000),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error(
      "No pudimos conectar. Verificá que el backend esté iniciado y que tengas conexión.",
    );
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Usuario o contraseña incorrectos. Volvé a ingresar.",
      403: "Tu usuario no tiene permiso para consultar esta jornada.",
      404: "No encontramos esa jornada.",
      500: "El servidor tuvo un problema. Intentá nuevamente.",
      502: "No se pudo conectar con el backend.",
      503: "El servidor no está disponible.",
    };
    throw new ApiError(
      response.status,
      messages[response.status] ??
        `No se pudo completar la consulta (${response.status}).`,
    );
  }
  return response.json() as Promise<T>;
}
export async function login(username: string, password: string) {
  clearAuth();
  const auth = basic(username, password);
  const user = await get<User>("/auth/me", undefined, auth);
  if (!user.roles.some((r) => ["ROLE_ADMIN", "ROLE_REPARTIDOR"].includes(r)))
    throw new Error("Este usuario no tiene acceso al reparto.");
  authorization = auth;
  return user;
}
export const download = (id: string) =>
  get<Snapshot>(`/jornadas/${encodeURIComponent(id)}/datos-offline`);
export const cash = (id: string) =>
  get<Caja>(`/jornadas/${encodeURIComponent(id)}/caja`);

export const listJourneys = (
  estado: string,
  pagina: number,
  signal?: AbortSignal,
) =>
  get<import("./types").PaginaJornadas>(
    `/jornadas?estado=${encodeURIComponent(estado)}&pagina=${pagina}&tamanio=20`,
    signal,
  );

export interface SyncResponse {
  completo: boolean;
  confirmadas: number;
  pendientes: number;
  resultados: {
    estado: string;
    httpStatus: number;
    mensaje: string | null;
    respuesta: { id: string; total: number; saldoCliente: number } | null;
  }[];
}
export async function sendOperation(
  jornadaId: string,
  operation: import("./operations-model").Operation,
): Promise<SyncResponse> {
  // Nuevo token y misma sesión para cada envío; nunca generar otro UUID al reintentar.
  const csrf = await get<{ headerName: string; token: string }>("/csrf");
  const response = await fetch(
    `/api/v1/jornadas/${encodeURIComponent(jornadaId)}/sincronizacion`,
    {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        Accept: "application/json",
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify({ operaciones: [operation] }),
    },
  );
  if (!response.ok)
    throw new ApiError(
      response.status,
      `No se obtuvo confirmación (HTTP ${response.status}). La solicitud se conserva para reintentar. Si es 401/403, volvé a ingresar con el mismo usuario.`,
    );
  return response.json() as Promise<SyncResponse>;
}

export const openingOptions = () =>
  get<import("./types").OpeningOptions>("/jornadas/apertura/opciones");
export const factoryStock = () =>
  get<import("./types").FactoryStock[]>("/stock/fabrica");
export const products = async () =>
  (await get<Omit<import("./types").Producto, "activo">[]>("/productos")).map(
    (p) => ({ ...p, activo: true }),
  );
export interface JourneyMutationResult {
  id: string;
  jornadaId?: string;
  estado?: string;
  numero?: number;
  tipo?: string;
}
export async function postJourney<T = JourneyMutationResult>(
  path: string,
  body: unknown,
  method: "POST" | "PUT" = "POST",
): Promise<T> {
  const csrf = await get<{ headerName: string; token: string }>("/csrf");
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const problem = await response.json();
      detail = typeof problem.detail === "string" ? problem.detail : "";
    } catch {
      /* Respuesta sin ProblemDetail */
    }
    throw new ApiError(
      response.status,
      detail ||
        ({
          400: "Los datos enviados no son válidos.",
          409: "No se pudo registrar: verificá jornadas abiertas, disponibilidad y stock.",
          401: "Volvé a ingresar con el mismo usuario.",
          403: "Sin permiso o sesión vencida. Volvé a ingresar con el mismo usuario.",
        }[response.status] ??
          `No se obtuvo confirmación (HTTP ${response.status}). Reintentá la misma solicitud.`),
    );
  }
  return response.json() as Promise<T>;
}

export const closurePreview = (id: string) => get<import("./types").ClosurePreview>(`/jornadas/${encodeURIComponent(id)}/cierre/previa`);

export const expenseCategories = () => get<import('./expense-model').Category[]>('/categorias-gasto');
export interface ExpenseRow {id:string;categoriaNombre:string;fecha:string;descripcion:string;medio:string;importe:number;referencia:string|null}
export const journeyExpenses = (id:string,page:number) => get<{contenido:ExpenseRow[];pagina:number;tamanio:number;hayMas:boolean}>(`/jornadas/${encodeURIComponent(id)}/gastos?pagina=${page}&tamanio=20`);

export interface ClientRecord {id:string;nombre:string;direccion:string;telefono:string;observaciones:string|null;activo:boolean;version:number}
export interface ClientBody {operacionId:string;nombre:string;direccion:string;telefono:string;observaciones:string|null;version:number|null}
export const searchClients=(query:string,page:number)=>get<{contenido:ClientRecord[];pagina:number;hayMas:boolean}>(`/clientes/gestion?busqueda=${encodeURIComponent(query)}&pagina=${page}`);
export const getClient=(id:string)=>get<ClientRecord>(`/clientes/${encodeURIComponent(id)}`);
export const saveClient=(id:string|null,body:ClientBody)=>postJourney<ClientRecord>(`/clientes/gestion${id?'/'+encodeURIComponent(id):''}`,body,id?'PUT':'POST');
export const adminCategories=()=>get<import('./expense-model').Category[]>('/categorias-gasto?incluirInactivas=true');
export const saveCategory=(id:string|null,body:{nombre:string;activo?:boolean;version?:number})=>postJourney<import('./expense-model').Category>(id?`/admin/categorias-gasto/${encodeURIComponent(id)}`:'/admin/categorias-gasto',body,id?'PUT':'POST');
export const adminPlans=()=>get<import('./plan-model').PlanRecord[]>('/admin/planes-abono');
export const savePlan=(id:string|null,body:ReturnType<typeof import('./plan-model').planBody>)=>postJourney<import('./plan-model').PlanRecord>(id?`/admin/planes-abono/${encodeURIComponent(id)}`:'/admin/planes-abono',body,id?'PUT':'POST');
export const saveProductPrice=(id:string,precioVenta:number,version:number)=>postJourney<import('./types').Producto>(`/admin/productos/${encodeURIComponent(id)}/precio`,{precioVenta,version},'PUT');

export interface ClientPrice {productoId:string;precio:number;activo:boolean;version:number;motivo:string}
export const clientPrices=(id:string)=>get<ClientPrice[]>(`/clientes/${encodeURIComponent(id)}/precios`);
export const saveClientPrice=(id:string,product:string,body:{precio:number;activo:boolean;version:number|null;motivo:string})=>postJourney<ClientPrice>(`/admin/clientes/${encodeURIComponent(id)}/precios/${encodeURIComponent(product)}`,body,'PUT');

export interface ClientHolding {productoId:string;codigo:string;nombre:string;cantidad:number}
export interface ClientSituation {clienteId:string;saldo:number;envases:ClientHolding[]}
export interface ClientHistory {clienteId:string;desde:string;hasta:string;saldoActual:number;contenido:{operacionId:string;jornadaId:string;creadoEn:string;tipo:string;importe:number;saldoResultante:number}[];pagina:number;tamanio:number;totalElementos:number;totalPaginas:number}
export const clientSituation=(id:string)=>get<ClientSituation>(`/clientes/${encodeURIComponent(id)}/situacion`);
export const clientMachines=(id:string)=>get<ClientHolding[]>(`/clientes/${encodeURIComponent(id)}/maquinas`);
export const clientMovements=(id:string,desde:string,hasta:string,pagina:number)=>get<ClientHistory>(`/clientes/${encodeURIComponent(id)}/movimientos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&pagina=${pagina}&tamanio=20`);
