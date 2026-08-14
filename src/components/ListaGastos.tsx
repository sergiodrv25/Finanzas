import { useEffect, useMemo, useState } from 'react'
import type { Categoria, Gasto } from '../types'
import { categoriaPorId, esApuesta } from '../lib/categorias'
import { formatearImporte, hoyISO, nombreDia } from '../lib/formato'
// Iconos de trazo compartidos con el panel de escritorio (sin emojis)
import Icono, { ICONO_CAT } from '../panel/iconos'

interface Props {
  mes: string // 'YYYY-MM'
  gastos: Gasto[]
  categorias: Categoria[]
  onSeleccionar: (gasto: Gasto) => void
  /** Alta manual: ya no hay botón +, se ofrece aquí y con pulsación larga en el mes. */
  onAnadir?: () => void
}

interface DatosDia {
  gasto: number
  ingreso: number
  items: Gasto[]
}

interface Grupo {
  clave: string
  cat: Categoria
  items: Gasto[]
  /** ingresos − gastos del grupo */
  neto: number
  apostado: number
  ganado: number
}

// Intensidad del día según el gasto (sobre el acento azul)
const NIVELES = [
  'transparent',
  'rgba(57, 135, 229, 0.14)',
  'rgba(57, 135, 229, 0.28)',
  'rgba(57, 135, 229, 0.46)',
  'rgba(57, 135, 229, 0.68)',
]

