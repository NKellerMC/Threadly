drop policy if exists "profile pins own insert" on public.profile_pins;
create policy "profile pins own insert" on public.profile_pins for insert to anon,authenticated
with check (user_id=private.threadly_uid() and ((target_type='thread' and exists(select 1 from public.threads t where t.id::text=target_id and t.user_id=user_id)) or (target_type='video' and exists(select 1 from public.videos v where v.id::text=target_id and v.user_id=user_id))));

drop policy if exists "profile pins own update" on public.profile_pins;
create policy "profile pins own update" on public.profile_pins for update to anon,authenticated
using (user_id=private.threadly_uid())
with check (user_id=private.threadly_uid() and ((target_type='thread' and exists(select 1 from public.threads t where t.id::text=target_id and t.user_id=user_id)) or (target_type='video' and exists(select 1 from public.videos v where v.id::text=target_id and v.user_id=user_id))));

drop policy if exists "collabs owner invite" on public.collaborations;
create policy "collabs owner invite" on public.collaborations for insert to anon,authenticated
with check (owner_id=private.threadly_uid() and collaborator_id<>owner_id and ((target_type='thread' and exists(select 1 from public.threads t where t.id::text=target_id and t.user_id=owner_id)) or (target_type='video' and exists(select 1 from public.videos v where v.id::text=target_id and v.user_id=owner_id))));

drop policy if exists "prompt entries own insert" on public.prompt_entries;
create policy "prompt entries own insert" on public.prompt_entries for insert to anon,authenticated
with check (user_id=private.threadly_uid() and ((target_type='thread' and exists(select 1 from public.threads t where t.id::text=target_id and t.user_id=user_id)) or (target_type='video' and exists(select 1 from public.videos v where v.id::text=target_id and v.user_id=user_id))));

drop policy if exists "highlight items owner insert" on public.highlight_items;
create policy "highlight items owner insert" on public.highlight_items for insert to anon,authenticated
with check (exists(select 1 from public.highlights h join public.stories s on s.id=story_id where h.id=highlight_id and h.user_id=private.threadly_uid() and s.user_id=h.user_id));
