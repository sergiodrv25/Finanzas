import { useMemo, useState } from 'react'
import type { Categoria, Gasto } from '../types'
import { categoriaPorId } from '../lib/categorias'
import { formatearImporte, hoyISO, nombreDia } from '../lib/formato'

interface Props {
  mes: string // 'YYYY-MM'
  gastos: Gasto[]
  categorias: Categoria[]
  onSeleccionar: (gasto: Gasto) => void
}

interface DatosDia {
  gasto: number
  ingreso: number
  items: Gasto[]
}

// Intensidad del día según el gasto (sobre el acento azul)
const NIVELES = [
  'var(--color-superficie)',
  'rgba(57, 135, 229, 0.18)',
  'rgba(57, 135, 229, 0.34)',
  'rgba(57, 135, 229, 0.52)',
  'rgba(57, 135, 229, 0.74)',
]

export default function ListaGastos({ mes, gastos, categorias, onSeleccionar }: Props) {
  const [anio, numMes] = mes.split('-').map(Number)
  const dias = new Date(anio, numMes, 0).getDate()
  const offset = (new Date(anio, numMes - 1, 1).getDay() + 6) % 7 // lunes = 0

  const porDia = useMemo(() => {
    const arr: DatosDia[] = Array.from({ length: dias }, () => ({ gasto: 0, ingreso: 0, items: [] }))
    for (const g of gastos) {
      const d = Number(g.fecha.slice(8, 10)) - 1
      if (d < 0 || d >= dias || g.fecha.slice(0, 7) !== mes) continue
      arr[d].items.push(g)
      if (g.tipo === 'ingreso') arr[d].ingreso += g.importe
      else arr[d].gasto += g.importe
    }
    return arr
  }, [gastos, dias, mes])

  const maxGasto = Math.max(...porDia.map((d) => d.gasto), 1)
  const hoy = hoyISO()
  const diaHoy = hoy.slice(0, 7) === mes ? Number(hoy.slice(8, 10)) : null

  // Día abierto en la hoja inferior (null = cerrada)
  const [diaSel, setDiaSel] = useState<number | null>(null)

  if (gastos.length === 0) {
    return (
      <div className="px-5 py-16 text-center text-tinta-3">
        <p className="text-4xl" aria-hidden="true">🪙</p>
        <p className="mt-3">Todavía no hay movimientos este mes.</p>
        <p className="mt-1 text-sm">Pulsa + para añadir el primero.</p>
      </div>
    )
  }

  const seleccion = diaSel ? porDia[diaSel - 1] : null

  return (
    <section className="px-5 pb-32">
      {/* ----------------------------------------------- Calendario */}
      <div className="mt-6 grid grid-cols-7 gap-1.5">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <div key={d} className="pb-0.5 text-center text-[10px] font-medium text-tinta-3">{d}</div>
        ))}
        {Array.from({ length: offset }, (_, i) => <div key={`h${i}`} />)}
        {porDia.map((d, i) => {
          const num = i + 1
          const nivel = d.gasto === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((d.gasto / maxGasto) * 4)))
          const esHoy = diaHoy === num
          const balance = d.ingreso - d.gasto
          return (
            <button
              key={num}
              type="button"
              onClick={() => setDiaSel((prev) => (prev === num ? null : num))}
              aria-label={`Día ${num}, gasto ${formatearImporte(d.gasto)}`}
              className="relative flex aspect-[0.85] flex-col items-center justify-center rounded-xl ring-1 ring-borde/60 transition-transform active:scale-95"
              style={{ background: NIVELES[nivel] }}
            >
              {d.items.length > 0 && balance !== 0 && (
                <i
                  className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${
                    balance > 0 ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                  aria-hidden="true"
                />
              )}
              <span className={`text-[12px] leading-none ${esHoy ? 'font-bold text-acento' : 'text-tinta-2'}`}>
                {num}
              </span>
              <span className="num mt-0.5 text-[9px] leading-none text-tinta-2">
                {d.gasto > 0 ? `${Math.round(d.gasto)}€` : '·'}
              </span>
            </button>
          )
        })}
      </div>

      {/* ------------------------------------ Hoja inferior del día */}
      {diaSel !== null && seleccion && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60"
            onClick={() => setDiaSel(null)}
          />
          <div className="relative max-h-[75dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-borde bg-superficie p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borde" aria-hidden="true" />

            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">
                {nombreDia(`${mes}-${String(diaSel).padStart(2, '0')}`)}
              </h2>
              {seleccion.items.length > 0 && (
                <span className="num text-xs text-tinta-3">
                  {seleccion.gasto > 0 && `−${formatearImporte(seleccion.gasto)}`}
                  {seleccion.gasto > 0 && seleccion.ingreso > 0 && ' · '}
                  {seleccion.ingreso > 0 && `+${formatearImporte(seleccion.ingreso)}`}
                </span>
              )}
            </div>

            {seleccion.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-tinta-3">Sin movimientos este día.</p>
            ) : (
              <ul className="mt-3 overflow-hidden rounded-2xl border border-borde bg-superficie-2/40">
                {seleccion.items.map((g, idx) => {
                  const cat = categoriaPorId(categorias, g.categoria_id, g.tipo)
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => onSeleccionar(g)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-superficie-2 ${
                          idx > 0 ? 'border-t border-borde' : ''
                        }`}
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                          style={{ background: `${cat.color}26` }}
                          aria-hidden="true"
                        >
                          {cat.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{g.comercio}</span>
                          <span className="block truncate text-xs text-tinta-3">
                            {cat.nombre}
                            {g.origen === 'apple_pay' && ' ·  Apple Pay'}
                            {g.descripcion ? ` · ${g.descripcion}` : ''}
                          </span>
                        </span>
                        <span className={`num shrink-0 font-medium ${g.tipo === 'ingreso' ? 'text-emerald-400' : ''}`}>
                          {g.tipo === 'ingreso' ? '+' : '−'}
                          {formatearImporte(g.importe)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
