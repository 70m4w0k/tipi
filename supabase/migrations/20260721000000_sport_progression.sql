-- Sport progression (spec docs/sport-progression-spec.md)
-- Visibilité du niveau sportif par les colocs (opt-out) + titre affiché choisi (gate niveau 5)
ALTER TABLE profiles ADD COLUMN show_sport_level boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN sport_title text;
