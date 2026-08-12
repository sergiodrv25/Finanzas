import { useMemo, useState } from 'react'
import type { Categoria, Gasto, Presupuesto } from '../types'
import { categoriaPorId, tipoDeCategoria } from '../lib/categorias'
import { formatearImporte, sumarMeses } from '../lib/formato'
import Icono, { ICONO_CAT } from './iconos'
import { colorCategoria } from './paleta'

// ---------------------------------------------------------------------------
// Suscripciones detectadas (cargos recurrentes)
// ---------------------------------------------------------------------------

interface Suscripcion {
  nombre: string
  importe: number
  proxima: string // 'YYYY-MM-DD' estimada
  meses: number
}

export function detectarSuscripciones(movs: Gasto[]): Suscripcion[] {
  const grupos = new Map<string, Gasto[]>()
  for (const g of movs) {
    if (g.tipo === 'ingreso') continue
    const clave = g.comercio.trim().toLowerCase()
    if (!clave) continue
    const lista = grupos.get(clave)
    if (lista) lista.push(g)
    else grupos.set(clave, [g])
  }
  const res: Suscripcion[] = []
  for (const items of grupos.values()) {
    const meses = [...new Set(items.map((g) => g.fecha.slice(0, 7)))].sort()
    if (meses.length < 2) continue
    // importe estable (variación < 15 %)
    const imps = items.map((i) => i.importe)
    const media = imps.reduce((a, b) => a + b, 0) / imps.length
    if (media <= 0 || (Math.max(...imps) - Math.min(...imps)) / media > 0.15) continue
    // al menos dos meses consecutivos
    let consecutivos = false
    for (let i = 1; i < meses.length; i++) {
      if (sumarMeses(meses[i - 1], 1) === meses[i]) { consecutivos = true; break }
    }
    if (!consecutivos) continue
    const ultimo = items.reduce((a, b) => (a.fecha > b.fecha ? a : b))
    const dia = Math.min(Number(ultimo.fecha.slice(8, 10)), 28)
    const proxima = `${sumarMeses(ultimo.fecha.slice(0, 7), 1)}-${String(dia).padStart(2, '0')}`
    res.push({ nombre: ultimo.comercio, importe: ultimo.importe, proxima, meses: meses.length })
  }
  return res.sort((a, b) => b.importe - a.importe)
}

