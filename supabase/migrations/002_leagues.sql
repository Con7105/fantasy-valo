-- Leagues: one per league
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text,
  event_id text not null,
  event_name text not null,
  status text not null default 'joining' check (status in ('joining', 'drafting', 'active')),
  draft_room_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- League members: participants who joined
create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null,
  join_order int not null default 0,
  wins int not null default 0,
  created_at timestamptz not null default now(),
  unique(league_id, name)
);

create index if not exists league_members_league_id on public.league_members(league_id);

-- League weeks: one row per week (phase), matchups and scores
create table if not exists public.league_weeks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  week_number int not null,
  phase text not null check (phase in ('0-0', '1-0/0-1', '1-1')),
  matchups jsonb not null default '[]',
  scores jsonb default '{}',
  status text not null default 'pending' check (status in ('pending', 'scored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(league_id, week_number)
);

create index if not exists league_weeks_league_id on public.league_weeks(league_id);

-- Add league_id to draft_rooms (nullable for back compat; new drafts from league will set it)
alter table public.draft_rooms
  add column if not exists league_id uuid references public.leagues(id) on delete set null;

-- leagues.draft_room_id FK to draft_rooms (add after column exists)
-- done via application: we set draft_room_id after creating draft_room; no DB FK from leagues to draft_rooms to avoid circular dep

-- updated_at for leagues and league_weeks
drop trigger if exists leagues_updated_at on public.leagues;
create trigger leagues_updated_at
  before update on public.leagues
  for each row execute function public.set_updated_at();

drop trigger if exists league_weeks_updated_at on public.league_weeks;
create trigger league_weeks_updated_at
  before update on public.league_weeks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.league_weeks enable row level security;

create policy "Allow anon read leagues" on public.leagues for select using (true);
create policy "Allow anon insert leagues" on public.leagues for insert with check (true);
create policy "Allow anon update leagues" on public.leagues for update using (true);

create policy "Allow anon read league_members" on public.league_members for select using (true);
create policy "Allow anon insert league_members" on public.league_members for insert with check (true);
create policy "Allow anon update league_members" on public.league_members for update using (true);

create policy "Allow anon read league_weeks" on public.league_weeks for select using (true);
create policy "Allow anon insert league_weeks" on public.league_weeks for insert with check (true);
create policy "Allow anon update league_weeks" on public.league_weeks for update using (true);
