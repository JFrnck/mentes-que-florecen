-- Pipeline de correos: webhook (insert en bookings) + recordatorios (pg_cron).
-- Llaman a la Edge Function `send-email` (Deno) que envía vía Brevo.
--
-- El "Bearer" usado aquí es la publishable/anon key del proyecto: es pública
-- por diseño (la misma que usa el frontend), no un secreto.
--
-- IMPORTANTE: hasta que se despliegue la Edge Function con
-- `supabase functions deploy send-email` y se configure `BREVO_API_KEY` con
-- `supabase secrets set`, estas llamadas fallarán en silencio (pg_net es
-- asíncrono: no bloquea ni rompe una reserva si el correo no sale).

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function _notify_booking_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://udfbznrwauedihcmlsnd.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_HKZjBQRwGmgcAcHvRyyHwA_R9PEHVJM'
    ),
    body := jsonb_build_object('type', 'INSERT', 'record', jsonb_build_object('id', new.id))
  );
  return new;
end;
$$;

drop trigger if exists booking_confirmation_trigger on bookings;
create trigger booking_confirmation_trigger
after insert on bookings
for each row execute function _notify_booking_confirmation();

select cron.unschedule('recordatorios-mqf') where exists (
  select 1 from cron.job where jobname = 'recordatorios-mqf'
);

select cron.schedule(
  'recordatorios-mqf',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := 'https://udfbznrwauedihcmlsnd.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_HKZjBQRwGmgcAcHvRyyHwA_R9PEHVJM'
    ),
    body := jsonb_build_object('kind', kind, 'booking_id', id)
  )
  from (
    select b.id,
           case
             when s.starts_at - now() between interval '23 hours' and interval '25 hours'
                  and b.reminder_24h_sent_at is null then 'reminder_24h'
             when s.starts_at - now() between interval '45 minutes' and interval '75 minutes'
                  and b.reminder_1h_sent_at is null then 'reminder_1h'
           end as kind
    from bookings b
    join slots s on s.id = b.slot_id
    where b.status = 'confirmed'
  ) q
  where kind is not null;
  $cron$
);
