-- Add requested shisha flavors.

insert into public.shisha_flavors (name, is_available)
values
  ('Swiss', true),
  ('Ice', true),
  ('Menta', true),
  ('Pistacija', true),
  ('Strong', true),
  ('Limeta', true),
  ('Borovnica', true),
  ('Malina', true),
  ('Dubai', true)
on conflict (name) do update
set is_available = excluded.is_available;
