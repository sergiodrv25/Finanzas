import type { Categoria } from '../types'

// Categorías por defecto. En Supabase se crean con el script schema.sql;
// en modo local se usan directamente estas.
// Colores: paleta categórica validada para modo oscuro (contraste >= 3:1
// sobre la superficie de la app y separación segura para daltonismo).
export const CATEGORIAS_DEFECTO: Categoria[] = [
  { id: 'supermercado', nombre: 'Supermercado', emoji: '🛒', color: '#199e70', tipo: 'gasto' },
  { id: 'restaurantes', nombre: 'Restaurantes', emoji: '🍽️', color: '#d95926', tipo: 'gasto' },
  { id: 'transporte', nombre: 'Transporte', emoji: '🚇', color: '#3987e5', tipo: 'gasto' },
  { id: 'hogar', nombre: 'Hogar', emoji: '🏠', color: '#9085e9', tipo: 'gasto' },
  { id: 'suscripciones', nombre: 'Suscripciones', emoji: '🔁', color: '#d55181', tipo: 'gasto' },
  { id: 'ocio', nombre: 'Ocio', emoji: '🎬', color: '#c98500', tipo: 'gasto' },
  { id: 'salud', nombre: 'Salud', emoji: '💊', color: '#e66767', tipo: 'gasto' },
  { id: 'viajes', nombre: 'Viajes', emoji: '✈️', color: '#008300', tipo: 'gasto' },
  { id: 'apuestas_gasto', nombre: 'Apuestas', emoji: '🎰', color: '#c9a227', tipo: 'gasto' },
  { id: 'otros', nombre: 'Otros', emoji: '📦', color: '#898781', tipo: 'gasto' },
  { id: 'nomina', nombre: 'Nómina', emoji: '💼', color: '#14a5a5', tipo: 'ingreso' },
  { id: 'apuestas', nombre: 'Apuestas', emoji: '🎲', color: '#c9a227', tipo: 'ingreso' },
  { id: 'inversiones', nombre: 'Inversiones', emoji: '📈', color: '#5aa64c', tipo: 'ingreso' },
  { id: 'otros_ingresos', nombre: 'Otros ingresos', emoji: '💰', color: '#8a8f98', tipo: 'ingreso' },
  { id: 'reembolsos', nombre: 'Reembolsos', emoji: '🤝', color: '#8b93a8', tipo: 'ingreso' },
]

/** Tipo efectivo de una categoría (datos antiguos sin campo tipo = gasto). */
export function tipoDeCategoria(c: Categoria): 'gasto' | 'ingreso' {
  return c.tipo === 'ingreso' ? 'ingreso' : 'gasto'
}

export function categoriaPorId(
  categorias: Categoria[],
  id: string | null,
  tipo: 'gasto' | 'ingreso' = 'gasto',
): Categoria {
  const idPorDefecto = tipo === 'ingreso' ? 'otros_ingresos' : 'otros'
  return (
    categorias.find((c) => c.id === id) ??
    categorias.find((c) => c.id === idPorDefecto) ?? {
      id: 'otros',
      nombre: 'Otros',
      emoji: '📦',
      color: '#898781',
    }
  )
}
