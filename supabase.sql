-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  contact text not null,
  players jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

-- Anyone can submit a team. The client must provide exactly five player objects.
create policy "Anyone can submit a team"
on public.teams for insert to anon, authenticated
with check (
  status = 'pending'
  and jsonb_typeof(players) = 'array'
  and jsonb_array_length(players) = 5
);

-- Public can see approved teams only.
create policy "Public can view approved teams"
on public.teams for select to anon, authenticated
using (status = 'approved');

-- Admins are managed through Supabase Auth and this allowlist.
create table if not exists public.tournament_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.tournament_admins enable row level security;

create policy "Admins can read admin allowlist"
on public.tournament_admins for select to authenticated
using (user_id = auth.uid());

create policy "Admins can view all registrations"
on public.teams for select to authenticated
using (exists (select 1 from public.tournament_admins a where a.user_id = auth.uid()));

create policy "Admins can update registrations"
on public.teams for update to authenticated
using (exists (select 1 from public.tournament_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.tournament_admins a where a.user_id = auth.uid()));

create policy "Admins can delete registrations"
on public.teams for delete to authenticated
using (exists (select 1 from public.tournament_admins a where a.user_id = auth.uid()));

-- After creating your admin account in Supabase Authentication,
-- copy that account's UUID and run:
-- insert into public.tournament_admins (user_id) values ('YOUR-AUTH-USER-UUID');
