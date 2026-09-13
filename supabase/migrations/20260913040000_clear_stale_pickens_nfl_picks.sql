-- George Pickens was traded from the Steelers to the Cowboys, but these two cached predictions
-- (generated before the roster-accuracy prompt fix) still list him as a Steelers player. Clear
-- them so the next request regenerates fresh, correct picks for these two games.
delete from public.nfl_picks
where game_id in (
  'pittsburgh-steelers-atlanta-falcons-2026-09-13',
  'new-england-patriots-pittsburgh-steelers-2026-09-20'
);