function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${Number(d)} ${meses[Number(m) - 1]}`
}

export function Suscripciones({ movs12m }: { movs12m: Gasto[] }) {
  const lista = useMemo(() => detectarSuscripciones(movs12m), [movs12m])
  const total = lista.reduce((s, x) => s + x.importe, 0)
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <h2 className="text-sm font-semibold">Suscripciones detectadas</h2>
      <p className="mb-2 text-xs text-tinta-3">Cargos recurrentes de importe estable (últimos 12 meses)</p>
      {lista.length === 0 && (
        <p className="py-6 text-center text-sm text-tinta-3">
          Aún no hay recurrencias claras: se detectan cuando un mismo comercio se repite dos meses seguidos con importe similar.
        </p>
      )}
      {lista.map((s) => (
        <div key={s.nombre} className="flex items-center gap-2.5 border-b border-borde py-2 last:border-b-0">
          <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-superficie-2 text-tinta-2">
            <Icono id="repetir" tam={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{s.nombre}</p>
            <p className="text-[11.5px] text-tinta-3">
              {s.meses} meses seguidos · próximo: {fechaCorta(s.proxima)}
            </p>
          </div>
          <span className="num text-[13px] font-semibold">{formatearImporte(s.importe)}</span>
        </div>
      ))}
      {lista.length > 0 && (
        <div className="mt-2.5 flex justify-between border-t border-borde pt-2.5 text-[13px] text-tinta-2">
          <span>Total recurrente</span>
          <b className="num text-tinta">{formatearImporte(total)} / mes</b>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Presupuestos mensuales (medidores + edición)
// ---------------------------------------------------------------------------

interface PptoProps {
  categorias: Categoria[]
  presupuestos: Presupuesto[]
  gastoMes: Map<string, number> // gasto del mes actual por categoria_id
  diasRestantes: number
  onGuardar: (lista: Presupuesto[]) => Promise<void>
}

export function Presupuestos({ categorias, presupuestos, gastoMes, diasRestantes, onGuardar }: PptoProps) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catsGasto = categorias.filter((c) => tipoDeCategoria(c) === 'gasto')

  function empezarEdicion() {
    const inicial: Record<string, string> = {}
    for (const p of presupuestos) inicial[p.categoria_id] = String(p.limite)
    setBorrador(inicial)
    setError(null)
    setEditando(true)
  }

  async function guardar() {
    if (guardando) return
    setGuardando(true)
    setError(null)
    try {
      const lista: Presupuesto[] = Object.entries(borrador)
        .map(([categoria_id, v]) => ({ categoria_id, limite: Number(String(v).replace(',', '.')) }))
        .filter((p) => isFinite(p.limite) && p.limite > 0)
      await onGuardar(lista)
      setEditando(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Presupuestos</h2>
          <p className="mb-3 text-xs text-tinta-3">Límite mensual por categoría</p>
        </div>
        {!editando ? (
          <button
            type="button"
            onClick={empezarEdicion}
            className="rounded-lg border border-borde px-2.5 py-1 text-xs text-tinta-2 hover:bg-superficie-2"
          >
            Editar
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-lg border border-borde px-2.5 py-1 text-xs text-tinta-2 hover:bg-superficie-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => void guardar()}
              className="rounded-lg bg-acento px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-rojo">{error}</p>}

      {!editando ? (
        <>
          {presupuestos.length === 0 && (
            <p className="py-6 text-center text-sm text-tinta-3">
              Sin presupuestos todavía. Pulsa «Editar» para fijar límites mensuales.
            </p>
          )}
          {presupuestos.map((p) => {
            const cat = categoriaPorId(categorias, p.categoria_id)
            const gastado = gastoMes.get(p.categoria_id) ?? 0
            const pct = (gastado / p.limite) * 100
            const estado = pct >= 100 ? 'mal' : pct >= 75 ? 'warn' : 'ok'
            const pista = estado === 'mal' ? '#401b1b' : estado === 'warn' ? '#3d2f10' : '#16324f'
            const relleno = estado === 'mal' ? 'var(--color-rojo)' : estado === 'warn' ? 'var(--color-ambar)' : 'var(--color-acento)'
            return (
              <div key={p.categoria_id} className="mb-3.5 last:mb-0">
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="flex items-center gap-1.5 text-tinta-2">
                    <Icono id={ICONO_CAT[cat.id] ?? 'caja'} tam={14} className="text-tinta-3" />
                    {cat.nombre}
                  </span>
                  <span className="num text-tinta-2">
                    <b className="font-semibold text-tinta">{formatearImporte(gastado)}</b> / {formatearImporte(p.limite)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: pista }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: relleno }} />
                </div>
                <p className={`mt-1 text-[11px] ${estado === 'mal' ? 'text-rojo' : 'text-tinta-3'}`}>
                  {estado === 'mal'
                    ? `Superado en ${formatearImporte(gastado - p.limite)} (${Math.round(pct)} %)`
                    : `${Math.round(pct)} % consumido · quedan ${diasRestantes} días`}
                </p>
              </div>
            )
          })}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {catsGasto.map((c) => (
            <label key={c.id} className="flex items-center justify-between gap-2 text-[13px] text-tinta-2">
              <span className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                <Icono id={ICONO_CAT[c.id] ?? 'caja'} tam={14} className="text-tinta-3" />
                {c.nombre}
              </span>
              <input
                inputMode="decimal"
                placeholder="—"
                value={borrador[c.id] ?? ''}
                onChange={(e) => setBorrador((b) => ({ ...b, [c.id]: e.target.value }))}
                className="num w-20 rounded-lg border border-borde bg-superficie-2 px-2 py-1 text-right text-[13px] outline-none focus:border-acento"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabla de movimientos
// ---------------------------------------------------------------------------

const POR_PAGINA = 15

type Orden = 'fecha' | 'importe-desc' | 'importe-asc'

interface TablaProps {
  movs: Gasto[]
  categorias: Categoria[]
}

export function TablaMovimientos({ movs, categorias }: TablaProps) {
  const [busqueda, setBusqueda] = useState('')
  const [catFiltro, setCatFiltro] = useState('todas')
  const [orden, setOrden] = useState<Orden>('fecha')
  const [pagina, setPagina] = useState(1)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    let lista = movs.filter((g) => {
      if (catFiltro !== 'todas' && (g.categoria_id ?? (g.tipo === 'ingreso' ? 'otros_ingresos' : 'otros')) !== catFiltro) return false
      if (q && !g.comercio.toLowerCase().includes(q) && !(g.descripcion ?? '').toLowerCase().includes(q)) return false
      return true
    })
    if (orden === 'importe-desc') lista = [...lista].sort((a, b) => b.importe - a.importe)
    else if (orden === 'importe-asc') lista = [...lista].sort((a, b) => a.importe - b.importe)
    return lista
  }, [movs, busqueda, catFiltro, orden])

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, paginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  function exportarCSV() {
    const cab = 'fecha;tipo;comercio;categoria;origen;importe;descripcion'
    const filas = filtrados.map((g) => {
      const cat = categoriaPorId(categorias, g.categoria_id, g.tipo)
      const campos = [g.fecha, g.tipo, g.comercio, cat.nombre, g.origen, String(g.importe).replace('.', ','), g.descripcion ?? '']
      return campos.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';')
    })
    const blob = new Blob(['﻿' + [cab, ...filas].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'movimientos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function fechaCortaTabla(iso: string): string {
    const [, m, d] = iso.split('-')
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${Number(d)} ${meses[Number(m) - 1]}`
  }

  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5" id="movimientos">
      <h2 className="text-sm font-semibold">Movimientos</h2>
      <p className="mb-3 text-xs text-tinta-3">{filtrados.length} registros en el período seleccionado</p>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Buscar comercio o nota…"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
          className="max-w-64 flex-1 rounded-lg border border-borde bg-superficie-2 px-2.5 py-1.5 !text-[12.5px] text-tinta outline-none placeholder:text-tinta-3 focus:border-acento"
        />
        <select
          value={catFiltro}
          onChange={(e) => { setCatFiltro(e.target.value); setPagina(1) }}
          className="rounded-lg border border-borde bg-superficie-2 px-2.5 py-1.5 !text-[12.5px] text-tinta-2 outline-none"
        >
          <option value="todas">Categoría: todas</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as Orden)}
          className="rounded-lg border border-borde bg-superficie-2 px-2.5 py-1.5 !text-[12.5px] text-tinta-2 outline-none"
        >
          <option value="fecha">Ordenar: fecha ↓</option>
          <option value="importe-desc">Importe ↓</option>
          <option value="importe-asc">Importe ↑</option>
        </select>
        <button
          type="button"
          onClick={exportarCSV}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 !text-[12.5px] text-tinta-2 hover:bg-superficie-2"
        >
          <Icono id="descarga" tam={13} /> Exportar CSV
        </button>
      </div>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {['Fecha', 'Comercio / concepto', 'Categoría', 'Origen', 'Importe'].map((h, i) => (
              <th key={h} className={`border-b border-borde px-2.5 py-2 text-[11px] font-semibold tracking-wider text-tinta-3 uppercase ${i === 4 ? 'text-right' : 'text-left'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibles.map((g) => {
            const cat = categoriaPorId(categorias, g.categoria_id, g.tipo)
            const esIngreso = g.tipo === 'ingreso'
            return (
              <tr key={g.id} className="hover:bg-white/[0.025]">
                <td className="border-b border-borde px-2.5 py-2 whitespace-nowrap text-tinta-3">{fechaCortaTabla(g.fecha)}</td>
                <td className="border-b border-borde px-2.5 py-2 font-medium">
                  {g.comercio}
                  {g.descripcion && <span className="ml-2 text-xs text-tinta-3">{g.descripcion}</span>}
                </td>
                <td className="border-b border-borde px-2.5 py-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs text-tinta-2">
                    <i className="inline-block h-2 w-2 flex-none rounded-full" style={{ background: colorCategoria(cat.id, cat.color) }} />
                    {cat.nombre}
                  </span>
                </td>
                <td className="border-b border-borde px-2.5 py-2 text-[11.5px] text-tinta-3">
                  {g.origen === 'apple_pay' ? 'Apple Pay' : g.origen === 'csv' ? 'CSV' : 'Manual'}
                </td>
                <td className={`num border-b border-borde px-2.5 py-2 text-right font-semibold ${esIngreso ? 'text-verde' : ''}`}>
                  {esIngreso ? '+' : '−'}{formatearImporte(g.importe)}
                </td>
              </tr>
            )
          })}
          {visibles.length === 0 && (
            <tr><td colSpan={5} className="py-8 text-center text-tinta-3">Sin resultados con los filtros actuales.</td></tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between pt-3 text-xs text-tinta-3">
        <span>
          Mostrando {visibles.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1}–{(paginaActual - 1) * POR_PAGINA + visibles.length} de {filtrados.length}
        </span>
        {paginas > 1 && (
          <span className="flex gap-1">
            <button type="button" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)} className="rounded-lg border border-borde bg-superficie-2 px-2.5 py-1 text-tinta-2 disabled:opacity-30">‹</button>
            <span className="px-2 py-1">{paginaActual} / {paginas}</span>
            <button type="button" disabled={paginaActual === paginas} onClick={() => setPagina(paginaActual + 1)} className="rounded-lg border border-borde bg-superficie-2 px-2.5 py-1 text-tinta-2 disabled:opacity-30">›</button>
          </span>
        )}
      </div>
    </div>
  )
}
