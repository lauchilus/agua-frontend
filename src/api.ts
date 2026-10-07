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
