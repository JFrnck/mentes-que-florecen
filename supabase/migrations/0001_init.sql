-- Mentes que Florecen — esquema inicial
-- Franjas, psicólogos, reservas, lista de espera, límite de intentos y funciones
-- de acceso (todo el acceso de escritura/lectura sensible pasa por funciones
-- security definer; no hay policies de lectura en bookings/waitlist).

create extension if not exists pgcrypto;

-- =========================================================
-- Tablas
-- =========================================================

create table if not exists slots (
  id           serial primary key,
  starts_at    timestamptz not null unique,
  capacity     int not null default 10,
  booked_count int not null default 0,
  constraint capacity_in_range check (booked_count >= 0 and booked_count <= capacity)
);

create table if not exists psychologists (
  seat_number int primary key check (seat_number between 1 and 10),
  full_name   text not null,
  cpsp        text not null,
  specialty   text not null
);

create table if not exists bookings (
  id                    uuid primary key default gen_random_uuid(),
  booking_code          text not null unique,
  slot_id               int not null references slots(id),
  seat_number           int not null references psychologists(seat_number),
  full_name             text not null,
  age                   int not null check (age between 14 and 29),
  email                 text not null,
  phone                 text not null,
  document_id           text not null,
  first_time            text check (first_time in ('si', 'no') or first_time is null),
  notes                 text,
  guardian_name         text,
  guardian_phone        text,
  guardian_consent      boolean not null default false,
  consent               boolean not null default false,
  status                text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  attended              boolean not null default false,
  confirmation_sent_at  timestamptz,
  reminder_24h_sent_at  timestamptz,
  reminder_1h_sent_at   timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists bookings_slot_id_idx on bookings (slot_id) where status = 'confirmed';
create unique index if not exists bookings_one_per_email on bookings (lower(email)) where status = 'confirmed';

create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  full_name  text,
  created_at timestamptz not null default now()
);

