import type { Snapshot, Cliente } from "./types";
export const money = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    n,
  );
export function cents(text: string): number {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized))
    throw new Error(
      "Ingresá un importe válido, con hasta dos decimales y sin separadores de miles.",
    );
  const [whole, frac = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
function integer(text: string) {
  if (!/^\d{1,5}$/.test(text) || Number(text) > 10000)
    throw new Error("Las cantidades deben ser enteros entre 0 y 10000.");
  return Number(text);
}
function fromAmount(n: number) {
  return Math.round(n * 100);
}
export interface DraftItem {
  productoId: string;
  entregados: string;
  vacios: string;
  danados: string;
  precio: string;
  motivo: string;
}
export interface DeliveryItem {
  productoId: string;
  entregados: number;
  devueltosVacios: number;
  devueltosDanados: number;
  precioVersion?: number;
  precioClienteVersion?: number;
  precioExcepcional?: number;
  motivoPrecio?: string;
}
export interface ExpectedItem {
  productoId: string;
  incluidosAbono: number;
  precioUnitario: number | null;
}
export interface DeliveryBody {
  operacionId: string;
  clienteId: string;
  items: DeliveryItem[];
  abono?: { planId: string; planVersion: number; periodo: string };
}
export interface Payment {
  medio: string;
  importe: number;
  referencia?: string;
}
export type Operation =
  | {tipo:"MAQUINA";maquina:{operacionId:string;clienteId:string;productoId:string;entregadas:number;retiradas:number}}
  | {
      tipo: "ENTREGA";
      entrega: DeliveryBody;
      esperadoEntrega: { total: number; items: ExpectedItem[] };
    }
  | {
      tipo: "COBRO";
      cobro: { operacionId: string; clienteId: string; pagos: Payment[] };
    };
export function delivery(
  data: Snapshot,
  client: Cliente,
  rows: DraftItem[],
  planId: string,
) {
  if (!client.activo) throw new Error("El cliente está inactivo.");
  const plan = planId
    ? data.planesAbono.find((p) => p.id === planId && p.activo)
    : undefined;
  if (planId && !plan)
    throw new Error("El plan seleccionado ya no está disponible.");
  if (
    plan &&
    data.abonosClientes.some(
      (a) => a.clienteId === client.id && a.planId === plan.id,
    )
  )
    throw new Error("El cliente ya tiene ese plan cargado en este mes.");
  const abonoIds = new Set(
    data.abonosClientes
      .filter((a) => a.clienteId === client.id && a.periodo === data.periodo)
      .map((a) => a.id),
  );
  let total = plan ? fromAmount(plan.precio) : 0;
  const items: DeliveryItem[] = [],
    expected: ExpectedItem[] = [],
    summary: {
      nombre: string;
      entregados: number;
      vacios: number;
      danados: number;
      incluidos: number;
      facturados: number;
      subtotal: number;
      envases: number;
    }[] = [];
  for (const row of rows) {
    const delivered = integer(row.entregados || "0"),
      empty = integer(row.vacios || "0"),
      damaged = integer(row.danados || "0");
    if (!delivered && !empty && !damaged) continue;
    const product = data.productos.find(
      (p) => p.id === row.productoId && p.activo && p.tipo === "BIDON",
    );
    if (!product) throw new Error("Producto no disponible.");
    const stock =
      data.stockJornada.find(
        (s) => s.productoId === product.id && s.estado === "LLENO",
      )?.cantidad ?? 0;
    if (delivered > stock)
      throw new Error(
        `Stock insuficiente de ${product.nombre}: disponibles ${stock}.`,
      );
    const held =
      data.envasesClientes.find(
        (t) => t.clienteId === client.id && t.productoId === product.id,
      )?.cantidad ?? 0;
    const resulting = held + delivered - empty - damaged;
    if (resulting < 0)
      throw new Error(
        `La devolución de ${product.nombre} supera los envases del cliente.`,
      );
    const allowance =
      data.cuposAbono
        .filter((c) => abonoIds.has(c.abonoId) && c.productoId === product.id)
        .reduce((n, c) => n + c.disponibles, 0) +
      (plan
        ? data.itemsPlanesAbono
            .filter((i) => i.planId === plan.id && i.productoId === product.id)
            .reduce((n, i) => n + i.cantidad, 0)
        : 0);
    const included = Math.min(delivered, allowance),
      billed = delivered - included;
    const special = data.preciosClientes.find(
      (p) => p.clienteId === client.id && p.productoId === product.id,
    );
    let price = special?.activo ? special.precio : product.precioVenta;
    const item: DeliveryItem = {
      productoId: product.id,
      entregados: delivered,
      devueltosVacios: empty,
      devueltosDanados: damaged,
    };
    if (delivered) {
      item.precioVersion = product.version;
      if (special) item.precioClienteVersion = special.version;
      if (row.precio.trim()) {
        const override = cents(row.precio);
        if (!row.motivo.trim())
          throw new Error("Indicá el motivo del precio excepcional.");
        item.precioExcepcional = override / 100;
        item.motivoPrecio = row.motivo.trim();
        price = override / 100;
      }
    } else if (row.precio.trim())
      throw new Error(
        "El precio excepcional solo corresponde a bidones entregados.",
      );
    if (billed && price === null)
      throw new Error(`Falta configurar el precio de ${product.nombre}.`);
    const unit = delivered ? (billed ? price! : 0) : null;
    const subtotal = billed * fromAmount(unit ?? 0);
    total += subtotal;
    items.push(item);
    expected.push({
      productoId: product.id,
      incluidosAbono: included,
      precioUnitario: unit,
    });
    summary.push({
      nombre: product.nombre,
      entregados: delivered,
      vacios: empty,
      danados: damaged,
      incluidos: included,
      facturados: billed,
      subtotal: subtotal / 100,
      envases: resulting,
    });
  }
  if (!items.length && !plan)
    throw new Error("Indicá una entrega, una devolución o un abono.");
  if (!Number.isSafeInteger(total))
    throw new Error("El importe es demasiado grande.");
  return {
    items,
    expected,
    summary,
    total: total / 100,
    abono: plan
      ? { planId: plan.id, planVersion: plan.version, periodo: data.periodo }
      : undefined,
  };
}
export function payments(
  rows: { medio: string; importe: string; referencia: string }[],
) {
  const pagos = rows
    .filter((r) => r.importe.trim() && cents(r.importe) > 0)
    .map((r) => ({
      medio: r.medio,
      importe: cents(r.importe) / 100,
      ...(r.referencia.trim() ? { referencia: r.referencia.trim() } : {}),
    }));
  if (!pagos.length)
    throw new Error("Ingresá al menos un importe mayor a cero.");
  return {
    pagos,
    total: pagos.reduce((n, p) => n + fromAmount(p.importe), 0) / 100,
  };
}
