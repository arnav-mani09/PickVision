-- Reported: Myles Garrett moved to the Rams, but these two cached predictions (generated before
-- the roster-accuracy prompt fix) still list him under Cleveland Browns games. Clear them so the
-- next request regenerates fresh picks with the corrected, search-verified roster.
delete from public.nfl_picks
where game_id in (
  'jacksonville-jaguars-cleveland-browns-2026-09-13',
  'tampa-bay-buccaneers-cleveland-browns-2026-09-20'
);
