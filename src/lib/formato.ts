const fmtEUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

export function formatearImporte(importe: number): string {
  return fmtEUR.format(importe)
}

export function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function mesActual(): string {
  return hoyISO().slice(0, 7)
}

/** Suma (o resta) meses a un 'YYYY-MM'. */
export function sumarMeses(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function nombreMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  const nombre = MESES[m - 1]
  const actual = new Date().getFullYear()
  return a === actual
    ? nombre.charAt(0).toUpperCase() + nombre.slice(1)
    : `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} ${a}`
}

export function nombreDia(fechaISO: string): string {
  const hoy = hoyISO()
  if (fechaISO === hoy) return 'Hoy'
  const [a, m, d] = fechaISO.split('-').map(Number)
  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  const ayerISO = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`
  if (fechaISO === ayerISO) return 'Ayer'
  const fecha = new Date(a, m - 1, d)
  const texto = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
