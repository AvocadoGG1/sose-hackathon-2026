-- Starter food items so the Donate page has buttons to show.
-- Safe to run more than once.
insert into public.food_items (name, category) values
  ('Rice',          'Grains'),
  ('Pasta',         'Grains'),
  ('Canned Beans',  'Canned Goods'),
  ('Canned Corn',   'Canned Goods'),
  ('Peanut Butter', 'Protein'),
  ('Apples',        'Produce'),
  ('Potatoes',      'Produce'),
  ('Bread',         'Bakery')
on conflict (name) do nothing;
