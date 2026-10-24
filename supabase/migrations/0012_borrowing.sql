-- Supplock: borrowing.
-- Some closet items (a glue gun, a label maker) are lent out, not used up.
-- The admin marks those items "lend it out". A teacher asks to borrow one and
-- picks when they'll bring it back; approving takes it off the shelf (without
-- low-stock alerts, since it's coming back), and when the teacher marks it
-- given back it goes back on the shelf. A borrow is a supply request with a
-- return date (to_date); returned_at is set when it comes back.

alter table public.items add column if not exists lendable boolean not null default false;
alter table public.requests add column if not exists returned_at timestamptz;
create index if not exists requests_borrowed_idx on public.requests (school_id, to_date)
  where kind = 'supply' and status = 'approved' and to_date is not null and returned_at is null;

-- Teachers see whether an item is lent out, and when the next one is due back.
create or replace view public.catalog with (security_barrier = true) as
  select i.id, i.school_id, i.name, i.category, i.unit, i.qty, i.low_threshold, i.icon, i.lendable,
    (select min(r.to_date) from public.requests r
     where r.item_id = i.id and r.kind = 'supply' and r.status = 'approved' and r.to_date is not null and r.returned_at is null) as back_on
  from public.items i
  where i.school_id = public.my_school_id();

-- Add or edit, now with "lend it out". p_lendable null keeps the current setting.
drop function if exists public.save_item(uuid, text, text, text, int, int, text, text, text, int, numeric, text);
create or replace function public.save_item(
  p_id uuid, p_name text, p_category text, p_unit text, p_qty int, p_low_threshold int,
  p_vendor text, p_url text, p_pack_name text, p_pack_size int, p_price numeric, p_icon text, p_lendable boolean default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  v_name text := public.clean_text(p_name, 120, 'Name');
  v_cat text := coalesce(nullif(public.clean_text(p_category, 60, 'Category'), ''), 'Classroom');
  v_unit text := coalesce(nullif(public.clean_text(p_unit, 40, 'Base unit'), ''), 'units');
  v_vendor text := public.clean_text(p_vendor, 80, 'Vendor');
  v_url text := public.clean_url(p_url);
  v_pack text := coalesce(nullif(public.clean_text(p_pack_name, 40, 'Purchase unit'), ''), 'each');
  v_icon text := nullif(public.clean_text(p_icon, 40, 'Icon'), '');
  old public.items;
  it public.items;
begin
  if v_name = '' then raise exception 'Add the item name'; end if;
  if p_qty is null or p_qty < 0 or p_qty > 1000000 then raise exception 'Current quantity must be 0 or more'; end if;
  if p_low_threshold is null or p_low_threshold < 0 or p_low_threshold > 1000000 then raise exception 'Low-stock threshold must be 0 or more'; end if;
  if p_pack_size is null or p_pack_size < 1 or p_pack_size > 100000 then raise exception 'Units per purchase must be at least 1'; end if;
  if p_price is null or p_price < 0 or p_price > 100000 then raise exception 'Price must be 0 or more'; end if;
  if exists (select 1 from public.items where school_id = a.school_id and lower(name) = lower(v_name) and id is distinct from p_id) then
    raise exception 'There''s already an item called %', v_name;
  end if;

  if p_id is null then
    insert into public.items (school_id, name, category, unit, qty, low_threshold, vendor, url, pack_name, pack_size, price, icon, lendable)
    values (a.school_id, v_name, v_cat, v_unit, p_qty, p_low_threshold, v_vendor, v_url, v_pack, p_pack_size, round(p_price, 2), v_icon, coalesce(p_lendable, false))
    returning * into it;
    perform public.add_log(a.school_id, 'Item added', '', it.name, it.qty::text, '', it.qty || ' ' || it.unit);
    perform public.check_low(it);
  else
    select * into old from public.items where id = p_id and school_id = a.school_id for update;
    if old.id is null then raise exception 'That item no longer exists'; end if;
    update public.items set name = v_name, category = v_cat, unit = v_unit, qty = p_qty, low_threshold = p_low_threshold,
      vendor = v_vendor, url = v_url, pack_name = v_pack, pack_size = p_pack_size, price = round(p_price, 2), icon = v_icon,
      lendable = coalesce(p_lendable, old.lendable)
    where id = p_id returning * into it;
    if it.qty <> old.qty then
      perform public.add_log(a.school_id, 'Adjustment', '', it.name, (it.qty - old.qty)::text, '', it.qty || ' ' || it.unit);
    end if;
    if it.qty < old.qty or it.low_threshold > old.low_threshold then perform public.check_low(it); end if;
    perform public.close_order_todos(it);
  end if;
  return it.id;
end $$;

-- Lent-out items are borrowed, not requested.
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
  if it.lendable then raise exception 'Pick when you''ll bring the % back', it.name; end if;

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

-- A return date can't be in the past, or more than half a year away.
-- (The database runs on UTC, so "today" can be yesterday for a US teacher in the evening.)
create or replace function public.check_until(p_until date) returns void
language plpgsql stable set search_path = public as $$
begin
  if p_until is null then raise exception 'Pick when you''ll bring it back'; end if;
  if p_until < current_date - 1 then raise exception 'Pick a return date that isn''t in the past'; end if;
  if p_until > current_date + 183 then raise exception 'Pick a return date within the next 6 months'; end if;
end $$;

create or replace function public.request_borrow(p_item uuid, p_qty int, p_until date, p_room text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.profiles := public.me_teacher();
  it public.items;
  v_room text := public.clean_text(p_room, 60, 'Classroom');
  v_note text := left(trim(coalesce(p_note, '')), 500);
  r uuid;
begin
  if p_qty is null or p_qty < 1 or p_qty > 99 then raise exception 'Pick a number from 1 to 99'; end if;
  perform public.check_until(p_until);
  select * into it from public.items where id = p_item and school_id = t.school_id;
  if it.id is null then raise exception 'That item is no longer in the inventory'; end if;
  if not it.lendable then raise exception 'That item isn''t lent out. Request it instead'; end if;

  insert into public.requests (school_id, teacher_id, kind, qty, room, note, item_id, item_name, to_date)
  values (t.school_id, t.id, 'supply', p_qty, v_room, v_note, it.id, it.name, p_until)
  returning id into r;

  perform public.add_log(t.school_id, 'Requested', t.name, it.name || ' (borrow)', p_qty::text, v_room, 'back by ' || public.nice_date(p_until));
  perform public.notify_admins(t.school_id, 'request',
    'New request from ' || t.name || ': borrow ' || p_qty || ' ' || it.name || ' until ' || public.nice_date(p_until));
  return r;
end $$;

-- Approve: same as before, plus borrowing.
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

  if r.kind = 'supply' and r.to_date is not null then
    -- Borrow: it comes back, so only lend what's on the shelf and skip the low-stock alert.
    select * into it from public.items where id = r.item_id and school_id = a.school_id for update;
    if it.id is null then raise exception 'That item was removed from the inventory, so this request can only be denied'; end if;
    if r.qty > it.qty then
      raise exception 'Only % available right now. Lower the number or deny the request', it.qty;
    end if;
    update public.items set qty = qty - r.qty where id = it.id returning * into it;
    update public.requests set status = 'approved', qty = r.qty where id = r.id;
    perform public.add_log(a.school_id, 'Borrowed', t, it.name, r.qty::text, r.room,
      'back by ' || public.nice_date(r.to_date) || ' · ' || it.qty || ' ' || it.unit || ' on the shelf');
    perform public.notify_user(a.school_id, r.teacher_id, 'status',
      'Your request to borrow ' || r.qty || ' ' || it.name || ' was approved. Please bring it back by ' || public.nice_date(r.to_date) || '.');

  elsif r.kind = 'supply' then
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

-- Loads a borrow that's still out, for the teacher who has it or any admin in the school.
create or replace function public.lock_borrow(p_id uuid) returns public.requests
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  r public.requests;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Please sign in again'; end if;
  if not public.school_active(p.school_id) then
    raise exception 'Your school''s Supplock plan isn''t active right now';
  end if;
  select * into r from public.requests where id = p_id and school_id = p.school_id for update;
  if r.id is null or (r.teacher_id is distinct from p.id and p.role <> 'admin') then raise exception 'That borrow no longer exists'; end if;
  if r.kind <> 'supply' or r.to_date is null or r.status <> 'approved' then raise exception 'That isn''t something you borrowed'; end if;
  if r.returned_at is not null then raise exception 'That was already given back'; end if;
  return r;
end $$;

-- Given back: it goes back on the shelf.
create or replace function public.return_borrowed(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.requests := public.lock_borrow(p_id);
  me public.profiles;
  t text;
  it public.items;
begin
  select * into me from public.profiles where id = auth.uid();
  select name into t from public.profiles where id = r.teacher_id;
  update public.requests set returned_at = now() where id = r.id;
  update public.items set qty = qty + r.qty where id = r.item_id returning * into it;
  if it.id is not null then perform public.close_order_todos(it); end if;
  perform public.add_log(r.school_id, 'Returned', t, r.item_name, r.qty::text, r.room,
    case when it.id is null then 'item no longer in inventory' else it.qty || ' ' || it.unit || ' on the shelf' end
    || case when me.role = 'admin' then ' · marked by ' || me.name else '' end);
  if me.role = 'teacher' then
    insert into public.notifications (school_id, to_role, kind, text)
    values (r.school_id, 'admin', 'status', t || ' gave back ' || r.qty || ' ' || r.item_name);
  end if;
end $$;

-- Need it longer: pick a new return date.
create or replace function public.borrow_until(p_id uuid, p_until date)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.requests := public.lock_borrow(p_id);
  t text;
begin
  perform public.check_until(p_until);
  if p_until = r.to_date then return; end if;
  select name into t from public.profiles where id = r.teacher_id;
  update public.requests set to_date = p_until where id = r.id;
  perform public.add_log(r.school_id, 'Return date changed', t, r.item_name, r.qty::text, r.room,
    public.nice_date(r.to_date) || ' → ' || public.nice_date(p_until));
  if r.teacher_id = auth.uid() then
    insert into public.notifications (school_id, to_role, kind, text)
    values (r.school_id, 'admin', 'status', t || ' will bring back ' || r.item_name || ' by ' || public.nice_date(p_until));
  end if;
end $$;

-- Permissions -----------------------------------------------------------------
revoke all on public.catalog from anon;
grant select on public.catalog to authenticated;
revoke execute on function public.check_until(date) from public, anon, authenticated;
revoke execute on function public.lock_borrow(uuid) from public, anon, authenticated;
revoke execute on function public.save_item(uuid, text, text, text, int, int, text, text, text, int, numeric, text, boolean) from public, anon;
revoke execute on function public.request_borrow(uuid, int, date, text, text) from public, anon;
revoke execute on function public.return_borrowed(uuid) from public, anon;
revoke execute on function public.borrow_until(uuid, date) from public, anon;
grant execute on function public.save_item(uuid, text, text, text, int, int, text, text, text, int, numeric, text, boolean) to authenticated;
grant execute on function public.request_borrow(uuid, int, date, text, text) to authenticated;
grant execute on function public.return_borrowed(uuid) to authenticated;
grant execute on function public.borrow_until(uuid, date) to authenticated;
