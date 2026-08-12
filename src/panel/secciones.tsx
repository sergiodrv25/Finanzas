import type { Categoria, Gasto } from '../types'
import { categoriaPorId } from '../lib/categorias'
import { formatearImporte, nombreMes } from '../lib/formato'
import Icono, { ICONO_CAT } from './iconos'
import { colorCategoria, RAMPA_CALENDARIO, SERIE_GASTOS, SERIE_INGRESOS } from './paleta'
import { Tooltip, useTooltip, totalGastos, totalIngresos } from './utiles'
import type { MesSerie } from './utiles'

const nf = new Intl.NumberFormat('es-ES')

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

function Sparkline({ valores, colorFinal }: { valores: number[]; colorFinal: string }) {
  if (valores.length < 2) return null
  const max = Math.max(...valores, 1)
  const paso = 68 / (valores.length - 1)
  const puntos = valores.map((v, i) => `${(i * paso).toFixed(1)},${(22 - (v / max) * 16).toFixed(1)}`)
  const [ux, uy] = puntos[puntos.length - 1].split(',')
  return (
    <svg width="72" height="26" viewBox="0 0 72 26" aria-hidden="true" className="absolute right-4 bottom-3.5">
      <polyline points={puntos.join(' ')} fill="none" stroke="#4a4a52" strokeWidth="2" strokeLinecap="round" />
      <circle cx={ux} cy={uy} r="3" fill={colorFinal} stroke="var(--color-superficie)" strokeWidth="2" />
    </svg>
  )
}

function Delta({ pct, malSiSube, sufijo = ' %' }: { pct: number | null; malSiSube: boolean; sufijo?: string }) {
  if (pct === null) return <span className="text-tinta-3">—</span>
  if (Math.round(pct) === 0) return <b className="text-tinta-3">=</b>
  const sube = pct > 0
  const mal = sube === malSiSube
  return (
    <b className={mal ? 'text-rojo' : 'text-verde'}>
      {sube ? '▲' : '▼'} {Math.abs(Math.round(pct))}{sufijo}
    </b>
  )
}

interface KpisProps {
  periodo: Gasto[]
  previo: Gasto[] | null // período anterior equivalente (null = sin comparación)
  etiquetaComparacion: string
  serie: MesSerie[] // últimos 12 meses, para las minitendencias
}

