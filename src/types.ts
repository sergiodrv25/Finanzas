export interface Categoria {
  id: string
  nombre: string
  emoji: string
  color: string
}

export type OrigenGasto = 'manual' | 'apple_pay' | 'csv'

export interface Gasto {
  id: string
  fecha: string // ISO date (YYYY-MM-DD)
  importe: number // en euros, positivo
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
  comercio: string
  descripcion?: string | null
  categoria_id: string | null
  origen: OrigenGasto
  moneda?: string
}
