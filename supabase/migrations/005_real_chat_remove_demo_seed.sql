-- Threadly 3.2 — chat real e remoção do seed de demonstração

-- Remove perfis/conteúdo fictício usados apenas durante o protótipo.
-- FKs com ON DELETE CASCADE removem os posts e relações associados.
delete from public.profiles where id like 'demo-%';

-- Uma conversa direta deve existir no máximo uma vez por par de usuários.
alter table public.conversations add column if not exists direct_key text;
create unique index if not exists conversations_direct_key_unique
  on public.conversations (direct_key)
  where direct_key is not null;

create or replace function public.start_direct_conversation(p_other_user_id text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me text := auth.jwt()->>'sub';
  pair_key text;
  conversation_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = p_other_user_id then raise exception 'cannot message self'; end if;
  if not exists(select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'profile not found';
  end if;

  pair_key := case
    when me < p_other_user_id then me || ':' || p_other_user_id
    else p_other_user_id || ':' || me
  end;

  select c.id into conversation_id
  from public.conversations c
  where c.direct_key = pair_key
  limit 1;

  if conversation_id is null then
    begin
      insert into public.conversations(kind, direct_key)
      values ('direct', pair_key)
      returning id into conversation_id;
    exception when unique_violation then
      select c.id into conversation_id
      from public.conversations c
      where c.direct_key = pair_key
      limit 1;
    end;
  end if;

  insert into public.conversation_members(conversation_id, user_id)
  values (conversation_id, me), (conversation_id, p_other_user_id)
  on conflict do nothing;

  return conversation_id;
end
$$;

revoke all on function public.start_direct_conversation(text) from public;
grant execute on function public.start_direct_conversation(text) to authenticated;