export function Kpis({ periodo, previo, etiquetaComparacion, serie }: KpisProps) {
  const gastos = totalGastos(periodo)
  const ingresos = totalIngresos(periodo)
  const balance = ingresos - gastos
  const tasa = ingresos > 0 ? (balance / ingresos) * 100 : null

  const gastosPrev = previo ? totalGastos(previo) : null
  const ingresosPrev = previo ? totalIngresos(previo) : null
  const pct = (actual: number, prev: number | null) =>
    prev === null || prev === 0 ? null : ((actual - prev) / prev) * 100

  const tasaPrev =
    ingresosPrev !== null && ingresosPrev > 0 && gastosPrev !== null
      ? ((ingresosPrev - gastosPrev) / ingresosPrev) * 100
      : null

  return (
    <div className="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div className="relative rounded-2xl border border-borde bg-superficie px-4.5 py-4">
        <p className="text-[12.5px] text-tinta-2">Gastos del período</p>
        <p className="num mt-0.5 text-[27px] font-semibold tracking-tight">{formatearImporte(gastos)}</p>
        <p className="mt-0.5 text-xs text-tinta-3">
          <Delta pct={pct(gastos, gastosPrev)} malSiSube={true} /> {etiquetaComparacion}
        </p>
        <Sparkline valores={serie.map((m) => m.gastos)} colorFinal={SERIE_GASTOS} />
      </div>
      <div className="relative rounded-2xl border border-borde bg-superficie px-4.5 py-4">
        <p className="text-[12.5px] text-tinta-2">Ingresos del período</p>
        <p className="num mt-0.5 text-[27px] font-semibold tracking-tight">{formatearImporte(ingresos)}</p>
        <p className="mt-0.5 text-xs text-tinta-3">
          <Delta pct={pct(ingresos, ingresosPrev)} malSiSube={false} /> {etiquetaComparacion}
        </p>
        <Sparkline valores={serie.map((m) => m.ingresos)} colorFinal={SERIE_INGRESOS} />
      </div>
      <div className="rounded-2xl border border-borde bg-superficie px-4.5 py-4">
        <p className="text-[12.5px] text-tinta-2">Balance</p>
        <p className={`num mt-0.5 text-[27px] font-semibold tracking-tight ${balance >= 0 ? 'text-verde' : 'text-rojo'}`}>
          {balance >= 0 ? '+' : '−'}{formatearImporte(Math.abs(balance))}
        </p>
        <p className="mt-0.5 text-xs text-tinta-3">ingresos − gastos</p>
      </div>
      <div className="rounded-2xl border border-borde bg-superficie px-4.5 py-4">
        <p className="text-[12.5px] text-tinta-2">Tasa de ahorro</p>
        <p className="num mt-0.5 text-[27px] font-semibold tracking-tight">
          {tasa === null ? '—' : `${Math.round(tasa)} %`}
        </p>
        <p className="mt-0.5 text-xs text-tinta-3">
          {tasa === null ? 'sin ingresos en el período' : <><Delta pct={tasaPrev === null || tasa === null ? null : tasa - tasaPrev} malSiSube={false} sufijo=" pts" /> {etiquetaComparacion}</>}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Evolución mensual (columnas agrupadas ingresos/gastos)
// ---------------------------------------------------------------------------

export function Evolucion({ serie }: { serie: MesSerie[] }) {
  const { tip, mover, salir } = useTooltip()
  const max = Math.max(...serie.map((m) => Math.max(m.gastos, m.ingresos)), 1)
  const techo = Math.max(500, Math.ceil(max / 500) * 500)
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => techo * f)

  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <h2 className="text-sm font-semibold">Evolución mensual</h2>
      <p className="mb-3 text-xs text-tinta-3">Ingresos frente a gastos</p>
      <div className="mb-2.5 flex gap-4 text-xs text-tinta-2">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-[-1px]" style={{ background: SERIE_INGRESOS }} />Ingresos</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-[-1px]" style={{ background: SERIE_GASTOS }} />Gastos</span>
      </div>
      <div className="grid grid-cols-[40px_1fr] gap-1.5">
        <div className="num flex flex-col justify-between pb-[22px] text-right text-[10.5px] text-tinta-3">
          {ticks.map((t) => <span key={t}>{nf.format(t)}</span>)}
        </div>
        <div className="relative h-[190px]">
          <div className="absolute inset-x-0 top-0 bottom-[22px] flex flex-col justify-between">
            {ticks.map((t) => <i key={t} className="h-0 border-t border-borde" />)}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-[22px] flex">
            {serie.map((m, idx) => (
              <div
                key={m.mes}
                className="relative flex flex-1 items-end justify-center gap-1 rounded-lg hover:bg-white/[0.03]"
                onPointerMove={(e) =>
                  mover(e, nombreMes(m.mes), [
                    { color: SERIE_INGRESOS, texto: 'Ingresos', valor: formatearImporte(m.ingresos) },
                    { color: SERIE_GASTOS, texto: 'Gastos', valor: formatearImporte(m.gastos) },
                    { texto: 'Balance', valor: formatearImporte(m.ingresos - m.gastos) },
                  ])
                }
                onPointerLeave={salir}
              >
                <div className="w-5 rounded-t" style={{ height: `${(m.ingresos / techo) * 100}%`, background: SERIE_INGRESOS }} />
                <div className="w-5 rounded-t" style={{ height: `${(m.gastos / techo) * 100}%`, background: SERIE_GASTOS }} />
                {idx === serie.length - 1 && (
                  <>
                    <span className="num absolute -translate-x-1/2 text-[10.5px] whitespace-nowrap text-tinta-2" style={{ left: 'calc(50% - 12px)', bottom: `calc(${(m.ingresos / techo) * 100}% + 2px)` }}>
                      {nf.format(Math.round(m.ingresos))}
                    </span>
                    <span className="num absolute -translate-x-1/2 text-[10.5px] whitespace-nowrap text-tinta-2" style={{ left: 'calc(50% + 13px)', bottom: `calc(${(m.gastos / techo) * 100}% - 14px)` }}>
                      {nf.format(Math.round(m.gastos))}
                    </span>
                  </>
                )}
                <span className="absolute inset-x-0 -bottom-[22px] text-center text-[11px] text-tinta-3">
                  {nombreMes(m.mes).slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Tooltip tip={tip} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gasto por categoría (barras horizontales con variación)
// ---------------------------------------------------------------------------

interface CatProps {
  periodo: Gasto[]
  previo: Gasto[] | null
  categorias: Categoria[]
}

export function GastoPorCategoria({ periodo, previo, categorias }: CatProps) {
  const { tip, mover, salir } = useTooltip()

  function porCategoria(movs: Gasto[]): Map<string, number> {
    const mapa = new Map<string, number>()
    for (const g of movs) {
      if (g.tipo === 'ingreso') continue
      const cat = categoriaPorId(categorias, g.categoria_id)
      mapa.set(cat.id, (mapa.get(cat.id) ?? 0) + g.importe)
    }
    return mapa
  }

  const actual = porCategoria(periodo)
  const anterior = previo ? porCategoria(previo) : null
  const filas = [...actual.entries()]
    .map(([id, total]) => ({ categoria: categoriaPorId(categorias, id), total }))
    .sort((a, b) => b.total - a.total)
  const maximo = filas[0]?.total ?? 0

  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <h2 className="text-sm font-semibold">Gasto por categoría</h2>
      <p className="mb-3 text-xs text-tinta-3">
        {anterior ? 'Variación frente al período anterior' : 'Total del período'}
      </p>
      {filas.length === 0 && <p className="py-6 text-center text-sm text-tinta-3">Sin gastos en el período.</p>}
      {filas.map(({ categoria, total }) => {
        const prev = anterior?.get(categoria.id) ?? null
        const dPct = prev === null || prev === 0 ? null : ((total - prev) / prev) * 100
        return (
          <div
            key={categoria.id}
            className="grid grid-cols-[150px_1fr_120px] items-center gap-3 py-[5px]"
            onPointerMove={(e) => mover(e, undefined, [{ color: colorCategoria(categoria.id, categoria.color), texto: categoria.nombre, valor: formatearImporte(total) }])}
            onPointerLeave={salir}
          >
            <div className="flex items-center gap-2 overflow-hidden text-[13px] whitespace-nowrap text-tinta-2">
              <Icono id={ICONO_CAT[categoria.id] ?? 'caja'} tam={15} className="text-tinta-3" />
              {categoria.nombre}
            </div>
            <div className="h-3.5 overflow-hidden rounded-md bg-superficie-2">
              <div
                className="h-full rounded"
                style={{ width: `${maximo > 0 ? Math.max((total / maximo) * 100, 3) : 0}%`, background: colorCategoria(categoria.id, categoria.color) }}
              />
            </div>
            <div className="num flex items-baseline justify-end gap-2">
              <span className="text-[13px] font-semibold">{formatearImporte(total)}</span>
              <span className={`w-11 text-right text-[11px] ${dPct === null ? 'text-tinta-3' : Math.round(dPct) === 0 ? 'text-tinta-3' : dPct > 0 ? 'text-rojo' : 'text-verde'}`}>
                {dPct === null ? '' : Math.round(dPct) === 0 ? '=' : `${dPct > 0 ? '▲' : '▼'}${Math.abs(Math.round(dPct))} %`}
              </span>
            </div>
          </div>
        )
      })}
      <Tooltip tip={tip} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calendario de gasto (heatmap del mes actual)
// ---------------------------------------------------------------------------

export function Calendario({ mes, movs }: { mes: string; movs: Gasto[] }) {
  const { tip, mover, salir } = useTooltip()
  const [a, m] = mes.split('-').map(Number)
  const dias = new Date(a, m, 0).getDate()
  const offset = (new Date(a, m - 1, 1).getDay() + 6) % 7 // lunes = 0

  const porDia = new Array<number>(dias).fill(0)
  for (const g of movs) {
    if (g.tipo === 'ingreso' || g.fecha.slice(0, 7) !== mes) continue
    porDia[Number(g.fecha.slice(8, 10)) - 1] += g.importe
  }
  const max = Math.max(...porDia, 1)

  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <h2 className="text-sm font-semibold">Calendario de gasto</h2>
      <p className="mb-3 text-xs text-tinta-3">Cuánto gastaste cada día de {nombreMes(mes).toLowerCase()}</p>
      <div className="grid grid-cols-7 gap-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <div key={d} className="pb-0.5 text-center text-[10px] text-tinta-3">{d}</div>
        ))}
        {Array.from({ length: offset }, (_, i) => <div key={`h${i}`} />)}
        {porDia.map((gasto, i) => {
          const nivel = gasto === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((gasto / max) * 4)))
          return (
            <div
              key={i}
              className="relative aspect-[1.5] rounded-[5px] hover:outline-2 hover:outline-offset-1 hover:outline-tinta-3"
              style={{ background: RAMPA_CALENDARIO[nivel] }}
              onPointerMove={(e) => mover(e, `${i + 1} de ${nombreMes(mes).toLowerCase()}`, [{ color: 'var(--color-acento)', texto: 'Gasto', valor: formatearImporte(gasto) }])}
              onPointerLeave={salir}
            >
              <span className="absolute top-0.5 left-1 text-[9px] text-tinta-3">{i + 1}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-tinta-3">
        Menos {RAMPA_CALENDARIO.map((c) => <i key={c} className="inline-block h-2 w-4 rounded-sm" style={{ background: c }} />)} Más
      </div>
      <Tooltip tip={tip} />
    </div>
  )
}
