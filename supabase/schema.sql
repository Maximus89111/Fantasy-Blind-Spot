-- Run in a NEW Supabase project's SQL editor. Never put service-role keys in browser code.
create table if not exists public.fantasy_teams (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 platform text not null check (platform in ('mfl','sleeper','espn')),
 league_id text not null,
 season integer not null,
 franchise_id text not null,
 team_name text not null,
 league_name text not null,
 roster jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 unique(user_id,platform,league_id,season,franchise_id)
);
alter table public.fantasy_teams enable row level security;
create policy "Owners can read own teams" on public.fantasy_teams for select to authenticated using (auth.uid()=user_id);
create policy "Owners can insert own teams" on public.fantasy_teams for insert to authenticated with check (auth.uid()=user_id);
create policy "Owners can update own teams" on public.fantasy_teams for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Owners can delete own teams" on public.fantasy_teams for delete to authenticated using (auth.uid()=user_id);
create table if not exists public.injury_events (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 player_id text not null,
 player_name text not null,
 team_id uuid references public.fantasy_teams(id) on delete cascade,
 old_status text,
 new_status text,
 old_practice text,
 new_practice text,
 occurred_at timestamptz not null default now()
);
alter table public.injury_events enable row level security;
create policy "Users read own alerts" on public.injury_events for select to authenticated using(auth.uid()=user_id);
-- Writes are reserved for a trusted backend, not clients.
create index if not exists fantasy_teams_owner_idx on public.fantasy_teams(user_id);
create index if not exists injury_events_owner_idx on public.injury_events(user_id,occurred_at desc);
