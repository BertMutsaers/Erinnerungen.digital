-- Migration 017: ist_demo flag + public read policies for demo projects

alter table projects add column if not exists ist_demo boolean default false;

update projects set ist_demo = true where titel = 'Piet Mutsaers';

-- Public read for demo projects
create policy "Demo lesbar" on projects
  for select using (ist_demo = true);

-- Public read for memories/stories/media/albums of demo projects
create policy "Demo memories lesbar" on memories
  for select using (
    project_id in (select id from projects where ist_demo = true)
    or book_id in (
      select b.id from books b
      join projects p on b.project_id = p.id
      where p.ist_demo = true
    )
  );

create policy "Demo stories lesbar" on stories
  for select using (
    project_id in (select id from projects where ist_demo = true)
    or book_id in (
      select b.id from books b
      join projects p on b.project_id = p.id
      where p.ist_demo = true
    )
  );

create policy "Demo media lesbar" on media
  for select using (
    project_id in (select id from projects where ist_demo = true)
    or book_id in (
      select b.id from books b
      join projects p on b.project_id = p.id
      where p.ist_demo = true
    )
  );

create policy "Demo albums lesbar" on albums
  for select using (
    project_id in (select id from projects where ist_demo = true)
    or book_id in (
      select b.id from books b
      join projects p on b.project_id = p.id
      where p.ist_demo = true
    )
  );
