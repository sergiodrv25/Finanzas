import { useState } from 'react'
import type { Deuda, DeudaRecurrente } from '../types'
import { formatearImporte, hoyISO } from '../lib/formato'
import Icono from './iconos'

function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${Number(d)} ${meses[Number(m) - 1]}`
}

interface Props {
  deudas: Deuda[]
  recurrentes: DeudaRecurrente[]
  disponible: boolean // false = falta la migración en Supabase
  onCobrar: (deuda: Deuda) => Promise<void>
  onEliminar: (deudaId: string) => Promise<void>
  onCrear: (d: { fecha: string; concepto: string; deudor: string; importe: number }) => Promise<void>
  onCrearRecurrente: (r: { concepto: string; deudor: string; importe: number; dia: number }) => Promise<void>
  onEliminarRecurrente: (id: number) => Promise<void>
}

export function Deudas({
  deudas,
  recurrentes,
  disponible,
  onCobrar,
  onEliminar,
  onCrear,
  onCrearRecurrente,
  onEliminarRecurrente,
}: Props) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoForm, setMostrandoForm] = useState<'ninguno' | 'puntual' | 'recurrente'>('ninguno')

  // formularios
  const [concepto, setConcepto] = useState('')
  const [deudor, setDeudor] = useState('')
  const [importe, setImporte] = useState('')
  const [dia, setDia] = useState('1')

  const pendientes = deudas.filter((d) => d.estado === 'pendiente')
  const cobradas = deudas.filter((d) => d.estado === 'cobrada').slice(0, 5)
  const totalPendiente = pendientes.reduce((s, d) => s + d.importe, 0)

  async function ejecutar(clave: string, accion: () => Promise<void>) {
    if (ocupado) return
    setOcupado(clave)
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.')
    } finally {
      setOcupado(null)
    }
  }

  function limpiarForm() {
    setConcepto('')
    setDeudor('')
    setImporte('')
    setDia('1')
    setMostrandoForm('ninguno')
  }

  const importeNum = Number(importe.replace(',', '.'))
  const formValido = concepto.trim().length > 0 && isFinite(importeNum) && importeNum > 0

  return (
    <div className="mb-3 rounded-2xl border border-borde bg-superficie p-5" id="deudas">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Me deben</h2>
          <p className="text-xs text-tinta-3">
            Deudas pendientes de cobro · desde el atajo: «60 cena <b>deben 45</b>»
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-tinta-3">Total pendiente</p>
          <p className={`num text-xl font-semibold ${totalPendiente > 0 ? 'text-ambar' : 'text-tinta-3'}`}>
            {formatearImporte(totalPendiente)}
          </p>
        </div>
      </div>

      {!disponible && (
        <p className="rounded-xl border border-borde bg-superficie-2 px-4 py-3 text-sm text-tinta-2">
          Falta ejecutar <code className="text-tinta">supabase/migracion-deudas.sql</code> en el SQL Editor de Supabase para activar esta sección.
        </p>
      )}

      {error && <p className="mb-2 text-xs text-rojo">{error}</p>}

      {disponible && (
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          {/* ------------------------------- Pendientes + historial */}
          <div>
            {pendientes.length === 0 && (
              <p className="py-6 text-center text-sm text-tinta-3">Nadie te debe nada ahora mismo. 🎉</p>
            )}
            {pendientes.map((d) => (
              <div key={d.id} className="flex items-center gap-2.5 border-b border-borde py-2 last:border-b-0">
                <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-superficie-2 text-tinta-2">
                  <Icono id={d.origen === 'recurrente' ? 'repetir' : 'monedas'} tam={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">
                    {d.concepto}
                    {d.deudor && <span className="font-normal text-tinta-2"> · {d.deudor}</span>}
                  </p>
                  <p className="text-[11.5px] text-tinta-3">
                    {fechaCorta(d.fecha)}
                    {d.origen === 'atajo' && ' · del atajo'}
                    {d.origen === 'recurrente' && ' · recurrente'}
                  </p>
                </div>
                <span className="num text-[13px] font-semibold">{formatearImporte(d.importe)}</span>
                <button
                  type="button"
                  disabled={ocupado !== null}
                  onClick={() => void ejecutar(d.id, () => onCobrar(d))}
                  className="rounded-lg bg-acento px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  title="Marcar como cobrada (crea un ingreso en Reembolsos)"
                >
                  {ocupado === d.id ? '…' : '✓ Cobrada'}
                </button>
                <button
                  type="button"
                  disabled={ocupado !== null}
                  onClick={() => void ejecutar('del' + d.id, () => onEliminar(d.id))}
                  className="rounded-lg border border-borde px-2 py-1 text-xs text-tinta-3 hover:text-rojo"
                  title="Eliminar sin cobrar"
                  aria-label="Eliminar deuda"
                >
                  ✕
                </button>
              </div>
            ))}

            {cobradas.length > 0 && (
              <>
                <p className="mt-4 mb-1 text-[11px] font-semibold tracking-wider text-tinta-3 uppercase">
                  Cobradas recientemente
                </p>
                {cobradas.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 py-1 text-[12.5px] text-tinta-3">
                    <span className="text-verde">✓</span>
                    <span className="truncate">
                      {d.concepto}
                      {d.deudor ? ` · ${d.deudor}` : ''}
                    </span>
                    <span className="num ml-auto">{formatearImporte(d.importe)}</span>
                  </div>
                ))}
              </>
            )}

            {mostrandoForm !== 'puntual' ? (
              <button
                type="button"
                onClick={() => setMostrandoForm('puntual')}
                className="mt-3 rounded-lg border border-borde px-3 py-1.5 !text-[12.5px] text-tinta-2 hover:bg-superficie-2"
              >
                + Añadir deuda
              </button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input placeholder="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)}
                  className="w-40 rounded-lg border border-borde bg-superficie-2 px-2.5 py-1.5 !text-[12.5px] outline-none focus:border-acento" />
                <input placeholder="Quién (opcional)" value={deudor} onChange={(e) => setDeudor(e.target.value)}
                  className="w-32 rounded-lg border border-borde bg-superficie-2 px-2.5 py-1.5 !text-[12.5px] outline-none focus:border-acento" />
                <input placeholder="€" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)}
                  className="num w-20 rounded-lg border border-borde bg-superficie-2 px-2.5 py-1.5 !text-[12.5px] outline-none focus:border-acento" />
                <button type="button" disabled={!formValido || ocupado !== null}
                  onClick={() => void ejecutar('crear', async () => { await onCrear({ fecha: hoyISO(), concepto, deudor, importe: importeNum }); limpiarForm() })}
                  className="rounded-lg bg-acento px-3 py-1.5 !text-[12.5px] font-semibold text-white disabled:opacity-40">
                  Guardar
                </button>
                <button type="button" onClick={limpiarForm} className="!text-[12.5px] text-tinta-3">Cancelar</button>
              </div>
            )}
          </div>

          {/* ------------------------------- Recurrentes */}
          <div className="rounded-xl border border-borde bg-superficie-2/40 p-4">
            <p className="mb-1 text-[13px] font-semibold">Recurrentes mensuales</p>
            <p className="mb-2 text-[11.5px] text-tinta-3">
              Se generan solas cada mes (p. ej. tu plan familiar de Spotify).
            </p>
            {recurrentes.length === 0 && (
              <p className="py-3 text-center text-[12.5px] text-tinta-3">Ninguna configurada.</p>
            )}
            {recurrentes.map((r) => (
              <div key={r.id} className="flex items-center gap-2 border-b border-borde py-1.5 text-[12.5px] last:border-b-0">
                <Icono id="repetir" tam={12} className="flex-none text-tinta-3" />
                <span className="min-w-0 flex-1 truncate">
                  {r.concepto}
                  {r.deudor && <span className="text-tinta-3"> · {r.deudor}</span>}
                  <span className="text-tinta-3"> · día {r.dia}</span>
                </span>
                <span className="num font-semibold">{formatearImporte(r.importe)}</span>
                <button
                  type="button"
                  disabled={ocupado !== null}
                  onClick={() => void ejecutar('rec' + r.id, () => onEliminarRecurrente(r.id))}
                  className="text-tinta-3 hover:text-rojo"
                  aria-label={`Eliminar recurrente ${r.concepto}`}
                >
                  ✕
                </button>
              </div>
            ))}

            {mostrandoForm !== 'recurrente' ? (
              <button
                type="button"
                onClick={() => setMostrandoForm('recurrente')}
                className="mt-3 rounded-lg border border-borde px-3 py-1.5 !text-[12.5px] text-tinta-2 hover:bg-superficie"
              >
                + Añadir recurrente
              </button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input placeholder="Concepto (Spotify…)" value={concepto} onChange={(e) => setConcepto(e.target.value)}
                  className="w-36 rounded-lg border border-borde bg-superficie px-2.5 py-1.5 !text-[12.5px] outline-none focus:border-acento" />
                <input placeholder="Quién" value={deudor} onChange={(e) => setDeudor(e.target.value)}
                  className="w-24 rounded-lg border border-borde bg-superficie px-2.5 py-1.5 !text-[12.5px] outline-none focus:border-acento" />
                <input placeholder="€/mes" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)}
                  className="num w-18 rounded-lg border border-borde bg-superficie px-2.5 py-1.5 !text-[12.5px] outline-none focus:border-acento" />
                <label className="flex items-center gap-1 !text-[12.5px] text-tinta-3">
                  día
                  <input inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)}
                    className="num w-11 rounded-lg border border-borde bg-superficie px-2 py-1.5 !text-[12.5px] outline-none focus:border-acento" />
                </label>
                <button type="button" disabled={!formValido || ocupado !== null}
                  onClick={() => void ejecutar('crearrec', async () => {
                    await onCrearRecurrente({ concepto, deudor, importe: importeNum, dia: Number(dia) || 1 })
                    limpiarForm()
                  })}
                  className="rounded-lg bg-acento px-3 py-1.5 !text-[12.5px] font-semibold text-white disabled:opacity-40">
                  Guardar
                </button>
                <button type="button" onClick={limpiarForm} className="!text-[12.5px] text-tinta-3">Cancelar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
