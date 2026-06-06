-- Seed: Piet Mutsaers (1926–1982)
-- Run AFTER migration_001.sql

-- Fixed UUIDs so re-running is idempotent
do $$ begin

  -- Book
  insert into books (id, owner_id, title, description)
  values (
    'a1b2c3d4-0000-0000-0000-000000000001',
    null,
    'Piet Mutsaers',
    'Geboren 17.6.1926 Tilburg · Gestorben 3.9.1982 Osnabrück'
  )
  on conflict (id) do nothing;

  -- Memories
  insert into memories
    (id, book_id, title, card_size, icon, kategorie, datum_label, datum_jahr, datum_monat, datum_tag, happened_at)
  values
    ('a1b2c3d4-0000-0000-0001-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Geburt in Tilburg',          'lg-black', '👶', 'kindheit',
     '17. Juni 1926',              1926, 6,  17, '1926-06-17'),

    ('a1b2c3d4-0000-0000-0001-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Grundschule',                'small',    '📚', 'kindheit',
     'Sommer 1933',                1933, 7,  null, null),

    ('a1b2c3d4-0000-0000-0001-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Mittelschule (Ulo)',         'medium',   '🏫', 'kindheit',
     'Sommer 1936',                1936, 7,  null, null),

    ('a1b2c3d4-0000-0000-0001-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Schlachter De Beer',         'medium',   '🔪', 'kindheit',
     'Juni 1940',                  1940, 6,  null, null),

    ('a1b2c3d4-0000-0000-0001-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Fleischerlehre H. Roovers–Vermeer', 'large', '🎓', 'ausbildung',
     'Januar 1942',                1942, 1,  null, null),

    ('a1b2c3d4-0000-0000-0001-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Gesellenprüfung',            'small',    '🏅', 'ausbildung',
     '21. Mai 1946',               1946, 5,  21, '1946-05-21'),

    ('a1b2c3d4-0000-0000-0001-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Militärdienst Husaren van Boreel', 'small', '⚔️', 'militaer',
     '17. Nov. 1947',              1947, 11, 17, '1947-11-17'),

    ('a1b2c3d4-0000-0000-0001-000000000008', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Wanderschaft Düsseldorf',    'large',    '🚶', 'wanderjahre',
     'Sommer 1951',                1951, 7,  null, null),

    ('a1b2c3d4-0000-0000-0001-000000000009', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Meisterbrief Landshut',      'lg-black', '🏆', 'wanderjahre',
     '9. Mai 1953',                1953, 5,  9, '1953-05-09'),

    ('a1b2c3d4-0000-0000-0001-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Hochzeit mit Ruth Bressau',  'large',    '💍', 'familie',
     '21. April 1958',             1958, 4,  21, '1958-04-21'),

    ('a1b2c3d4-0000-0000-0001-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Tochter Gabi',               'small',    '👶', 'familie',
     'März 1959',                  1959, 3,  null, null),

    ('a1b2c3d4-0000-0000-0001-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Tochter Marijke',            'small',    '👶', 'familie',
     'August 1960',                1960, 8,  null, null),

    ('a1b2c3d4-0000-0000-0001-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Sohn Bert',                  'medium',   '👦', 'familie',
     'November 1962',              1962, 11, null, null),

    ('a1b2c3d4-0000-0000-0001-000000000014', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Kauf Fa. Bedford',           'lg-black', '🏢', 'beruf',
     '14. Okt. 1969',              1969, 10, 14, '1969-10-14'),

    ('a1b2c3d4-0000-0000-0001-000000000015', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Neubau Bedford Produktion',  'small',    '🏗️', 'beruf',
     '1971',                       1971, null, null, null),

    ('a1b2c3d4-0000-0000-0001-000000000016', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Mutsaers Familien Holding GbR', 'small', '📊', 'beruf',
     'Juli 1979',                  1979, 7,  null, null),

    ('a1b2c3d4-0000-0000-0001-000000000017', 'a1b2c3d4-0000-0000-0000-000000000001',
     'Piet Mutsaers verstirbt',    'lg-black', '✝️', 'sonstiges',
     '3. Sept. 1982',              1982, 9,  3, '1982-09-03')

  on conflict (id) do nothing;

end $$;
