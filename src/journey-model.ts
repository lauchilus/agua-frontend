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
