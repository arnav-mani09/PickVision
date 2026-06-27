create table if not exists public.daily_picks (
  id uuid primary key default gen_random_uuid(),
  league text not null,
  date text not null,
  picks jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists daily_picks_league_date_idx on public.daily_picks (league, date, created_at desc);
