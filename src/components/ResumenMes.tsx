import type { Categoria, Gasto } from '../types'
import { categoriaPorId, esApuesta } from '../lib/categorias'
import { formatearImporte } from '../lib/formato'
// Iconos de trazo compartidos con el panel de escritorio (sin emojis)
import Icono, { ICONO_CAT } from '../panel/iconos'

interface Props {
  gastos: Gasto[]
  categorias: Categoria[]
}

interface FilaCategoria {
  categoria: Categoria
  total: number
}

/** Tasa de ahorro legible: acotada para que un mes sin ingresos no muestre −7945 %. */
function textoAhorro(balance: number, ingresos: number): string {
  if (ingresos <= 0) return '—'
  const tasa = (balance / ingresos) * 100
  if (tasa < -100 || tasa > 999) return '—'
  return `${Math.round(tasa)} %`
}

export default function ResumenMes({ gastos, categorias }: Props) {
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
    <section className="px-5 pt-2">
      <p className="micro">Gastos del mes</p>
      <p className="num mt-1.5 text-[44px] leading-none font-semibold tracking-[-0.035em]">
        {formatearImporte(totalGastos)}
      </p>

      {(apostado > 0 || ganado > 0) && (
        <p className="mt-3.5 rounded-2xl border border-borde bg-superficie px-4 py-3 text-[13.5px] leading-relaxed text-tinta-2">
          Apuestas: apostado <b className="num text-tinta">{formatearImporte(apostado)}</b> · ganado{' '}
          <b className="num text-tinta">{formatearImporte(ganado)}</b> · neto{' '}
          <b
            className={`num text-[15px] ${
              netoApuestas > 0 ? 'text-verde' : netoApuestas < 0 ? 'text-rojo' : ''
            }`}
          >
            {netoApuestas >= 0 ? '+' : '−'}
            {formatearImporte(Math.abs(netoApuestas))}
          </b>
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 border-y border-linea py-3">
        <div className="pr-3">
          <dt className="text-[11px] text-tinta-3">Ingresos</dt>
          <dd className="num mt-0.5 text-[15px] font-medium text-verde">
            +{formatearImporte(totalIngresos)}
          </dd>
        </div>
        <div className="pr-3">
          <dt className="text-[11px] text-tinta-3">Balance</dt>
          <dd
            className={`num mt-0.5 text-[15px] font-medium ${balance >= 0 ? 'text-verde' : 'text-rojo'}`}
          >
            {balance >= 0 ? '+' : '−'}
            {formatearImporte(Math.abs(balance))}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-tinta-3">Ahorro</dt>
          <dd className="num mt-0.5 text-[15px] font-medium text-tinta-2">
            {textoAhorro(balance, totalIngresos)}
          </dd>
        </div>
      </dl>

      {filas.length > 0 && (
        <>
          <p className="micro mt-5">Por categoría</p>
          <ul className="mt-3">
            {filas.map(({ categoria, total: t }) => (
              <li key={categoria.id} className="flex items-center gap-3 py-2">
                <span style={{ color: categoria.color }} className="flex">
                  <Icono id={ICONO_CAT[categoria.id] ?? 'caja'} tam={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13.5px] text-tinta-2">{categoria.nombre}</span>
                    <span className="num shrink-0 text-[13.5px] font-medium">
                      {formatearImporte(t)}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-[3px] w-full overflow-hidden rounded-full bg-linea">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${maximo > 0 ? Math.max((t / maximo) * 100, 2) : 0}%`,
                        background: categoria.color,
                      }}
                    />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
