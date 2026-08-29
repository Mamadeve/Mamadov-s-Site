-- ============================================================================
-- MAMADO - Supabase database schema
-- Productivity / music OS for a Nothing-inspired minimal workspace.
--
-- Security model (enforced at the DATABASE level via RLS):
--   * profiles.role in {admin, user}; 'admin' = owner.
--   * tasks         : creator == auth.uid()  OR  admin  (write); all read
--   * music_tracks  : everyone authenticated may add/read; owner may edit/remove;
--                     admin has full access
--   * categories    : admin manages global ones (owner_id IS NULL); any user may
--                     add personal categories
--   * activities / notifications / favourites / focus_sessions / track_plays
--                     are strictly per-user
--   * First sign-up is auto-promoted to admin via handle_new_user trigger.
-- ============================================================================

create extension if not exists "pgcrypto";

-- -- Enums --------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('todo','in_progress','completed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_priority as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.music_source as enum ('spotify','soundcloud','direct');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.focus_session_type as enum ('focus','short_break','long_break');
exception when duplicate_object then null; end $$;

-- -- Profiles (created FIRST: helper functions below are validated against it) --
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  bio          text,
  role         user_role not null default 'user',
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- -- Generic helpers ----------------------------------------
-- NOTE: is_admin() is a LANGUAGE SQL function - its body is validated
-- against existing tables at creation time, so it must come after profiles.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user') = 'admin';
$$;

-- Activity log writer (used by triggers). SECURITY DEFINER so trigger
-- functions can record events without per-user insert policies.
create or replace function public.write_audit(
  p_user_id uuid, p_type text, p_entity_type text, p_entity_id text, p_metadata jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.activities (user_id, type, entity_type, entity_id, metadata)
  values (p_user_id, p_type, p_entity_type, p_entity_id, p_metadata);
end; $$;

-- Only triggers (running as the definer/owner) may write audit rows;
-- blocks forged activity entries from client-side calls.
revoke execute on function public.write_audit(uuid, text, text, text, jsonb) from anon, authenticated;

-- Profiles RLS (policies need is_admin() to exist)
create policy "profiles read all"  on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin all"  on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Block privilege escalation: only admins may change the role column.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end; $$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- Auto-create a profile on signup; the FIRST account becomes admin (owner).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
  v_uname  text;
begin
  select not exists (select 1 from public.profiles) into is_first;
  v_uname := coalesce(nullif(lower(new.raw_user_meta_data ->> 'display_name'), ''), lower(split_part(new.email, '@', 1)));
  insert into public.profiles (id, display_name, role, username)
  values (new.id, new.raw_user_meta_data ->> 'display_name', case when is_first then 'admin'::user_role else 'user'::user_role end, v_uname)
  on conflict (id) do nothing;
  perform public.write_audit(new.id, 'user.joined', 'user', new.id::text,
    jsonb_build_object('title', coalesce(new.raw_user_meta_data ->> 'display_name', new.email)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -- Categories ---------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text,
  owner_id   uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;

create policy "cat select all"          on public.categories for select to authenticated using (true);
create policy "cat insert own/admin"    on public.categories for insert to authenticated with check (owner_id = auth.uid() or public.is_admin());
create policy "cat update own/admin"    on public.categories for update to authenticated using (public.is_admin() or owner_id = auth.uid()) with check (public.is_admin() or owner_id = auth.uid());
create policy "cat delete own/admin"    on public.categories for delete to authenticated using (public.is_admin() or owner_id = auth.uid());

-- -- Tasks --------------------------------------------------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       task_status not null default 'todo',
  priority     task_priority not null default 'medium',
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  assigned_to  uuid references public.profiles (id) on delete set null,
  category_id  uuid references public.categories (id) on delete set null,
  tags         text[] not null default '{}',
  position     bigint not null default 0,
  -- privacy / visibility (admin-controlled)
  assignee_visible boolean not null default true,
  is_public        boolean not null default false
);
alter table public.tasks enable row level security;

create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_assigned_idx   on public.tasks (assigned_to);
create index tasks_status_idx     on public.tasks (status);
create index tasks_public_idx     on public.tasks (is_public);

create policy "tasks select visible"           on public.tasks for select to authenticated using (
  public.is_admin()
  or is_public
  or created_by = auth.uid()
  or (assigned_to = auth.uid() and assignee_visible)
);
create policy "tasks insert own/admin"        on public.tasks for insert to authenticated with check (created_by = auth.uid() or public.is_admin());
create policy "tasks update own/assign/admin" on public.tasks for update to authenticated
  using (created_by = auth.uid() or assigned_to = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or assigned_to = auth.uid() or public.is_admin());
create policy "tasks delete own/admin"        on public.tasks for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- audit + timestamps + completed_at bookkeeping
create or replace function public.task_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit(new.created_by, 'task.created', 'task', new.id::text, jsonb_build_object('title', new.title));
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.status = 'completed' and old.status <> 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
      perform public.write_audit(new.created_by, 'task.completed', 'task', new.id::text, jsonb_build_object('title', new.title));
    elsif new.status in ('todo','in_progress') and old.status = 'completed' then
      new.completed_at := null;
      perform public.write_audit(new.created_by, 'task.uncompleted', 'task', new.id::text, jsonb_build_object('title', new.title));
    else
      perform public.write_audit(new.created_by, 'task.updated', 'task', new.id::text, jsonb_build_object('title', new.title));
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    perform public.write_audit(old.created_by, 'task.deleted', 'task', old.id::text, jsonb_build_object('title', old.title));
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists tasks_audit on public.tasks;
create trigger tasks_audit
  after insert or update or delete on public.tasks
  for each row execute procedure public.task_audit();

-- task favorites
create table if not exists public.task_favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  item_id    uuid not null references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.task_favorites enable row level security;
create policy "task favs own" on public.task_favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -- Music --------------------------------------------------
create table if not exists public.music_tracks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  artist           text not null,
  album            text,
  cover_url        text,
  source           music_source not null default 'direct',
  source_url       text not null,
  duration_seconds integer,
  notes            text,
  category_id      uuid references public.categories (id) on delete set null,
  added_by         uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
alter table public.music_tracks enable row level security;
create index music_source_idx on public.music_tracks (source);

-- review workflow: non-admin submissions stay pending until admin-approved
-- (triggers music_enforce_review / music_enforce_upload_limit — see
--  supabase/migrations/2026-08-29_music_approval_limits.sql)
alter table public.music_tracks add column if not exists status text not null default 'approved';
do $$ begin
  alter table public.music_tracks add constraint music_tracks_status_check
    check (status in ('pending','approved','rejected'));
exception when duplicate_object then null; when 42710 then null; end $$;

create or replace function public.music_enforce_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.status := 'pending';
  end if;
  return new;
end; $$;

drop trigger if exists music_enforce_review on public.music_tracks;
create trigger music_enforce_review
  before insert on public.music_tracks
  for each row execute procedure public.music_enforce_review();

create or replace function public.music_upload_limit()
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case jsonb_typeof(value)
              when 'number' then (value #>> '{}')::int
              when 'string' then nullif(value #>> '{}', '')::int
              else null end
     from public.app_settings where key = 'public.music_upload_limit'),
    1);
$$;

create or replace function public.music_enforce_upload_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit integer;
  v_count integer;
begin
  if public.is_admin() then return new; end if;
  if new.source <> 'direct' then return new; end if; -- links are unlimited
  select public.music_upload_limit() into v_limit;
  if v_limit is null or v_limit < 0 then return new; end if;
  select count(*) into v_count
    from public.music_tracks
   where added_by = auth.uid() and source = 'direct';
  if v_count >= v_limit then
    raise exception 'Upload limit reached — % uploaded audio file(s) per account. Music links are unlimited.', v_limit
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;

drop trigger if exists music_enforce_upload_limit on public.music_tracks;
create trigger music_enforce_upload_limit
  before insert on public.music_tracks
  for each row execute procedure public.music_enforce_upload_limit();

insert into public.app_settings (key, value, updated_by)
values ('public.music_upload_limit', '1'::jsonb, null)
on conflict (key) do nothing;

create policy "music select visible"       on public.music_tracks for select to authenticated using (status = 'approved' or added_by = auth.uid() or public.is_admin());
create policy "music insert user/admin"  on public.music_tracks for insert to authenticated with check (added_by = auth.uid() or public.is_admin());
create policy "music update own/admin"   on public.music_tracks for update to authenticated using (added_by = auth.uid() or public.is_admin()) with check (added_by = auth.uid() or public.is_admin());
create policy "music delete own/admin"   on public.music_tracks for delete to authenticated using (added_by = auth.uid() or public.is_admin());

-- audio file storage (direct uploads) — public read, per-user write folders
insert into storage.buckets (id, name, public) values ('music', 'music', true) on conflict (id) do nothing;
create policy "music storage read" on storage.objects for select to authenticated
using (bucket_id = 'music');
create policy "music storage insert" on storage.objects for insert to authenticated
with check (bucket_id = 'music' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "music storage delete" on storage.objects for delete to authenticated
using (bucket_id = 'music' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create or replace function public.music_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit(new.added_by, 'music.added', 'music', new.id::text, jsonb_build_object('title', new.title, 'artist', new.artist));
    return new;
  end if;
  if tg_op = 'DELETE' then
    perform public.write_audit(old.added_by, 'music.removed', 'music', old.id::text, jsonb_build_object('title', old.title));
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists music_audit on public.music_tracks;
create trigger music_audit
  after insert or delete on public.music_tracks
  for each row execute procedure public.music_audit();

-- music favorites
create table if not exists public.music_favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  item_id    uuid not null references public.music_tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.music_favorites enable row level security;
create policy "music favs own" on public.music_favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- track plays (recently played)
create table if not exists public.track_plays (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles (id) on delete cascade,
  track_id  uuid not null references public.music_tracks (id) on delete cascade,
  played_at timestamptz not null default now()
);
alter table public.track_plays enable row level security;
create index track_plays_user_idx on public.track_plays (user_id, played_at desc);
create policy "track plays own" on public.track_plays for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -- Activities / Notifications / Focus / Settings ----------
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  entity_type text,
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
alter table public.activities enable row level security;
create index activities_user_idx on public.activities (user_id, created_at desc);
create policy "activities read own"     on public.activities for select to authenticated using (user_id = auth.uid());
create policy "activities admin read"   on public.activities for select to authenticated using (public.is_admin());
-- writes are only via the security-definer trigger functions

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  type       text not null default 'info',
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications own" on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  task_id          uuid references public.tasks (id) on delete set null,
  session_type     focus_session_type not null default 'focus',
  duration_seconds integer not null default 0,
  started_at       timestamptz not null default now(),
  completed        boolean not null default true
);
alter table public.focus_sessions enable row level security;
create index focus_sessions_user_idx on public.focus_sessions (user_id);
create policy "focus own" on public.focus_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
-- settings may contain provider secrets → admin-only read/write
create policy "settings select admin" on public.app_settings for select to authenticated using (public.is_admin());
create policy "settings write admin"   on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Sanitized public mirror: `public.*` keys (feature flags, no secrets)
-- readable by all authenticated users.
create or replace view public.app_public_settings
with (security_invoker = false) as
  select key, value from public.app_settings where key like 'public.%';
grant select on public.app_public_settings to authenticated;

-- ============================================================================
-- Data API grants (run in SQL editor if new tables aren't exposed yet):
--   grant usage on schema public to anon, authenticated;
--   grant select on all tables in schema public to anon;
--   grant select, insert, update, delete on all tables in schema public to authenticated;
-- ============================================================================
