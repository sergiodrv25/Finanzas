import { useMemo } from 'react'
import type { Gasto } from '../types'
import { esApuesta } from '../lib/categorias'
import { formatearImporte, nombreMes } from '../lib/formato'
import Icono from './iconos'
import { Tooltip, useTooltip } from './utiles'

const VERDE = 'var(--color-verde)'
const ROJO = 'var(--color-rojo)'

function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${Number(d)} ${meses[Number(m) - 1]}`
}

interface Props {
  /** Movimientos de apuestas del período seleccionado (ya filtrados). */
  periodo: Gasto[]
  /** Todos los movimientos de los últimos 12 meses (para evolución y acumulado). */
  movs12m: Gasto[]
  /** Claves 'YYYY-MM' de los últimos 12 meses, en orden. */
  meses12: string[]
  etiquetaPeriodo: string
}

export function Apuestas({ periodo, movs12m, meses12, etiquetaPeriodo }: Props) {
  const { tip, mover, salir } = useTooltip()

  const apostado = periodo.filter((g) => g.tipo !== 'ingreso').reduce((s, g) => s + g.importe, 0)
  const ganado = periodo.filter((g) => g.tipo === 'ingreso').reduce((s, g) => s + g.importe, 0)
  const neto = ganado - apostado
  const numApuestas = periodo.filter((g) => g.tipo !== 'ingreso').length
  const retorno = apostado > 0 ? (ganado / apostado) * 100 : null

  const apuestas12m = useMemo(() => movs12m.filter((g) => esApuesta(g.categoria_id)), [movs12m])

  const netoPorMes = useMemo(() => {
    const mapa = new Map<string, number>(meses12.map((m) => [m, 0]))
    for (const g of apuestas12m) {
      const clave = g.fecha.slice(0, 7)
      if (!mapa.has(clave)) continue
      mapa.set(clave, (mapa.get(clave) ?? 0) + (g.tipo === 'ingreso' ? g.importe : -g.importe))
    }
    return meses12.map((m) => ({ mes: m, neto: mapa.get(m) ?? 0 }))
  }, [apuestas12m, meses12])

  const acumulado12m = netoPorMes.reduce((s, m) => s + m.neto, 0)
  const maxAbs = Math.max(...netoPorMes.map((m) => Math.abs(m.neto)), 1)

  const colorNeto = (v: number) => (v > 0 ? 'text-verde' : v < 0 ? 'text-rojo' : 'text-tinta')
  const signo = (v: number) => (v >= 0 ? '+' : '−')

  return (
    <div className="mb-3 rounded-2xl border border-borde bg-superficie p-5" id="apuestas">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icono id="dado" tam={15} className="text-tinta-3" /> Apuestas
          </h2>
          <p className="text-xs text-tinta-3">{etiquetaPeriodo} · fuera de gastos e ingresos, incluido en el balance</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-tinta-3">Neto del período</p>
          <p className={`num text-xl font-semibold ${colorNeto(neto)}`}>
            {signo(neto)}{formatearImporte(Math.abs(neto))}
          </p>
        </div>
      </div>

      {periodo.length === 0 && apuestas12m.length === 0 ? (
        <p className="py-6 text-center text-sm text-tinta-3">
          Sin apuestas registradas. Se apuntan con la categoría Apuestas: gasto al apostar, ingreso (+) al cobrar.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
          {/* -------------------------------- Cifras + evolución */}
          <div>
            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-borde bg-superficie-2/40 px-3.5 py-2.5">
                <p className="text-[11.5px] text-tinta-3">Apostado</p>
                <p className="num text-[17px] font-semibold">{formatearImporte(apostado)}</p>
                <p className="text-[11px] text-tinta-3">{numApuestas} {numApuestas === 1 ? 'apuesta' : 'apuestas'}</p>
              </div>
              <div className="rounded-xl border border-borde bg-superficie-2/40 px-3.5 py-2.5">
                <p className="text-[11.5px] text-tinta-3">Ganado</p>
                <p className="num text-[17px] font-semibold">{formatearImporte(ganado)}</p>
                <p className="text-[11px] text-tinta-3">cobros de apuestas</p>
              </div>
              <div className="rounded-xl border border-borde bg-superficie-2/40 px-3.5 py-2.5">
                <p className="text-[11.5px] text-tinta-3">Retorno</p>
                <p className={`num text-[17px] font-semibold ${retorno !== null && retorno < 100 ? 'text-rojo' : retorno !== null ? 'text-verde' : ''}`}>
                  {retorno === null ? '—' : `${Math.round(retorno)} %`}
                </p>
                <p className="text-[11px] text-tinta-3">ganado / apostado</p>
              </div>
              <div className="rounded-xl border border-borde bg-superficie-2/40 px-3.5 py-2.5">
                <p className="text-[11.5px] text-tinta-3">Acumulado 12 meses</p>
                <p className={`num text-[17px] font-semibold ${colorNeto(acumulado12m)}`}>
                  {signo(acumulado12m)}{formatearImporte(Math.abs(acumulado12m))}
                </p>
                <p className="text-[11px] text-tinta-3">neto histórico</p>
              </div>
            </div>

            <p className="mb-1.5 text-xs text-tinta-3">Neto por mes (últimos 12)</p>
            <div className="relative flex h-[110px] items-stretch gap-1">
              {/* línea de cero */}
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-borde" />
              {netoPorMes.map((m) => (
                <div
                  key={m.mes}
                  className="relative flex-1 rounded hover:bg-white/[0.04]"
                  onPointerMove={(e) =>
                    mover(e, nombreMes(m.mes), [
                      { color: m.neto >= 0 ? VERDE : ROJO, texto: 'Neto', valor: `${signo(m.neto)}${formatearImporte(Math.abs(m.neto))}` },
                    ])
                  }
                  onPointerLeave={salir}
                >
                  {m.neto !== 0 && (
                    <div
                      className="absolute right-[15%] left-[15%] rounded-[3px]"
                      style={
                        m.neto > 0
                          ? { bottom: '50%', height: `${(m.neto / maxAbs) * 46}%`, background: VERDE }
                          : { top: '50%', height: `${(-m.neto / maxAbs) * 46}%`, background: ROJO }
                      }
                    />
                  )}
                  <span className="absolute inset-x-0 -bottom-4 text-center text-[9.5px] text-tinta-3">
                    {nombreMes(m.mes).slice(0, 1)}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-4" />
          </div>

          {/* -------------------------------- Listado del período */}
          <div>
            <p className="mb-1 text-xs text-tinta-3">Movimientos de apuestas del período</p>
            {periodo.length === 0 && (
              <p className="py-6 text-center text-sm text-tinta-3">Sin apuestas en el período seleccionado.</p>
            )}
            <div className="max-h-[290px] overflow-y-auto pr-1">
              {periodo.map((g) => {
                const esCobro = g.tipo === 'ingreso'
                return (
                  <div key={g.id} className="flex items-center gap-2.5 border-b border-borde py-2 text-[13px] last:border-b-0">
                    <span
                      className="inline-block h-2 w-2 flex-none rounded-full"
                      style={{ background: esCobro ? VERDE : ROJO }}
                      aria-hidden="true"
                    />
                    <span className="w-12 flex-none text-tinta-3">{fechaCorta(g.fecha)}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{g.comercio}</span>
                    <span className="flex-none text-[11px] text-tinta-3">{esCobro ? 'cobro' : 'apuesta'}</span>
                    <span className={`num flex-none font-semibold ${esCobro ? 'text-verde' : 'text-rojo'}`}>
                      {esCobro ? '+' : '−'}{formatearImporte(g.importe)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}
