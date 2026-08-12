import type { Categoria, Deuda, DeudaRecurrente, Gasto, GastoNuevo, Presupuesto } from '../types'
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

/** Lista movimientos en el rango [inicio, fin) de fechas ISO (YYYY-MM-DD). */
export async function listarGastosRango(
  inicio: string,
  fin: string,
): Promise<Gasto[]> {
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

// ---------------------------------------------------------------------------
// Presupuestos mensuales por categoría (tabla `presupuestos`)
// ---------------------------------------------------------------------------

const CLAVE_PPTO = 'finanzas.presupuestos.v1'

export async function listarPresupuestos(): Promise<Presupuesto[]> {
  if (!supabase) {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_PPTO) ?? '[]') as Presupuesto[]
    } catch {
      return []
    }
  }
  const { data, error } = await supabase
    .from('presupuestos')
    .select('categoria_id, limite')
  if (error) throw new Error(error.message)
  return (data ?? []) as Presupuesto[]
}

/** Reemplaza el conjunto completo de presupuestos (son pocas filas). */
export async function guardarPresupuestos(lista: Presupuesto[]): Promise<void> {
  const limpios = lista.filter((p) => p.limite > 0)
  if (!supabase) {
    localStorage.setItem(CLAVE_PPTO, JSON.stringify(limpios))
    return
  }
  const { error: e1 } = await supabase
    .from('presupuestos')
    .delete()
    .neq('categoria_id', '')
  if (e1) throw new Error(e1.message)
  if (limpios.length > 0) {
    const { error: e2 } = await supabase.from('presupuestos').insert(limpios)
    if (e2) throw new Error(e2.message)
  }
}

// ---------------------------------------------------------------------------
// Deudas ("me deben") y deudas recurrentes
// ---------------------------------------------------------------------------

const CLAVE_DEUDAS = 'finanzas.deudas.v1'
const CLAVE_DEUDAS_REC = 'finanzas.deudasrec.v1'

function leerDeudasLocal(): Deuda[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_DEUDAS) ?? '[]') as Deuda[]
  } catch {
    return []
  }
}

function guardarDeudasLocal(deudas: Deuda[]) {
  localStorage.setItem(CLAVE_DEUDAS, JSON.stringify(deudas))
}

function leerRecurrentesLocal(): DeudaRecurrente[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_DEUDAS_REC) ?? '[]') as DeudaRecurrente[]
  } catch {
    return []
  }
}

function guardarRecurrentesLocal(lista: DeudaRecurrente[]) {
  localStorage.setItem(CLAVE_DEUDAS_REC, JSON.stringify(lista))
}

