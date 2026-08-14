import { useState } from 'react'
import type { Categoria, GastoNuevo, TipoMovimiento } from '../types'
import { tipoDeCategoria } from '../lib/categorias'
import { hoyISO } from '../lib/formato'
// Iconos de trazo compartidos con el panel de escritorio (sin emojis)
import Icono, { ICONO_CAT } from '../panel/iconos'

interface Props {
  categorias: Categoria[]
  onGuardar: (gasto: GastoNuevo) => Promise<void>
  onCerrar: () => void
}

export default function HojaNuevoGasto({ categorias, onGuardar, onCerrar }: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento>('gasto')
  const [importe, setImporte] = useState('')
  const [comercio, setComercio] = useState('')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importeNum = Number(importe.replace(',', '.'))
  const valido = importeNum > 0 && comercio.trim().length > 0

  async function guardar() {
    if (!valido || guardando) return
    setGuardando(true)
    setError(null)
    try {
      await onGuardar({
        fecha,
        importe: Math.round(importeNum * 100) / 100,
        tipo,
        comercio,
        descripcion: nota || null,
        categoria_id: categoriaId,
        origen: 'manual',
      })
      onCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el gasto.')
      setGuardando(false)
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
        <h2 className="text-lg font-semibold">Nuevo movimiento</h2>

        <div
          role="group"
          aria-label="Tipo de movimiento"
          className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-borde bg-superficie-2 p-1"
        >
          {(
            [
              ['gasto', 'Gasto'],
              ['ingreso', 'Ingreso'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => {
                setTipo(valor)
                setCategoriaId(null)
              }}
              className={`rounded-lg py-2 text-sm font-medium ${
                tipo === valor
                  ? valor === 'ingreso'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-acento text-white'
                  : 'text-tinta-2'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="text-sm text-tinta-2">Importe (€)</span>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className="num mt-1 w-full rounded-xl border border-borde bg-superficie-2 px-4 py-3 text-2xl outline-none focus:border-acento"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-sm text-tinta-2">
            {tipo === 'ingreso' ? 'Concepto' : 'Comercio'}
          </span>
          <input
            placeholder={tipo === 'ingreso' ? 'Nómina agosto, apuesta…' : 'Mercadona, Netflix…'}
            value={comercio}
            onChange={(e) => setComercio(e.target.value)}
            className="mt-1 w-full rounded-xl border border-borde bg-superficie-2 px-4 py-3 outline-none focus:border-acento"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm text-tinta-2">Categoría</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {categorias
              .filter((c) => tipoDeCategoria(c) === tipo)
              .map((c) => {
              const activa = categoriaId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoriaId(activa ? null : c.id)}
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
        </fieldset>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-tinta-2">Fecha</span>
            <input
              type="date"
              value={fecha}
              max={hoyISO()}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-xl border border-borde bg-superficie-2 px-4 py-3 outline-none focus:border-acento"
            />
          </label>
          <label className="block">
            <span className="text-sm text-tinta-2">Nota (opcional)</span>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="mt-1 w-full rounded-xl border border-borde bg-superficie-2 px-4 py-3 outline-none focus:border-acento"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          disabled={!valido || guardando}
          onClick={guardar}
          className="mt-5 w-full rounded-xl bg-acento py-3.5 font-semibold text-white disabled:opacity-40"
        >
          {guardando
            ? 'Guardando…'
            : tipo === 'ingreso'
              ? 'Guardar ingreso'
              : 'Guardar gasto'}
        </button>
      </div>
    </div>
  )
}
