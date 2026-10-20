-- Supplock: log an order you placed yourself.
-- The admin picks any items (low or not), or pastes product links that match
-- the links saved on items, sets how many packs of each, and an arrival date.
-- Each line becomes an open order; stock only goes up when it's received.

alter table public.reorders add column if not exists link text not null default '';

-- p_lines: [{item, packs, link}]. All or nothing: one bad line stops the whole order.
create or replace function public.log_order(p_lines jsonb, p_eta date)
returns int language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  ln jsonb;
  it public.items;
  v_packs int;
  v_link text;
  n int := 0;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Add at least one item to the order'; end if;
  if jsonb_array_length(p_lines) > 100 then raise exception 'That''s more than 100 lines. Split it into smaller orders'; end if;
  if p_eta is not null and p_eta < current_date - 1 then raise exception 'Pick an arrival date that isn''t in the past'; end if;
  for ln in select * from jsonb_array_elements(p_lines) loop
    select * into it from public.items where id = (ln->>'item')::uuid and school_id = a.school_id;
    if it.id is null then raise exception 'One of those items no longer exists'; end if;
    v_packs := (ln->>'packs')::int;
    if v_packs is null or v_packs < 1 or v_packs > 10000 then raise exception 'Pick how many % to order (1 or more)', public.pack_plural(it.pack_name, 2); end if;
    v_link := public.clean_url(coalesce(nullif(trim(ln->>'link'), ''), it.url));
    insert into public.reorders (school_id, item_id, item_name, packs, eta, link)
    values (a.school_id, it.id, it.name, v_packs, p_eta, v_link);
    perform public.add_log(a.school_id, 'Reorder placed', '', it.name, v_packs || ' ' || public.pack_plural(it.pack_name, v_packs), '',
      case when p_eta is null then '' else 'arrives ' || public.nice_date(p_eta) end);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Orders from the shopping list keep the item's product link too.
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
  insert into public.reorders (school_id, item_id, item_name, packs, eta, link)
  values (a.school_id, it.id, it.name, p_packs, current_date + greatest(0, least(coalesce(p_days, 5), 365)), it.url)
  returning * into o;
  perform public.add_log(a.school_id, 'Reorder placed', '', it.name, p_packs || ' ' || public.pack_plural(it.pack_name, p_packs), '',
    'arrives ' || public.nice_date(o.eta));
  return o.id;
end $$;

revoke execute on function public.log_order(jsonb, date) from public, anon;
grant execute on function public.log_order(jsonb, date) to authenticated;
