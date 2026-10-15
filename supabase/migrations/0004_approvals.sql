-- Supplock: admins approve, deny and follow up on requests.
-- Stock is only deducted on approval, never below zero. After a deduction, a
-- low level sends a low-stock alert with a suggested reorder and adds an
-- "Order more …" to-do. Teachers are notified at every step.

-- Internal helpers (not callable from the browser) ---------------------------
create or replace function public.notify_user(p_school uuid, p_user uuid, p_kind text, p_text text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (school_id, to_user_id, kind, text)
  select p_school, p_user, p_kind, p_text where p_user is not null;
$$;

-- The signed-in admin, or an error.
create or replace function public.me_admin() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Please sign in again'; end if;
  if p.role <> 'admin' then raise exception 'Only admins can do that'; end if;
  return p;
end $$;

-- out = 0; critical <= floor(threshold/3); low < threshold; else ok.
create or replace function public.item_level(p_qty int, p_threshold int) returns text
language sql immutable set search_path = public as $$
  select case when p_qty = 0 then 'out' when p_qty <= p_threshold / 3 then 'critical' when p_qty < p_threshold then 'low' else 'ok' end;
$$;

-- "box" → "boxes", "pack" → "packs"; names with a dash stay as they are.
create or replace function public.pack_plural(p_pack text, p_n int) returns text
language sql immutable set search_path = public as $$
  select case when p_n > 1 and position('-' in p_pack) = 0
              then p_pack || case when p_pack ~ '[xs]$' then 'es' else 's' end
              else p_pack end;
$$;

-- "Order 2 boxes = 20 reams": packs = max(1, ceil((threshold×2 − qty) / pack_size)).
create or replace function public.reorder_text(it public.items) returns text
language sql immutable set search_path = public as $$
  select 'Order ' || n || ' ' || public.pack_plural(it.pack_name, n) || ' = ' || (n * it.pack_size) || ' ' || it.unit
  from (select greatest(1, ceil((it.low_threshold * 2 - it.qty)::numeric / it.pack_size)::int) as n) x;
$$;

-- After stock goes down: alert the admins and add the "Order more" to-do.
create or replace function public.check_low(it public.items) returns void
language plpgsql security definer set search_path = public as $$
declare lv text := public.item_level(it.qty, it.low_threshold);
begin
  if lv = 'ok' then return; end if;
  perform public.notify_admins(it.school_id, 'low',
    it.name || case when lv = 'out' then ' is out of stock' else ' is low' end
    || ' (' || it.qty || ' ' || it.unit || ' left). Suggested: ' || lower(public.reorder_text(it)));
  perform public.ensure_todo(it.school_id, 'Order more ' || it.name, it.id, null, '', null);
end $$;

-- "Tue, Nov 3", like the app.
create or replace function public.nice_date(d date) returns text
language sql immutable set search_path = public as $$
  select to_char(d, 'Dy, Mon FMDD');
$$;

create or replace function public.request_title(r public.requests) returns text
language sql immutable set search_path = public as $$
  select case r.kind when 'supply' then r.item_name when 'custom' then r.name
         else case when r.laptop_type = 'full' then 'Laptop · full-time class use' else 'Laptops · temporary checkout' end end;
$$;

-- Free laptops in a school (for log lines).
create or replace function public.laptops_free(p_school uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.laptops where school_id = p_school and status = 'available';
$$;

-- Loads a request from the admin's school, locked for the change.
create or replace function public.lock_request(p_id uuid, p_school uuid) returns public.requests
language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_id and school_id = p_school for update;
  if r.id is null then raise exception 'That request no longer exists'; end if;
  return r;
end $$;

-- Approve ---------------------------------------------------------------------
-- p_qty lets the admin change the amount before approving (null keeps it).
create or replace function public.approve_request(p_id uuid, p_qty int default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  r public.requests := public.lock_request(p_id, a.school_id);
  t text;
  it public.items;
  v_taken int;
  v_tags text[];
begin
  if r.status <> 'pending' then raise exception 'This request was already handled'; end if;
  if p_qty is not null then
    if p_qty < 1 or p_qty > 999 then raise exception 'Pick a number from 1 to 999'; end if;
    if r.kind = 'laptop' and r.laptop_type = 'full' and p_qty <> 1 then raise exception 'Full-time class use is always 1 laptop'; end if;
    r.qty := p_qty;
  end if;
  select name into t from public.profiles where id = r.teacher_id;

  if r.kind = 'supply' then
    select * into it from public.items where id = r.item_id and school_id = a.school_id for update;
    if it.id is null then raise exception 'That item was removed from the inventory, so this request can only be denied'; end if;
    v_taken := least(r.qty, it.qty);
    update public.items set qty = greatest(0, qty - r.qty) where id = it.id returning * into it;
    update public.requests set status = 'approved', qty = r.qty, placement = 'pending' where id = r.id;
    perform public.add_log(a.school_id, 'Approved', t, it.name, r.qty::text, r.room, 'by ' || a.name);
    perform public.add_log(a.school_id, 'Deducted', t, it.name, (-v_taken)::text, r.room,
      it.qty || ' ' || it.unit || case when it.qty = 0 then ' · out of stock' else '' end);
    perform public.check_low(it);
    perform public.notify_user(a.school_id, r.teacher_id, 'status', 'Your request for ' || r.qty || ' ' || it.name || ' was approved');

  elsif r.kind = 'custom' then
    update public.requests set status = 'approved', qty = r.qty where id = r.id;
    perform public.add_log(a.school_id, 'Approved', t, 'Custom: ' || r.name, r.qty::text, r.room, 'pending order');
    if r.url = '' then perform public.ensure_todo(a.school_id, 'Order ' || r.name, null, r.id, '', r.needed_by); end if;
    perform public.notify_user(a.school_id, r.teacher_id, 'status', 'Your request for ' || r.name || ' was approved and is pending order');

  else
    -- Hand out free laptops by tag. If fewer are free than asked, the admin can lower the number first.
    if public.laptops_free(a.school_id) < r.qty then
      raise exception 'Only % laptop(s) are available. Lower the number or deny the request', public.laptops_free(a.school_id);
    end if;
    with picked as (
      select id from public.laptops where school_id = a.school_id and status = 'available'
      order by tag limit r.qty for update
    ), handed as (
      update public.laptops l set
        status = case when r.laptop_type = 'full' then 'assigned' else 'out' end,
        holder_id = r.teacher_id, room = r.room,
        due_date = case when r.laptop_type = 'full' then null else r.to_date end
      from picked where l.id = picked.id
      returning l.tag
    )
    select coalesce(array_agg(tag order by tag), '{}') into v_tags from handed;
    update public.requests set status = 'approved', qty = r.qty, laptop_tags = v_tags, placement = 'pending' where id = r.id;
    perform public.add_log(a.school_id, case when r.laptop_type = 'full' then 'Laptop assigned' else 'Laptop checkout' end, t,
      array_to_string(v_tags, ', '), r.qty::text, r.room, public.laptops_free(a.school_id) || ' available');
    perform public.notify_user(a.school_id, r.teacher_id, 'status', 'Your laptop request was approved: ' || array_to_string(v_tags, ', '));
  end if;
end $$;

-- Deny --------------------------------------------------------------------------
create or replace function public.deny_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  r public.requests := public.lock_request(p_id, a.school_id);
  t text;
begin
  if r.status <> 'pending' then raise exception 'This request was already handled'; end if;
  select name into t from public.profiles where id = r.teacher_id;
  update public.requests set status = 'denied' where id = r.id;
  perform public.add_log(a.school_id, 'Denied', t, public.request_title(r), r.qty::text, r.room, 'inventory unchanged');
  update public.todos set done = true where school_id = a.school_id and request_id = r.id;
  perform public.notify_user(a.school_id, r.teacher_id, 'status', 'Your request for ' || public.request_title(r) || ' was denied');
end $$;

-- Custom orders: Approved → Ordered (with ETA) → Delivered ----------------------------
create or replace function public.custom_ordered(p_id uuid, p_eta date)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  r public.requests := public.lock_request(p_id, a.school_id);
  t text;
begin
  if r.kind <> 'custom' or r.status <> 'approved' then raise exception 'Only approved custom requests can be marked ordered'; end if;
  if p_eta is null then raise exception 'Pick the expected arrival date'; end if;
  select name into t from public.profiles where id = r.teacher_id;
  update public.requests set status = 'ordered', eta = p_eta where id = r.id;
  update public.todos set done = true where school_id = a.school_id and request_id = r.id;
  perform public.add_log(a.school_id, 'Reorder placed', t, 'Custom: ' || r.name, r.qty::text, r.room, 'arrives ' || public.nice_date(p_eta));
  perform public.notify_user(a.school_id, r.teacher_id, 'status',
    'Your request for ' || r.name || ' has been ordered — expected to arrive ' || public.nice_date(p_eta) || '.');
end $$;

create or replace function public.custom_delivered(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  r public.requests := public.lock_request(p_id, a.school_id);
  t text;
begin
  if r.kind <> 'custom' or r.status <> 'ordered' then raise exception 'Only ordered custom requests can be marked received'; end if;
  select name into t from public.profiles where id = r.teacher_id;
  update public.requests set status = 'delivered', placement = 'pending' where id = r.id;
  perform public.add_log(a.school_id, 'Received', t, 'Custom: ' || r.name, r.qty::text, r.room, 'ready for pickup');
  perform public.notify_user(a.school_id, r.teacher_id, 'status',
    'Your ' || r.name || ' has arrived and is ready for pickup at the front office.');
end $$;

-- Notifications -------------------------------------------------------------------
-- Marks the bell as read: your own notices, plus the admin inbox if you're an admin.
create or replace function public.mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update public.notifications set read = true
  where school_id = public.my_school_id() and not read
    and (to_user_id = auth.uid() or (to_role = 'admin' and public.is_admin()));
$$;

-- Permissions -----------------------------------------------------------------
revoke execute on function public.notify_user(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.me_admin() from public, anon, authenticated;
revoke execute on function public.check_low(public.items) from public, anon, authenticated;
revoke execute on function public.lock_request(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.laptops_free(uuid) from public, anon, authenticated;

revoke execute on function public.approve_request(uuid, int) from public, anon;
revoke execute on function public.deny_request(uuid) from public, anon;
revoke execute on function public.custom_ordered(uuid, date) from public, anon;
revoke execute on function public.custom_delivered(uuid) from public, anon;
revoke execute on function public.mark_notifications_read() from public, anon;
grant execute on function public.approve_request(uuid, int) to authenticated;
grant execute on function public.deny_request(uuid) to authenticated;
grant execute on function public.custom_ordered(uuid, date) to authenticated;
grant execute on function public.custom_delivered(uuid) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
