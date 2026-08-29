-- ============================================================================
-- MAMADO — migration 2026-08-28
-- Task visibility (personal + public), music storage bucket, integrations
-- security hardening. Idempotent — safe to run repeatedly.
-- ============================================================================

-- ── 1. Task visibility columns ──────────────────────────────────────────────
alter table public.tasks add column if not exists assignee_visible boolean not null default true;
alter table public.tasks add column if not exists is_public boolean not null default false;

-- Replace the blanket "everyone reads everything" select policy with the
-- privacy model: admins see all; public tasks are readable by everyone;
-- own tasks (created/assigned) are readable; a task hidden from the assignee
-- is NOT readable by that assignee.
drop policy if exists "tasks select public" on public.tasks;
drop policy if exists "tasks select visible" on public.tasks;
create policy "tasks select visible" on public.tasks for select to authenticated using (
  public.is_admin()
  or is_public
  or created_by = auth.uid()
  or (assigned_to = auth.uid() and assignee_visible)
);

create index if not exists tasks_public_idx on public.tasks (is_public);

-- ── 2. Music storage bucket (direct audio uploads) ─────────────────────────
insert into storage.buckets (id, name, public)
values ('music', 'music', true)
on conflict (id) do nothing;

-- users may read all audio (library is shared), write only into their own
-- folder (`<uid>/filename`), delete only their own objects.
drop policy if exists "music storage read" on storage.objects;
create policy "music storage read" on storage.objects for select to authenticated
using (bucket_id = 'music');

drop policy if exists "music storage insert" on storage.objects;
create policy "music storage insert" on storage.objects for insert to authenticated
with check (bucket_id = 'music' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "music storage delete" on storage.objects;
create policy "music storage delete" on storage.objects for delete to authenticated
using (bucket_id = 'music' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ── 3. Integrations security ───────────────────────────────────────────────
-- app_settings must be admin-only (it now holds provider secrets).
drop policy if exists "settings select public" on public.app_settings;
create policy "settings select admin" on public.app_settings for select to authenticated
using (public.is_admin());

-- Sanitized public mirror: keys prefixed `public.` are readable by all
-- authenticated users via this view (no secrets, only feature flags).
create or replace view public.app_public_settings
with (security_invoker = false) as
  select key, value from public.app_settings where key like 'public.%';

grant select on public.app_public_settings to authenticated;
