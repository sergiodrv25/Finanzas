import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Categoria, Deuda, DeudaRecurrente, Gasto, Presupuesto } from '../types'
import { CATEGORIAS_DEFECTO, esApuesta } from '../lib/categorias'
import { hoyISO, mesActual, nombreMes, sumarMeses } from '../lib/formato'
import {
  cobrarDeuda,
  crearDeuda,
  crearDeudaRecurrente,
  eliminarDeuda,
  eliminarDeudaRecurrente,
  generarDeudasRecurrentes,
  guardarPresupuestos,
  listarCategorias,
  listarDeudas,
  listarDeudasRecurrentes,
  listarGastosRango,
  listarPresupuestos,
} from '../lib/store'
import { modoLocal } from '../lib/supabase'
import Icono from './iconos'
import { Calendario, Evolucion, GastoPorCategoria, Kpis } from './secciones'
import { Presupuestos, Suscripciones, TablaMovimientos } from './bloques'
import { Deudas } from './deudas'
import { Apuestas } from './apuestas'
import { serieMensual } from './utiles'

type Preset = 'mes' | '3m' | '6m' | 'anio'

const PRESETS: { id: Preset; etiqueta: string }[] = [
  { id: 'mes', etiqueta: 'Este mes' },
  { id: '3m', etiqueta: '3 M' },
  { id: '6m', etiqueta: '6 M' },
  { id: 'anio', etiqueta: 'Año' },
]

/** Meses (claves 'YYYY-MM') del preset, el último es el mes actual. */
function mesesDelPreset(preset: Preset): string[] {
  const actual = mesActual()
  const n =
    preset === 'mes' ? 6 // el gráfico de evolución enseña contexto de 6 meses
    : preset === '3m' ? 3
    : preset === '6m' ? 6
    : Number(actual.slice(5, 7)) // 'anio': de enero al mes actual
  return Array.from({ length: n }, (_, i) => sumarMeses(actual, i - (n - 1)))
}

/** Rango [inicio, fin) de fechas ISO que cubre el preset (para KPIs y tabla). */
function rangoDelPreset(preset: Preset): { inicio: string; fin: string } {
  const actual = mesActual()
  const fin = `${sumarMeses(actual, 1)}-01`
  const inicio =
    preset === 'mes' ? `${actual}-01`
    : preset === '3m' ? `${sumarMeses(actual, -2)}-01`
    : preset === '6m' ? `${sumarMeses(actual, -5)}-01`
    : `${actual.slice(0, 4)}-01-01`
  return { inicio, fin }
}

