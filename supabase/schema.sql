-- Haxagon Food Pantry: the whole database schema in one file.
--
-- To set up a database: run this file in the Supabase SQL Editor, then seed.sql.
-- Safe to run again on a database that already has it (nothing is dropped or changed).
--
-- Weights are stored in grams (the ESP32 sends grams).
-- Only the Express server reads or writes these tables, using the secret key; row level
-- security is on with no policies, so the public anon key can't touch them.


-- ---------------------------------------------------------------------------
-- Foods
-- ---------------------------------------------------------------------------

-- Items people can donate or pick up (e.g. "Rice", "Canned Beans").
-- category is the label shown on cards; food_group (USDA MyPlate) drives the cart's
-- nutrition check, e.g. Canned Beans is category "Canned Goods" but food_group protein.
create table if not exists public.food_items (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  category     text,
  food_group   text check (food_group in ('grains', 'protein', 'vegetables', 'fruits', 'dairy')),
  created_at   timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- Scale
-- ---------------------------------------------------------------------------

-- Readings posted by the ESP32 scale each time a weight settles (POST /api/scale-reading).
create table if not exists public.scale_readings (
  id           bigint generated always as identity primary key,
  device_id    text not null,
  weight_grams numeric(10, 2) not null check (weight_grams >= 0),
  recorded_at  timestamptz not null default now()
);

-- Lets the Donate page quickly fetch the latest reading for a scale.
create index if not exists scale_readings_device_latest_idx
  on public.scale_readings (device_id, recorded_at desc);


-- ---------------------------------------------------------------------------
-- Donations (Donate Food page)
-- ---------------------------------------------------------------------------

-- One row per submitted donation. Submitted donations count as stock right away.
create table if not exists public.donations (
  id          bigint generated always as identity primary key,
  donor_name  text,
  donor_email text,
  notes       text,
  status      text not null default 'submitted'
              check (status in ('draft', 'submitted')),
  created_at  timestamptz not null default now()
);

-- The items in a donation. Staff can reject part of an item on the Admin page
-- (e.g. 1 dented can of 5); only quantity - rejected_quantity counts as stock.
create table if not exists public.donation_items (
  id                bigint generated always as identity primary key,
  donation_id       bigint not null references public.donations (id) on delete cascade,
  food_item_id      bigint not null references public.food_items (id),
  weight_grams      numeric(10, 2) check (weight_grams >= 0),
  quantity          integer not null default 1 check (quantity > 0),
  rejected_quantity integer not null default 0,
  expiration_date   date,
  -- The scale reading this weight came from, if it was weighed on the ESP32.
  scale_reading_id  bigint references public.scale_readings (id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint donation_items_rejected_quantity_check
    check (rejected_quantity >= 0 and rejected_quantity <= quantity)
);

create index if not exists donation_items_donation_idx on public.donation_items (donation_id);
create index if not exists donation_items_food_item_idx on public.donation_items (food_item_id);


-- ---------------------------------------------------------------------------
-- Pickups (Get Food -> Checkout)
-- ---------------------------------------------------------------------------

-- One row per checkout. Staff move it to picked_up or cancelled on the Admin page;
-- cancelled pickups give their food back to stock.
create table if not exists public.pickups (
  id              bigint generated always as identity primary key,
  recipient_name  text not null,
  recipient_email text not null,
  notes           text,
  status          text not null default 'submitted'
                  check (status in ('submitted', 'picked_up', 'cancelled')),
  created_at      timestamptz not null default now()
);

-- The items in a checkout.
create table if not exists public.pickup_items (
  id           bigint generated always as identity primary key,
  pickup_id    bigint not null references public.pickups (id) on delete cascade,
  food_item_id bigint not null references public.food_items (id),
  quantity     integer not null check (quantity > 0),
  created_at   timestamptz not null default now()
);

create index if not exists pickup_items_pickup_idx on public.pickup_items (pickup_id);
create index if not exists pickup_items_food_item_idx on public.pickup_items (food_item_id);


-- ---------------------------------------------------------------------------
-- Inventory (what Get Food, Donate and Admin show)
-- ---------------------------------------------------------------------------

-- One row per food: donated (minus rejected items) minus picked up (minus cancelled).
-- total_quantity never goes below 0; the API also refuses changes that would oversell.
-- security_invoker makes the view respect RLS instead of running as its owner.
create or replace view public.inventory with (security_invoker = true) as
select
  f.id                                                              as food_item_id,
  f.name,
  f.category,
  coalesce(d.total_weight_grams, 0)                                 as total_weight_grams,
  greatest(coalesce(d.total_quantity, 0) - coalesce(p.taken, 0), 0) as total_quantity,
  d.earliest_expiration,
  f.food_group
from public.food_items f
left join (
  select
    di.food_item_id,
    -- weight is per line, so scale it down by the share that was rejected
    sum(di.weight_grams * (di.quantity - di.rejected_quantity) / di.quantity)  as total_weight_grams,
    sum(di.quantity - di.rejected_quantity)                                     as total_quantity,
    min(di.expiration_date) filter (where di.quantity > di.rejected_quantity)  as earliest_expiration
  from public.donation_items di
  join public.donations dn on dn.id = di.donation_id
  where dn.status = 'submitted'
  group by di.food_item_id
) d on d.food_item_id = f.id
left join (
  select pi.food_item_id, sum(pi.quantity) as taken
  from public.pickup_items pi
  join public.pickups pk on pk.id = pi.pickup_id
  where pk.status <> 'cancelled'
  group by pi.food_item_id
) p on p.food_item_id = f.id;


-- ---------------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------------

alter table public.food_items     enable row level security;
alter table public.scale_readings enable row level security;
alter table public.donations      enable row level security;
alter table public.donation_items enable row level security;
alter table public.pickups        enable row level security;
alter table public.pickup_items   enable row level security;
