-- ============================================================
-- Aplicación Finanzas — esquema de base de datos para Supabase
-- Pega este script completo en: SQL Editor > New query > Run
-- ============================================================

-- Categorías de gasto
create table if not exists public.categorias (
  id     text primary key,
  nombre text not null,
  emoji  text not null default '📦',
  color  text not null default '#898781',
  tipo   text not null default 'gasto'
         check (tipo in ('gasto', 'ingreso'))
);

-- Gastos e ingresos (movimientos)
create table if not exists public.gastos (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null default current_date,
  importe      numeric(10,2) not null check (importe > 0),
  tipo         text not null default 'gasto'
               check (tipo in ('gasto', 'ingreso')),
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


-- Presupuestos mensuales por categoría
create table if not exists public.presupuestos (
  categoria_id text primary key references public.categorias(id),
  limite       numeric(10,2) not null check (limite > 0)
);

-- Deudas recurrentes ("me deben" todos los meses)
create table if not exists public.deudas_recurrentes (
  id       bigint generated always as identity primary key,
  concepto text not null,
  deudor   text,
  importe  numeric(10,2) not null check (importe > 0),
  dia      int not null default 1 check (dia between 1 and 28),
  activa   boolean not null default true
);

-- Deudas: dinero que te deben
create table if not exists public.deudas (
  id            uuid primary key default gen_random_uuid(),
  fecha         date not null default current_date,
  concepto      text not null,
  deudor        text,
  importe       numeric(10,2) not null check (importe > 0),
  estado        text not null default 'pendiente'
                check (estado in ('pendiente', 'cobrada')),
  origen        text not null default 'panel'
                check (origen in ('atajo', 'panel', 'recurrente')),
  gasto_id      uuid references public.gastos(id) on delete set null,
  recurrente_id bigint references public.deudas_recurrentes(id) on delete cascade,
  mes           text,
  created_at    timestamptz not null default now(),
  cobrada_at    timestamptz
);

create unique index if not exists deudas_recurrente_mes_idx
  on public.deudas (recurrente_id, mes);

-- ------------------------------------------------------------
-- Seguridad (RLS): solo un usuario autenticado puede leer/escribir.
-- La Edge Function usa la service_role key y no pasa por RLS.
-- Crea tu usuario en Authentication > Users > Add user, y desactiva
-- los registros nuevos en Authentication > Sign In / Up.
-- ------------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.gastos     enable row level security;
alter table public.reglas     enable row level security;
alter table public.presupuestos       enable row level security;
alter table public.deudas             enable row level security;
alter table public.deudas_recurrentes enable row level security;

create policy "usuario autenticado - categorias"
  on public.categorias for all
  to authenticated using (true) with check (true);

create policy "usuario autenticado - gastos"
  on public.gastos for all
  to authenticated using (true) with check (true);

create policy "usuario autenticado - reglas"
  on public.reglas for all
  to authenticated using (true) with check (true);

create policy "usuario autenticado - presupuestos"
  on public.presupuestos for all
  to authenticated using (true) with check (true);

create policy "usuario autenticado - deudas"
  on public.deudas for all
  to authenticated using (true) with check (true);

create policy "usuario autenticado - deudas_recurrentes"
  on public.deudas_recurrentes for all
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

insert into public.categorias (id, nombre, emoji, color, tipo) values
  ('apuestas_gasto', 'Apuestas', '🎰', '#c9a227', 'gasto')
on conflict (id) do nothing;

-- Categorías de ingreso
insert into public.categorias (id, nombre, emoji, color, tipo) values
  ('nomina',         'Nómina',         '💼', '#14a5a5', 'ingreso'),
  ('apuestas',       'Apuestas',       '🎲', '#c9a227', 'ingreso'),
  ('inversiones',    'Inversiones',    '📈', '#5aa64c', 'ingreso'),
  ('otros_ingresos', 'Otros ingresos', '💰', '#8a8f98', 'ingreso'),
  ('reembolsos',     'Reembolsos',     '🤝', '#8b93a8', 'ingreso')
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
