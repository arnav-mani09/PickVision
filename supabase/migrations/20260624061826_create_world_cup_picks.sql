create table if not exists public.world_cup_picks (
  id uuid primary key default gen_random_uuid(),
  game_id text not null unique,
  kickoff timestamptz not null,
  home_team text not null,
  away_team text not null,
  home_country_code text not null,
  away_country_code text not null,
  predicted_winner text not null,
  confidence numeric not null,
  reasoning text not null,
  top_picks jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists world_cup_picks_kickoff_idx on public.world_cup_picks (kickoff);
