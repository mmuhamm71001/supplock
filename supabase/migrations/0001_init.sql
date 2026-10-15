-- Supplock: initial schema.
-- Every table belongs to a school. Row Level Security makes sure a signed-in
-- person only ever sees rows from their own school.
--
-- Reads go through RLS policies. Writes that change stock, requests, laptops,
-- spaces or the log go through database functions added in later migrations
-- (security definer, checked against the caller's school and role), so the
-- browser can never change stock directly.
--
-- No demo data. Safe to run once on a fresh Supabase project.

-- ---------------------------------------------------------------- schools
create table public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  code         text not null unique check (code ~ '^[A-Z]{1,5}-[0-9]{4}$'),
  logo_url     text,
  email_domain text,                                   -- optional restriction, e.g. 'myschool.org'
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  school_id  uuid not null references public.schools (id) on delete cascade,
  name       text not null,
  email      text not null,
  role       text not null check (role in ('admin', 'teacher')),
  room       text not null default '',
  created_at timestamptz not null default now()
);
create index profiles_school_idx on public.profiles (school_id);

-- ---------------------------------------------------------------- main closet inventory
create table public.items (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  category      text not null default 'Classroom',
  unit          text not null default 'units',            -- base unit stock is counted in
  qty           int  not null default 0 check (qty >= 0),
  low_threshold int  not null default 0 check (low_threshold >= 0),
  vendor        text not null default '',
  url           text not null default '',
  pack_name     text not null default 'pack',             -- what you buy: box, case, pack…
  pack_size     int  not null default 1 check (pack_size >= 1),
  price         numeric(10, 2) not null default 0 check (price >= 0),  -- per base unit
  icon          text,
  created_at    timestamptz not null default now()
);
create index items_school_idx on public.items (school_id);

-- ---------------------------------------------------------------- laptops
create table public.laptops (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  tag        text not null,                               -- LT-001
  status     text not null default 'available' check (status in ('available', 'out', 'assigned')),
  zoom       boolean not null default false,
  holder_id  uuid references public.profiles (id) on delete set null,
  room       text not null default '',
  due_date   date,
  created_at timestamptz not null default now(),
  unique (school_id, tag)
);

