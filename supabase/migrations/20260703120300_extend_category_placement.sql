-- ============================================================================
-- Estende i valori ammessi di category e placement sui tornei.
--  · category: + King, Queen (formato "king/queen of the beach": si cambia
--    compagno ad ogni partita e si vincono i set singolarmente)
--  · placement: + Semifinale (tra 3° e Quarti)
-- I nuovi insiemi sono superset di quelli precedenti: nessuna riga esistente
-- viola il vincolo aggiornato.
-- ============================================================================
alter table public.tournaments drop constraint tournaments_category_check;
alter table public.tournaments add constraint tournaments_category_check
  check (category in ('Amatoriale','Open','Serie','Pro','King','Queen'));

alter table public.tournaments drop constraint tournaments_placement_check;
alter table public.tournaments add constraint tournaments_placement_check
  check (placement in ('1° 🏆','2°','3°','Semifinale','Quarti','Ottavi','Gironi','In corso'));
