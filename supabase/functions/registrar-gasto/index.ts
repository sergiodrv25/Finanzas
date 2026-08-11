// ============================================================
// Edge Function: registrar-gasto
//
// Recibe un gasto desde la automatización de Atajos de iOS
// (disparador "Transacción" de Apple Pay) y lo guarda en la
// base de datos, aplicando las reglas de categorización.
//
// Despliegue (desde la carpeta raíz del proyecto):
//   npx supabase functions deploy registrar-gasto --no-verify-jwt
//
// Secretos necesarios (Dashboard > Edge Functions > Secrets):
//   TOKEN_ATAJOS: una cadena larga y aleatoria que solo conozcas tú.
//   (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las inyecta Supabase.)
//
// Petición esperada (POST, JSON):
//   Cabeceras: x-token: <TOKEN_ATAJOS>
//   Cuerpo: { "importe": "12,50", "comercio": "Mercadona", "fecha": "..." }
//   El importe admite formato español ("12,50") o número (12.5).
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

function parsearImporte(valor: unknown): number | null {
  if (typeof valor === 'number' && isFinite(valor)) return Math.abs(valor)
  if (typeof valor === 'string') {
    // Acepta "12,50 €", "12.50", "-12,50", "1.234,56"...
    let limpio = valor.replace(/[^\d.,-]/g, '')
    if (limpio.includes(',') && limpio.includes('.')) {
      // "1.234,56" -> puntos = miles, coma = decimal
      limpio = limpio.replace(/\./g, '').replace(',', '.')
    } else {
      limpio = limpio.replace(',', '.')
    }
    const n = Number(limpio)
    if (isFinite(n) && n !== 0) return Math.abs(n)
  }
  return null
}

function parsearFecha(valor: unknown): string {
  if (typeof valor === 'string' && valor.trim()) {
    const d = new Date(valor)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    // Formato español "11/8/2026" o "11/08/2026"
    const m = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (m) {
      return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }
  }
  return new Date().toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Método no permitido', { status: 405 })
  }

  // --- Autenticación con token secreto ---
  const token = req.headers.get('x-token')
  const esperado = Deno.env.get('TOKEN_ATAJOS')
  if (!esperado || token !== esperado) {
    return new Response('No autorizado', { status: 401 })
  }

  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await req.json()
  } catch {
    return new Response('JSON inválido', { status: 400 })
  }

  const importe = parsearImporte(cuerpo.importe)
  const comercio = String(cuerpo.comercio ?? '').trim() || 'Desconocido'
  const fecha = parsearFecha(cuerpo.fecha)
  const origen = cuerpo.origen === 'manual' ? 'manual' : 'apple_pay'

  if (importe === null) {
    return new Response(JSON.stringify({ error: 'Importe inválido' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // --- Deduplicación: mismo comercio e importe en la misma fecha,
  //     registrado hace menos de 2 minutos (Atajos a veces reintenta) ---
  const hace2min = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: duplicados } = await supabase
    .from('gastos')
    .select('id')
    .eq('fecha', fecha)
    .eq('importe', importe)
    .eq('comercio', comercio)
    .gte('created_at', hace2min)
    .limit(1)

  if (duplicados && duplicados.length > 0) {
    return new Response(JSON.stringify({ ok: true, duplicado: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  // --- Categorización automática por reglas ---
  let categoriaId: string | null = null
  const { data: reglas } = await supabase
    .from('reglas')
    .select('patron, categoria_id')
  if (reglas) {
    const comercioMin = comercio.toLowerCase()
    for (const regla of reglas) {
      if (comercioMin.includes(String(regla.patron).toLowerCase())) {
        categoriaId = regla.categoria_id
        break
      }
    }
  }

  const { data, error } = await supabase
    .from('gastos')
    .insert({
      fecha,
      importe,
      comercio,
      categoria_id: categoriaId,
      origen,
      moneda: 'EUR',
    })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true, gasto: data }), {
    headers: { 'content-type': 'application/json' },
  })
})
