-- Supplock: teachers send requests.
-- Sending a request never changes stock. It logs "Requested", notifies the
-- admins, and when it asks for more than is on hand it also sends an urgent
-- alert and adds an "Order more …" to-do (it is not blocked).

-- Internal helpers (not callable from the browser) ---------------------------
create or replace function public.add_log(p_school uuid, p_action text, p_teacher text, p_item text, p_qty text, p_room text, p_result text)
returns void language sql security definer set search_path = public as $$
  insert into public.log (school_id, action, teacher_name, item_label, qty, room, result)
  values (p_school, p_action, coalesce(p_teacher, ''), coalesce(p_item, ''), coalesce(p_qty, ''), coalesce(p_room, ''), coalesce(p_result, ''));
$$;

create or replace function public.notify_admins(p_school uuid, p_kind text, p_text text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (school_id, to_role, kind, text) values (p_school, 'admin', p_kind, p_text);
$$;

-- Adds an automatic to-do unless an open one with the same text exists.
create or replace function public.ensure_todo(p_school uuid, p_text text, p_item uuid, p_request uuid, p_link text, p_due date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.todos where school_id = p_school and not done and text = p_text) then
    insert into public.todos (school_id, text, auto, item_id, request_id, link, due)
    values (p_school, p_text, true, p_item, p_request, coalesce(p_link, ''), p_due);
  end if;
end $$;

-- The signed-in teacher, or an error.
create or replace function public.me_teacher() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Please sign in again'; end if;
  if p.role <> 'teacher' then raise exception 'Only teachers can send requests'; end if;
  return p;
end $$;

-- Cleans a short text field and enforces a length limit.
create or replace function public.clean_text(p text, p_max int, p_label text) returns text
language plpgsql immutable set search_path = public as $$
declare v text := trim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g'));
begin
  if length(v) > p_max then raise exception '% is too long (% characters max)', p_label, p_max; end if;
  return v;
end $$;

-- Teachers can't read the laptops table, but the request form shows how many are free.
create or replace function public.laptops_available() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.laptops where school_id = public.my_school_id() and status = 'available';
$$;

-- Requests --------------------------------------------------------------------
create or replace function public.request_supply(p_item uuid, p_qty int, p_room text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.profiles := public.me_teacher();
  it public.items;
  v_room text := public.clean_text(p_room, 60, 'Classroom');
  v_note text := left(trim(coalesce(p_note, '')), 500);
  r uuid;
begin
  if p_qty is null or p_qty < 1 or p_qty > 999 then raise exception 'Pick a number from 1 to 999'; end if;
  select * into it from public.items where id = p_item and school_id = t.school_id;
  if it.id is null then raise exception 'That item is no longer in the inventory'; end if;

  insert into public.requests (school_id, teacher_id, kind, qty, room, note, item_id, item_name)
  values (t.school_id, t.id, 'supply', p_qty, v_room, v_note, it.id, it.name)
  returning id into r;

  perform public.add_log(t.school_id, 'Requested', t.name, it.name, p_qty::text, v_room,
    it.qty || ' ' || it.unit || case when p_qty > it.qty then ' · exceeds stock' else '' end);
  perform public.notify_admins(t.school_id, 'request', 'New request from ' || t.name || ': ' || p_qty || ' ' || it.name);
  if p_qty > it.qty then
    perform public.notify_admins(t.school_id, 'urgent', '⚠️ Request from ' || t.name || ' exceeds current stock for ' || it.name);
    perform public.ensure_todo(t.school_id, 'Order more ' || it.name, it.id, null, '', null);
  end if;
  return r;
end $$;

create or replace function public.request_custom(p_name text, p_qty int, p_url text, p_needed_by date, p_room text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.profiles := public.me_teacher();
  v_name text := public.clean_text(p_name, 120, 'Item name');
  v_url text := trim(coalesce(p_url, ''));
  v_room text := public.clean_text(p_room, 60, 'Classroom');
  v_note text := left(trim(coalesce(p_note, '')), 500);
  r uuid;
begin
  if v_name = '' then raise exception 'Add the item name'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 999 then raise exception 'Pick a number from 1 to 999'; end if;
  if length(v_url) > 1000 then raise exception 'That link is too long'; end if;
  -- Only web links, so a pasted link can't run anything when the admin opens it.
  if v_url <> '' and v_url !~* '^https?://' then v_url := 'https://' || v_url; end if;
  if v_url <> '' and v_url !~* '^https?://[^\s/]+\.[^\s]+$' then raise exception 'That product link doesn''t look right'; end if;

  insert into public.requests (school_id, teacher_id, kind, qty, room, note, name, url, needed_by)
  values (t.school_id, t.id, 'custom', p_qty, v_room, v_note, v_name, v_url, p_needed_by)
  returning id into r;

  if v_url <> '' then perform public.ensure_todo(t.school_id, 'Order ' || v_name, null, r, v_url, p_needed_by); end if;
  perform public.add_log(t.school_id, 'Requested', t.name, 'Custom: ' || v_name, p_qty::text, v_room, '');
  perform public.notify_admins(t.school_id, 'request', 'New custom request from ' || t.name || ': ' || v_name);
  return r;
end $$;

create or replace function public.request_laptop(p_type text, p_qty int, p_from date, p_to date, p_room text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.profiles := public.me_teacher();
  v_room text := public.clean_text(p_room, 60, 'Classroom');
  v_note text := left(trim(coalesce(p_note, '')), 500);
  v_qty int := case when p_type = 'full' then 1 else p_qty end;
  v_free int;
  r uuid;
begin
  if p_type not in ('temp', 'full') then raise exception 'Pick temporary checkout or full-time class use'; end if;
  if v_qty is null or v_qty < 1 or v_qty > 999 then raise exception 'Pick a number from 1 to 999'; end if;
  if p_type = 'full' and v_room = '' then raise exception 'Classroom is required for full-time class use'; end if;
  if p_type = 'temp' and (p_from is null or p_to is null) then raise exception 'Pick the checkout dates'; end if;
  if p_type = 'temp' and p_to < p_from then raise exception 'The return date is before the start date'; end if;

  insert into public.requests (school_id, teacher_id, kind, qty, room, note, laptop_type, from_date, to_date)
  values (t.school_id, t.id, 'laptop', v_qty, v_room, v_note, p_type,
          case when p_type = 'temp' then p_from end, case when p_type = 'temp' then p_to end)
  returning id into r;

  perform public.add_log(t.school_id, 'Requested', t.name,
    case when p_type = 'full' then 'Laptop · full-time class use' else 'Laptops · temporary checkout' end, v_qty::text, v_room, '');
  perform public.notify_admins(t.school_id, 'request', 'New laptop request from ' || t.name);
  select count(*) into v_free from public.laptops where school_id = t.school_id and status = 'available';
  if v_qty > v_free then
    perform public.notify_admins(t.school_id, 'urgent', '⚠️ Request from ' || t.name || ' exceeds current stock for Laptops');
  end if;
  return r;
end $$;

-- Permissions -----------------------------------------------------------------
revoke execute on function public.add_log(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.ensure_todo(uuid, text, uuid, uuid, text, date) from public, anon, authenticated;
revoke execute on function public.me_teacher() from public, anon, authenticated;
revoke execute on function public.clean_text(text, int, text) from public, anon, authenticated;

revoke execute on function public.laptops_available() from public, anon;
revoke execute on function public.request_supply(uuid, int, text, text) from public, anon;
revoke execute on function public.request_custom(text, int, text, date, text, text) from public, anon;
revoke execute on function public.request_laptop(text, int, date, date, text, text) from public, anon;
grant execute on function public.laptops_available() to authenticated;
grant execute on function public.request_supply(uuid, int, text, text) to authenticated;
grant execute on function public.request_custom(text, int, text, date, text, text) to authenticated;
grant execute on function public.request_laptop(text, int, date, date, text, text) to authenticated;
