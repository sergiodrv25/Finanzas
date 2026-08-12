export type TipoMovimiento = 'gasto' | 'ingreso'

export interface Categoria {
  id: string
  nombre: string
  emoji: string
  color: string
  /** Ausente en datos antiguos: se interpreta como 'gasto'. */
  tipo?: TipoMovimiento
}

export type OrigenGasto = 'manual' | 'apple_pay' | 'csv'

export interface Gasto {
  id: string
  fecha: string // ISO date (YYYY-MM-DD)
  importe: number // en euros, positivo
  tipo: TipoMovimiento
  comercio: string
  descripcion?: string | null
  categoria_id: string | null
  origen: OrigenGasto
  moneda: string
  created_at: string
}

export interface GastoNuevo {
  fecha: string
  importe: number
  tipo?: TipoMovimiento // por defecto 'gasto'
  comercio: string
  descripcion?: string | null
  categoria_id: string | null
  origen: OrigenGasto
  moneda?: string
}

export interface Presupuesto {
  categoria_id: string
  limite: number // en euros, > 0
}

export type EstadoDeuda = 'pendiente' | 'cobrada'
export type OrigenDeuda = 'atajo' | 'panel' | 'recurrente'

export interface Deuda {
  id: string
  fecha: string // ISO date
  concepto: string
  deudor?: string | null
  importe: number
  estado: EstadoDeuda
  origen: OrigenDeuda
  gasto_id?: string | null
  recurrente_id?: number | null
  mes?: string | null // 'YYYY-MM' si viene de una recurrente
  created_at: string
  cobrada_at?: string | null
}

export interface DeudaRecurrente {
  id: number
  concepto: string
  deudor?: string | null
  importe: number
  dia: number // 1-28
  activa: boolean
}
