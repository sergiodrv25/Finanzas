import type { Categoria, Gasto, GastoNuevo } from '../types'
import { CATEGORIAS_DEFECTO } from './categorias'
import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Capa de datos con dos implementaciones:
//  - Supabase (si VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están definidas)
//  - Local (localStorage) para usar la app sin backend o probarla en desarrollo
// ---------------------------------------------------------------------------

const CLAVE_LOCAL = 'finanzas.gastos.v1'

function leerLocal(): Gasto[] {
  try {
    const raw = localStorage.getItem(CLAVE_LOCAL)
    const gastos = raw ? (JSON.parse(raw) as Gasto[]) : []
    // Datos guardados antes de existir el campo tipo -> son gastos
    return gastos.map((g) => ({ ...g, tipo: g.tipo ?? 'gasto' }))
  } catch {
    return []
  }
}

function guardarLocal(gastos: Gasto[]) {
  localStorage.setItem(CLAVE_LOCAL, JSON.stringify(gastos))
}

function idAleatorio(): string {
  return crypto.randomUUID()
}

/** Rango [inicio, fin) de un mes dado como 'YYYY-MM'. */
function rangoMes(mes: string): { inicio: string; fin: string } {
  const [a, m] = mes.split('-').map(Number)
  const inicio = `${mes}-01`
  const siguiente = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`
  return { inicio, fin: `${siguiente}-01` }
}

export async function listarCategorias(): Promise<Categoria[]> {
  if (!supabase) return CATEGORIAS_DEFECTO
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre, emoji, color, tipo')
    .order('nombre')
  if (error || !data || data.length === 0) return CATEGORIAS_DEFECTO
  return data as Categoria[]
}

export async function listarGastosDelMes(mes: string): Promise<Gasto[]> {
  const { inicio, fin } = rangoMes(mes)
  if (!supabase) {
    return leerLocal()
      .filter((g) => g.fecha >= inicio && g.fecha < fin)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.created_at.localeCompare(a.created_at)))
  }
  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .gte('fecha', inicio)
    .lt('fecha', fin)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Gasto[]
}

export async function totalDelMes(mes: string): Promise<number> {
  const gastos = await listarGastosDelMes(mes)
  return gastos.reduce((suma, g) => suma + g.importe, 0)
}

export async function anadirGasto(nuevo: GastoNuevo): Promise<Gasto> {
  const gasto: Gasto = {
    id: idAleatorio(),
    fecha: nuevo.fecha,
    importe: nuevo.importe,
    tipo: nuevo.tipo ?? 'gasto',
    comercio: nuevo.comercio.trim(),
    descripcion: nuevo.descripcion?.trim() || null,
    categoria_id: nuevo.categoria_id,
    origen: nuevo.origen,
    moneda: nuevo.moneda ?? 'EUR',
    created_at: new Date().toISOString(),
  }
  if (!supabase) {
    const gastos = leerLocal()
    gastos.push(gasto)
    guardarLocal(gastos)
    return gasto
  }
  const { data, error } = await supabase
    .from('gastos')
    .insert({
      fecha: gasto.fecha,
      importe: gasto.importe,
      tipo: gasto.tipo,
      comercio: gasto.comercio,
      descripcion: gasto.descripcion,
      categoria_id: gasto.categoria_id,
      origen: gasto.origen,
      moneda: gasto.moneda,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Gasto
}

export async function actualizarCategoria(
  gastoId: string,
  categoriaId: string,
): Promise<void> {
  if (!supabase) {
    const gastos = leerLocal()
    const g = gastos.find((x) => x.id === gastoId)
    if (g) {
      g.categoria_id = categoriaId
      guardarLocal(gastos)
    }
    return
  }
  const { error } = await supabase
    .from('gastos')
    .update({ categoria_id: categoriaId })
    .eq('id', gastoId)
  if (error) throw new Error(error.message)
}

export async function eliminarGasto(gastoId: string): Promise<void> {
  if (!supabase) {
    guardarLocal(leerLocal().filter((g) => g.id !== gastoId))
    return
  }
  const { error } = await supabase.from('gastos').delete().eq('id', gastoId)
  if (error) throw new Error(error.message)
}
