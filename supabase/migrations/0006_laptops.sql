-- Supplock: the laptop cart.
-- Admins add laptops (tags LT-001, LT-002, … in order), track Zoom installs,
-- mark laptops returned and remove ones that are on the cart. Laptops are
-- handed out when a laptop request is approved (see 0004_approvals.sql).

-- Adds p_count laptops after the highest existing tag. Returns the new tags.
create or replace function public.add_laptops(p_count int default 1)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  n int;
  tags text[];
begin
  if p_count is null or p_count < 1 or p_count > 200 then raise exception 'Add between 1 and 200 laptops at a time'; end if;
  -- One at a time per school, so two admins adding at once can't make the same tag.
  perform pg_advisory_xact_lock(hashtext('laptops:' || a.school_id));
  select coalesce(max(substring(tag from '^LT-(\d+)$')::int), 0) into n from public.laptops where school_id = a.school_id;
  with made as (
    insert into public.laptops (school_id, tag)
    select a.school_id, 'LT-' || lpad((n + g)::text, 3, '0') from generate_series(1, p_count) g
    returning tag
  )
  select array_agg(tag order by tag) into tags from made;
  perform public.add_log(a.school_id, 'Adjustment', '',
    case when p_count = 1 then 'Laptop ' || tags[1] || ' added' else 'Laptops ' || tags[1] || '–' || tags[p_count] || ' added' end,
    p_count::text, '', public.laptops_free(a.school_id) || ' available');
  return tags;
end $$;

create or replace function public.toggle_zoom(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.profiles := public.me_admin();
begin
  update public.laptops set zoom = not zoom where id = p_id and school_id = a.school_id;
  if not found then raise exception 'That laptop no longer exists'; end if;
end $$;

create or replace function public.return_laptop(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  l public.laptops;
  t text;
begin
  select * into l from public.laptops where id = p_id and school_id = a.school_id for update;
  if l.id is null then raise exception 'That laptop no longer exists'; end if;
  if l.status = 'available' then raise exception '% is already on the cart', l.tag; end if;
  select name into t from public.profiles where id = l.holder_id;
  update public.laptops set status = 'available', holder_id = null, room = '', due_date = null where id = l.id;
  perform public.add_log(a.school_id, 'Laptop return', t, l.tag, '1', l.room, public.laptops_free(a.school_id) || ' available');
end $$;

-- Only laptops on the cart can be removed (return it first).
create or replace function public.remove_laptop(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  l public.laptops;
begin
  select * into l from public.laptops where id = p_id and school_id = a.school_id for update;
  if l.id is null then raise exception 'That laptop no longer exists'; end if;
  if l.status <> 'available' then raise exception 'Mark % returned before removing it', l.tag; end if;
  delete from public.laptops where id = l.id;
  perform public.add_log(a.school_id, 'Adjustment', '', 'Laptop ' || l.tag || ' removed', '-1', '', public.laptops_free(a.school_id) || ' available');
end $$;

-- Permissions -----------------------------------------------------------------
revoke execute on function public.add_laptops(int) from public, anon;
revoke execute on function public.toggle_zoom(uuid) from public, anon;
revoke execute on function public.return_laptop(uuid) from public, anon;
revoke execute on function public.remove_laptop(uuid) from public, anon;
grant execute on function public.add_laptops(int) to authenticated;
grant execute on function public.toggle_zoom(uuid) to authenticated;
grant execute on function public.return_laptop(uuid) to authenticated;
grant execute on function public.remove_laptop(uuid) to authenticated;
