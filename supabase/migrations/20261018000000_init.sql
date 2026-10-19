-- Initial schema for the food donation site.
-- Weights are stored in grams. The ESP32 sends grams; convert in the UI if needed.

-- Items people can donate or pick up (e.g. "Rice", "Canned beans").
create table public.food_items (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  category     text,
  default_unit text not null default 'g',
  created_at   timestamptz not null default now()
);

-- Raw readings posted by the ESP32 scale.
create table public.scale_readings (
  id           bigint generated always as identity primary key,
  device_id    text not null,
  weight_grams numeric(10, 2) not null check (weight_grams >= 0),
  recorded_at  timestamptz not null default now()
);

-- Lets the Donate page quickly fetch the latest reading for a scale.
create index scale_readings_device_latest_idx
  on public.scale_readings (device_id, recorded_at desc);

-- One row per submitted donation.
create table public.donations (
  id          bigint generated always as identity primary key,
  donor_name  text,
  donor_email text,
  notes       text,
  status      text not null default 'submitted'
              check (status in ('draft', 'submitted')),
  created_at  timestamptz not null default now()
);

-- The individual items inside a donation.
create table public.donation_items (
  id               bigint generated always as identity primary key,
  donation_id      bigint not null references public.donations (id) on delete cascade,
  food_item_id     bigint not null references public.food_items (id),
  weight_grams     numeric(10, 2) check (weight_grams >= 0),
  quantity         integer not null default 1 check (quantity > 0),
  expiration_date  date,
  -- The scale reading this weight came from, if it was weighed on the ESP32.
  scale_reading_id bigint references public.scale_readings (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index donation_items_donation_idx on public.donation_items (donation_id);
create index donation_items_food_item_idx on public.donation_items (food_item_id);

-- What's available on the Get Food page: totals of everything donated, per item.
-- When pickups/checkout are added, subtract them here.
-- security_invoker makes the view respect RLS instead of running as its owner.
create view public.inventory with (security_invoker = true) as
select
  f.id                              as food_item_id,
  f.name,
  f.category,
  coalesce(sum(di.weight_grams), 0) as total_weight_grams,
  coalesce(sum(di.quantity), 0)     as total_quantity,
  min(di.expiration_date)           as earliest_expiration
from public.food_items f
left join (
  select di.*
  from public.donation_items di
  join public.donations d on d.id = di.donation_id
  where d.status = 'submitted'
) di on di.food_item_id = f.id
group by f.id, f.name, f.category;

-- Only the Express server (using the service role key) talks to the database.
-- RLS with no policies blocks the public anon key from reading or writing directly.
alter table public.food_items     enable row level security;
alter table public.scale_readings enable row level security;
alter table public.donations      enable row level security;
alter table public.donation_items enable row level security;
