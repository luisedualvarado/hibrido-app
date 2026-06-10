-- Ejecutar una vez en Supabase SQL Editor.
-- Crea un unico documento de estado protegido por Supabase Auth + RLS.

create table if not exists public.app_state (
  id text primary key default 'primary' check (id = 'primary'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "admin reads own state" on public.app_state;
create policy "admin reads own state"
on public.app_state for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "admin inserts own state" on public.app_state;
create policy "admin inserts own state"
on public.app_state for insert
to authenticated
with check (owner_id = auth.uid() and id = 'primary');

drop policy if exists "admin updates own state" on public.app_state;
create policy "admin updates own state"
on public.app_state for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() and id = 'primary');

revoke all on table public.app_state from anon;
grant select, insert, update on table public.app_state to authenticated;
