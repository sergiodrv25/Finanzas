import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PantallaLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || ocupado) return
    setOcupado(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (err) {
      setError('Correo o contraseña incorrectos.')
      setOcupado(false)
    }
    // Si va bien, onAuthStateChange en App.tsx muestra la app.
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <p className="text-center text-5xl" aria-hidden="true">💶</p>
      <h1 className="mt-4 text-center text-2xl font-semibold">Finanzas</h1>
      <p className="mt-1 text-center text-sm text-tinta-3">
        Tu gestor personal de gastos
      </p>

      <form onSubmit={entrar} className="mt-8 space-y-3">
        <input
          type="email"
          autoComplete="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-borde bg-superficie px-4 py-3 outline-none focus:border-acento"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-borde bg-superficie px-4 py-3 outline-none focus:border-acento"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={ocupado || !email || !password}
          className="w-full rounded-xl bg-acento py-3.5 font-semibold text-white disabled:opacity-40"
        >
          {ocupado ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
