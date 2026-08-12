-- ============================================================
-- Migración 12-08-2026 (4): categoría de GASTO "Apuestas"
-- (convive con la de ingreso del mismo nombre; la Edge Function
--  desempata por el tipo del movimiento)
-- Pega este script en: SQL Editor > New query > Run
-- ============================================================

insert into public.categorias (id, nombre, emoji, color, tipo) values
  ('apuestas_gasto', 'Apuestas', '🎰', '#c9a227', 'gasto')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
