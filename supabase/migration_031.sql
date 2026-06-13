-- Demo-Daten entfernen (Piet Mutsaers)
delete from memories where book_id  = 'a1b2c3d4-0000-0000-0000-000000000001';
delete from stories  where book_id  = 'a1b2c3d4-0000-0000-0000-000000000001';
delete from media    where book_id  = 'a1b2c3d4-0000-0000-0000-000000000001';
delete from albums   where book_id  = 'a1b2c3d4-0000-0000-0000-000000000001';
delete from books    where id       = 'a1b2c3d4-0000-0000-0000-000000000001';
delete from projects where id in (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001'
);