-- ---------------------------------------------------------------- spaces (classroom & subject inventories)
create table public.spaces (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  kind       text not null default 'subject' check (kind in ('classroom', 'subject')),
  subject    text not null default '',
  owner_id   uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index spaces_school_idx on public.spaces (school_id);
create index spaces_owner_idx on public.spaces (owner_id);

create table public.space_items (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  space_id      uuid not null references public.spaces (id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  category      text not null default 'Supplies' check (category in ('Supplies', 'Equipment', 'Books', 'Furniture')),
  qty           int  not null default 0 check (qty >= 0),
  unit          text not null default '',
  low_threshold int  not null default 0 check (low_threshold >= 0),  -- 0 = no alert
  on_loan       boolean not null default false,
  note          text not null default '',
  icon          text,
  created_at    timestamptz not null default now()
);
create index space_items_space_idx on public.space_items (space_id);

create table public.space_counts (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools (id) on delete cascade,
  space_id        uuid not null references public.spaces (id) on delete cascade,
  counted_at      timestamptz not null default now(),
  counted_by      uuid references public.profiles (id) on delete set null,
  counted_by_name text not null default '',
  lines           jsonb not null default '[]'::jsonb      -- [{item_id, name, unit, expected, counted, prev}]
);
create index space_counts_space_idx on public.space_counts (space_id, counted_at desc);

-- ---------------------------------------------------------------- requests
create table public.requests (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references public.schools (id) on delete cascade,
  teacher_id         uuid references public.profiles (id) on delete set null,
  kind               text not null check (kind in ('supply', 'custom', 'laptop')),
  status             text not null default 'pending'
                     check (status in ('pending', 'approved', 'denied', 'ordered', 'delivered')),
  qty                int  not null default 1 check (qty >= 1),
  room               text not null default '',
  note               text not null default '',
  created_at         timestamptz not null default now(),
  -- supply
  item_id            uuid references public.items (id) on delete set null,
  item_name          text not null default '',             -- kept so history survives item removal
  -- custom
  name               text not null default '',
  url                text not null default '',
  needed_by          date,
  eta                date,
  -- laptop
  laptop_type        text check (laptop_type in ('temp', 'full')),
  from_date          date,
  to_date            date,
  laptop_tags        text[] not null default '{}',
  -- placement into a space after approval / delivery
  placement          text check (placement in ('pending', 'done', 'skipped')),
  placed_in_space_id uuid references public.spaces (id) on delete set null
);
create index requests_school_idx on public.requests (school_id, created_at desc);
create index requests_teacher_idx on public.requests (teacher_id, created_at desc);

-- ---------------------------------------------------------------- reorders
create table public.reorders (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  item_id        uuid references public.items (id) on delete set null,
  item_name      text not null default '',
  packs          int  not null check (packs >= 1),
  placed_on      date not null default current_date,
  eta            date,
  status         text not null default 'ordered' check (status in ('ordered', 'received')),
  received_packs int,
  received_on    date
);
create index reorders_school_idx on public.reorders (school_id, placed_on desc);

-- ---------------------------------------------------------------- to-dos (the Gazette)
create table public.todos (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  text       text not null check (length(trim(text)) > 0),
  done       boolean not null default false,
  auto       boolean not null default false,
  item_id    uuid references public.items (id) on delete set null,
  request_id uuid references public.requests (id) on delete set null,
  link       text not null default '',
  due        date,
  created_at timestamptz not null default now()
);
create index todos_school_idx on public.todos (school_id);

-- ---------------------------------------------------------------- transaction log
create table public.log (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  ts           timestamptz not null default now(),
  action       text not null,
  teacher_name text not null default '',
  item_label   text not null default '',
  qty          text not null default '',
  room         text not null default '',
  result       text not null default ''
);
create index log_school_ts_idx on public.log (school_id, ts desc);

-- ---------------------------------------------------------------- notifications
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  to_user_id uuid references public.profiles (id) on delete cascade,
  to_role    text check (to_role in ('admin')),
  kind       text not null check (kind in ('request', 'urgent', 'low', 'status')),
  text       text not null,
  read       boolean not null default false,
  ts         timestamptz not null default now(),
  check (to_user_id is not null or to_role is not null)
);
create index notifications_user_idx on public.notifications (to_user_id, ts desc);
create index notifications_role_idx on public.notifications (school_id, to_role, ts desc);

-- ================================================================ helpers
-- Who is calling? These run as the table owner so they can read profiles
-- without tripping over profiles' own RLS.
create or replace function public.my_school_id() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Look up a school by its code before signing in (shows the logo and name on
-- the sign-in / join card). Returns only public bits.
create or replace function public.school_by_code(p_code text)
returns table (id uuid, name text, code text, logo_url text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.code, s.logo_url
  from public.schools s
  where s.code = upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'))
$$;

-- Teachers see the closet without cost or vendor.
create view public.catalog with (security_barrier = true) as
  select id, school_id, name, category, unit, qty, low_threshold, icon
  from public.items
  where school_id = public.my_school_id();

-- ================================================================ row level security
alter table public.schools       enable row level security;
alter table public.profiles      enable row level security;
alter table public.items         enable row level security;
alter table public.laptops       enable row level security;
alter table public.spaces        enable row level security;
alter table public.space_items   enable row level security;
alter table public.space_counts  enable row level security;
alter table public.requests      enable row level security;
alter table public.reorders      enable row level security;
alter table public.todos         enable row level security;
alter table public.log           enable row level security;
alter table public.notifications enable row level security;

-- schools: everyone in the school can read it.
create policy schools_read on public.schools for select to authenticated
  using (id = public.my_school_id());

-- profiles: you can read yourself; admins can read everyone in their school.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or (public.is_admin() and school_id = public.my_school_id()));

-- admin-only tables (teachers use the catalog view and functions instead).
create policy items_admin_read on public.items for select to authenticated
  using (public.is_admin() and school_id = public.my_school_id());
create policy laptops_admin_read on public.laptops for select to authenticated
  using (public.is_admin() and school_id = public.my_school_id());
create policy reorders_admin_read on public.reorders for select to authenticated
  using (public.is_admin() and school_id = public.my_school_id());
create policy log_admin_read on public.log for select to authenticated
  using (public.is_admin() and school_id = public.my_school_id());

-- to-dos: admins read and edit freely (they don't change stock).
create policy todos_admin_all on public.todos for all to authenticated
  using (public.is_admin() and school_id = public.my_school_id())
  with check (public.is_admin() and school_id = public.my_school_id());

-- requests: teachers see their own; admins see the whole school.
create policy requests_read on public.requests for select to authenticated
  using (school_id = public.my_school_id() and (teacher_id = auth.uid() or public.is_admin()));

-- spaces: owner or any admin in the school.
create policy spaces_read on public.spaces for select to authenticated
  using (school_id = public.my_school_id() and (owner_id = auth.uid() or public.is_admin()));
create policy space_items_read on public.space_items for select to authenticated
  using (school_id = public.my_school_id() and (public.is_admin()
         or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())));
create policy space_counts_read on public.space_counts for select to authenticated
  using (school_id = public.my_school_id() and (public.is_admin()
         or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())));

-- notifications: yours, or the admin inbox if you are an admin.
create policy notifications_read on public.notifications for select to authenticated
  using (school_id = public.my_school_id()
         and (to_user_id = auth.uid() or (to_role = 'admin' and public.is_admin())));

-- Lock everything else down: no direct inserts/updates/deletes from the
-- browser except to-dos. Anonymous visitors get nothing but school_by_code.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.todos to authenticated;
revoke all on public.catalog from anon;
grant select on public.catalog to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.my_school_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.school_by_code(text) to anon, authenticated;

-- ================================================================ storage: school logos
-- Public bucket so logos show on the sign-in page. Uploads happen on the
-- server with the service key, so no upload policies are needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
