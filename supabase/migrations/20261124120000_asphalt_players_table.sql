-- Asphalt FC: players get their own table.
-- Until now the squad lived as JSON inside asphalt_groups.state and sign-ups in
-- asphalt_groups.signups. Now every player is one row in asphalt_players, so the
-- organizer can read and edit the squad in the Supabase Table Editor:
--   status 'squad'   = in the squad, with a rating (1 to 10);
--   status 'pending' = signed up from the player link, waiting for a rating.
-- The functions keep the same inputs and outputs, so the app works unchanged.
-- The table is never exposed to the browser; ratings still never reach the player link.

create table if not exists public.asphalt_players (
  group_id   uuid not null references public.asphalt_groups(id) on delete cascade,
  id         text not null default 'p' || encode(extensions.gen_random_bytes(6), 'hex'),
  name       text not null check (length(btrim(name)) between 1 and 30),
  pos        text not null default 'mid' check (pos in ('gk', 'mid', 'att')),
  rating     int check (rating between 1 and 10),
  coming     boolean not null default false,
  status     text not null default 'squad' check (status in ('squad', 'pending')),
  squad_id   text,                      -- pending only: the squad player with the same name
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, id),
  check (status = 'pending' or rating is not null)
);
create index if not exists asphalt_players_group_status on public.asphalt_players (group_id, status);

alter table public.asphalt_players enable row level security;
revoke all on public.asphalt_players from anon, authenticated;

-- Readable list for the Table Editor: group name first, then the player.
create or replace view public.asphalt_players_list with (security_invoker = true) as
  select g.name as group_name, p.name, p.pos, p.rating, p.coming, p.status, p.created_at, p.group_id, p.id
    from public.asphalt_players p join public.asphalt_groups g on g.id = p.group_id
   order by g.name, p.status desc, p.name;
revoke all on public.asphalt_players_list from anon, authenticated;

-- Move the existing data over.
insert into public.asphalt_players (group_id, id, name, pos, rating, coming, status)
select g.id, p->>'id', left(btrim(p->>'name'), 30),
       case when p->>'pos' in ('gk', 'mid', 'att') then p->>'pos' else 'mid' end,
       greatest(1, least(10, coalesce(round((p->>'rating')::numeric)::int, 5))),
       coalesce((p->>'here')::boolean, false), 'squad'
  from public.asphalt_groups g, jsonb_array_elements(coalesce(g.state->'players', '[]'::jsonb)) p
 where coalesce(btrim(p->>'name'), '') <> '' and p->>'id' is not null
on conflict do nothing;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'asphalt_groups' and column_name = 'signups') then
    execute $q$
      insert into public.asphalt_players (group_id, id, name, pos, status, squad_id, created_at)
      select g.id, s->>'id', left(btrim(s->>'name'), 30),
             case when s->>'pos' in ('gk', 'mid', 'att') then s->>'pos' else 'mid' end,
             'pending', s->>'pid', coalesce((s->>'at')::timestamptz, now())
        from public.asphalt_groups g, jsonb_array_elements(g.signups) s
       where coalesce(btrim(s->>'name'), '') <> ''
      on conflict do nothing
    $q$;
    alter table public.asphalt_groups drop column signups;
  end if;
end $$;

update public.asphalt_groups set state = state - 'players' where state ? 'players';

-- Helpers: the squad as the app's JSON, with or without ratings.
create or replace function public.asphalt_squad_json(p_group uuid, p_ratings boolean)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(
           case when p_ratings
                then jsonb_build_object('id', id, 'name', name, 'pos', pos, 'rating', rating, 'here', coming)
                else jsonb_build_object('id', id, 'name', name, 'pos', pos, 'here', coming) end
           order by created_at, name), '[]'::jsonb)
    from asphalt_players where group_id = p_group and status = 'squad'
$$;

create or replace function public.asphalt_pending_json(p_group uuid, p_full boolean)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(
           case when p_full
                then jsonb_strip_nulls(jsonb_build_object('id', id, 'name', name, 'pos', pos, 'pid', squad_id, 'at', created_at))
                else jsonb_build_object('id', id, 'name', name, 'pos', pos) end
           order by created_at), '[]'::jsonb)
    from asphalt_players where group_id = p_group and status = 'pending'
$$;

