-- Demo data: 12 pantry foods and two weeks of donations and pickups, so every page
-- has something to show. Run after schema.sql. Safe to run again: the foods are
-- upserted, and the history is only added if it isn't there yet.
--
-- Dates are relative to when you run it, so the 14-day chart is always full.
-- Stock it ends with:
--   Rice 14, Canned Beans 11, Pasta 9, Canned Corn 8, Oatmeal 6, Canned Tuna 6,
--   Potatoes 4, Fruit Cups 3, Bread 2 (expires in 2 days), Apples 2 (expires in 4 days),
--   Peanut Butter 1, Shelf-Stable Milk 0 (so the cart has no dairy to offer).
-- Plus 2 pickups waiting, 1 cancelled pickup, 1 dented can of tuna rejected,
-- and 1 donation weighed on the scale.

-- category is the label on the cards; food_group (MyPlate) drives the cart's check.
insert into public.food_items (name, category, food_group) values
  ('Rice',              'Grains',       'grains'),
  ('Pasta',             'Grains',       'grains'),
  ('Oatmeal',           'Breakfast',    'grains'),
  ('Bread',             'Bakery',       'grains'),
  ('Canned Beans',      'Canned Goods', 'protein'),
  ('Canned Tuna',       'Canned Goods', 'protein'),
  ('Peanut Butter',     'Protein',      'protein'),
  ('Canned Corn',       'Canned Goods', 'vegetables'),
  ('Potatoes',          'Produce',      'vegetables'),
  ('Apples',            'Produce',      'fruits'),
  ('Fruit Cups',        'Snacks',       'fruits'),
  ('Shelf-Stable Milk', 'Dairy',        'dairy')
on conflict (name) do update
  set category = excluded.category, food_group = excluded.food_group;

do $$
declare
  d bigint;  -- the donation being added
  p bigint;  -- the pickup being added
  r bigint;  -- a scale reading
