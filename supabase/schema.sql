-- ============================================================
-- Aplicación Finanzas — esquema de base de datos para Supabase
-- Pega este script completo en: SQL Editor > New query > Run
-- ============================================================

-- Categorías de gasto
create table if not exists public.categorias (
  id     text primary key,
  nombre text not null,
  emoji  text not null default '📦',
  color  text not null default '#898781'
);

-- Gastos
create table if not exists public.gastos (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null default current_date,
  importe      numeric(10,2) not null check (importe > 0),
  comercio     text not null,
  descripcion  text,
  categoria_id text references public.categorias(id),
  origen       text not null default 'manual'
               check (origen in ('manual', 'apple_pay', 'csv')),
  moneda       text not null default 'EUR',
  created_at   timestamptz not null default now()
);

create index if not exists gastos_fecha_idx on public.gastos (fecha desc);

-- Reglas de categorización automática: si el comercio contiene el patrón
-- (sin distinguir mayúsculas), se asigna la categoría.
create table if not exists public.reglas (
  id           bigint generated always as identity primary key,
  patron       text not null,
  categoria_id text not null references public.categorias(id)
);

-- ------------------------------------------------------------
-- Seguridad (RLS): solo un usuario autenticado puede leer/escribir.
-- La Edge Function usa la service_role key y no pasa por RLS.
-- Crea tu usuario en Authentication > Users > Add user, y desactiva
-- los registros nuevos en Authentication > Sign In / Up.
-- ------------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.gastos     enable row level security;
alter table public.reglas     enable row level security;

create policy "usuario autenticado - categorias"
  on public.categorias for all
  to authenticated using (true) with check (true);

create policy "usuario autenticado - gastos"
  on public.gastos for all
  to authenticated using (true) with check (true);

create policy "usuario autenticado - reglas"
  on public.reglas for all
  to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- Categorías por defecto (colores validados para el tema oscuro)
-- ------------------------------------------------------------
insert into public.categorias (id, nombre, emoji, color) values
  ('supermercado',  'Supermercado',  '🛒', '#199e70'),
  ('restaurantes',  'Restaurantes',  '🍽️', '#d95926'),
  ('transporte',    'Transporte',    '🚇', '#3987e5'),
  ('hogar',         'Hogar',         '🏠', '#9085e9'),
  ('suscripciones', 'Suscripciones', '🔁', '#d55181'),
  ('ocio',          'Ocio',          '🎬', '#c98500'),
  ('salud',         'Salud',         '💊', '#e66767'),
  ('viajes',        'Viajes',        '✈️', '#008300'),
  ('otros',         'Otros',         '📦', '#898781')
on conflict (id) do nothing;

-- Algunas reglas de ejemplo (edítalas o añade las tuyas)
insert into public.reglas (patron, categoria_id) values
  ('mercadona',  'supermercado'),
  ('carrefour',  'supermercado'),
  ('lidl',       'supermercado'),
  ('dia',        'supermercado'),
  ('netflix',    'suscripciones'),
  ('spotify',    'suscripciones'),
  ('apple.com',  'suscripciones'),
  ('renfe',      'transporte'),
  ('metro',      'transporte'),
  ('cabify',     'transporte'),
  ('uber',       'transporte'),
  ('farmacia',   'salud'),
  ('glovo',      'restaurantes')
on conflict do nothing;
