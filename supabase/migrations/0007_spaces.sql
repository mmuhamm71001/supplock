-- Supplock: spaces (classroom and subject inventories).
-- Each space has one owner (a teacher). The owner and every admin can keep its
-- inventory: add, edit, adjust and remove items, and take counts. Low items
-- alert both the owner and the admins. After a teacher's request is approved
-- (or a custom one delivered) they choose which of their spaces it goes into.

-- Internal helpers ------------------------------------------------------------
-- The space, if the signed-in person may edit it (its owner, or an admin in the same school).
create or replace function public.editable_space(p_space uuid) returns public.spaces
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles;
  sp public.spaces;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Please sign in again'; end if;
  select * into sp from public.spaces where id = p_space and school_id = me.school_id;
  if sp.id is null or (me.role <> 'admin' and sp.owner_id is distinct from me.id) then raise exception 'That space no longer exists'; end if;
  return sp;
end $$;

create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select name from public.profiles where id = auth.uid()), '');
$$;

-- "Safety goggles in Science Lab are low (22 left, low at 24)" to the owner and the admins,
-- unless the same alert is still unread.
create or replace function public.space_low(it public.space_items) returns void
language plpgsql security definer set search_path = public as $$
declare
  sp public.spaces;
  msg text;
begin
  if it.low_threshold = 0 or it.qty >= it.low_threshold then return; end if;
  select * into sp from public.spaces where id = it.space_id;
  msg := it.name || ' in ' || sp.name || case when it.qty = 0 then ' ran out' else ' is low' end
         || ' (' || it.qty || ' left, low at ' || it.low_threshold || ')';
  if sp.owner_id is not null and not exists (select 1 from public.notifications where to_user_id = sp.owner_id and text = msg and not read) then
    perform public.notify_user(sp.school_id, sp.owner_id, 'low', msg);
  end if;
  if not exists (select 1 from public.notifications where school_id = sp.school_id and to_role = 'admin' and text = msg and not read) then
    perform public.notify_admins(sp.school_id, 'low', msg);
  end if;
end $$;

-- Spaces (admins) ---------------------------------------------------------------
-- The owner must be a teacher in the admin's school.
create or replace function public.school_teacher(p_school uuid, p_owner uuid) returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare t public.profiles;
begin
  select * into t from public.profiles where id = p_owner and school_id = p_school and role = 'teacher';
  if t.id is null then raise exception 'Pick a teacher to own this space'; end if;
  return t;
end $$;

