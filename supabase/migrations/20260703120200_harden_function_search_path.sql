-- ============================================================================
-- Hardening sicurezza — search_path immutabile sulle funzioni
-- Risolve l'advisor "function_search_path_mutable" di Supabase.
-- I riferimenti dentro le funzioni sono già schema-qualificati (public., auth.),
-- quindi un search_path vuoto non rompe la risoluzione dei nomi.
-- ============================================================================
alter function public.set_updated_at() set search_path = '';
alter function public.seed_demo(uuid) set search_path = '';
