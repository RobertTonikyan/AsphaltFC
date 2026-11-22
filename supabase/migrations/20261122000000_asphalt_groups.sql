-- Asphalt FC: one row per group (roster, settings, current split, draw and match clock).
-- The table is never exposed directly. Clients go through the functions below:
--   * the manager proves ownership with a secret that only the manager link carries;
--   * players read through a view code, and ratings are stripped on the server.

create table if not exists public.asphalt_groups (
  id          uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  view_code   text not null unique,
  name        text not null default '',
  state       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.asphalt_groups enable row level security;
revoke all on public.asphalt_groups from anon, authenticated;

create or replace function public.asphalt_hash(p_secret text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_secret, 'sha256'), 'hex')
$$;

-- Removes everything a player must not see: ratings and the fairness spread.
create or replace function public.asphalt_public_state(p_state jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('id', p->'id', 'name', p->'name', 'pos', p->'pos'))
      from jsonb_array_elements(coalesce(p_state->'players', '[]'::jsonb)) p
    ), '[]'::jsonb),
    'result', case when p_state ? 'result' and jsonb_typeof(p_state->'result') = 'object'
                   then (p_state->'result') - 'spread' else null end,
    'game', p_state->'game'
  )
$$;

create or replace function public.asphalt_create(p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_secret text := encode(extensions.gen_random_bytes(18), 'hex');
  v_code   text := encode(extensions.gen_random_bytes(6), 'hex');
  v_id     uuid;
begin
  if p_name is null or length(btrim(p_name)) = 0 or length(p_name) > 60 then
    raise exception 'bad_input';
  end if;
  insert into asphalt_groups (secret_hash, view_code, name)
  values (asphalt_hash(v_secret), v_code, btrim(p_name))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'secret', v_secret, 'view_code', v_code, 'now', now());
end $$;

create or replace function public.asphalt_admin_get(p_id uuid, p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g asphalt_groups;
begin
  select * into g from asphalt_groups where id = p_id and secret_hash = asphalt_hash(p_secret);
  if not found then raise exception 'not_admin'; end if;
  return jsonb_build_object('id', g.id, 'name', g.name, 'view_code', g.view_code,
                            'state', g.state, 'updated_at', g.updated_at, 'now', now());
end $$;

create or replace function public.asphalt_admin_save(p_id uuid, p_secret text, p_state jsonb, p_name text default null)
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
                            'updated_at', g.updated_at, 'now', now());
end $$;

revoke all on function public.asphalt_hash(text) from public, anon, authenticated;
revoke all on function public.asphalt_public_state(jsonb) from public, anon, authenticated;
revoke all on function public.asphalt_create(text) from public;
revoke all on function public.asphalt_admin_get(uuid, text) from public;
revoke all on function public.asphalt_admin_save(uuid, text, jsonb, text) from public;
revoke all on function public.asphalt_view(text) from public;
grant execute on function public.asphalt_create(text) to anon, authenticated;
grant execute on function public.asphalt_admin_get(uuid, text) to anon, authenticated;
grant execute on function public.asphalt_admin_save(uuid, text, jsonb, text) to anon, authenticated;
grant execute on function public.asphalt_view(text) to anon, authenticated;
