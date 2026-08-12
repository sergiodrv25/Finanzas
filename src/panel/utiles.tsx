import { useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'

// ---------------------------------------------------------------------------
// Tooltip compartido de los gráficos del panel
// ---------------------------------------------------------------------------

export interface FilaTip {
  color?: string
  texto: string
  valor?: string
}

export interface DatosTip {
  x: number
  y: number
  titulo?: string
  filas: FilaTip[]
}

export function useTooltip() {
  const [tip, setTip] = useState<DatosTip | null>(null)
  function mover(e: RPointerEvent, titulo: string | undefined, filas: FilaTip[]) {
    setTip({ x: e.clientX, y: e.clientY, titulo, filas })
  }
  function salir() {
    setTip(null)
  }
  return { tip, mover, salir }
}

export function Tooltip({ tip }: { tip: DatosTip | null }) {
  if (!tip) return null
  const left = Math.min(tip.x + 14, window.innerWidth - 240)
  const top = Math.max(tip.y - 20 - 24 * (tip.filas.length + 1), 8)
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 rounded-xl border border-borde bg-superficie-2 px-3 py-2 text-xs shadow-xl shadow-black/40"
      style={{ left, top }}
    >
      {tip.titulo && <div className="mb-1 text-tinta-3">{tip.titulo}</div>}
      {tip.filas.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          {f.color && (
            <i
              className="inline-block h-[3px] w-2.5 rounded-sm"
              style={{ background: f.color }}
            />
          )}
          <span className="text-tinta-2">{f.texto}</span>
          {f.valor && <b className="num ml-auto pl-3">{f.valor}</b>}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utilidades de agregación
// ---------------------------------------------------------------------------

import type { Gasto } from '../types'
import { esApuesta } from '../lib/categorias'

export interface MesSerie {
  mes: string // 'YYYY-MM'
  gastos: number
  ingresos: number
}

/** Agrega movimientos por mes para los meses indicados (claves 'YYYY-MM'). */
export function serieMensual(movs: Gasto[], meses: string[]): MesSerie[] {
  const mapa = new Map<string, MesSerie>(
    meses.map((m) => [m, { mes: m, gastos: 0, ingresos: 0 }]),
  )
  for (const g of movs) {
    const fila = mapa.get(g.fecha.slice(0, 7))
    if (!fila || esApuesta(g.categoria_id)) continue
    if (g.tipo === 'ingreso') fila.ingresos += g.importe
    else fila.gastos += g.importe
  }
  return meses.map((m) => mapa.get(m)!)
}

/** Gastos ordinarios: sin apuestas (las apuestas van como neto aparte). */
export function totalGastos(movs: Gasto[]): number {
  return movs
    .filter((g) => g.tipo !== 'ingreso' && !esApuesta(g.categoria_id))
    .reduce((s, g) => s + g.importe, 0)
}

/** Ingresos ordinarios: sin ganancias de apuestas. */
export function totalIngresos(movs: Gasto[]): number {
  return movs
    .filter((g) => g.tipo === 'ingreso' && !esApuesta(g.categoria_id))
    .reduce((s, g) => s + g.importe, 0)
}

/** Apostado, ganado y neto de apuestas del conjunto de movimientos. */
export function resumenApuestas(movs: Gasto[]): { apostado: number; ganado: number; neto: number } {
  let apostado = 0
  let ganado = 0
  for (const g of movs) {
    if (!esApuesta(g.categoria_id)) continue
    if (g.tipo === 'ingreso') ganado += g.importe
    else apostado += g.importe
  }
  return { apostado, ganado, neto: ganado - apostado }
}
