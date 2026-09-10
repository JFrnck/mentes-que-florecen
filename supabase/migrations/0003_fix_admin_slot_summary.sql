-- Corrige ambigüedad de columnas: "starts_at"/"capacity"/"booked_count" en el
-- SELECT colisionaban con los nombres de columna de RETURNS TABLE.
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
