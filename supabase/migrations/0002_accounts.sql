-- Supplock: schools and accounts.
-- create_school / join_school are called by the server (service key) right
-- after it creates the sign-in account, so they are not callable from the browser.

-- WORD-NNNN: first 5 letters of the school name (padded with SCHOOL), a dash, 4 random digits.
create or replace function public.new_school_code(p_name text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  w text := left(upper(regexp_replace(coalesce(p_name, ''), '[^A-Za-z]', '', 'g')) || 'SCHOOL', 5);
  c text;
begin
  for i in 1 .. 200 loop
    c := w || '-' || (1000 + floor(random() * 9000))::int;
    if not exists (select 1 from public.schools where code = c) then return c; end if;
  end loop;
  raise exception 'Could not find a free school code for %', w;
end $$;

create or replace function public.create_school(p_user uuid, p_school_name text, p_admin_name text, p_email text)
returns public.schools
language plpgsql security definer set search_path = public as $$
declare s public.schools;
begin
  if length(trim(coalesce(p_school_name, ''))) = 0 or length(trim(coalesce(p_admin_name, ''))) = 0 then
    raise exception 'School name and your name are required';
  end if;
  insert into public.schools (name, code)
  values (trim(p_school_name), public.new_school_code(p_school_name))
  returning * into s;
  insert into public.profiles (id, school_id, name, email, role)
  values (p_user, s.id, trim(p_admin_name), lower(trim(p_email)), 'admin');
  insert into public.todos (school_id, text) values
    (s.id, 'Add your supplies to the inventory'),
    (s.id, 'Share the school code ' || s.code || ' with your teachers');
  return s;
end $$;

-- Adds a teacher and their classroom space. Returns the school id.
create or replace function public.join_school(p_user uuid, p_code text, p_name text, p_email text, p_room text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s public.schools;
  v_room text := trim(coalesce(p_room, ''));
  v_name text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  select * into s from public.schools where code = upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
  if s.id is null then raise exception 'No school with that code'; end if;
  if v_name = '' then raise exception 'Your name is required'; end if;
  if coalesce(s.email_domain, '') <> '' and v_email not like '%@' || lower(s.email_domain) then
    raise exception 'Use your @% email to join this school', s.email_domain;
  end if;
  insert into public.profiles (id, school_id, name, email, role, room)
  values (p_user, s.id, v_name, v_email, 'teacher', v_room);
  insert into public.spaces (school_id, name, kind, owner_id)
  values (s.id, case when v_room <> '' then 'Classroom · ' || v_room else v_name || '''s classroom' end, 'classroom', p_user);
  return s.id;
end $$;

-- Admin settings ------------------------------------------------------------
create or replace function public.regenerate_school_code() returns text
language plpgsql security definer set search_path = public as $$
declare s public.schools; c text;
begin
  if not public.is_admin() then raise exception 'Only admins can change the school code'; end if;
  select * into s from public.schools where id = public.my_school_id() for update;
  c := public.new_school_code(s.name);
  update public.schools set code = c where id = s.id;
  update public.todos set text = 'Share the school code ' || c || ' with your teachers'
  where school_id = s.id and not done and text = 'Share the school code ' || s.code || ' with your teachers';
  return c;
end $$;

create or replace function public.rename_school(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can rename the school'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Add the school name'; end if;
  update public.schools set name = trim(p_name) where id = public.my_school_id();
end $$;

create or replace function public.set_school_logo(p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can change the logo'; end if;
  update public.schools set logo_url = nullif(trim(coalesce(p_url, '')), '') where id = public.my_school_id();
end $$;

-- Permissions -----------------------------------------------------------------
revoke execute on function public.new_school_code(text) from public, anon, authenticated;
revoke execute on function public.create_school(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.join_school(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_school(uuid, text, text, text) to service_role;
grant execute on function public.join_school(uuid, text, text, text, text) to service_role;

revoke execute on function public.regenerate_school_code() from public, anon;
revoke execute on function public.rename_school(text) from public, anon;
revoke execute on function public.set_school_logo(text) from public, anon;
grant execute on function public.regenerate_school_code() to authenticated;
grant execute on function public.rename_school(text) to authenticated;
grant execute on function public.set_school_logo(text) to authenticated;
