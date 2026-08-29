-- ============================================================================
-- MAMADO migration — 2026-08-29
-- Music review workflow (admin approval), per-user upload limits and the
-- Apple Music source. Idempotent — safe to re-run.
--
-- Workflow rules (enforced at the DATABASE level):
--   * music_tracks.status ∈ {pending, approved, rejected}
--   * non-admin inserts are FORCED to 'pending' by trigger — they never
--     appear publicly until an admin sets them to 'approved'
--   * RLS: users can read approved tracks + their own submissions;
--     admins read everything
--   * non-admins may upload AT MOST `public.music_upload_limit` (default 1)
--     direct audio files per account; music LINKS are unlimited.
--     Set the app_settings key `public.music_upload_limit` (JSON number,
--     -1 = unlimited) in the Admin console to change the quota.
-- ============================================================================

-- ── status column ──────────────────────────────────────────────────────────
alter table public.music_tracks add column if not exists status text not null default 'approved';

do $$ begin
  alter table public.music_tracks add constraint music_tracks_status_check
    check (status in ('pending','approved','rejected'));
exception when duplicate_object then null; when 42710 then null; end $$;

-- ── Apple Music source value ───────────────────────────────────────────────
alter type public.music_source add value if not exists 'applemusic';

-- ── Force pending status for non-admin submissions ─────────────────────────
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

-- ── Upload limit (uploaded audio files only — links are unlimited) ─────────
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
  if v_limit is null or v_limit < 0 then return new; end if; -- -1 = unlimited
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

-- ── RLS: visibility follows the review workflow ────────────────────────────
drop policy if exists "music select public" on public.music_tracks;
create policy "music select visible"
  on public.music_tracks for select to authenticated
  using (status = 'approved' or added_by = auth.uid() or public.is_admin());

-- ── Default public setting (readable via app_public_settings) ──────────────
insert into public.app_settings (key, value, updated_by)
values ('public.music_upload_limit', '1'::jsonb, null)
on conflict (key) do nothing;
