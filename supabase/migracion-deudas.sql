-- ============================================================
-- Migración 12-08-2026 (3): deudas ("me deben")
-- Pega este script completo en: SQL Editor > New query > Run
-- (es seguro ejecutarlo más de una vez)
-- ============================================================

-- Deudas recurrentes: plantillas mensuales (p. ej. Spotify, 4 €, Juan, día 1)
create table if not exists public.deudas_recurrentes (
  id       bigint generated always as identity primary key,
  concepto text not null,
  deudor   text,
  importe  numeric(10,2) not null check (importe > 0),
  dia      int not null default 1 check (dia between 1 and 28),
  activa   boolean not null default true
);

-- Deudas: dinero que te deben (puntuales, del atajo o generadas de recurrentes)
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
  mes           text, -- 'YYYY-MM' de la recurrencia (evita duplicados por mes)
  created_at    timestamptz not null default now(),
  cobrada_at    timestamptz
);

-- Una recurrente solo genera una deuda por mes
create unique index if not exists deudas_recurrente_mes_idx
  on public.deudas (recurrente_id, mes);

alter table public.deudas             enable row level security;
alter table public.deudas_recurrentes enable row level security;

drop policy if exists "usuario autenticado - deudas" on public.deudas;
create policy "usuario autenticado - deudas"
  on public.deudas for all
  to authenticated using (true) with check (true);

drop policy if exists "usuario autenticado - deudas_recurrentes" on public.deudas_recurrentes;
create policy "usuario autenticado - deudas_recurrentes"
  on public.deudas_recurrentes for all
  to authenticated using (true) with check (true);

-- Categoría de ingreso para los cobros de deudas
insert into public.categorias (id, nombre, emoji, color, tipo) values
  ('reembolsos', 'Reembolsos', '🤝', '#8b93a8', 'ingreso')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
