import { useEffect, useMemo, useState } from 'react'
import type { Categoria, Gasto } from '../types'
import { categoriaPorId, esApuesta } from '../lib/categorias'
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
  'var(--color-superficie)',
  'rgba(57, 135, 229, 0.18)',
  'rgba(57, 135, 229, 0.34)',
  'rgba(57, 135, 229, 0.52)',
  'rgba(57, 135, 229, 0.74)',
]

/** Importe con signo explícito: −12,30 € / +1.500,00 € */
function conSigno(v: number): string {
  return (v < 0 ? '−' : '+') + formatearImporte(Math.abs(v))
}

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
      // En el grupo de apuestas, mostrar siempre el emoji de gasto 🎰
      if (clave === 'apuestas' && g.tipo === 'gasto') grupo.cat = cat
    }
    return [...mapa.values()].sort((a, b) => a.neto - b.neto)
  }, [seleccion, categorias])

  if (gastos.length === 0) {
    return (
      <div className="px-5 py-16 text-center text-tinta-3">
        <p className="text-4xl" aria-hidden="true">🪙</p>
        <p className="mt-3">Todavía no hay movimientos este mes.</p>
        <p className="mt-1 text-sm">Pulsa + para añadir el primero.</p>
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
    <section className="px-5 pb-32">
      {/* ------------------------------------ Calendario compacto */}
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
          const esActivo = diaActivo === num
          return (
            <button
              key={num}
              type="button"
              onClick={() => setDiaSel(num)}
              aria-label={`Día ${num}, gasto ${formatearImporte(d.gasto)}`}
              aria-pressed={esActivo}
              className={`relative flex aspect-[1.25] items-center justify-center rounded-xl transition-transform active:scale-95 ${
                esActivo ? 'ring-2 ring-acento' : 'ring-1 ring-borde/60'
              }`}
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
            </button>
          )
        })}
      </div>

      {/* ------------------------------------ Cabecera del día */}
      {fechaActiva && seleccion && (
        <>
          <div className="mt-6 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">{nombreDia(fechaActiva)}</h2>
            {seleccion.items.length > 0 && (
              <span className={`num text-base font-bold ${netoDia > 0 ? 'text-verde' : ''}`}>
                {conSigno(netoDia)}
              </span>
            )}
          </div>
          {seleccion.items.length > 0 && (
            <div className="mt-2 flex gap-2">
              {seleccion.gasto > 0 && (
                <span className="num rounded-lg bg-superficie-2 px-2.5 py-1 text-xs text-tinta-2">
                  Gastos −{formatearImporte(seleccion.gasto)}
                </span>
              )}
              {seleccion.ingreso > 0 && (
                <span className="num rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-400">
                  Ingresos +{formatearImporte(seleccion.ingreso)}
                </span>
              )}
            </div>
          )}

          {/* ------------------------------ Lista agrupada por categoría */}
          {seleccion.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-tinta-3">Sin movimientos este día.</p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-2xl border border-borde bg-superficie-2/40">
              {grupos.map((grupo, idx) => {
                const varios = grupo.items.length > 1
                const abierto = abiertos.has(grupo.clave)
                const unico = grupo.items[0]
                const subtitulo = !varios
                  ? `${unico.comercio}${unico.origen === 'apple_pay' ? ' ·  Apple Pay' : ''}${unico.descripcion ? ` · ${unico.descripcion}` : ''}`
                  : grupo.clave === 'apuestas'
                    ? `${grupo.items.filter((g) => g.tipo === 'gasto').length} apuestas · −${Math.round(grupo.apostado)}€ +${Math.round(grupo.ganado)}€`
                    : `${grupo.items.length} movimientos`
                return (
                  <li key={grupo.clave} className={idx > 0 ? 'border-t border-borde' : ''}>
                    <button
                      type="button"
                      onClick={() => (varios ? alternarGrupo(grupo.clave) : onSeleccionar(unico))}
                      aria-expanded={varios ? abierto : undefined}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-superficie-2"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                        style={{ background: `${grupo.cat.color}26` }}
                        aria-hidden="true"
                      >
                        {grupo.cat.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{grupo.cat.nombre}</span>
                        <span className="num block truncate text-xs text-tinta-3">{subtitulo}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className={`num font-medium ${grupo.neto > 0 ? 'text-emerald-400' : ''}`}>
                          {conSigno(grupo.neto)}
                        </span>
                        {varios && (
                          <span
                            className={`text-[9px] leading-none text-tinta-3 transition-transform ${abierto ? 'rotate-90' : ''}`}
                            aria-hidden="true"
                          >
                            ▶
                          </span>
                        )}
                      </span>
                    </button>

                    {varios && abierto && (
                      <ul className="pb-1">
                        {grupo.items.map((g) => (
                          <li key={g.id}>
                            <button
                              type="button"
                              onClick={() => onSeleccionar(g)}
                              className="flex w-full items-center gap-3 py-2 pr-4 pl-[4.25rem] text-left active:bg-superficie-2"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-tinta-2">{g.comercio}</span>
                                {(g.origen === 'apple_pay' || g.descripcion) && (
                                  <span className="block truncate text-xs text-tinta-3">
                                    {g.origen === 'apple_pay' ? ' Apple Pay' : ''}
                                    {g.origen === 'apple_pay' && g.descripcion ? ' · ' : ''}
                                    {g.descripcion ?? ''}
                                  </span>
                                )}
                              </span>
                              <span className={`num shrink-0 text-sm font-medium ${g.tipo === 'ingreso' ? 'text-emerald-400' : ''}`}>
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
        </>
      )}
    </section>
  )
}
