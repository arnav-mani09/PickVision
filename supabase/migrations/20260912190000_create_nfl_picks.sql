create table if not exists public.nfl_picks (
  id uuid primary key default gen_random_uuid(),
  game_id text not null unique,
  kickoff timestamptz not null,
  home_team text not null,
  away_team text not null,
  predicted_winner text not null,
  confidence numeric not null,
  reasoning text not null,
  top_picks jsonb not null,
  factors jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nfl_picks_kickoff_idx on public.nfl_picks (kickoff);