-- Límite de intentos para /cancelar (consulta y cancelación por código)
create table if not exists lookup_attempts (
  id           bigserial primary key,
  ip_hash      text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists lookup_attempts_ip_time_idx on lookup_attempts (ip_hash, attempted_at);

-- Secretos internos (nunca expuestos vía RLS; solo lo leen funciones security definer)
create table if not exists app_secrets (
  name  text primary key,
  value text not null
);

-- =========================================================
-- Row Level Security
-- =========================================================

alter table slots enable row level security;
drop policy if exists "slots publicos" on slots;
create policy "slots publicos" on slots for select using (true);

alter table psychologists enable row level security;
drop policy if exists "psicologos publicos" on psychologists;
create policy "psicologos publicos" on psychologists for select using (true);

alter table waitlist enable row level security;
drop policy if exists "cualquiera se une a la waitlist" on waitlist;
create policy "cualquiera se une a la waitlist" on waitlist for insert with check (true);

alter table bookings enable row level security;
alter table lookup_attempts enable row level security;
alter table app_secrets enable row level security;
-- bookings, lookup_attempts y app_secrets: sin policies = bloqueado para
-- anon/authenticated. Todo acceso pasa por funciones security definer.

-- =========================================================
-- Funciones
-- =========================================================

-- Límite de intentos: máx. 20 consultas/cancelaciones por IP cada hora.
create or replace function _check_rate_limit(p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from lookup_attempts
      where ip_hash = p_ip_hash and attempted_at > now() - interval '1 hour') >= 20 then
    raise exception 'RATE_LIMITED';
  end if;
  insert into lookup_attempts (ip_hash) values (p_ip_hash);
end;
$$;

-- Reserva atómica de una franja (evita condiciones de carrera con FOR UPDATE).
create or replace function book_slot(
  p_slot_id int,
  p_full_name text,
  p_age int,
  p_email text,
  p_phone text,
  p_document_id text,
  p_first_time text,
  p_notes text,
  p_guardian_name text,
  p_guardian_phone text,
  p_guardian_consent boolean,
  p_consent boolean
) returns table (
  booking_code text,
  full_name text,
  email text,
  starts_at timestamptz,
  age int,
  guardian_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot slots;
  v_seat int;
  v_code text;
  v_constraint text;
begin
  if p_age is null or p_age < 14 or p_age > 29 then
    raise exception 'AGE_OUT_OF_RANGE';
  end if;
  if not coalesce(p_consent, false) then
    raise exception 'CONSENT_REQUIRED';
  end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 9 then
    raise exception 'INVALID_PHONE';
  end if;
  if p_age < 18 and (
       p_guardian_name is null or trim(p_guardian_name) = ''
    or p_guardian_phone is null or length(regexp_replace(p_guardian_phone, '\D', '', 'g')) < 9
    or not coalesce(p_guardian_consent, false)
  ) then
    raise exception 'GUARDIAN_REQUIRED';
  end if;

  select * into v_slot from slots where id = p_slot_id for update;
  if v_slot is null then
    raise exception 'SLOT_NOT_FOUND';
  end if;
  if v_slot.booked_count >= v_slot.capacity then
    raise exception 'SLOT_FULL';
  end if;

  v_seat := v_slot.booked_count + 1;

  loop
    v_code := 'MQF-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    begin
      insert into bookings (
        booking_code, slot_id, seat_number, full_name, age, email, phone, document_id,
        first_time, notes, guardian_name, guardian_phone, guardian_consent, consent
      ) values (
        v_code, p_slot_id, v_seat, trim(p_full_name), p_age, lower(trim(p_email)), trim(p_phone), trim(p_document_id),
        nullif(p_first_time, ''), nullif(trim(p_notes), ''), nullif(trim(p_guardian_name), ''),
        nullif(trim(p_guardian_phone), ''), coalesce(p_guardian_consent, false), p_consent
      );
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'bookings_one_per_email' then
        raise exception 'EMAIL_ALREADY_BOOKED';
      end if;
      -- si fue el codigo el que colisiono, se reintenta con otro codigo
    end;
  end loop;

  update slots set booked_count = booked_count + 1 where id = p_slot_id;

  return query select v_code, trim(p_full_name), lower(trim(p_email)), v_slot.starts_at, p_age, nullif(trim(p_guardian_name), '');
end;
$$;

-- Consulta de una reserva por código (sin exponer datos de otras personas).
create or replace function get_booking_by_code(p_code text, p_ip_hash text)
returns table (
  booking_code text,
  full_name text,
  starts_at timestamptz,
  status text,
  age int,
  guardian_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _check_rate_limit(p_ip_hash);

  return query
    select b.booking_code, b.full_name, s.starts_at, b.status, b.age, b.guardian_name
    from bookings b
    join slots s on s.id = b.slot_id
    where b.booking_code = upper(trim(p_code));
end;
$$;

-- Cancela una reserva por código y libera el cupo.
create or replace function cancel_booking_by_code(p_code text, p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings;
begin
  perform _check_rate_limit(p_ip_hash);

  select * into v_booking from bookings
  where booking_code = upper(trim(p_code)) and status = 'confirmed';

  if v_booking is null then
    raise exception 'BOOKING_NOT_FOUND_OR_ALREADY_CANCELLED';
  end if;

  update bookings set status = 'cancelled', attended = false where id = v_booking.id;
  update slots set booked_count = booked_count - 1 where id = v_booking.slot_id;
end;
$$;

-- --- Administración: gated por una clave interna (app_secrets.admin_api_key),
-- no por la service_role key. La clave la conoce solo el server de Next.js.

create or replace function _admin_check(p_admin_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_key is null or p_admin_key = '' or p_admin_key <> (
    select value from app_secrets where name = 'admin_api_key'
  ) then
    raise exception 'UNAUTHORIZED';
  end if;
end;
$$;

create or replace function admin_list_bookings(p_admin_key text)
returns table (
  id uuid, booking_code text, starts_at timestamptz, full_name text, age int,
  email text, phone text, document_id text, seat_number int, psychologist_name text,
  status text, attended boolean, first_time text, notes text, guardian_name text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _admin_check(p_admin_key);
  return query
    select b.id, b.booking_code, s.starts_at, b.full_name, b.age, b.email, b.phone, b.document_id,
           b.seat_number, p.full_name, b.status, b.attended, b.first_time, b.notes, b.guardian_name, b.created_at
    from bookings b
    join slots s on s.id = b.slot_id
    join psychologists p on p.seat_number = b.seat_number
    order by s.starts_at, b.full_name;
end;
$$;

create or replace function admin_slot_summary(p_admin_key text)
returns table (slot_id int, starts_at timestamptz, capacity int, booked_count int)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _admin_check(p_admin_key);
  return query select s.id, s.starts_at, s.capacity, s.booked_count from slots s order by s.starts_at;
end;
$$;

create or replace function admin_set_attended(p_admin_key text, p_id uuid, p_attended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _admin_check(p_admin_key);
  update bookings set attended = p_attended where id = p_id;
end;
$$;

create or replace function admin_cancel_booking(p_admin_key text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings;
begin
  perform _admin_check(p_admin_key);
  select * into v_booking from bookings where id = p_id and status = 'confirmed';
  if v_booking is null then
    raise exception 'BOOKING_NOT_FOUND_OR_ALREADY_CANCELLED';
  end if;
  update bookings set status = 'cancelled', attended = false where id = p_id;
  update slots set booked_count = booked_count - 1 where id = v_booking.slot_id;
end;
$$;

-- =========================================================
-- Permisos
-- =========================================================

grant execute on function book_slot to anon, authenticated;
grant execute on function get_booking_by_code to anon, authenticated;
grant execute on function cancel_booking_by_code to anon, authenticated;
grant execute on function admin_list_bookings to anon, authenticated;
grant execute on function admin_slot_summary to anon, authenticated;
grant execute on function admin_set_attended to anon, authenticated;
grant execute on function admin_cancel_booking to anon, authenticated;
-- _check_rate_limit y _admin_check son helpers internos, no se otorgan a roles publicos.

-- =========================================================
-- Seed: franjas del 19/09/2026 y los 10 psicólogos de Consultoría Murillo
-- =========================================================

insert into slots (starts_at, capacity)
select g, 10
from generate_series(
  '2026-09-19 09:00:00-05'::timestamptz,
  '2026-09-19 16:30:00-05'::timestamptz,
  '30 minutes'::interval
) g
where g <> '2026-09-19 13:00:00-05'::timestamptz
on conflict (starts_at) do nothing;

insert into psychologists (seat_number, full_name, cpsp, specialty) values
  (1,  'Ps. Lizbeth Medina Zeballos',        '50574', 'Psicóloga · Maestría en Neuropsicología Clínica · Psicoterapeuta'),
  (2,  'Ps. Fabrissio Mendoza Apaza',        '55608', 'Especialidad en Psicología Clínica y de la Salud · Especialización en Psicología Oncológica'),
  (3,  'Ps. Yamil Sernaque Uscamayta',       '67147', 'Psicólogo clínico · Maestría en Terapias de Tercera Generación'),
  (4,  'Ps. Niami Marquez Libandro',         '12499', 'Psicóloga clínica y educativa · Psicoterapeuta Gestalt · Especialista en PNL'),
  (5,  'Ps. Marissel Guzmán Chiroque',       '47678', 'Psicoterapeuta TREC · Especialista en neuropsicología'),
  (6,  'Ps. Rosa del Carmen Taya Gamero',    '49024', 'Psicoterapeuta cognitivo conductual y terapia racional emotivo conductual'),
  (7,  'Ps. Kevin Amesquita Ramos',          '65518', 'Maestría en Neurociencias Cognitivas y del Comportamiento · Especialización en ADOS-2 y ADI-R (TEA)'),
  (8,  'Ps. Mélany Salas Ticona',            '71178', 'Psicóloga · Maestría en Psicología Clínica-Educativa Infantil'),
  (9,  'Ps. Cristina Jara Navarro',          '35549', 'Maestría en Psicología Clínica-Educativa del Niño y del Adolescente · Psicoterapia sistémica en parejas y familia'),
  (10, 'Ps. Néstor Iván Villanueva Junco',   '62423', 'Especialista en psicoterapia cognitivo-conductual · Violencia familiar · TCC en niños y adolescentes')
on conflict (seat_number) do nothing;