create or replace function public.asphalt_admin_get(p_id uuid, p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g asphalt_groups;
begin
  select * into g from asphalt_groups where id = p_id and secret_hash = asphalt_hash(p_secret);
  if not found then raise exception 'not_admin'; end if;
  return jsonb_build_object('id', g.id, 'name', g.name, 'view_code', g.view_code,
                            'state', g.state || jsonb_build_object('players', asphalt_squad_json(g.id, true)),
                            'signups', asphalt_pending_json(g.id, true),
                            'updated_at', g.updated_at, 'now', now());
end $$;

-- Saves the manager's state: squad rows go to asphalt_players, the rest stays in state.
-- p_taken: sign-ups the manager has handled (added to the squad or dismissed).
create or replace function public.asphalt_admin_save(p_id uuid, p_secret text, p_state jsonb,
                                                     p_name text default null, p_taken text[] default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_updated timestamptz;
begin
  if p_state is null or jsonb_typeof(p_state) <> 'object' or length(p_state::text) > 200000
     or (p_state ? 'players' and jsonb_typeof(p_state->'players') <> 'array') then
    raise exception 'bad_input';
  end if;
  if p_name is not null and (length(btrim(p_name)) = 0 or length(p_name) > 60) then
    raise exception 'bad_input';
  end if;
  update asphalt_groups
     set state = p_state - 'players',
         name = coalesce(btrim(p_name), name),
         updated_at = now()
   where id = p_id and secret_hash = asphalt_hash(p_secret)
  returning updated_at into v_updated;
  if not found then raise exception 'not_admin'; end if;

  if p_state ? 'players' then
    delete from asphalt_players
     where group_id = p_id and status = 'squad'
       and id not in (select p->>'id' from jsonb_array_elements(p_state->'players') p where p->>'id' is not null);
    insert into asphalt_players as t (group_id, id, name, pos, rating, coming, status)
    select p_id, p->>'id', left(btrim(p->>'name'), 30),
           case when p->>'pos' in ('gk', 'mid', 'att') then p->>'pos' else 'mid' end,
           greatest(1, least(10, coalesce(round((p->>'rating')::numeric)::int, 5))),
           coalesce((p->>'here')::boolean, false), 'squad'
      from jsonb_array_elements(p_state->'players') p
     where p->>'id' is not null and coalesce(btrim(p->>'name'), '') <> ''
    on conflict (group_id, id) do update
       set name = excluded.name, pos = excluded.pos, rating = excluded.rating, coming = excluded.coming,
           status = 'squad', squad_id = null,
           updated_at = case when (t.name, t.pos, t.rating, t.coming, t.status)
                                  is distinct from (excluded.name, excluded.pos, excluded.rating, excluded.coming, 'squad')
                             then now() else t.updated_at end;
  end if;

  if coalesce(cardinality(p_taken), 0) > 0 then
    delete from asphalt_players where group_id = p_id and status = 'pending' and id = any(p_taken);
  end if;
  return jsonb_build_object('updated_at', v_updated, 'now', now());
end $$;

create or replace function public.asphalt_view(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g asphalt_groups;
begin
  select * into g from asphalt_groups where view_code = p_code;
  if not found then raise exception 'bad_link'; end if;
  return jsonb_build_object('name', g.name,
                            'state', jsonb_build_object(
                               'players', asphalt_squad_json(g.id, false),
                               'result', case when jsonb_typeof(g.state->'result') = 'object'
                                              then (g.state->'result') - 'spread' else null end,
                               'game', g.state->'game'),
                            'signups', asphalt_pending_json(g.id, false),
                            'updated_at', g.updated_at, 'now', now());
end $$;

create or replace function public.asphalt_register(p_code text, p_name text, p_pos text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
  v_name  text := btrim(coalesce(p_name, ''));
  v_key   text := lower(btrim(coalesce(p_name, '')));
  v_id    text;
  v_pid   text;
begin
  if length(v_name) = 0 or length(v_name) > 30 or p_pos not in ('gk', 'mid', 'att') then
    raise exception 'bad_input';
  end if;
  select id into v_group from asphalt_groups where view_code = p_code for update;
  if not found then raise exception 'bad_link'; end if;

  select id, name into v_pid, v_name from asphalt_players
   where group_id = v_group and status = 'squad' and lower(btrim(name)) = v_key limit 1;
  v_name := coalesce(v_name, btrim(p_name));

  -- Same name again: update the position instead of adding a duplicate.
  update asphalt_players set pos = p_pos, updated_at = now()
   where group_id = v_group and status = 'pending' and lower(btrim(name)) = v_key
  returning id into v_id;

  if v_id is null then
    if (select count(*) from asphalt_players where group_id = v_group and status = 'pending') >= 80 then
      raise exception 'full';
    end if;
    v_id := 'r' || encode(extensions.gen_random_bytes(6), 'hex');
    insert into asphalt_players (group_id, id, name, pos, status, squad_id)
    values (v_group, v_id, v_name, p_pos, 'pending', v_pid);
  end if;
  return jsonb_build_object('id', v_id, 'name', v_name, 'pos', p_pos, 'known', v_pid is not null, 'now', now());
end $$;

-- A player can take back their own sign-up while it is still waiting for the manager.
create or replace function public.asphalt_unregister(p_code text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_group uuid;
begin
  select id into v_group from asphalt_groups where view_code = p_code;
  if not found then raise exception 'bad_link'; end if;
  delete from asphalt_players where group_id = v_group and status = 'pending' and id = p_id;
  return jsonb_build_object('now', now());
end $$;

drop function if exists public.asphalt_public_state(jsonb);

revoke all on function public.asphalt_squad_json(uuid, boolean) from public, anon, authenticated;
revoke all on function public.asphalt_pending_json(uuid, boolean) from public, anon, authenticated;
