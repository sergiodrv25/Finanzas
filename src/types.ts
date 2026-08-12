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
