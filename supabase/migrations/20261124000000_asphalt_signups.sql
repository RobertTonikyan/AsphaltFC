-- Asphalt FC: players sign themselves up from the player link.
-- A sign-up is a name and a position. It waits in `signups` (kept apart from `state`,
-- so the manager's saves never overwrite a sign-up that arrived in between) until the
-- manager rates the player and adds them to the squad, or dismisses the sign-up.
-- A name that already exists in the squad is linked to that player (`pid`), so the
-- manager's app can mark them as coming today without asking for a new rating.

alter table public.asphalt_groups
  add column if not exists signups jsonb not null default '[]'::jsonb;

-- Players also see who is coming today (names and positions only, never ratings).
create or replace function public.asphalt_public_state(p_state jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('id', p->'id', 'name', p->'name', 'pos', p->'pos',
                                          'here', coalesce(p->'here', 'false'::jsonb)))
      from jsonb_array_elements(coalesce(p_state->'players', '[]'::jsonb)) p
    ), '[]'::jsonb),
    'result', case when p_state ? 'result' and jsonb_typeof(p_state->'result') = 'object'
                   then (p_state->'result') - 'spread' else null end,
    'game', p_state->'game'
  )
$$;

create or replace function public.asphalt_register(p_code text, p_name text, p_pos text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g      asphalt_groups;
  v_name text := btrim(coalesce(p_name, ''));
  v_key  text := lower(btrim(coalesce(p_name, '')));
  v_id   text;
  v_pid  text;
begin
  if length(v_name) = 0 or length(v_name) > 30 or p_pos not in ('gk', 'mid', 'att') then
    raise exception 'bad_input';
  end if;
  select * into g from asphalt_groups where view_code = p_code for update;
  if not found then raise exception 'bad_link'; end if;

  select p->>'id', p->>'name' into v_pid, v_name
    from jsonb_array_elements(coalesce(g.state->'players', '[]'::jsonb)) p
   where lower(btrim(p->>'name')) = v_key limit 1;
  v_name := coalesce(v_name, btrim(p_name));

  -- Same name again: update the position instead of adding a duplicate.
  select s->>'id' into v_id
    from jsonb_array_elements(g.signups) s
   where lower(btrim(s->>'name')) = v_key limit 1;

  if v_id is not null then
    update asphalt_groups
       set signups = (select coalesce(jsonb_agg(case when s->>'id' = v_id
                                                     then s || jsonb_build_object('pos', p_pos)
                                                     else s end), '[]'::jsonb)
                        from jsonb_array_elements(g.signups) s)
     where id = g.id;
  else
    if jsonb_array_length(g.signups) >= 80 then raise exception 'full'; end if;
    v_id := 'r' || encode(extensions.gen_random_bytes(6), 'hex');
    update asphalt_groups
       set signups = g.signups || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
             'id', v_id, 'name', v_name, 'pos', p_pos, 'pid', v_pid, 'at', now())))
     where id = g.id;
  end if;
  return jsonb_build_object('id', v_id, 'name', v_name, 'pos', p_pos, 'known', v_pid is not null, 'now', now());
end $$;

-- A player can take back their own sign-up while it is still waiting for the manager.
create or replace function public.asphalt_unregister(p_code text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update asphalt_groups
     set signups = (select coalesce(jsonb_agg(s), '[]'::jsonb)
                      from jsonb_array_elements(signups) s where s->>'id' <> p_id)
   where view_code = p_code;
  if not found then raise exception 'bad_link'; end if;
  return jsonb_build_object('now', now());
end $$;

create or replace function public.asphalt_admin_get(p_id uuid, p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g asphalt_groups;
begin
  select * into g from asphalt_groups where id = p_id and secret_hash = asphalt_hash(p_secret);
  if not found then raise exception 'not_admin'; end if;
  return jsonb_build_object('id', g.id, 'name', g.name, 'view_code', g.view_code,
                            'state', g.state, 'signups', g.signups,
                            'updated_at', g.updated_at, 'now', now());
end $$;

-- p_taken: sign-ups the manager has handled (added to the squad or dismissed) in this save.
drop function if exists public.asphalt_admin_save(uuid, text, jsonb, text);
create or replace function public.asphalt_admin_save(p_id uuid, p_secret text, p_state jsonb,
                                                     p_name text default null, p_taken text[] default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_updated timestamptz;
begin
  if p_state is null or jsonb_typeof(p_state) <> 'object' or length(p_state::text) > 200000 then
    raise exception 'bad_input';
  end if;
  if p_name is not null and (length(btrim(p_name)) = 0 or length(p_name) > 60) then
    raise exception 'bad_input';
  end if;
  update asphalt_groups
     set state = p_state,
         name = coalesce(btrim(p_name), name),
         signups = case when coalesce(cardinality(p_taken), 0) = 0 then signups
                        else (select coalesce(jsonb_agg(s), '[]'::jsonb)
                                from jsonb_array_elements(signups) s
                               where not (s->>'id' = any(p_taken))) end,
         updated_at = now()
   where id = p_id and secret_hash = asphalt_hash(p_secret)
  returning updated_at into v_updated;
  if not found then raise exception 'not_admin'; end if;
  return jsonb_build_object('updated_at', v_updated, 'now', now());
end $$;

create or replace function public.asphalt_view(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g asphalt_groups;
begin
  select * into g from asphalt_groups where view_code = p_code;
  if not found then raise exception 'bad_link'; end if;
  return jsonb_build_object('name', g.name, 'state', asphalt_public_state(g.state),
                            'signups', (select coalesce(jsonb_agg(jsonb_build_object(
                                          'id', s->'id', 'name', s->'name', 'pos', s->'pos')), '[]'::jsonb)
                                          from jsonb_array_elements(g.signups) s),
                            'updated_at', g.updated_at, 'now', now());
end $$;

revoke all on function public.asphalt_register(text, text, text) from public;
revoke all on function public.asphalt_unregister(text, text) from public;
revoke all on function public.asphalt_admin_save(uuid, text, jsonb, text, text[]) from public;
grant execute on function public.asphalt_register(text, text, text) to anon, authenticated;
grant execute on function public.asphalt_unregister(text, text) to anon, authenticated;
grant execute on function public.asphalt_admin_save(uuid, text, jsonb, text, text[]) to anon, authenticated;
