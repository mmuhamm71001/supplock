-- Supplock: email notifications.
-- Every notification is also an email "outbox" entry. After each action the
-- server claims the school's unsent ones, emails them through Resend, and
-- releases any that failed so they go out next time.
-- Who gets an email: admins for new requests, over-stock alerts and low stock;
-- teachers for status updates (approved, denied, ordered, delivered).

alter table public.notifications add column if not exists emailed_at timestamptz;
create index if not exists notifications_outbox_idx on public.notifications (school_id, ts) where emailed_at is null;

-- Don't email everything that happened before this migration.
update public.notifications set emailed_at = now() where emailed_at is null;

-- Claims up to p_limit unsent notifications (for one school, or all when p_school is null) and returns
-- the ones worth emailing, each with its recipients and school name. Claimed rows that aren't emailed (e.g. a teacher's low-stock note) are just marked done.
create or replace function public.claim_emails(p_school uuid, p_limit int default 50)
returns table (id uuid, kind text, text text, recipients text[], ts timestamptz, school text, to_admin boolean)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with claimed as (
    update public.notifications n set emailed_at = now()
    where n.id in (
      select x.id from public.notifications x
      where (p_school is null or x.school_id = p_school) and x.emailed_at is null
      order by x.ts limit greatest(1, least(coalesce(p_limit, 50), 100))
      for update skip locked
    )
    returning n.*
  )
  select c.id, c.kind, c.text,
    case
      when c.to_role = 'admin' and c.kind in ('request', 'urgent', 'low') then
        (select array_agg(p.email order by p.email) from public.profiles p where p.school_id = c.school_id and p.role = 'admin' and p.email <> '')
      when c.to_user_id is not null and c.kind = 'status' then
        (select array[p.email] from public.profiles p where p.id = c.to_user_id and p.email <> '')
    end,
    c.ts, s.name, c.to_role = 'admin'
  from claimed c join public.schools s on s.id = c.school_id
  where (c.to_role = 'admin' and c.kind in ('request', 'urgent', 'low')) or (c.to_user_id is not null and c.kind = 'status')
  order by c.ts;
end $$;

-- Puts notifications back in the outbox after a failed send.
create or replace function public.release_emails(p_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update public.notifications set emailed_at = null where id = any (p_ids);
$$;

revoke execute on function public.claim_emails(uuid, int) from public, anon, authenticated;
revoke execute on function public.release_emails(uuid[]) from public, anon, authenticated;
grant execute on function public.claim_emails(uuid, int) to service_role;
grant execute on function public.release_emails(uuid[]) to service_role;