create or replace function public.create_space(p_name text, p_kind text, p_subject text, p_owner uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  v_name text := public.clean_text(p_name, 80, 'Name');
  v_subject text := public.clean_text(p_subject, 60, 'Subject');
  t public.profiles := public.school_teacher(a.school_id, p_owner);
  sid uuid;
begin
  if v_name = '' then raise exception 'Give the space a name'; end if;
  if p_kind not in ('classroom', 'subject') then raise exception 'Pick subject space or classroom'; end if;
  insert into public.spaces (school_id, name, kind, subject, owner_id)
  values (a.school_id, v_name, p_kind, case when p_kind = 'subject' then v_subject else '' end, t.id)
  returning id into sid;
  perform public.add_log(a.school_id, 'Space created', t.name, v_name, '', v_name, 'owner ' || t.name);
  perform public.notify_user(a.school_id, t.id, 'status', 'You''ve been assigned ' || v_name || '. Take its inventory under My spaces.');
  return sid;
end $$;

create or replace function public.set_space_owner(p_space uuid, p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  sp public.spaces;
  t public.profiles := public.school_teacher(a.school_id, p_owner);
  was text;
begin
  select * into sp from public.spaces where id = p_space and school_id = a.school_id for update;
  if sp.id is null then raise exception 'That space no longer exists'; end if;
  if sp.owner_id = t.id then return; end if;
  select name into was from public.profiles where id = sp.owner_id;
  update public.spaces set owner_id = t.id where id = sp.id;
  perform public.add_log(a.school_id, 'Space created', t.name, sp.name, '', sp.name, 'reassigned from ' || coalesce(was, 'nobody'));
  perform public.notify_user(a.school_id, t.id, 'status', 'You''ve been assigned ' || sp.name || '.');
end $$;

-- Also deletes the space's items and counts.
create or replace function public.delete_space(p_space uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  sp public.spaces;
begin
  delete from public.spaces where id = p_space and school_id = a.school_id returning * into sp;
  if sp.id is null then raise exception 'That space no longer exists'; end if;
  perform public.add_log(a.school_id, 'Space created', '', sp.name, '', sp.name, 'space removed');
end $$;

-- Items (owner or admin) ------------------------------------------------------
create or replace function public.save_space_item(
  p_id uuid, p_space uuid, p_name text, p_category text, p_qty int, p_unit text, p_low_threshold int, p_on_loan boolean, p_note text, p_icon text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  sp public.spaces := public.editable_space(p_space);
  v_name text := public.clean_text(p_name, 120, 'Name');
  v_unit text := public.clean_text(p_unit, 40, 'Unit');
  v_note text := public.clean_text(p_note, 200, 'Note');
  old public.space_items;
  it public.space_items;
begin
  if v_name = '' then raise exception 'Give the item a name'; end if;
  if p_category not in ('Supplies', 'Equipment', 'Books', 'Furniture') then raise exception 'Pick a category'; end if;
  if p_qty is null or p_qty < 0 or p_qty > 1000000 then raise exception 'Quantity must be 0 or more'; end if;
  if p_low_threshold is null or p_low_threshold < 0 or p_low_threshold > 1000000 then raise exception 'Low alert must be 0 or more'; end if;
  if p_id is null then
    insert into public.space_items (school_id, space_id, name, category, qty, unit, low_threshold, on_loan, note, icon)
    values (sp.school_id, sp.id, v_name, p_category, p_qty, v_unit, p_low_threshold, coalesce(p_on_loan, false), v_note, nullif(trim(coalesce(p_icon, '')), ''))
    returning * into it;
    perform public.add_log(sp.school_id, 'Space item', public.my_name(), it.name, it.qty::text, sp.name, 'added' || case when it.on_loan then ' · on loan' else '' end);
  else
    select * into old from public.space_items where id = p_id and space_id = sp.id for update;
    if old.id is null then raise exception 'That item no longer exists'; end if;
    update public.space_items set name = v_name, category = p_category, qty = p_qty, unit = v_unit, low_threshold = p_low_threshold,
      on_loan = coalesce(p_on_loan, false), note = v_note
    where id = old.id returning * into it;
    if it.qty <> old.qty then
      perform public.add_log(sp.school_id, 'Space adjustment', public.my_name(), it.name, (it.qty - old.qty)::text, sp.name, it.qty || ' ' || it.unit);
    end if;
  end if;
  perform public.space_low(it);
  return it.id;
end $$;

create or replace function public.adjust_space_item(p_id uuid, p_delta int)
returns void language plpgsql security definer set search_path = public as $$
declare
  old public.space_items;
  it public.space_items;
  sp public.spaces;
begin
  select * into old from public.space_items where id = p_id;
  if old.id is null then raise exception 'That item no longer exists'; end if;
  sp := public.editable_space(old.space_id);
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000000 then return; end if;
  update public.space_items set qty = greatest(0, qty + p_delta) where id = p_id returning * into it;
  if it.qty = old.qty then return; end if;
  perform public.add_log(sp.school_id, 'Space adjustment', public.my_name(), it.name, (it.qty - old.qty)::text, sp.name, it.qty || ' ' || it.unit);
  perform public.space_low(it);
end $$;

create or replace function public.remove_space_item(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  it public.space_items;
  sp public.spaces;
begin
  select * into it from public.space_items where id = p_id;
  if it.id is null then raise exception 'That item no longer exists'; end if;
  sp := public.editable_space(it.space_id);
  delete from public.space_items where id = it.id;
  perform public.add_log(sp.school_id, 'Space item', public.my_name(), it.name, '', sp.name, 'removed');
end $$;

-- Taking inventory --------------------------------------------------------------------
-- p_lines: [{id, counted}]. Items left out keep their quantity (counted = on record).
-- Stores every line with what was on record, what was counted, and the previous count.
create or replace function public.save_space_count(p_space uuid, p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  sp public.spaces := public.editable_space(p_space);
  last jsonb;
  out jsonb := '[]'::jsonb;
  it public.space_items;
  v_counted int;
  fixed int := 0;
  n int := 0;
begin
  select lines into last from public.space_counts where space_id = sp.id order by counted_at desc limit 1;
  for it in select * from public.space_items where space_id = sp.id order by name for update loop
    select (l->>'counted')::int into v_counted from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) l where l->>'id' = it.id::text limit 1;
    v_counted := coalesce(v_counted, it.qty);
    if v_counted < 0 or v_counted > 1000000 then raise exception 'Counts must be 0 or more (%)', it.name; end if;
    out := out || jsonb_build_object('item_id', it.id, 'name', it.name, 'unit', it.unit, 'expected', it.qty, 'counted', v_counted,
      'prev', (select (l->>'counted')::int from jsonb_array_elements(coalesce(last, '[]'::jsonb)) l where l->>'item_id' = it.id::text limit 1));
    n := n + 1;
    if v_counted <> it.qty then
      fixed := fixed + 1;
      update public.space_items set qty = v_counted where id = it.id returning * into it;
    end if;
  end loop;
  insert into public.space_counts (school_id, space_id, counted_by, counted_by_name, lines)
  values (sp.school_id, sp.id, auth.uid(), public.my_name(), out);
  perform public.add_log(sp.school_id, 'Space count', public.my_name(), sp.name, n || ' items', sp.name,
    case when fixed > 0 then fixed || ' corrected' else 'all matched' end);
  for it in select * from public.space_items where space_id = sp.id loop perform public.space_low(it); end loop;
  return jsonb_build_object('items', n, 'corrected', fixed);
end $$;

-- Placement: "Where should these go?" ----------------------------------------------------
-- p_space null means "Don't add". Adding merges into an item with the same name and loan flag.
create or replace function public.place_request(p_request uuid, p_space uuid, p_on_loan boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.profiles := public.me_teacher();
  r public.requests;
  sp public.spaces;
  src public.items;
  v_name text;
  v_qty int;
  v_unit text;
  hit public.space_items;
  it public.space_items;
begin
  select * into r from public.requests where id = p_request and teacher_id = t.id for update;
  if r.id is null then raise exception 'That request no longer exists'; end if;
  if r.placement is distinct from 'pending' then raise exception 'That was already placed'; end if;
  if p_space is null then
    update public.requests set placement = 'skipped' where id = r.id;
    return;
  end if;
  select * into sp from public.spaces where id = p_space and school_id = t.school_id and owner_id = t.id;
  if sp.id is null then raise exception 'Pick one of your spaces'; end if;

  if r.kind = 'supply' then select * into src from public.items where id = r.item_id; end if;
  v_name := case r.kind when 'supply' then r.item_name when 'custom' then r.name else 'Laptops ' || array_to_string(r.laptop_tags, ', ') end;
  v_qty := case when r.kind = 'laptop' then cardinality(r.laptop_tags) else r.qty end;
  v_unit := case when r.kind = 'laptop' then 'laptops' else coalesce(src.unit, 'units') end;

  select * into hit from public.space_items
  where space_id = sp.id and lower(name) = lower(v_name) and on_loan = coalesce(p_on_loan, false) for update;
  if hit.id is not null then
    update public.space_items set qty = qty + v_qty where id = hit.id returning * into it;
  else
    insert into public.space_items (school_id, space_id, name, category, qty, unit, on_loan, note, icon)
    values (sp.school_id, sp.id, v_name, case when r.kind = 'laptop' then 'Equipment' else 'Supplies' end, v_qty, v_unit,
            coalesce(p_on_loan, false), case when r.kind = 'laptop' and r.to_date is not null then 'due back ' || public.nice_date(r.to_date) else '' end,
            case when r.kind = 'laptop' then 'laptop' else src.icon end)
    returning * into it;
  end if;
  update public.requests set placement = 'done', placed_in_space_id = sp.id where id = r.id;
  perform public.add_log(sp.school_id, 'Placed in space', t.name, v_name, v_qty::text, sp.name,
    case when coalesce(p_on_loan, false) then 'on loan from main closet' else 'added to space' end);
end $$;

-- Permissions -----------------------------------------------------------------
revoke execute on function public.editable_space(uuid) from public, anon, authenticated;
revoke execute on function public.my_name() from public, anon, authenticated;
revoke execute on function public.space_low(public.space_items) from public, anon, authenticated;
revoke execute on function public.school_teacher(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.create_space(text, text, text, uuid) from public, anon;
revoke execute on function public.set_space_owner(uuid, uuid) from public, anon;
revoke execute on function public.delete_space(uuid) from public, anon;
revoke execute on function public.save_space_item(uuid, uuid, text, text, int, text, int, boolean, text, text) from public, anon;
revoke execute on function public.adjust_space_item(uuid, int) from public, anon;
revoke execute on function public.remove_space_item(uuid) from public, anon;
revoke execute on function public.save_space_count(uuid, jsonb) from public, anon;
revoke execute on function public.place_request(uuid, uuid, boolean) from public, anon;
grant execute on function public.create_space(text, text, text, uuid) to authenticated;
grant execute on function public.set_space_owner(uuid, uuid) to authenticated;
grant execute on function public.delete_space(uuid) to authenticated;
grant execute on function public.save_space_item(uuid, uuid, text, text, int, text, int, boolean, text, text) to authenticated;
grant execute on function public.adjust_space_item(uuid, int) to authenticated;
grant execute on function public.remove_space_item(uuid) to authenticated;
grant execute on function public.save_space_count(uuid, jsonb) to authenticated;
grant execute on function public.place_request(uuid, uuid, boolean) to authenticated;
