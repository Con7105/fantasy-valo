-- Draft rooms: one per draft session
create table if not exists public.draft_rooms (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_name text not null,
  phase text not null check (phase in ('0-0', '1-0/0-1', '1-1')),
  slot_count int not null check (slot_count in (3, 4)),
  role_constraints jsonb,
  player_roles jsonb,
  participant_names text[] not null default '{}',
  snake_order int[] not null default '{}',
  current_round int not null default 1,
  current_pick_index int not null default 0,
  status text not null default 'setup' check (status in ('setup', 'drafting', 'completed')),
  matchups jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Draft picks: one row per pick
create table if not exists public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.draft_rooms(id) on delete cascade,
  round int not null,
  pick_index int not null,
  participant_index int not null,
  player_key text not null,
  player_name text not null,
  team_name text not null,
  role text,
  created_at timestamptz not null default now(),
  unique(room_id, round, pick_index)
);

create index if not exists draft_picks_room_id on public.draft_picks(room_id);

-- Realtime: enable in Supabase Dashboard > Database > Replication for draft_rooms and draft_picks

-- RLS: allow anon read/write for draft tables (link-based access; optional: tighten later with join codes)
alter table public.draft_rooms enable row level security;
alter table public.draft_picks enable row level security;

create policy "Allow anon read draft_rooms" on public.draft_rooms for select using (true);
create policy "Allow anon insert draft_rooms" on public.draft_rooms for insert with check (true);
create policy "Allow anon update draft_rooms" on public.draft_rooms for update using (true);

create policy "Allow anon read draft_picks" on public.draft_picks for select using (true);
create policy "Allow anon insert draft_picks" on public.draft_picks for insert with check (true);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists draft_rooms_updated_at on public.draft_rooms;
create trigger draft_rooms_updated_at
  before update on public.draft_rooms
  for each row execute function public.set_updated_at();
