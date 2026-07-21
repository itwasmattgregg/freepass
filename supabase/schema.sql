-- FreePass production schema
-- Run in the Supabase SQL Editor for a fresh project (includes auth + hardened RLS).

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  address text,
  address_normalized text,
  latitude numeric,
  longitude numeric,
  offers_trial boolean not null default true,
  management_key uuid not null default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  description text,
  category text,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trial_signups (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  email text not null,
  signed_up_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_studios_location on public.studios(latitude, longitude);
create index if not exists idx_studios_owner_id on public.studios(owner_id);
create index if not exists idx_studios_address_normalized on public.studios(address_normalized)
  where address_normalized is not null and address_normalized <> '';
create index if not exists idx_classes_studio_id on public.classes(studio_id);
create index if not exists idx_classes_category on public.classes(category);
create index if not exists idx_trial_signups_studio_id on public.trial_signups(studio_id);
create unique index if not exists idx_trial_signups_studio_email
  on public.trial_signups(studio_id, lower(trim(email)));
create index if not exists idx_rate_limits_lookup
  on public.rate_limits(bucket, identifier, created_at desc);

alter table public.studios enable row level security;
alter table public.classes enable row level security;
alter table public.trial_signups enable row level security;
alter table public.rate_limits enable row level security;

create policy "Public can read studios"
  on public.studios for select using (true);

create policy "Public can read classes"
  on public.classes for select using (true);

create policy "Public can insert trial signups"
  on public.trial_signups for insert with check (true);

create policy "Owners can read own trial signups"
  on public.trial_signups for select
  using (
    exists (
      select 1 from public.studios s
      where s.id = trial_signups.studio_id
        and s.owner_id = auth.uid()
    )
  );

-- Hide management_key from PostgREST clients
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

create or replace function normalize_trial_email()
returns trigger as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$ language plpgsql;

drop trigger if exists trial_signups_normalize_email on public.trial_signups;
create trigger trial_signups_normalize_email
  before insert or update on public.trial_signups
  for each row execute function normalize_trial_email();
