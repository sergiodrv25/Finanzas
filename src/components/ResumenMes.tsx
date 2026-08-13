import { useState } from 'react'
import type { Categoria, Gasto } from '../types'
import { categoriaPorId, esApuesta } from '../lib/categorias'
import { formatearImporte } from '../lib/formato'

interface Props {
  gastos: Gasto[]
  categorias: Categoria[]
}

interface FilaCategoria {
  categoria: Categoria
  total: number
}

const TOP_CATEGORIAS = 5

export default function ResumenMes({ gastos, categorias }: Props) {
  const [verTodas, setVerTodas] = useState(false)
  // Las apuestas van aparte: no son consumo ni ingreso ordinario
  const soloGastos = gastos.filter((g) => g.tipo !== 'ingreso' && !esApuesta(g.categoria_id))
  const soloIngresos = gastos.filter((g) => g.tipo === 'ingreso' && !esApuesta(g.categoria_id))
  const apostado = gastos
    .filter((g) => g.tipo !== 'ingreso' && esApuesta(g.categoria_id))
    .reduce((s, g) => s + g.importe, 0)
  const ganado = gastos
    .filter((g) => g.tipo === 'ingreso' && esApuesta(g.categoria_id))
    .reduce((s, g) => s + g.importe, 0)
  const netoApuestas = ganado - apostado

  const totalGastos = soloGastos.reduce((s, g) => s + g.importe, 0)
  const totalIngresos = soloIngresos.reduce((s, g) => s + g.importe, 0)
  const balance = totalIngresos - totalGastos + netoApuestas
  const tasaAhorro = totalIngresos > 0 ? (balance / totalIngresos) * 100 : null

  const porCategoria = new Map<string, number>()
  for (const g of soloGastos) {
    const cat = categoriaPorId(categorias, g.categoria_id)
    porCategoria.set(cat.id, (porCategoria.get(cat.id) ?? 0) + g.importe)
  }
  const filas: FilaCategoria[] = [...porCategoria.entries()]
    .map(([id, t]) => ({ categoria: categoriaPorId(categorias, id), total: t }))
    .sort((a, b) => b.total - a.total)
  const maximo = filas[0]?.total ?? 0

  return (
    <section className="px-5">
      <p className="text-sm text-tinta-2">Gastos del mes</p>
      <p className="num mt-1 text-5xl font-semibold tracking-tight">
        {formatearImporte(totalGastos)}
      </p>

      {(apostado > 0 || ganado > 0) && (
        <p className="mt-3 rounded-xl border border-borde bg-superficie px-4 py-2 text-xs text-tinta-2">
          <span aria-hidden="true">🎲</span> Apuestas: apostado{' '}
          <b className="num text-tinta">{formatearImporte(apostado)}</b> · ganado{' '}
          <b className="num text-tinta">{formatearImporte(ganado)}</b> · neto{' '}
          <b className={`num ${netoApuestas > 0 ? 'text-emerald-400' : netoApuestas < 0 ? 'text-red-400' : ''}`}>
            {netoApuestas >= 0 ? '+' : '−'}{formatearImporte(Math.abs(netoApuestas))}
          </b>
        </p>
      )}

      {totalIngresos > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl border border-borde bg-superficie px-4 py-3">
          <div>
            <p className="text-xs text-tinta-3">Ingresos</p>
            <p className="num mt-0.5 text-sm font-medium text-emerald-400">
              +{formatearImporte(totalIngresos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-tinta-3">Balance</p>
            <p
              className={`num mt-0.5 text-sm font-medium ${
                balance >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {balance >= 0 ? '+' : '−'}
              {formatearImporte(Math.abs(balance))}
            </p>
          </div>
          <div>
            <p className="text-xs text-tinta-3">Ahorro</p>
            <p
              className={`num mt-0.5 text-sm font-medium ${
                balance >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {tasaAhorro === null ? '—' : `${Math.round(tasaAhorro)} %`}
            </p>
          </div>
        </div>
      )}

      {filas.length > 0 && (
        <div className="mt-6 space-y-3">
          {(verTodas ? filas : filas.slice(0, TOP_CATEGORIAS)).map(({ categoria, total: t }) => (
            <div key={categoria.id}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-tinta-2">
                  <span aria-hidden="true">{categoria.emoji}</span>{' '}
                  {categoria.nombre}
                </span>
                <span className="num text-tinta">{formatearImporte(t)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-superficie-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${maximo > 0 ? Math.max((t / maximo) * 100, 3) : 0}%`,
                    background: categoria.color,
                  }}
                />
              </div>
            </div>
          ))}
          {filas.length > TOP_CATEGORIAS && (
            <button
              type="button"
              onClick={() => setVerTodas((v) => !v)}
              className="w-full pt-1 text-center text-xs font-medium text-tinta-3 active:text-tinta-2"
            >
              {verTodas
                ? 'Ver menos'
                : `Ver las ${filas.length - TOP_CATEGORIAS} restantes`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
