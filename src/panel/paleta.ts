// Paleta del panel (v2) — tonos apagados validados para contraste y
// daltonismo sobre el fondo oscuro. El color sigue a la entidad (categoría).
export const COLOR_CAT: Record<string, string> = {
  transporte: '#3d92e8',
  restaurantes: '#e0663d',
  supermercado: '#1da186',
  ocio: '#bb8b2e',
  suscripciones: '#d65e8c',
  viajes: '#63a52e',
  hogar: '#7d7cec',
  salud: '#26a3ba',
  otros: '#8b93a8',
  nomina: '#26a3ba',
  apuestas: '#bb8b2e',
  inversiones: '#63a52e',
  otros_ingresos: '#8b93a8',
}

export const SERIE_INGRESOS = '#1da186'
export const SERIE_GASTOS = '#7d7cec'

/** Rampa secuencial (azul) para el calendario de gasto. */
export const RAMPA_CALENDARIO = ['#17171f', '#16324f', '#1d4a75', '#2a67a6', '#3d92e8']

export function colorCategoria(id: string | null, respaldo = '#8b93a8'): string {
  return (id && COLOR_CAT[id]) || respaldo
}
