-- Asphalt FC: positions are now defence, midfield and attack.
-- The goalkeeper position is replaced by defence ('def', shown as בלם/מגן).
-- Existing goalkeepers become defenders; the app also reads an old 'gk' as defence.

alter table public.asphalt_players drop constraint if exists asphalt_players_pos_check;
update public.asphalt_players set pos = 'def', updated_at = now() where pos = 'gk';
alter table public.asphalt_players add constraint asphalt_players_pos_check check (pos in ('def', 'mid', 'att'));

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
           case when p->>'pos' = 'gk' then 'def' when p->>'pos' in ('def', 'mid', 'att') then p->>'pos' else 'mid' end,
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

create or replace function public.asphalt_register(p_code text, p_name text, p_pos text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
  v_name  text := btrim(coalesce(p_name, ''));
  v_key   text := lower(btrim(coalesce(p_name, '')));
  v_id    text;
  v_pid   text;
begin
  if p_pos = 'gk' then p_pos := 'def'; end if;  -- older app versions
  if length(v_name) = 0 or length(v_name) > 30 or p_pos not in ('def', 'mid', 'att') then
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
