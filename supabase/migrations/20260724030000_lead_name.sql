-- Optional visitor name captured alongside the email on the intro form.
-- Nullable, since the name field is optional.
alter table leads add column name text;
