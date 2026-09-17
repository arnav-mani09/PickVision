create table if not exists public.world_cup_schedule_cache (
  date text primary key,
  matches jsonb not null,
  created_at timestamptz not null default now()
);
