-- Corrige a integridade do voto: a opção escolhida precisa pertencer à enquete informada.
drop policy if exists "poll votes own insert" on public.poll_votes;
create policy "poll votes own insert"
on public.poll_votes
for insert
to anon, authenticated
with check (
  user_id = private.threadly_uid()
  and exists (
    select 1 from public.poll_options o
    where o.id = poll_votes.option_id
      and o.poll_id = poll_votes.poll_id
  )
);

-- Índices para FKs e consultas sociais mais frequentes.
create index if not exists poll_votes_option_id_idx on public.poll_votes(option_id);
create index if not exists poll_votes_user_id_idx on public.poll_votes(user_id);
create index if not exists collaborations_owner_id_idx on public.collaborations(owner_id);
create index if not exists collaborations_collaborator_id_idx on public.collaborations(collaborator_id);
create index if not exists highlights_user_id_idx on public.highlights(user_id);
create index if not exists highlight_items_story_id_idx on public.highlight_items(story_id);
create index if not exists prompts_user_id_idx on public.prompts(user_id);
create index if not exists prompt_entries_user_id_idx on public.prompt_entries(user_id);
create index if not exists profile_pins_user_position_idx on public.profile_pins(user_id,position);
create index if not exists follow_requests_target_id_idx on public.follow_requests(target_id);
create index if not exists blocks_blocked_id_idx on public.blocks(blocked_id);
create index if not exists restrictions_restricted_id_idx on public.restrictions(restricted_id);
create index if not exists mutes_muted_id_idx on public.mutes(muted_id);
create index if not exists close_friends_friend_id_idx on public.close_friends(friend_id);
