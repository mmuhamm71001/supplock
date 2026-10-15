-- Supplock: subscriptions (Stripe).
-- Each school has a billing record that only its admins can read. Stripe tells
-- the server about subscription changes, and the server (service key) updates
-- the record. A school can make changes while it is free, trialing, active or
-- past due (Stripe is retrying the card); otherwise it is read-only, but
-- nothing is deleted. Plans limit how many teachers can join.

create table if not exists public.school_billing (
  school_id              uuid primary key references public.schools (id) on delete cascade,
  status                 text not null default 'none'
                         check (status in ('none', 'free', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused')),
  plan                   text check (plan in ('small', 'medium', 'large')),
  billing_interval       text check (billing_interval in ('month', 'year')),
  teacher_limit          int check (teacher_limit is null or teacher_limit > 0),   -- null = unlimited
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  trial_end              timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  trial_used             boolean not null default false,
  updated_at             timestamptz not null default now()
);
alter table public.school_billing enable row level security;
create policy school_billing_admin_read on public.school_billing for select to authenticated
  using (public.is_admin() and school_id = public.my_school_id());
revoke all on public.school_billing from anon;
revoke insert, update, delete, truncate on public.school_billing from authenticated;
grant select on public.school_billing to authenticated;

-- Schools that already exist (Manara Academy) are free forever. New schools start with no plan.
insert into public.school_billing (school_id, status)
select id, 'free' from public.schools
on conflict (school_id) do nothing;

create or replace function public.new_school_billing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.school_billing (school_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists schools_billing on public.schools;
create trigger schools_billing after insert on public.schools for each row execute function public.new_school_billing();

-- Can this school make changes right now?
create or replace function public.school_active(p_school uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status in ('free', 'trialing', 'active', 'past_due') from public.school_billing where school_id = p_school), false);
$$;

-- For the app's banner: is the signed-in person's school active?
create or replace function public.my_school_active() returns boolean
language sql stable security definer set search_path = public as $$
  select public.school_active(public.my_school_id());
$$;

-- Every change goes through one of these, so this is where read-only is enforced.
create or replace function public.me_teacher() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Please sign in again'; end if;
  if p.role <> 'teacher' then raise exception 'Only teachers can send requests'; end if;
  if not public.school_active(p.school_id) then
    raise exception 'Your school''s Supplock plan isn''t active right now. Ask your admin to renew it';
  end if;
  return p;
end $$;

create or replace function public.me_admin() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Please sign in again'; end if;
  if p.role <> 'admin' then raise exception 'Only admins can do that'; end if;
  if not public.school_active(p.school_id) then
    raise exception 'Your school''s Supplock plan isn''t active. Choose a plan on the Billing page to keep making changes';
  end if;
  return p;
end $$;

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
  if not public.school_active(me.school_id) then
    raise exception 'Your school''s Supplock plan isn''t active right now, so spaces can''t be changed';
  end if;
  return sp;
end $$;

-- To-dos are edited directly (no stock involved); they follow the same rule.
drop policy if exists todos_admin_all on public.todos;
create policy todos_admin_all on public.todos for all to authenticated
  using (public.is_admin() and school_id = public.my_school_id())
  with check (public.is_admin() and school_id = public.my_school_id() and public.my_school_active());

-- Teacher limit: checked whenever a teacher joins.
create or replace function public.check_teacher_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lim int;
  n int;
begin
  if new.role <> 'teacher' then return new; end if;
  select teacher_limit into lim from public.school_billing where school_id = new.school_id;
  if lim is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext('teachers:' || new.school_id));
  select count(*) into n from public.profiles where school_id = new.school_id and role = 'teacher';
  if n >= lim then
    raise exception 'This school has reached its plan''s limit of % teachers. Ask your admin to upgrade', lim;
  end if;
  return new;
end $$;
drop trigger if exists profiles_teacher_limit on public.profiles;
create trigger profiles_teacher_limit before insert on public.profiles for each row execute function public.check_teacher_limit();

-- Permissions -----------------------------------------------------------------
revoke execute on function public.new_school_billing() from public, anon, authenticated;
revoke execute on function public.check_teacher_limit() from public, anon, authenticated;
revoke execute on function public.school_active(uuid) from public, anon, authenticated;
revoke execute on function public.my_school_active() from public, anon;
grant execute on function public.my_school_active() to authenticated;
