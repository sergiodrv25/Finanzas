-- ============================================================
-- Migración 12-08-2026: soporte de INGRESOS
-- Pega este script completo en: SQL Editor > New query > Run
-- (es seguro ejecutarlo más de una vez)
-- ============================================================

-- Tipo de movimiento en gastos: 'gasto' (por defecto) o 'ingreso'.
-- Todos los registros existentes quedan como 'gasto'.
alter table public.gastos
  add column if not exists tipo text not null default 'gasto'
  check (tipo in ('gasto', 'ingreso'));

-- Las categorías también tienen tipo, para separar las de gasto
-- de las de ingreso en la interfaz.
alter table public.categorias
  add column if not exists tipo text not null default 'gasto'
  check (tipo in ('gasto', 'ingreso'));

-- Categorías de ingreso
insert into public.categorias (id, nombre, emoji, color, tipo) values
  ('nomina',         'Nómina',         '💼', '#14a5a5', 'ingreso'),
  ('apuestas',       'Apuestas',       '🎲', '#c9a227', 'ingreso'),
  ('inversiones',    'Inversiones',    '📈', '#5aa64c', 'ingreso'),
  ('otros_ingresos', 'Otros ingresos', '💰', '#8a8f98', 'ingreso')
on conflict (id) do nothing;
