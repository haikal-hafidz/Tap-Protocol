-- TAP Protocol cloud save. Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again: every statement is idempotent.
--
-- One row per signed-in user. Row Level Security makes every row visible and writable only to its owner.
-- The `revision` column is controlled by the database (a trigger), never by the browser.

create table if not exists public.cloud_saves (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  revision       bigint      not null default 1,
  payload        jsonb       not null,
  schema_version integer     not null default 1,
  device_id      text,
  device_label   text,
  updated_at     timestamptz not null default now(),
  constraint cloud_saves_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint cloud_saves_payload_size check (pg_column_size(payload) < 4000000)
);

alter table public.cloud_saves enable row level security;
alter table public.cloud_saves force row level security;

-- Policies: owner only. There is deliberately NO delete policy, so a bug or a stolen browser session
-- cannot erase the cloud copy. (Delete the row from the dashboard Table Editor if you ever want to.)
drop policy if exists cloud_saves_select_own on public.cloud_saves;
create policy cloud_saves_select_own on public.cloud_saves
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists cloud_saves_insert_own on public.cloud_saves;
create policy cloud_saves_insert_own on public.cloud_saves
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists cloud_saves_update_own on public.cloud_saves;
create policy cloud_saves_update_own on public.cloud_saves
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Table privileges: signed-in users only; the anonymous (signed-out) role gets nothing.
revoke all on public.cloud_saves from anon;
revoke all on public.cloud_saves from authenticated;
grant select, insert, update on public.cloud_saves to authenticated;

-- Revision trigger. The browser sends "update ... where revision = N" (compare-and-set).
--   * INSERT: revision is forced to 1, the owner is forced to the caller, the time is server time.
--   * UPDATE: revision is forced to OLD.revision + 1 whatever the client sent; the owner cannot be changed.
-- Two devices updating from the same revision N at once: the second UPDATE waits for the first one's row lock,
-- re-checks "revision = N", finds N+1, and changes zero rows. The browser treats zero rows as a conflict.
create or replace function public.cloud_saves_before_write() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.user_id    := auth.uid();
    new.revision   := 1;
    new.updated_at := now();
  else
    new.user_id    := old.user_id;
    new.revision   := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists cloud_saves_before_write on public.cloud_saves;
create trigger cloud_saves_before_write
  before insert or update on public.cloud_saves
  for each row execute function public.cloud_saves_before_write();