export async function listarDeudas(): Promise<Deuda[]> {
  if (!supabase) {
    return leerDeudasLocal().sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const { data, error } = await supabase
    .from('deudas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Deuda[]
}

export async function crearDeuda(nueva: {
  fecha: string
  concepto: string
  deudor?: string | null
  importe: number
}): Promise<void> {
  const fila = {
    fecha: nueva.fecha,
    concepto: nueva.concepto.trim(),
    deudor: nueva.deudor?.trim() || null,
    importe: nueva.importe,
    estado: 'pendiente' as const,
    origen: 'panel' as const,
  }
  if (!supabase) {
    const deudas = leerDeudasLocal()
    deudas.push({ ...fila, id: idAleatorio(), created_at: new Date().toISOString() })
    guardarDeudasLocal(deudas)
    return
  }
  const { error } = await supabase.from('deudas').insert(fila)
  if (error) throw new Error(error.message)
}

/**
 * Marca una deuda como cobrada y registra el ingreso correspondiente
 * (categoría "Reembolsos"), para que el balance refleje la realidad.
 */
export async function cobrarDeuda(deuda: Deuda): Promise<void> {
  const hoy = new Date()
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  await anadirGasto({
    fecha: fechaHoy,
    importe: deuda.importe,
    tipo: 'ingreso',
    comercio: deuda.deudor ? `${deuda.concepto} · ${deuda.deudor}` : deuda.concepto,
    descripcion: 'Cobro de deuda',
    categoria_id: 'reembolsos',
    origen: 'manual',
  })
  if (!supabase) {
    const deudas = leerDeudasLocal()
    const d = deudas.find((x) => x.id === deuda.id)
    if (d) {
      d.estado = 'cobrada'
      d.cobrada_at = new Date().toISOString()
      guardarDeudasLocal(deudas)
    }
    return
  }
  const { error } = await supabase
    .from('deudas')
    .update({ estado: 'cobrada', cobrada_at: new Date().toISOString() })
    .eq('id', deuda.id)
  if (error) throw new Error(error.message)
}

export async function eliminarDeuda(deudaId: string): Promise<void> {
  if (!supabase) {
    guardarDeudasLocal(leerDeudasLocal().filter((d) => d.id !== deudaId))
    return
  }
  const { error } = await supabase.from('deudas').delete().eq('id', deudaId)
  if (error) throw new Error(error.message)
}

export async function listarDeudasRecurrentes(): Promise<DeudaRecurrente[]> {
  if (!supabase) return leerRecurrentesLocal().filter((r) => r.activa)
  const { data, error } = await supabase
    .from('deudas_recurrentes')
    .select('*')
    .eq('activa', true)
    .order('id')
  if (error) throw new Error(error.message)
  return (data ?? []) as DeudaRecurrente[]
}

export async function crearDeudaRecurrente(nueva: {
  concepto: string
  deudor?: string | null
  importe: number
  dia: number
}): Promise<void> {
  const fila = {
    concepto: nueva.concepto.trim(),
    deudor: nueva.deudor?.trim() || null,
    importe: nueva.importe,
    dia: Math.min(Math.max(Math.round(nueva.dia), 1), 28),
    activa: true,
  }
  if (!supabase) {
    const lista = leerRecurrentesLocal()
    const id = lista.reduce((m, r) => Math.max(m, r.id), 0) + 1
    lista.push({ ...fila, id })
    guardarRecurrentesLocal(lista)
    return
  }
  const { error } = await supabase.from('deudas_recurrentes').insert(fila)
  if (error) throw new Error(error.message)
}

export async function eliminarDeudaRecurrente(id: number): Promise<void> {
  if (!supabase) {
    guardarRecurrentesLocal(leerRecurrentesLocal().filter((r) => r.id !== id))
    return
  }
  // Desactivar (no borrar) para conservar el historial de deudas generadas
  const { error } = await supabase
    .from('deudas_recurrentes')
    .update({ activa: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Genera las deudas del mes para cada recurrente activa (si no existen ya).
 * Se llama al abrir el panel: idempotente gracias al índice único
 * (recurrente_id, mes).
 */
export async function generarDeudasRecurrentes(mes: string): Promise<void> {
  const recurrentes = await listarDeudasRecurrentes()
  if (recurrentes.length === 0) return
  const filas = recurrentes.map((r) => ({
    fecha: `${mes}-${String(r.dia).padStart(2, '0')}`,
    concepto: r.concepto,
    deudor: r.deudor ?? null,
    importe: r.importe,
    estado: 'pendiente' as const,
    origen: 'recurrente' as const,
    recurrente_id: r.id,
    mes,
  }))
  if (!supabase) {
    const deudas = leerDeudasLocal()
    for (const f of filas) {
      if (!deudas.some((d) => d.recurrente_id === f.recurrente_id && d.mes === mes)) {
        deudas.push({ ...f, id: idAleatorio(), created_at: new Date().toISOString() })
      }
    }
    guardarDeudasLocal(deudas)
    return
  }
  const { error } = await supabase
    .from('deudas')
    .upsert(filas, { onConflict: 'recurrente_id,mes', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}
