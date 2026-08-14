/** Errores de sesión/token que merecen un reintento con la sesión refrescada. */
export function esErrorDeSesion(mensaje: string): boolean {
  return /jwt|pgrst301|token|unauthorized|401/i.test(mensaje)
}

/** Traduce los errores más habituales a algo entendible en la pantalla. */
export function mensajeLegible(mensaje: string): string {
  const m = mensaje.toLowerCase()
  if (m.includes('issued at future') || m.includes('not yet valid')) {
    return 'La hora del móvil va desajustada. Activa Ajustes › General › Fecha y hora › Ajustar automáticamente y recarga.'
  }
  if (m.includes('expired')) {
    return 'La sesión ha caducado. Vuelve a iniciar sesión.'
  }
  if (esErrorDeSesion(m)) {
    return 'Problema con la sesión. Cierra y vuelve a abrir la app; si sigue, inicia sesión de nuevo.'
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Sin conexión. Los datos que ves pueden estar desactualizados.'
  }
  return mensaje || 'Error cargando los datos.'
}
