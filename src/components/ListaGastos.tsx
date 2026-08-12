import type { Categoria, Gasto } from '../types'
import { categoriaPorId } from '../lib/categorias'
import { formatearImporte, nombreDia } from '../lib/formato'

interface Props {
  gastos: Gasto[]
  categorias: Categoria[]
  onSeleccionar: (gasto: Gasto) => void
}

export default function ListaGastos({ gastos, categorias, onSeleccionar }: Props) {
  if (gastos.length === 0) {
    return (
      <div className="px-5 py-16 text-center text-tinta-3">
        <p className="text-4xl" aria-hidden="true">🪙</p>
        <p className="mt-3">Todavía no hay movimientos este mes.</p>
        <p className="mt-1 text-sm">Pulsa + para añadir el primero.</p>
      </div>
    )
  }

  // Agrupar por día (los gastos ya llegan ordenados por fecha descendente)
  const grupos: { fecha: string; items: Gasto[] }[] = []
  for (const g of gastos) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.fecha === g.fecha) ultimo.items.push(g)
    else grupos.push({ fecha: g.fecha, items: [g] })
  }

  return (
    <section className="px-5 pb-32">
      {grupos.map((grupo) => (
        <div key={grupo.fecha} className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-tinta-2">
              {nombreDia(grupo.fecha)}
            </h2>
            <span className="num text-xs text-tinta-3">
              {(() => {
                const neto = grupo.items.reduce(
                  (s, g) => s + (g.tipo === 'ingreso' ? g.importe : -g.importe),
                  0,
                )
                return `${neto > 0 ? '+' : neto < 0 ? '−' : ''}${formatearImporte(Math.abs(neto))}`
              })()}
            </span>
          </div>
          <ul className="mt-2 overflow-hidden rounded-2xl border border-borde bg-superficie">
            {grupo.items.map((g, i) => {
              const cat = categoriaPorId(categorias, g.categoria_id, g.tipo)
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => onSeleccionar(g)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-superficie-2 ${
                      i > 0 ? 'border-t border-borde' : ''
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
                    <span
                      className={`num shrink-0 font-medium ${
                        g.tipo === 'ingreso' ? 'text-emerald-400' : ''
                      }`}
                    >
                      {g.tipo === 'ingreso' ? '+' : '−'}
                      {formatearImporte(g.importe)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
