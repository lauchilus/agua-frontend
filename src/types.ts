export interface User {
  username: string;
  roles: string[];
}
export interface Cliente {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  observaciones: string | null;
  activo: boolean;
  saldo: number;
  tieneAbonoRegistrado: boolean;
}
export interface Producto {
  tipo: string;
  id: string;
  codigo: string;
  nombre: string;
  precioVenta: number | null;
  activo: boolean;
  version: number;
}
export interface Tenencia {
  clienteId: string;
  productoId: string;
  cantidad: number;
}
export interface Snapshot {
  versionFormato: number;
  generadoEn: string;
  zonaHoraria: string;
  periodo: string;
  jornada: {
    id: string;
    fecha: string;
    estado: string;
    efectivoInicial: number;
  };
  stockJornada: { productoId: string; estado: string; cantidad: number }[];
  productos: Producto[];
  clientes: Cliente[];
  envasesClientes: Tenencia[];
  maquinasClientes: Tenencia[];
  abonosClientes: {
    id: string;
    clienteId: string;
    planId: string;
    planNombre: string;
    periodo: string;
    importe: number;
  }[];
  cuposAbono: {
    abonoId: string;
    productoId: string;
    incluidos: number;
    consumidos: number;
    disponibles: number;
  }[];
  planesAbono: {
    id: string;
    nombre: string;
    precio: number;
    activo: boolean;
    version: number;
  }[];
  itemsPlanesAbono: { planId: string; productoId: string; cantidad: number }[];
  preciosClientes: {
    clienteId: string;
    productoId: string;
    precio: number;
    activo: boolean;
    version: number;
  }[];
}
export interface Caja {
  estado: string;
  efectivoInicial: number;
  totalCobrado: number;
  totalGastado: number;
  efectivoEsperado: number;
  ingresosEfectivo: number;
  ingresosTransferencia: number;
  ingresosMercadoPago: number;
}

export interface JornadaOpcion {
  id: string;
  fecha: string;
  estado: string;
  camionetaNombre: string;
  patente: string;
  repartidorNombre: string;
}
export interface PaginaJornadas {
  contenido: JornadaOpcion[];
  pagina: number;
  tamanio: number;
  hayMas: boolean;
}

export interface OpeningOptions {
  camionetas: {
    id: string;
    nombre: string;
    patente: string;
    ocupada: boolean;
  }[];
  repartidores: { id: string; nombre: string; ocupado: boolean }[];
  efectivoInicialSugerido: number;
}
export interface FactoryStock {
  productoId: string;
  codigo: string;
  nombre: string;
  estado: string;
  cantidad: number;
}
