-- Fresh project schema. Session capabilities are random 256-bit HttpOnly cookies.
-- Only their SHA-256 digest is stored. No service_role or SECURITY DEFINER is required.
create table public.reaction_sessions (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) < 1000000),
  updated_at timestamptz not null default now()
);
alter table public.reaction_sessions enable row level security;
revoke all on public.reaction_sessions from anon, authenticated;
grant select, insert, update on public.reaction_sessions to anon;
create policy session_read on public.reaction_sessions for select to anon
  using (id = encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-session-token',''), 'UTF8')), 'hex')
    and length(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-session-token','')) = 64);
create policy session_create on public.reaction_sessions for insert to anon
  with check (id = encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-session-token',''), 'UTF8')), 'hex')
    and (current_setting('request.headers', true)::jsonb ->> 'x-session-token') ~ '^[a-f0-9]{64}$');
create policy session_update on public.reaction_sessions for update to anon
  using (id = encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-session-token',''), 'UTF8')), 'hex')
    and length(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-session-token','')) = 64)
  with check (id = encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-session-token',''), 'UTF8')), 'hex')
    and (current_setting('request.headers', true)::jsonb ->> 'x-session-token') ~ '^[a-f0-9]{64}$');
