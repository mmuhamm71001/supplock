-- Supplock: notices from teachers, and changing a custom order's arrival date.
-- Notices are for things nobody requests one at a time, like copy paper in the
-- printer or tissues in the staff room: a teacher writes "we're almost out of
-- copy paper", the admins get it in the bell, by email and on the dashboard,
-- and when an admin marks it handled the teacher hears back.

create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  teacher_id  uuid references public.profiles (id) on delete set null,
  teacher_name text not null default '',
  text        text not null check (length(trim(text)) > 0),
  handled     boolean not null default false,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notices_school_idx on public.notices (school_id, created_at desc);

alter table public.notices enable row level security;

-- Teachers see their own notices; admins see the whole school's.
drop policy if exists notices_read on public.notices;
create policy notices_read on public.notices for select to authenticated
  using (school_id = public.my_school_id() and (teacher_id = auth.uid() or public.is_admin()));

revoke all on public.notices from anon;
revoke insert, update, delete, truncate on public.notices from authenticated;
grant select on public.notices to authenticated;

-- Notices ----------------------------------------------------------------------
create or replace function public.send_notice(p_text text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.profiles := public.me_teacher();
  v_text text := public.clean_text(p_text, 300, 'Your note');
  r uuid;
begin
  if v_text = '' then raise exception 'Add a short note first'; end if;
  insert into public.notices (school_id, teacher_id, teacher_name, text)
  values (t.school_id, t.id, t.name, v_text)
  returning id into r;
  perform public.notify_admins(t.school_id, 'request', 'Note from ' || t.name || ': ' || v_text);
  return r;
end $$;

create or replace function public.handle_notice(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  n public.notices;
begin
  select * into n from public.notices where id = p_id and school_id = a.school_id for update;
  if n.id is null then raise exception 'That note no longer exists'; end if;
  if n.handled then return; end if;
  update public.notices set handled = true, handled_at = now() where id = n.id;
  if n.teacher_id is not null then
    perform public.notify_user(a.school_id, n.teacher_id, 'status',
      'The office took care of your note: “' || left(n.text, 120) || case when length(n.text) > 120 then '…' else '' end || '”');
  end if;
end $$;

-- Custom orders: change the expected arrival date after ordering -----------------
create or replace function public.custom_set_eta(p_id uuid, p_eta date)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public.me_admin();
  r public.requests := public.lock_request(p_id, a.school_id);
  t text;
begin
  if r.kind <> 'custom' or r.status <> 'ordered' then raise exception 'Only ordered custom requests have an arrival date'; end if;
  if p_eta is null then raise exception 'Pick the expected arrival date'; end if;
  if p_eta = r.eta then return; end if;
  select name into t from public.profiles where id = r.teacher_id;
  update public.requests set eta = p_eta where id = r.id;
  perform public.add_log(a.school_id, 'Arrival date changed', t, 'Custom: ' || r.name, r.qty::text, r.room, 'arrives ' || public.nice_date(p_eta));
  perform public.notify_user(a.school_id, r.teacher_id, 'status',
    'New arrival date for your ' || r.name || ': expected ' || public.nice_date(p_eta) || '.');
end $$;

-- Permissions -----------------------------------------------------------------
revoke execute on function public.send_notice(text) from public, anon;
revoke execute on function public.handle_notice(uuid) from public, anon;
revoke execute on function public.custom_set_eta(uuid, date) from public, anon;
grant execute on function public.send_notice(text) to authenticated;
grant execute on function public.handle_notice(uuid) to authenticated;
grant execute on function public.custom_set_eta(uuid, date) to authenticated;
