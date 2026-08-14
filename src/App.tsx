import { useCallback, useEffect, useRef, useState } from 'react'
import type { Categoria, Gasto, GastoNuevo } from './types'
import { CATEGORIAS_DEFECTO } from './lib/categorias'
import { mesActual, nombreMes, sumarMeses } from './lib/formato'
import { esErrorDeSesion, mensajeLegible } from './lib/errores'
import {
  actualizarCategoria,
  anadirGasto,
  eliminarGasto,
  listarCategorias,
  listarGastosDelMes,
} from './lib/store'
import { modoLocal, supabase } from './lib/supabase'
import ResumenMes from './components/ResumenMes'
import ListaGastos from './components/ListaGastos'
import HojaNuevoGasto from './components/HojaNuevoGasto'
import HojaGasto from './components/HojaGasto'
import PantallaLogin from './components/PantallaLogin'
import Panel from './panel/Panel'

export default function App() {
  // null = comprobando sesión, false = sin sesión, true = con sesión
  const [autenticado, setAutenticado] = useState<boolean | null>(
    modoLocal ? true : null,
  )

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setAutenticado(data.session !== null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setAutenticado(sesion !== null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (autenticado === null) {
    return <p className="px-5 py-16 text-center text-tinta-3">Cargando…</p>
  }
  if (!autenticado) {
    return <PantallaLogin />
  }
  if (window.location.pathname.startsWith('/panel')) {
    return <Panel />
  }
  return <Principal />
}

function FlechaMes({ hacia }: { hacia: 'izquierda' | 'derecha' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${hacia === 'izquierda' ? '' : 'rotate-180'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function Principal() {
  const [mes, setMes] = useState(mesActual())
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_DEFECTO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoNuevo, setMostrandoNuevo] = useState(false)
  const [gastoSeleccionado, setGastoSeleccionado] = useState<Gasto | null>(null)

  const recargar = useCallback(
    async (reintento = false): Promise<void> => {
      try {
        setError(null)
        const [g, c] = await Promise.all([listarGastosDelMes(mes), listarCategorias()])
        setGastos(g)
        setCategorias(c)
      } catch (e) {
        const bruto = e instanceof Error ? e.message : ''
        // Un desfase de reloj o un token caducado se arreglan solos con una sesión nueva
        if (!reintento && supabase && esErrorDeSesion(bruto)) {
          try {
            await supabase.auth.refreshSession()
            await recargar(true)
            return
          } catch {
            /* si el refresco falla, se muestra el mensaje de abajo */
          }
        }
        setError(mensajeLegible(bruto))
      } finally {
        setCargando(false)
      }
    },
    [mes],
  )

  useEffect(() => {
    setCargando(true)
    void recargar()
  }, [recargar])

  // Al volver a la app (p. ej. tras pagar con Apple Pay), refrescar
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') void recargar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])

  // Pulsación larga sobre el nombre del mes: alta manual (sustituye al botón +)
  const temporizador = useRef<number | null>(null)
  const cancelarPulsacion = useCallback(() => {
    if (temporizador.current !== null) {
      window.clearTimeout(temporizador.current)
      temporizador.current = null
    }
  }, [])
  const iniciarPulsacion = useCallback(() => {
    cancelarPulsacion()
    temporizador.current = window.setTimeout(() => setMostrandoNuevo(true), 550)
  }, [cancelarPulsacion])
  useEffect(() => cancelarPulsacion, [cancelarPulsacion])

  async function guardarNuevo(nuevo: GastoNuevo) {
    await anadirGasto(nuevo)
    await recargar()
  }

  async function cambiarCategoria(gastoId: string, categoriaId: string) {
    await actualizarCategoria(gastoId, categoriaId)
    await recargar()
  }

  async function eliminar(gastoId: string) {
    await eliminarGasto(gastoId)
    await recargar()
  }

  const esMesActual = mes === mesActual()

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-fondo/80 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setMes((m) => sumarMeses(m, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-tinta-3 active:bg-superficie-2"
        >
          <FlechaMes hacia="izquierda" />
        </button>
        <h1
          className="sin-callout text-[17px] font-semibold tracking-tight"
          onPointerDown={iniciarPulsacion}
          onPointerUp={cancelarPulsacion}
          onPointerLeave={cancelarPulsacion}
          onPointerCancel={cancelarPulsacion}
          onContextMenu={(e) => e.preventDefault()}
        >
          {nombreMes(mes)}
        </h1>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setMes((m) => sumarMeses(m, 1))}
          disabled={esMesActual}
          className="flex h-9 w-9 items-center justify-center rounded-full text-tinta-3 active:bg-superficie-2 disabled:opacity-25"
        >
          <FlechaMes hacia="derecha" />
        </button>
      </header>

      {modoLocal && (
        <p className="mx-5 mb-4 rounded-xl border border-borde bg-superficie px-4 py-2.5 text-xs text-tinta-3">
          Modo local: los datos se guardan solo en este dispositivo. Configura
          Supabase para sincronizar y activar el registro automático.
        </p>
      )}

      {error && (
        <p className="mx-5 mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="px-5 py-16 text-center text-tinta-3">Cargando…</p>
      ) : (
        <>
          <ResumenMes gastos={gastos} categorias={categorias} />
          <ListaGastos
            mes={mes}
            gastos={gastos}
            categorias={categorias}
            onSeleccionar={setGastoSeleccionado}
            onAnadir={() => setMostrandoNuevo(true)}
          />
        </>
      )}

      {mostrandoNuevo && (
        <HojaNuevoGasto
          categorias={categorias}
          onGuardar={guardarNuevo}
          onCerrar={() => setMostrandoNuevo(false)}
        />
      )}

      {gastoSeleccionado && (
        <HojaGasto
          gasto={gastoSeleccionado}
          categorias={categorias}
          onCambiarCategoria={cambiarCategoria}
          onEliminar={eliminar}
          onCerrar={() => setGastoSeleccionado(null)}
        />
      )}
    </div>
  )
}