/** Importe con signo explícito: −12,30 € / +1.500,00 € */
function conSigno(v: number): string {
  return (v < 0 ? '−' : '+') + formatearImporte(Math.abs(v))
}

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 text-tinta-3 transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function ListaGastos({ mes, gastos, categorias, onSeleccionar, onAnadir }: Props) {
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

  // Día por defecto: hoy si tiene movimientos; si no, el último con actividad
  const diaDefecto = useMemo(() => {
    if (diaHoy !== null && porDia[diaHoy - 1]?.items.length) return diaHoy
    for (let i = dias - 1; i >= 0; i--) {
      if (porDia[i].items.length) return i + 1
    }
    return diaHoy
  }, [porDia, diaHoy, dias])

  const [diaSel, setDiaSel] = useState<number | null>(null)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  // Al cambiar de mes, volver al día por defecto y plegar los grupos
  useEffect(() => {
    setDiaSel(null)
    setAbiertos(new Set())
  }, [mes])

  const diaActivo = diaSel ?? diaDefecto
  const seleccion = diaActivo !== null ? porDia[diaActivo - 1] : null

  // Movimientos del día agrupados por categoría (las apuestas, juntas)
  const grupos = useMemo(() => {
    if (!seleccion) return []
    const mapa = new Map<string, Grupo>()
    for (const g of seleccion.items) {
      const cat = categoriaPorId(categorias, g.categoria_id, g.tipo)
      const clave = esApuesta(g.categoria_id) ? 'apuestas' : cat.id
      let grupo = mapa.get(clave)
      if (!grupo) {
        grupo = { clave, cat, items: [], neto: 0, apostado: 0, ganado: 0 }
        mapa.set(clave, grupo)
      }
      grupo.items.push(g)
      if (g.tipo === 'ingreso') {
        grupo.neto += g.importe
        grupo.ganado += g.importe
      } else {
        grupo.neto -= g.importe
        grupo.apostado += g.importe
      }
      // En el grupo de apuestas, quedarse con la categoría de gasto
      if (clave === 'apuestas' && g.tipo === 'gasto') grupo.cat = cat
    }
    return [...mapa.values()].sort((a, b) => a.neto - b.neto)
  }, [seleccion, categorias])

  if (gastos.length === 0) {
    return (
      <div className="px-5 py-20 text-center">
        <p className="text-sm text-tinta-2">Todavía no hay movimientos este mes.</p>
        {onAnadir && (
          <button
            type="button"
            onClick={onAnadir}
            className="mt-4 rounded-full border border-borde px-4 py-2 text-[13px] text-tinta-2 active:bg-superficie-2"
          >
            Añadir a mano
          </button>
        )}
      </div>
    )
  }

  const netoDia = seleccion ? seleccion.ingreso - seleccion.gasto : 0
  const fechaActiva = diaActivo !== null ? `${mes}-${String(diaActivo).padStart(2, '0')}` : null

  function alternarGrupo(clave: string) {
    setAbiertos((prev) => {
      const sig = new Set(prev)
      if (sig.has(clave)) sig.delete(clave)
      else sig.add(clave)
      return sig
    })
  }

  return (
    <section className="pb-16">
      {/* ------------------------------------ Calendario compacto */}
      <div className="mt-5 grid grid-cols-7 gap-1 border-t border-linea px-5 pt-5">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <div
            key={d}
            className="pb-1.5 text-center text-[10px] font-medium tracking-[0.08em] text-tinta-3"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`h${i}`} />
        ))}
        {porDia.map((d, i) => {
          const num = i + 1
          const nivel =
            d.gasto === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((d.gasto / maxGasto) * 4)))
          const esHoy = diaHoy === num
          const balance = d.ingreso - d.gasto
          const esActivo = diaActivo === num
          return (
            <button
              key={num}
              type="button"
              onClick={() => setDiaSel(num)}
              aria-label={`Día ${num}, gasto ${formatearImporte(d.gasto)}`}
              aria-pressed={esActivo}
              className={`relative flex aspect-[1.15] items-center justify-center rounded-[10px] transition-transform active:scale-90 ${
                esActivo ? 'ring-1 ring-acento' : ''
              }`}
              style={{ background: NIVELES[nivel] }}
            >
              {d.items.length > 0 && balance !== 0 && (
                <i
                  className={`absolute top-1 right-1 h-1 w-1 rounded-full ${
                    balance > 0 ? 'bg-verde' : 'bg-rojo/70'
                  }`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`text-[12px] leading-none ${
                  esHoy
                    ? 'font-semibold text-acento'
                    : nivel === 0
                      ? 'text-tinta-3'
                      : 'text-tinta-2'
                }`}
              >
                {num}
              </span>
            </button>
          )
        })}
      </div>

      {/* ------------------------------------ Día seleccionado */}
      {fechaActiva && seleccion && (
        <div className="mt-6 px-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">{nombreDia(fechaActiva)}</h2>
            {seleccion.items.length > 0 && (
              <span
                className={`num text-[15px] font-semibold ${
                  netoDia > 0 ? 'text-verde' : netoDia < 0 ? 'text-tinta' : 'text-tinta-2'
                }`}
              >
                {conSigno(netoDia)}
              </span>
            )}
          </div>

          {seleccion.items.length > 0 && (
            <p className="mt-1 text-[11px] text-tinta-3">
              {seleccion.gasto > 0 && (
                <>
                  Gastos <span className="num">−{formatearImporte(seleccion.gasto)}</span>
                </>
              )}
              {seleccion.gasto > 0 && seleccion.ingreso > 0 && <span> · </span>}
              {seleccion.ingreso > 0 && (
                <>
                  Ingresos{' '}
                  <span className="num text-verde">+{formatearImporte(seleccion.ingreso)}</span>
                </>
              )}
            </p>
          )}

          {/* ------------------------------ Lista agrupada por categoría */}
          {seleccion.items.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-tinta-3">Sin movimientos este día.</p>
          ) : (
            <ul className="mt-2.5">
              {grupos.map((grupo) => {
                const varios = grupo.items.length > 1
                const abierto = abiertos.has(grupo.clave)
                const unico = grupo.items[0]
                const subtitulo = !varios
                  ? `${unico.comercio}${unico.origen === 'apple_pay' ? ' ·  Apple Pay' : ''}${unico.descripcion ? ` · ${unico.descripcion}` : ''}`
                  : grupo.clave === 'apuestas'
                    ? `${grupo.items.filter((g) => g.tipo === 'gasto').length} apuestas · −${Math.round(grupo.apostado)}€ +${Math.round(grupo.ganado)}€`
                    : `${grupo.items.length} movimientos`
                return (
                  <li key={grupo.clave} className="border-t border-linea">
                    <button
                      type="button"
                      onClick={() => (varios ? alternarGrupo(grupo.clave) : onSeleccionar(unico))}
                      aria-expanded={varios ? abierto : undefined}
                      className="flex w-full items-center gap-3 py-3 text-left active:bg-superficie-2/60"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${grupo.cat.color}1f`, color: grupo.cat.color }}
                      >
                        <Icono id={ICONO_CAT[grupo.cat.id] ?? 'caja'} tam={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">
                          {grupo.cat.nombre}
                        </span>
                        <span className="num block truncate text-[11px] text-tinta-3">
                          {subtitulo}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`num text-[14px] font-medium ${grupo.neto > 0 ? 'text-verde' : ''}`}
                        >
                          {conSigno(grupo.neto)}
                        </span>
                        {varios && <Chevron abierto={abierto} />}
                      </span>
                    </button>

                    {varios && abierto && (
                      <ul className="pb-2">
                        {grupo.items.map((g) => (
                          <li key={g.id}>
                            <button
                              type="button"
                              onClick={() => onSeleccionar(g)}
                              className="flex w-full items-center gap-3 py-2 pl-12 text-left active:bg-superficie-2/60"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] text-tinta-2">
                                  {g.comercio}
                                </span>
                                {(g.origen === 'apple_pay' || g.descripcion) && (
                                  <span className="block truncate text-[11px] text-tinta-3">
                                    {g.origen === 'apple_pay' ? ' Apple Pay' : ''}
                                    {g.origen === 'apple_pay' && g.descripcion ? ' · ' : ''}
                                    {g.descripcion ?? ''}
                                  </span>
                                )}
                              </span>
                              <span
                                className={`num shrink-0 text-[13px] ${g.tipo === 'ingreso' ? 'text-verde' : 'text-tinta-2'}`}
                              >
                                {g.tipo === 'ingreso' ? '+' : '−'}
                                {formatearImporte(g.importe)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
