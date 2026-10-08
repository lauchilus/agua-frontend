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
export async function postJourney(
  path: string,
  body: unknown,
): Promise<JourneyMutationResult> {
  const csrf = await get<{ headerName: string; token: string }>("/csrf");
  const response = await fetch("/api/v1" + path, {
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
  return response.json() as Promise<JourneyMutationResult>;
}

export const closurePreview = (id: string) => get<import("./types").ClosurePreview>(`/jornadas/${encodeURIComponent(id)}/cierre/previa`);
