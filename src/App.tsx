import { useCallback, useEffect, useState } from 'react'
import type { Categoria, Gasto, GastoNuevo } from './types'
import { CATEGORIAS_DEFECTO } from './lib/categorias'
import { mesActual, nombreMes, sumarMeses } from './lib/formato'
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
  return <Principal />
}

function Principal() {
  const [mes, setMes] = useState(mesActual())
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_DEFECTO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoNuevo, setMostrandoNuevo] = useState(false)
  const [gastoSeleccionado, setGastoSeleccionado] = useState<Gasto | null>(null)

  const recargar = useCallback(async () => {
    try {
      setError(null)
      const [g, c] = await Promise.all([listarGastosDelMes(mes), listarCategorias()])
      setGastos(g)
      setCategorias(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando los datos.')
    } finally {
      setCargando(false)
    }
  }, [mes])

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
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setMes((m) => sumarMeses(m, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-borde text-tinta-2 active:bg-superficie-2"
        >
          ‹
        </button>
        <h1 className="text-lg font-semibold">{nombreMes(mes)}</h1>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setMes((m) => sumarMeses(m, 1))}
          disabled={esMesActual}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-borde text-tinta-2 active:bg-superficie-2 disabled:opacity-30"
        >
          ›
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
            gastos={gastos}
            categorias={categorias}
            onSeleccionar={setGastoSeleccionado}
          />
        </>
      )}

      <button
        type="button"
        aria-label="Añadir movimiento"
        onClick={() => setMostrandoNuevo(true)}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-acento text-3xl font-light text-white shadow-lg shadow-black/40 active:scale-95"
      >
        +
      </button>

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
