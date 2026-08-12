-- ============================================================
-- Migración 12-08-2026 (2): presupuestos mensuales por categoría
-- Pega este script completo en: SQL Editor > New query > Run
-- (es seguro ejecutarlo más de una vez)
-- ============================================================

create table if not exists public.presupuestos (
  categoria_id text primary key references public.categorias(id),
  limite       numeric(10,2) not null check (limite > 0)
);

alter table public.presupuestos enable row level security;

drop policy if exists "usuario autenticado - presupuestos" on public.presupuestos;
create policy "usuario autenticado - presupuestos"
  on public.presupuestos for all
  to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