export default function Panel() {
  const [movs, setMovs] = useState<Gasto[]>([]) // últimos 12 meses
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_DEFECTO)
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [recurrentes, setRecurrentes] = useState<DeudaRecurrente[]>([])
  const [deudasDisponibles, setDeudasDisponibles] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<Preset>('mes')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'gasto' | 'ingreso'>('todos')
  const [origenFiltro, setOrigenFiltro] = useState<'todos' | 'apple_pay' | 'manual' | 'csv'>('todos')

  const recargar = useCallback(async () => {
    try {
      setError(null)
      const inicio = `${sumarMeses(mesActual(), -11)}-01`
      const fin = `${sumarMeses(mesActual(), 1)}-01`
      const [g, c, p] = await Promise.all([
        listarGastosRango(inicio, fin),
        listarCategorias(),
        // Si la tabla de presupuestos aún no existe, el resto del panel
        // debe cargar igualmente.
        listarPresupuestos().catch(() => [] as Presupuesto[]),
      ])
      setMovs(g)
      setCategorias(c)
      setPresupuestos(p)
      // Deudas: generar las recurrentes del mes y cargar; si falta la
      // migración, la sección lo indica sin tumbar el panel.
      try {
        await generarDeudasRecurrentes(mesActual())
        const [d, r] = await Promise.all([listarDeudas(), listarDeudasRecurrentes()])
        setDeudas(d)
        setRecurrentes(r)
        setDeudasDisponibles(true)
      } catch {
        setDeudasDisponibles(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando los datos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  // --- Derivados del preset y los filtros globales -------------------------
  const { inicio, fin } = rangoDelPreset(preset)

  const filtradosGlobal = useMemo(
    () =>
      movs.filter((g) => {
        if (tipoFiltro !== 'todos' && g.tipo !== tipoFiltro) return false
        if (origenFiltro !== 'todos' && g.origen !== origenFiltro) return false
        return true
      }),
    [movs, tipoFiltro, origenFiltro],
  )

  const periodo = useMemo(
    () => filtradosGlobal.filter((g) => g.fecha >= inicio && g.fecha < fin),
    [filtradosGlobal, inicio, fin],
  )

  // Período anterior equivalente (para las variaciones): solo en "Este mes"
  const previo = useMemo(() => {
    if (preset !== 'mes') return null
    const mesPrev = sumarMeses(mesActual(), -1)
    return filtradosGlobal.filter((g) => g.fecha.slice(0, 7) === mesPrev)
  }, [filtradosGlobal, preset])

  const meses = mesesDelPreset(preset)
  const serie = useMemo(() => serieMensual(filtradosGlobal, meses), [filtradosGlobal, meses])
  const meses12 = useMemo(
    () => Array.from({ length: 12 }, (_, i) => sumarMeses(mesActual(), i - 11)),
    [],
  )
  const serie12 = useMemo(() => serieMensual(movs, meses12), [movs, meses12])

  const apuestasPeriodo = useMemo(
    () =>
      movs.filter(
        (g) => esApuesta(g.categoria_id) && g.fecha >= inicio && g.fecha < fin,
      ),
    [movs, inicio, fin],
  )

  const gastoMesActualPorCat = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const g of movs) {
      if (g.tipo === 'ingreso' || g.fecha.slice(0, 7) !== mesActual()) continue
      const id = g.categoria_id ?? 'otros'
      mapa.set(id, (mapa.get(id) ?? 0) + g.importe)
    }
    return mapa
  }, [movs])

  const diasRestantes = useMemo(() => {
    const [a, m] = mesActual().split('-').map(Number)
    return new Date(a, m, 0).getDate() - Number(hoyISO().slice(8, 10))
  }, [])

  async function guardarPpto(lista: Presupuesto[]) {
    await guardarPresupuestos(lista)
    setPresupuestos(lista)
  }

  async function cobrar(deuda: Deuda) {
    await cobrarDeuda(deuda)
    await recargar() // refresca deudas y el ingreso nuevo en movimientos
  }

  async function quitarDeuda(id: string) {
    await eliminarDeuda(id)
    setDeudas((ds) => ds.filter((d) => d.id !== id))
  }

  async function nuevaDeuda(d: { fecha: string; concepto: string; deudor: string; importe: number }) {
    await crearDeuda(d)
    setDeudas(await listarDeudas())
  }

  async function nuevaRecurrente(r: { concepto: string; deudor: string; importe: number; dia: number }) {
    await crearDeudaRecurrente(r)
    await generarDeudasRecurrentes(mesActual())
    const [d, rec] = await Promise.all([listarDeudas(), listarDeudasRecurrentes()])
    setDeudas(d)
    setRecurrentes(rec)
  }

  async function quitarRecurrente(id: number) {
    await eliminarDeudaRecurrente(id)
    setRecurrentes((rs) => rs.filter((r) => r.id !== id))
  }

  function irA(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const etiquetaPeriodo =
    preset === 'mes' ? `${nombreMes(mesActual())} · comparado con ${nombreMes(sumarMeses(mesActual(), -1)).toLowerCase()}`
    : preset === '3m' ? 'Últimos 3 meses'
    : preset === '6m' ? 'Últimos 6 meses'
    : `Año ${mesActual().slice(0, 4)}`

  return (
    <div className="grid min-h-dvh grid-cols-[220px_1fr]">
      {/* ------------------------------------------------ Sidebar */}
      <aside className="sticky top-0 flex h-dvh flex-col gap-1 border-r border-borde px-3 py-5">
        <div className="flex items-center gap-2.5 px-2.5 pb-4">
          <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-acento text-white">
            <Icono id="cartera" tam={17} />
          </div>
          <div className="leading-tight">
            <b className="text-[16px] tracking-tight">Finanzas</b>
            <span className="block text-[11.5px] text-tinta-3">Panel de administración</span>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 text-sm font-medium">
          <a href="/panel" className="flex items-center gap-2.5 rounded-[10px] bg-superficie-2 px-2.5 py-2 text-tinta">
            <Icono id="panel" className="text-acento" /> Resumen
          </a>
          <button type="button" onClick={() => irA('movimientos')} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-tinta-2 hover:bg-superficie">
            <Icono id="recibo" className="text-tinta-3" /> Movimientos
          </button>
          <button type="button" onClick={() => irA('suscripciones')} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-tinta-2 hover:bg-superficie">
            <Icono id="repetir" className="text-tinta-3" /> Suscripciones
          </button>
          <button type="button" onClick={() => irA('presupuestos')} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-tinta-2 hover:bg-superficie">
            <Icono id="diana" className="text-tinta-3" /> Presupuestos
          </button>
          <button type="button" onClick={() => irA('deudas')} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-tinta-2 hover:bg-superficie">
            <Icono id="monedas" className="text-tinta-3" /> Me deben
          </button>
          <button type="button" onClick={() => irA('apuestas')} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-tinta-2 hover:bg-superficie">
            <Icono id="dado" className="text-tinta-3" /> Apuestas
          </button>
          <span className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-tinta-3">
            <Icono id="tendencia" /> Inversiones
            <span className="ml-auto rounded-full border border-borde px-1.5 py-px text-[10px]">pronto</span>
          </span>
          <span className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-tinta-3">
            <Icono id="varita" /> Reglas
            <span className="ml-auto rounded-full border border-borde px-1.5 py-px text-[10px]">pronto</span>
          </span>
        </nav>
        <div className="mt-auto border-t border-borde px-2.5 pt-3 text-xs text-tinta-3">
          <a href="/" className="mb-1 flex items-center gap-1.5 text-tinta-2 hover:text-tinta">
            <Icono id="movil" tam={13} /> Abrir la app móvil
          </a>
          {modoLocal ? 'Modo local (sin Supabase)' : 'Sincronizado con la PWA'}
        </div>
      </aside>

      {/* ------------------------------------------------ Contenido */}
      <main className="max-w-[1240px] px-7 pt-6 pb-16">
        <h1 className="text-xl font-semibold tracking-tight">Resumen</h1>
        <p className="mb-4 text-[13px] text-tinta-3">{etiquetaPeriodo}</p>

        {/* Filtros globales */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-[10px] border border-borde">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`border-r border-borde px-3.5 py-1.5 !text-[13px] last:border-r-0 ${
                  preset === p.id ? 'bg-superficie-2 font-semibold text-tinta' : 'text-tinta-2 hover:bg-superficie'
                }`}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)}
            className="rounded-[10px] border border-borde bg-superficie px-2.5 py-1.5 !text-[13px] text-tinta-2 outline-none"
          >
            <option value="todos">Tipo: todos</option>
            <option value="gasto">Solo gastos</option>
            <option value="ingreso">Solo ingresos</option>
          </select>
          <select
            value={origenFiltro}
            onChange={(e) => setOrigenFiltro(e.target.value as typeof origenFiltro)}
            className="rounded-[10px] border border-borde bg-superficie px-2.5 py-1.5 !text-[13px] text-tinta-2 outline-none"
          >
            <option value="todos">Origen: todos</option>
            <option value="apple_pay">Apple Pay</option>
            <option value="manual">Manual</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">{error}</p>
        )}

        {cargando ? (
          <p className="py-16 text-center text-tinta-3">Cargando…</p>
        ) : (
          <>
            <Kpis
              periodo={periodo}
              previo={previo}
              etiquetaComparacion={preset === 'mes' ? 'vs mes anterior' : ''}
              serie={serie12}
            />

            <div className="mb-3 grid gap-3 xl:grid-cols-[3fr_2fr]">
              <Evolucion serie={serie} />
              <GastoPorCategoria periodo={periodo} previo={previo} categorias={categorias} />
            </div>

            <div className="mb-3 grid gap-3 xl:grid-cols-3">
              <Calendario mes={mesActual()} movs={movs} />
              <div id="suscripciones">
                <Suscripciones movs12m={movs} />
              </div>
              <div id="presupuestos">
                <Presupuestos
                  categorias={categorias}
                  presupuestos={presupuestos}
                  gastoMes={gastoMesActualPorCat}
                  diasRestantes={diasRestantes}
                  onGuardar={guardarPpto}
                />
              </div>
            </div>

            <Deudas
              deudas={deudas}
              recurrentes={recurrentes}
              disponible={deudasDisponibles}
              onCobrar={cobrar}
              onEliminar={quitarDeuda}
              onCrear={nuevaDeuda}
              onCrearRecurrente={nuevaRecurrente}
              onEliminarRecurrente={quitarRecurrente}
            />

            <Apuestas
              periodo={apuestasPeriodo}
              movs12m={movs}
              meses12={meses12}
              etiquetaPeriodo={etiquetaPeriodo}
            />

            <TablaMovimientos movs={periodo} categorias={categorias} />
          </>
        )}
      </main>
    </div>
  )
}
