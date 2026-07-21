-- Production hardening: owner auth, hide secrets, tighten RLS, duplicate helpers

-- Owner linkage + contact + normalized address for duplicate detection
alter table public.studios
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists contact_email text,
  add column if not exists address_normalized text;

create index if not exists idx_studios_owner_id on public.studios(owner_id);
create index if not exists idx_studios_address_normalized on public.studios(address_normalized)
  where address_normalized is not null and address_normalized <> '';

-- Simple rate-limit ledger (server-side only via service role)
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_lookup
  on public.rate_limits(bucket, identifier, created_at desc);

alter table public.rate_limits enable row level security;
-- No policies for anon/authenticated → only service role can use this table

-- Drop overly permissive policies from the initial schema
drop policy if exists "Studios are viewable by everyone" on public.studios;
drop policy if exists "Classes are viewable by everyone" on public.classes;
drop policy if exists "Anyone can insert trial signups" on public.trial_signups;
drop policy if exists "Studio management: allow insert/update/delete with management_key (handled in API)" on public.studios;
drop policy if exists "Anyone can insert studios (public directory)" on public.studios;
drop policy if exists "Anyone can insert classes" on public.classes;
drop policy if exists "Anyone can update/delete studios" on public.studios;
drop policy if exists "Anyone can update/delete classes" on public.classes;
drop policy if exists "Anyone can delete classes" on public.classes;

-- Public read for discovery; mutations go through service role in server actions
create policy "Public can read studios"
  on public.studios for select
  using (true);

create policy "Public can read classes"
  on public.classes for select
  using (true);

create policy "Public can insert trial signups"
  on public.trial_signups for insert
  with check (true);

create policy "Owners can read own trial signups"
  on public.trial_signups for select
  using (
    exists (
      select 1 from public.studios s
      where s.id = trial_signups.studio_id
        and s.owner_id = auth.uid()
    )
  );

-- Hide management_key from PostgREST clients (anon / authenticated)
revoke all on table public.studios from anon, authenticated;
grant select (
  id, name, slug, description, address, latitude, longitude,
  offers_trial, created_at, updated_at, owner_id, contact_email, address_normalized
) on table public.studios to anon, authenticated;

revoke all on table public.classes from anon, authenticated;
grant select on table public.classes to anon, authenticated;

revoke all on table public.trial_signups from anon, authenticated;
grant insert (studio_id, email) on table public.trial_signups to anon, authenticated;

revoke all on table public.rate_limits from anon, authenticated;

-- Ensure unique trial per studio+email (idempotent with existing index)
create unique index if not exists idx_trial_signups_studio_email
  on public.trial_signups(studio_id, lower(trim(email)));

comment on column public.studios.owner_id is 'Supabase auth user who owns this studio listing';
comment on column public.studios.contact_email is 'Where trial signup notifications are sent';
comment on column public.studios.address_normalized is 'Normalized address used to detect duplicate listings';
