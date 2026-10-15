-- Supplock: the main closet inventory.
-- Admins add, edit, adjust and remove items, place reorders and receive them,
-- and import a supply list in bulk. Every stock change is logged, and stock
-- going down checks for low stock (alert + "Order more …" to-do).

-- Internal helpers ------------------------------------------------------------
-- Only web links, so a pasted link can't run anything when someone opens it.
create or replace function public.clean_url(p text) returns text
language plpgsql immutable set search_path = public as $$
declare v text := trim(coalesce(p, ''));
begin
  if v = '' then return ''; end if;
  if length(v) > 1000 then raise exception 'That link is too long'; end if;
  if v !~* '^https?://' then v := 'https://' || v; end if;
  if v !~* '^https?://[^\s/]+\.[^\s]+$' then raise exception 'That product link doesn''t look right'; end if;
  return v;
end $$;

-- Same as before, but stays quiet during a bulk import (which sends one summary instead).
create or replace function public.check_low(it public.items) returns void
language plpgsql security definer set search_path = public as $$
declare lv text := public.item_level(it.qty, it.low_threshold);
begin
  if lv = 'ok' or current_setting('supplock.quiet', true) = 'on' then return; end if;
  perform public.notify_admins(it.school_id, 'low',
    it.name || case when lv = 'out' then ' is out of stock' else ' is low' end
    || ' (' || it.qty || ' ' || it.unit || ' left). Suggested: ' || lower(public.reorder_text(it)));
  perform public.ensure_todo(it.school_id, 'Order more ' || it.name, it.id, null, '', null);
end $$;

-- Closes "Order more …" to-dos once an item is back to a healthy level.
create or replace function public.close_order_todos(it public.items) returns void
language sql security definer set search_path = public as $$
  update public.todos set done = true
  where school_id = it.school_id and item_id = it.id and not done
    and public.item_level(it.qty, it.low_threshold) = 'ok';
$$;

-- Add or edit -----------------------------------------------------------------
create or replace function public.save_item(
  p_id uuid, p_name text, p_category text, p_unit text, p_qty int, p_low_threshold int,
  p_vendor text, p_url text, p_pack_name text, p_pack_size int, p_price numeric, p_icon text)
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
    insert into public.items (school_id, name, category, unit, qty, low_threshold, vendor, url, pack_name, pack_size, price, icon)
    values (a.school_id, v_name, v_cat, v_unit, p_qty, p_low_threshold, v_vendor, v_url, v_pack, p_pack_size, round(p_price, 2), v_icon)
    returning * into it;
    perform public.add_log(a.school_id, 'Item added', '', it.name, it.qty::text, '', it.qty || ' ' || it.unit);
    perform public.check_low(it);
  else
    select * into old from public.items where id = p_id and school_id = a.school_id for update;
    if old.id is null then raise exception 'That item no longer exists'; end if;
    update public.items set name = v_name, category = v_cat, unit = v_unit, qty = p_qty, low_threshold = p_low_threshold,
      vendor = v_vendor, url = v_url, pack_name = v_pack, pack_size = p_pack_size, price = round(p_price, 2), icon = v_icon
    where id = p_id returning * into it;
    if it.qty <> old.qty then
      perform public.add_log(a.school_id, 'Adjustment', '', it.name, (it.qty - old.qty)::text, '', it.qty || ' ' || it.unit);
    end if;
    if it.qty < old.qty or it.low_threshold > old.low_threshold then perform public.check_low(it); end if;
    perform public.close_order_todos(it);
  end if;
  return it.id;
end $$;

create or replace function public.adjust_item(p_id uuid, p_delta int)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  old public.items;
  it public.items;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000000 then return; end if;
  select * into old from public.items where id = p_id and school_id = a.school_id for update;
  if old.id is null then raise exception 'That item no longer exists'; end if;
  update public.items set qty = greatest(0, qty + p_delta) where id = p_id returning * into it;
  if it.qty = old.qty then return; end if;
  perform public.add_log(a.school_id, 'Adjustment', '', it.name, (it.qty - old.qty)::text, '', it.qty || ' ' || it.unit);
  if it.qty < old.qty then perform public.check_low(it); else perform public.close_order_todos(it); end if;
end $$;

