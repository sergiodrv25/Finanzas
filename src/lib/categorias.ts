import type { Categoria } from '../types'

// Categorías por defecto. En Supabase se crean con el script schema.sql;
// en modo local se usan directamente estas.
// Colores: paleta categórica validada para modo oscuro (contraste >= 3:1
// sobre la superficie de la app y separación segura para daltonismo).
export const CATEGORIAS_DEFECTO: Categoria[] = [
  { id: 'supermercado', nombre: 'Supermercado', emoji: '🛒', color: '#199e70' },
  { id: 'restaurantes', nombre: 'Restaurantes', emoji: '🍽️', color: '#d95926' },
  { id: 'transporte', nombre: 'Transporte', emoji: '🚇', color: '#3987e5' },
  { id: 'hogar', nombre: 'Hogar', emoji: '🏠', color: '#9085e9' },
  { id: 'suscripciones', nombre: 'Suscripciones', emoji: '🔁', color: '#d55181' },
  { id: 'ocio', nombre: 'Ocio', emoji: '🎬', color: '#c98500' },
  { id: 'salud', nombre: 'Salud', emoji: '💊', color: '#e66767' },
  { id: 'viajes', nombre: 'Viajes', emoji: '✈️', color: '#008300' },
  { id: 'otros', nombre: 'Otros', emoji: '📦', color: '#898781' },
]

export function categoriaPorId(
  categorias: Categoria[],
  id: string | null,
): Categoria {
  return (
    categorias.find((c) => c.id === id) ??
    categorias.find((c) => c.id === 'otros') ?? {
      id: 'otros',
      nombre: 'Otros',
      emoji: '📦',
      color: '#898781',
    }
  )
}
