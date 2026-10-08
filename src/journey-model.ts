import type { FactoryStock, Producto, OpeningOptions } from "./types";
import { cents } from "./operations-model.ts";
export function opening(
  options: OpeningOptions,
  vanId: string,
  repId: string,
  amount: string,
) {
  const van = options.camionetas.find((c) => c.id === vanId && !c.ocupada),
    rep = options.repartidores.find((r) => r.id === repId && !r.ocupado);
  if (!van) throw new Error("Elegí una camioneta disponible.");
  if (!rep) throw new Error("Elegí un repartidor sin jornada abierta.");
  return {
    camionetaId: van.id,
    repartidorId: rep.id,
    efectivoInicial: cents(amount) / 100,
  };
}
export function loading(
  catalog: Producto[],
  stock: FactoryStock[],
  quantities: Record<string, string>,
) {
  const items: { productoId: string; cantidad: number }[] = [];
  for (const [id, text] of Object.entries(quantities)) {
    if (text.trim() === "" || text === "0") continue;
    if (
      !/^\d+$/.test(text) ||
      !Number.isSafeInteger(Number(text)) ||
      Number(text) > 2147483647
    )
      throw new Error(
        "Las cantidades deben ser enteros positivos dentro del rango permitido.",
      );
    const cantidad = Number(text);
    if (cantidad === 0) continue;
    const product = catalog.find((p) => p.id === id && p.activo);
    if (!product) throw new Error("Producto no disponible.");
    if (!["BIDON", "MAQUINA", "COPA"].includes(product.tipo)) throw new Error("Solo se pueden cargar bidones, máquinas y copas.");
    const state = product.tipo === "BIDON" ? "LLENO" : "DISPONIBLE";
    const available =
      stock.find((s) => s.productoId === id && s.estado === state)?.cantidad ??
      0;
    if (cantidad > available)
      throw new Error(
        `Stock insuficiente de ${product.nombre}: disponibles ${available}.`,
      );
    items.push({ productoId: id, cantidad });
  }
  if (!items.length)
    throw new Error("Indicá al menos un producto para cargar.");
  if (items.length > 100)
    throw new Error("Podés cargar hasta 100 productos por operación.");
  return items;
}

export function closing(preview: import("./types").ClosurePreview, amount: string, reason: string) {
  if (preview.jornada.estado !== "ABIERTA") throw new Error("La jornada ya está cerrada.");
  const counted = cents(amount), expected = Math.round(preview.caja.efectivoEsperado * 100);
  const motivo = reason.trim();
  if (counted !== expected && !motivo) throw new Error("Indicá el motivo de la diferencia de efectivo.");
  if (motivo.length > 500) throw new Error("El motivo admite hasta 500 caracteres.");
  return { efectivoContado: counted / 100, motivoDiferencia: motivo || null, devoluciones: preview.stockADevolver.filter(s => s.cantidad > 0).map(({productoId, estado, cantidad}) => ({productoId, estado, cantidad})) };
}
