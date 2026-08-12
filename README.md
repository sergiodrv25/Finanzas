# Finanzas 💶

Aplicación personal de gestión de gastos. PWA instalable en el iPhone, con
registro automático de los pagos de Apple Pay (tarjeta Revolut) mediante la
app Atajos de iOS.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (PWA)
- **Backend:** Supabase (Postgres + Auth + Edge Functions) — capa gratuita
- **Hosting:** Vercel — capa gratuita

La app también funciona **sin backend** (modo local): si no configuras
Supabase, los gastos se guardan solo en el dispositivo. Útil para probarla.

---

## 1. Probar en tu ordenador

```bash
npm install
npm run dev
```

Abre la URL que aparece (http://localhost:5173). Estará en modo local.

## 2. Crear el proyecto de Supabase (gratis)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo
   (elige la región de Europa, p. ej. Frankfurt).
2. Ve a **SQL Editor → New query**, pega el contenido completo de
   `supabase/schema.sql` y pulsa **Run**. Esto crea las tablas, las categorías
   y las reglas de categorización.
3. Crea tu usuario: **Authentication → Users → Add user** (tu correo y una
   contraseña). Marca "Auto confirm user".
4. Desactiva los registros de desconocidos: **Authentication → Sign In / Up →
   desactiva "Allow new users to sign up"**.
5. Copia de **Project Settings → API**:
   - `Project URL` → será `VITE_SUPABASE_URL`
   - `anon public key` → será `VITE_SUPABASE_ANON_KEY`

Para probar en local con Supabase: copia `.env.example` a `.env`, rellena las
dos variables y reinicia `npm run dev`. Entra con tu correo y contraseña.

## 3. Desplegar en Vercel (gratis)

1. Sube este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com): **Add New → Project → importa el repo**.
   Vercel detecta Vite automáticamente.
3. En **Environment Variables** añade `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` con los valores del paso anterior.
4. **Deploy**. Tendrás una URL tipo `https://finanzas-xxxx.vercel.app`.

## 4. Instalar la PWA en el iPhone

1. Abre tu URL de Vercel en **Safari**.
2. Botón **Compartir → Añadir a pantalla de inicio**.
3. Ya tienes el icono de Finanzas como una app más, a pantalla completa.

## 5. Registro automático de pagos (Apple Pay + Atajos)

### 5.1 Desplegar la Edge Function

Necesitas [Node.js](https://nodejs.org) instalado. Desde la carpeta del proyecto:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF   # el ref sale de la URL del dashboard
npx supabase functions deploy registrar-gasto --no-verify-jwt
```

Después, crea el token secreto (invéntate una cadena larga y aleatoria):

- Dashboard → **Edge Functions → registrar-gasto → Secrets → Add secret**
- Nombre: `TOKEN_ATAJOS` · Valor: tu cadena secreta

La URL de la función será:
`https://TU_PROJECT_REF.supabase.co/functions/v1/registrar-gasto`

### 5.2 Crear la automatización en el iPhone

Requisito: tu tarjeta Revolut añadida a Apple Pay (app Wallet).

1. Abre **Atajos → Automatización → Nueva automatización**.
2. Elige **Transacción** → selecciona tu tarjeta Revolut → marca
   **Ejecutar inmediatamente** (y desactiva "Notificar al ejecutar" si quieres).
3. Añade la acción **Obtener contenido de URL** y configúrala:
   - **URL:** `https://TU_PROJECT_REF.supabase.co/functions/v1/registrar-gasto`
   - **Método:** POST
   - **Cabeceras:** `x-token` = tu `TOKEN_ATAJOS`
   - **Cuerpo de la solicitud:** JSON con estos campos, usando las variables
     mágicas del disparador Transacción:
     - `importe` → variable **Importe** (Amount)
     - `comercio` → variable **Comercio** (Merchant)
     - `fecha` → variable **Fecha** (Date)
4. Guarda. Paga algo con Apple Pay y a los pocos segundos el gasto aparecerá
   en la app, ya categorizado si coincide con alguna regla.

> La función deduplica reintentos y entiende importes en formato español
> ("12,50 €"). Los pagos que no pasen por Apple Pay se añaden a mano con el
> botón + (o en el futuro, importando el CSV de Revolut).

### 5.3 (Opcional) Atajo de registro manual rápido

Crea un **Atajo** normal (no automatización) que pregunte "Importe" y
"Comercio" (acción *Solicitar entrada*) y haga el mismo POST añadiendo
`"origen": "manual"` al JSON. Ponlo en la pantalla de inicio o en el
botón de acción del iPhone.

## 6. Reglas de categorización

Están en la tabla `reglas` de Supabase: si el nombre del comercio contiene el
patrón (sin distinguir mayúsculas), se asigna esa categoría. Añade las tuyas
en **Table Editor → reglas** (p. ej. patrón `alcampo` → `supermercado`).

## 7. Ingresos (nóminas, apuestas, etc.)

Desde la migración `supabase/migracion-ingresos.sql` la app registra también
ingresos, con sus propias categorías (Nómina, Apuestas, Inversiones, Otros
ingresos). El resumen del mes muestra gastos, ingresos, balance y tasa de ahorro.

- **En la app:** el botón + abre "Nuevo movimiento" con selector Gasto/Ingreso.
- **Desde el atajo:** escribe el importe con prefijo `+` para que sea un
  ingreso: `+1500 nómina`. Sin prefijo es un gasto. (Requiere que la regex del
  atajo admita el `+` inicial: `^(\+?[\d]+[.,]?\d*)\s+(.+)$`.)
- **En la Edge Function:** también se puede enviar `"tipo": "ingreso"` en el
  cuerpo del POST.

Si tu base de datos es anterior a esta versión, ejecuta
`supabase/migracion-ingresos.sql` en el SQL Editor de Supabase y vuelve a
desplegar la Edge Function.

## Estructura del proyecto

```
src/
  App.tsx                    Pantalla principal, navegación por meses, login
  components/
    ResumenMes.tsx           Total del mes y barras por categoría
    ListaGastos.tsx          Lista agrupada por día
    HojaNuevoGasto.tsx       Formulario de alta manual
    HojaGasto.tsx            Detalle: cambiar categoría / eliminar
    PantallaLogin.tsx        Acceso con correo y contraseña
  lib/
    store.ts                 Capa de datos (Supabase o modo local)
    supabase.ts              Cliente de Supabase
    categorias.ts            Categorías por defecto
    formato.ts               Fechas e importes en formato español
supabase/
  schema.sql                 Esquema de la base de datos (pegar en SQL Editor)
  functions/registrar-gasto/ Edge Function para el atajo de iOS
```

## Próximas fases (ideas)

Importador del CSV de Revolut con deduplicación, presupuestos mensuales por
categoría con avisos, detección de suscripciones, gráfico de evolución entre
meses, objetivos de ahorro.