create or replace function public.remove_item(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  it public.items;
begin
  delete from public.items where id = p_id and school_id = a.school_id returning * into it;
  if it.id is null then raise exception 'That item no longer exists'; end if;
  update public.todos set done = true where school_id = a.school_id and text = 'Order more ' || it.name and not done;
  perform public.add_log(a.school_id, 'Item removed', '', it.name, '', '', '');
end $$;

-- Reorders ----------------------------------------------------------------------
create or replace function public.place_reorder(p_item uuid, p_packs int, p_days int default 5)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  it public.items;
  o public.reorders;
begin
  if p_packs is null or p_packs < 1 or p_packs > 10000 then raise exception 'Pick how many to order (1 or more)'; end if;
  select * into it from public.items where id = p_item and school_id = a.school_id;
  if it.id is null then raise exception 'That item no longer exists'; end if;
  insert into public.reorders (school_id, item_id, item_name, packs, eta)
  values (a.school_id, it.id, it.name, p_packs, current_date + greatest(0, least(coalesce(p_days, 5), 365)))
  returning * into o;
  perform public.add_log(a.school_id, 'Reorder placed', '', it.name, p_packs || ' ' || public.pack_plural(it.pack_name, p_packs), '',
    'arrives ' || public.nice_date(o.eta));
  return o.id;
end $$;

create or replace function public.set_reorder_packs(p_id uuid, p_packs int)
returns void language plpgsql security definer set search_path = public as $$
declare a public.profiles := public.me_admin();
begin
  if p_packs is null or p_packs < 1 or p_packs > 10000 then raise exception 'Pick how many (1 or more)'; end if;
  update public.reorders set packs = p_packs where id = p_id and school_id = a.school_id and status = 'ordered';
  if not found then raise exception 'That order was already received'; end if;
end $$;

-- p_packs is how many actually arrived (for partial deliveries); null means all of them.
create or replace function public.receive_reorder(p_id uuid, p_packs int default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  o public.reorders;
  it public.items;
  n int;
begin
  select * into o from public.reorders where id = p_id and school_id = a.school_id for update;
  if o.id is null then raise exception 'That order no longer exists'; end if;
  if o.status <> 'ordered' then raise exception 'That order was already received'; end if;
  n := coalesce(p_packs, o.packs);
  if n < 0 or n > 10000 then raise exception 'Pick how many arrived'; end if;
  select * into it from public.items where id = o.item_id and school_id = a.school_id for update;
  if it.id is null then raise exception 'That item was removed from the inventory'; end if;
  update public.items set qty = qty + n * it.pack_size where id = it.id returning * into it;
  update public.reorders set status = 'received', received_packs = n, received_on = current_date where id = o.id;
  perform public.add_log(a.school_id, 'Received', '', it.name, (n * it.pack_size)::text, '',
    n || ' ' || public.pack_plural(it.pack_name, n) || ' × ' || it.pack_size || ' → ' || it.qty || ' ' || it.unit);
  perform public.close_order_todos(it);
end $$;

-- Bulk import from a spreadsheet ---------------------------------------------------
-- p_rows: [{name, category, unit, qty, low_threshold, vendor, url, pack_name, pack_size, price}].
-- Matches existing items by name (ignoring capitals). Missing fields keep the current value
-- (or the usual default for new items). All or nothing: one bad row stops the whole import.
create or replace function public.import_items(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  r jsonb;
  i int := 0;
  old public.items;
  added int := 0;
  updated int := 0;
  low int;
  v_name text;
begin
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Nothing to import'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'That''s more than 2000 rows. Split the file and import it in parts'; end if;
  perform set_config('supplock.quiet', 'on', true);
  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_name := public.clean_text(r->>'name', 120, 'Name');
    if v_name = '' then continue; end if;
    select * into old from public.items where school_id = a.school_id and lower(name) = lower(v_name);
    begin
      perform public.save_item(
        old.id, coalesce(old.name, v_name),
        coalesce(r->>'category', old.category), coalesce(r->>'unit', old.unit),
        coalesce((r->>'qty')::int, old.qty, 0), coalesce((r->>'low_threshold')::int, old.low_threshold, 0),
        coalesce(r->>'vendor', old.vendor), coalesce(r->>'url', old.url),
        coalesce(r->>'pack_name', old.pack_name), coalesce((r->>'pack_size')::int, old.pack_size, 1),
        coalesce((r->>'price')::numeric, old.price, 0), old.icon);
    exception when others then
      raise exception 'Row % (%): %', i, v_name, sqlerrm;
    end;
    if old.id is null then added := added + 1; else updated := updated + 1; end if;
  end loop;
  perform set_config('supplock.quiet', 'off', true);
  select count(*) into low from public.items where school_id = a.school_id and public.item_level(qty, low_threshold) <> 'ok';
  perform public.notify_admins(a.school_id, 'request', 'Imported ' || added || ' new and ' || updated || ' updated items'
    || case when low > 0 then '. ' || low || case when low = 1 then ' is' else ' are' end || ' low or out of stock: see the shopping list on the Inventory page' else '' end);
  return jsonb_build_object('added', added, 'updated', updated, 'low', low);
end $$;

-- Permissions -----------------------------------------------------------------
revoke execute on function public.close_order_todos(public.items) from public, anon, authenticated;

revoke execute on function public.save_item(uuid, text, text, text, int, int, text, text, text, int, numeric, text) from public, anon;
revoke execute on function public.adjust_item(uuid, int) from public, anon;
revoke execute on function public.remove_item(uuid) from public, anon;
revoke execute on function public.place_reorder(uuid, int, int) from public, anon;
revoke execute on function public.set_reorder_packs(uuid, int) from public, anon;
revoke execute on function public.receive_reorder(uuid, int) from public, anon;
revoke execute on function public.import_items(jsonb) from public, anon;
grant execute on function public.save_item(uuid, text, text, text, int, int, text, text, text, int, numeric, text) to authenticated;
grant execute on function public.adjust_item(uuid, int) to authenticated;
grant execute on function public.remove_item(uuid) to authenticated;
grant execute on function public.place_reorder(uuid, int, int) to authenticated;
grant execute on function public.set_reorder_packs(uuid, int) to authenticated;
grant execute on function public.receive_reorder(uuid, int) to authenticated;
grant execute on function public.import_items(jsonb) to authenticated;
