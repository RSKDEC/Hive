-- Pondlife: games, seats and move log.
-- All access goes through the Next.js server using the service-role key.
-- RLS is enabled with no policies, so the public anon key cannot read or write these tables.

create table if not exists public.games (
  id            text primary key check (id ~ '^[A-Za-z0-9]{6,32}$'),
  config        jsonb not null,
  actions       jsonb not null default '[]'::jsonb,
  ending        jsonb,
  status        text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  turn          text not null default 'w' check (turn in ('w', 'b')),
  winner        text check (winner in ('w', 'b', 'draw')),
  result_reason text check (result_reason in ('surround', 'resign', 'agreement')),
  revision      integer not null default 0,
  offer         jsonb,
  rematch_id    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.players (
  game_id      text not null references public.games(id) on delete cascade,
  color        text not null check (color in ('w', 'b')),
  nickname     text not null check (char_length(nickname) between 1 and 24),
  secret_hash  text not null,
  joined_at    timestamptz not null default now(),
  primary key (game_id, color)
);

create table if not exists public.game_moves (
  id          bigserial primary key,
  game_id     text not null references public.games(id) on delete cascade,
  revision    integer not null,
  ply         integer not null,
  color       text not null check (color in ('w', 'b')),
  action      jsonb not null,
  created_at  timestamptz not null default now(),
  unique (game_id, ply)
);

create index if not exists games_updated_at_idx on public.games (updated_at);
create index if not exists game_moves_game_idx on public.game_moves (game_id, revision);

alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.game_moves enable row level security;
revoke all on public.games, public.players, public.game_moves from anon, authenticated;

-- Atomic, optimistic-concurrency commit: succeeds only if the stored revision still equals p_expected.
-- Returns the updated row, or no rows on conflict.
create or replace function public.commit_game(p_id text, p_expected integer, p_patch jsonb, p_moves jsonb)
returns setof public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.games;
begin
  update public.games set
    actions       = p_patch->'actions',
    ending        = nullif(p_patch->'ending', 'null'::jsonb),
    status        = p_patch->>'status',
    turn          = p_patch->>'turn',
    winner        = p_patch->>'winner',
    result_reason = p_patch->>'result_reason',
    offer         = nullif(p_patch->'offer', 'null'::jsonb),
    rematch_id    = p_patch->>'rematch_id',
    revision      = revision + 1,
    updated_at    = now()
  where id = p_id and revision = p_expected
  returning * into g;

  if not found then
    return;
  end if;

  -- Moves undone by an accepted take-back are removed from the log so plies stay unique.
  delete from public.game_moves where game_id = p_id and ply >= jsonb_array_length(g.actions) - jsonb_array_length(coalesce(p_moves, '[]'::jsonb));

  insert into public.game_moves (game_id, revision, ply, color, action)
  select p_id, g.revision, (m->>'ply')::int, m->>'color', m->'action'
  from jsonb_array_elements(coalesce(p_moves, '[]'::jsonb)) as m;

  return next g;
end;
$$;

revoke all on function public.commit_game(text, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.commit_game(text, integer, jsonb, jsonb) to service_role;

-- Optional housekeeping: remove games untouched for 90 days.
-- select cron.schedule('pondlife-cleanup', '0 4 * * *', $$delete from public.games where updated_at < now() - interval '90 days'$$);
