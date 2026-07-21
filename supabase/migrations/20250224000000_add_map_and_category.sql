-- Add location for map discovery
alter table public.studios
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

-- Add category for filtering (e.g. Yoga, Pilates, HIIT)
alter table public.classes
  add column if not exists category text;

create index if not exists idx_studios_location on public.studios(latitude, longitude);
create index if not exists idx_classes_category on public.classes(category);

comment on column public.studios.latitude is 'Latitude for map display and nearby search';
comment on column public.studios.longitude is 'Longitude for map display and nearby search';
comment on column public.classes.category is 'Class type for search/filter (e.g. Yoga, Pilates, HIIT)';