begin
  if exists (select 1 from public.donations where notes = 'seed') then
    raise notice 'Demo history is already loaded; skipping.';
    return;
  end if;

  -- ---------------- donations: (food, quantity, total grams, best-before) ----------------

  insert into public.donations (donor_name, notes, created_at)
  values ('Starter stock', 'seed', now() - interval '13 days') returning id into d;
  insert into public.donation_items (donation_id, food_item_id, quantity, weight_grams, expiration_date, created_at)
  select d, f.id, v.qty, v.grams, current_date + v.days, now() - interval '13 days'
  from (values ('Rice', 10, 9070, 300), ('Pasta', 8, 3632, 400), ('Canned Beans', 10, 4250, 500),
               ('Canned Corn', 8, 3456, 450), ('Peanut Butter', 4, 1816, 200), ('Oatmeal', 6, 3060, 250),
               ('Canned Tuna', 6, 852, 600)) v(name, qty, grams, days)
  join public.food_items f on f.name = v.name;

  insert into public.donations (donor_name, donor_email, created_at)
  values ('Matador Mutual Aid', 'mutualaid@example.com', now() - interval '11 days') returning id into d;
  insert into public.donation_items (donation_id, food_item_id, quantity, weight_grams, expiration_date, created_at)
  select d, f.id, v.qty, v.grams, current_date + v.days, now() - interval '11 days'
  from (values ('Potatoes', 6, 13608, 20), ('Apples', 6, 8160, 4)) v(name, qty, grams, days)
  join public.food_items f on f.name = v.name;

  insert into public.donations (donor_name, created_at)
  values (null, now() - interval '9 days') returning id into d;
  insert into public.donation_items (donation_id, food_item_id, quantity, weight_grams, expiration_date, created_at)
  select d, f.id, v.qty, v.grams, current_date + v.days, now() - interval '9 days'
  from (values ('Fruit Cups', 8, 904, 200), ('Shelf-Stable Milk', 4, 3784, 90), ('Bread', 4, 2268, 2)) v(name, qty, grams, days)
  join public.food_items f on f.name = v.name;

  -- one dented can of tuna rejected by staff
  insert into public.donations (donor_name, notes, created_at)
  values ('CSUN Engineering Club', 'Collected at the club meeting', now() - interval '7 days') returning id into d;
  insert into public.donation_items (donation_id, food_item_id, quantity, rejected_quantity, weight_grams, expiration_date, created_at)
  select d, f.id, v.qty, v.rejected, v.grams, current_date + v.days, now() - interval '7 days'
  from (values ('Rice', 6, 0, 5442, 300), ('Canned Tuna', 4, 1, 568, 600), ('Canned Beans', 5, 0, 2125, 500)) v(name, qty, rejected, grams, days)
  join public.food_items f on f.name = v.name;

  insert into public.donations (donor_name, donor_email, created_at)
  values ('Alex Rivera', 'alex.rivera@example.com', now() - interval '5 days') returning id into d;
  insert into public.donation_items (donation_id, food_item_id, quantity, weight_grams, expiration_date, created_at)
  select d, f.id, v.qty, v.grams, current_date + v.days, now() - interval '5 days'
  from (values ('Pasta', 4, 1816, 400), ('Oatmeal', 2, 1020, 250)) v(name, qty, grams, days)
  join public.food_items f on f.name = v.name;

  insert into public.donations (donor_name, created_at)
  values (null, now() - interval '3 days') returning id into d;
  insert into public.donation_items (donation_id, food_item_id, quantity, weight_grams, expiration_date, created_at)
  select d, f.id, v.qty, v.grams, current_date + v.days, now() - interval '3 days'
  from (values ('Bread', 3, 1701, 4), ('Apples', 2, 2720, 10)) v(name, qty, grams, days)
  join public.food_items f on f.name = v.name;

  -- weighed on the scale: the potatoes are linked to their reading
  insert into public.scale_readings (device_id, weight_grams, recorded_at)
  values ('intake-1', 4536, now() - interval '1 day') returning id into r;
  insert into public.donations (donor_name, notes, created_at)
  values ('Pantry volunteer drive', null, now() - interval '1 day') returning id into d;
  insert into public.donation_items (donation_id, food_item_id, quantity, weight_grams, expiration_date, scale_reading_id, created_at)
  select d, f.id, v.qty, v.grams, current_date + v.days, case when v.name = 'Potatoes' then r end, now() - interval '1 day'
  from (values ('Canned Corn', 3, 1296, 450), ('Potatoes', 2, 4536, 20), ('Fruit Cups', 2, 226, 200)) v(name, qty, grams, days)
  join public.food_items f on f.name = v.name;

  -- ---------------- pickups: (food, quantity) ----------------

  insert into public.pickups (recipient_name, recipient_email, status, created_at)
  values ('Jordan Lee', 'jordan.lee@example.com', 'picked_up', now() - interval '12 days') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '12 days'
  from (values ('Rice', 1), ('Canned Beans', 1), ('Peanut Butter', 1), ('Canned Tuna', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;

  insert into public.pickups (recipient_name, recipient_email, status, created_at)
  values ('Maria Gonzalez', 'maria.gonzalez@example.com', 'picked_up', now() - interval '10 days') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '10 days'
  from (values ('Pasta', 1), ('Canned Corn', 1), ('Potatoes', 2), ('Apples', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;

  insert into public.pickups (recipient_name, recipient_email, status, created_at)
  values ('Sam Nguyen', 'sam.nguyen@example.com', 'picked_up', now() - interval '8 days') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '8 days'
  from (values ('Shelf-Stable Milk', 2), ('Fruit Cups', 2), ('Bread', 2), ('Oatmeal', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;

  -- cancelled: its food went back into stock
  insert into public.pickups (recipient_name, recipient_email, notes, status, created_at)
  values ('Chris Park', 'chris.park@example.com', 'Ordered twice by mistake', 'cancelled', now() - interval '6 days') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '6 days'
  from (values ('Rice', 2), ('Canned Tuna', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;

  insert into public.pickups (recipient_name, recipient_email, status, created_at)
  values ('Priya Shah', 'priya.shah@example.com', 'picked_up', now() - interval '4 days') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '4 days'
  from (values ('Canned Beans', 2), ('Canned Tuna', 1), ('Apples', 2), ('Fruit Cups', 2), ('Shelf-Stable Milk', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;

  insert into public.pickups (recipient_name, recipient_email, status, created_at)
  values ('Diego Martinez', 'diego.martinez@example.com', 'picked_up', now() - interval '2 days') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '2 days'
  from (values ('Bread', 2), ('Peanut Butter', 1), ('Pasta', 1), ('Canned Corn', 1), ('Potatoes', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;

  insert into public.pickups (recipient_name, recipient_email, status, created_at)
  values ('Taylor Brooks', 'taylor.brooks@example.com', 'picked_up', now() - interval '1 day') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '1 day'
  from (values ('Shelf-Stable Milk', 1), ('Oatmeal', 1), ('Canned Tuna', 1), ('Apples', 1), ('Fruit Cups', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;

  -- waiting for staff to hand out
  insert into public.pickups (recipient_name, recipient_email, status, created_at)
  values ('Avery Johnson', 'avery.johnson@example.com', 'submitted', now() - interval '3 hours') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '3 hours'
  from (values ('Rice', 1), ('Canned Beans', 1), ('Peanut Butter', 1), ('Apples', 1), ('Bread', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;

  insert into public.pickups (recipient_name, recipient_email, notes, status, created_at)
  values ('Jamie Chen', 'jamie.chen@example.com', 'Can pick up after 3 pm', 'submitted', now() - interval '40 minutes') returning id into p;
  insert into public.pickup_items (pickup_id, food_item_id, quantity, created_at)
  select p, f.id, v.qty, now() - interval '40 minutes'
  from (values ('Pasta', 1), ('Canned Corn', 1), ('Fruit Cups', 2), ('Potatoes', 1), ('Apples', 1)) v(name, qty)
  join public.food_items f on f.name = v.name;
end $$;
