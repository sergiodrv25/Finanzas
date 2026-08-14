import { useState } from 'react'
import type { Categoria, Gasto } from '../types'
import { categoriaPorId, tipoDeCategoria } from '../lib/categorias'
import { formatearImporte, nombreDia } from '../lib/formato'
// Iconos de trazo compartidos con el panel de escritorio (sin emojis)
import Icono, { ICONO_CAT } from '../panel/iconos'

interface Props {
  gasto: Gasto
  categorias: Categoria[]
  onCambiarCategoria: (gastoId: string, categoriaId: string) => Promise<void>
  onEliminar: (gastoId: string) => Promise<void>
  onCerrar: () => void
}

export default function HojaGasto({
  gasto,
  categorias,
  onCambiarCategoria,
  onEliminar,
  onCerrar,
}: Props) {
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const cat = categoriaPorId(categorias, gasto.categoria_id, gasto.tipo)
  const categoriasDelTipo = categorias.filter(
    (c) => tipoDeCategoria(c) === gasto.tipo,
  )

  async function cambiar(categoriaId: string) {
    if (ocupado) return
    setOcupado(true)
    try {
      await onCambiarCategoria(gasto.id, categoriaId)
      onCerrar()
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar() {
    if (ocupado) return
    setOcupado(true)
    try {
      await onEliminar(gasto.id)
      onCerrar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={onCerrar}
      />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-borde bg-superficie p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borde" aria-hidden="true" />

        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: `${cat.color}26`, color: cat.color }}
          >
            <Icono id={ICONO_CAT[cat.id] ?? 'caja'} tam={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{gasto.comercio}</p>
            <p className="text-sm text-tinta-3">
              {nombreDia(gasto.fecha)}
              {gasto.origen === 'apple_pay' && ' ·  Apple Pay'}
            </p>
          </div>
          <p
            className={`num ml-auto text-xl font-semibold ${
              gasto.tipo === 'ingreso' ? 'text-emerald-400' : ''
            }`}
          >
            {gasto.tipo === 'ingreso' ? '+' : '−'}
            {formatearImporte(gasto.importe)}
          </p>
        </div>

        {gasto.descripcion && (
          <p className="mt-3 text-sm text-tinta-2">{gasto.descripcion}</p>
        )}

        <p className="mt-5 text-sm text-tinta-2">Categoría</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {categoriasDelTipo.map((c) => {
            const activa = c.id === cat.id
            return (
              <button
                key={c.id}
                type="button"
                disabled={ocupado}
                onClick={() => cambiar(c.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                  activa
                    ? 'border-transparent text-fondo'
                    : 'border-borde bg-superficie-2 text-tinta-2'
                }`}
                style={activa ? { background: c.color } : undefined}
              >
                <Icono id={ICONO_CAT[c.id] ?? 'caja'} tam={15} />
                {c.nombre}
              </button>
            )
          })}
        </div>

        {confirmandoBorrado ? (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmandoBorrado(false)}
              className="flex-1 rounded-xl border border-borde py-3 text-tinta-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={eliminar}
              className="flex-1 rounded-xl bg-red-500/90 py-3 font-semibold text-white"
            >
              Eliminar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoBorrado(true)}
            className="mt-6 w-full rounded-xl border border-borde py-3 text-red-400"
          >
            {gasto.tipo === 'ingreso' ? 'Eliminar ingreso' : 'Eliminar gasto'}
          </button>
        )}
      </div>
    </div>
  )
}
