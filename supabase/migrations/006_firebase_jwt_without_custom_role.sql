-- Threadly 3.2 — Firebase Auth integrado ao Supabase sem depender de custom claim.
--
-- O Firebase ID token é validado pelo Third-Party Auth do Supabase. Como tokens
-- Firebase sem `role` são executados no Postgres como `anon`, as políticas abaixo
-- permitem esse papel somente quando issuer, audience e subject pertencem ao
-- projeto Firebase oficial do Threadly.

create or replace function public.is_threadly_firebase_jwt()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (auth.jwt()->>'sub') is not null
    and (auth.jwt()->>'iss') = 'https://securetoken.google.com/threadly-61b09'
    and (auth.jwt()->>'aud') = 'threadly-61b09',
    false
  );
$$;

revoke all on function public.is_threadly_firebase_jwt() from public;
grant execute on function public.is_threadly_firebase_jwt() to anon, authenticated, service_role;

alter policy "bookmarks owner delete" on public.bookmarks to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "bookmarks owner insert" on public.bookmarks to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "bookmarks owner read" on public.bookmarks to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "members conversation read" on public.conversation_members to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and public.is_conversation_member(conversation_id));
alter policy "members own update" on public.conversation_members to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and user_id = (select auth.jwt()->>'sub')) with check ((select public.is_threadly_firebase_jwt()) and user_id = (select auth.jwt()->>'sub'));
alter policy "conversations member read" on public.conversations to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and public.is_conversation_member(id));

alter policy "follows owner delete" on public.follows to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = follower_id);
alter policy "follows owner insert" on public.follows to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = follower_id);

alter policy "messages member insert" on public.messages to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and sender_id = (select auth.jwt()->>'sub') and public.is_conversation_member(conversation_id));
alter policy "messages member read" on public.messages to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and public.is_conversation_member(conversation_id));

alter policy "notifications owner read" on public.notifications to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "notifications owner update" on public.notifications to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id) with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "profiles owner insert" on public.profiles to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = id);
alter policy "profiles owner update" on public.profiles to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = id) with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = id);

alter policy "reports owner insert" on public.reports to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = reporter_id);

alter policy "thread bookmarks owner delete" on public.thread_bookmarks to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "thread bookmarks owner insert" on public.thread_bookmarks to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "thread bookmarks owner read" on public.thread_bookmarks to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "thread likes owner delete" on public.thread_likes to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "thread likes owner insert" on public.thread_likes to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "thread likes owner select" on public.thread_likes to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "thread replies owner delete" on public.thread_replies to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "thread replies owner insert" on public.thread_replies to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "threads owner delete" on public.threads to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "threads owner insert" on public.threads to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "threads owner update" on public.threads to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id) with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "comments owner delete" on public.video_comments to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "comments owner insert" on public.video_comments to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "video likes owner delete" on public.video_likes to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "video likes owner insert" on public.video_likes to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "video likes owner select" on public.video_likes to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "views owner read" on public.video_views to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = viewer_id);

alter policy "videos owner delete" on public.videos to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "videos owner insert" on public.videos to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);
alter policy "videos owner update" on public.videos to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id) with check ((select public.is_threadly_firebase_jwt()) and (select auth.jwt()->>'sub') = user_id);

alter policy "media owner delete" on storage.objects to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and bucket_id = any(array['videos'::text,'thumbnails'::text,'images'::text]) and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
alter policy "media owner insert" on storage.objects to anon, authenticated with check ((select public.is_threadly_firebase_jwt()) and bucket_id = any(array['videos'::text,'thumbnails'::text,'images'::text]) and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
alter policy "media owner update" on storage.objects to anon, authenticated using ((select public.is_threadly_firebase_jwt()) and bucket_id = any(array['videos'::text,'thumbnails'::text,'images'::text]) and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')) with check ((select public.is_threadly_firebase_jwt()) and bucket_id = any(array['videos'::text,'thumbnails'::text,'images'::text]) and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select public.is_threadly_firebase_jwt()) and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = (select auth.jwt()->>'sub')
  );
$$;

create or replace function public.list_conversations(p_user_id text)
returns table(id uuid, participant_id text, participant_username text, participant_name text, participant_avatar_url text, last_message text, last_message_at timestamptz, unread bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare me text := auth.jwt()->>'sub';
begin
  if not (select public.is_threadly_firebase_jwt()) or me is null or me <> p_user_id then raise exception 'forbidden'; end if;
  return query
  select c.id, other.user_id, p.username, p.display_name, p.avatar_url,
    coalesce(last_msg.body,''), coalesce(last_msg.created_at,c.updated_at),
    (select count(*) from public.messages um where um.conversation_id=c.id and um.sender_id<>me and um.created_at>coalesce(mine.last_read_at,'epoch'::timestamptz))
  from public.conversations c
  join public.conversation_members mine on mine.conversation_id=c.id and mine.user_id=me
  join public.conversation_members other on other.conversation_id=c.id and other.user_id<>me
  join public.profiles p on p.id=other.user_id
  left join lateral (select m.body,m.created_at from public.messages m where m.conversation_id=c.id order by m.created_at desc limit 1) last_msg on true
  order by coalesce(last_msg.created_at,c.updated_at) desc;
end
$$;

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
  if not (select public.is_threadly_firebase_jwt()) or me is null then raise exception 'not authenticated'; end if;
  if me = p_other_user_id then raise exception 'cannot message self'; end if;
  if not exists(select 1 from public.profiles where id = p_other_user_id) then raise exception 'profile not found'; end if;
  pair_key := case when me < p_other_user_id then me || ':' || p_other_user_id else p_other_user_id || ':' || me end;
  select c.id into conversation_id from public.conversations c where c.direct_key = pair_key limit 1;
  if conversation_id is null then
    begin
      insert into public.conversations(kind, direct_key) values ('direct', pair_key) returning id into conversation_id;
    exception when unique_violation then
      select c.id into conversation_id from public.conversations c where c.direct_key = pair_key limit 1;
    end;
  end if;
  insert into public.conversation_members(conversation_id,user_id)
  values (conversation_id,me),(conversation_id,p_other_user_id)
  on conflict do nothing;
  return conversation_id;
end
$$;

create or replace function public.record_video_view(p_video_id uuid, p_viewer_id text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actual_viewer text := auth.jwt()->>'sub'; inserted_count int := 0;
begin
  if not (select public.is_threadly_firebase_jwt()) then raise exception 'not authenticated'; end if;
  if not exists(select 1 from public.videos where id=p_video_id) then return; end if;
  if actual_viewer is null or not exists(select 1 from public.profiles where id=actual_viewer) then return; end if;
  insert into public.video_views(video_id,viewer_id) values(p_video_id,actual_viewer)
    on conflict (video_id,viewer_id) where viewer_id is not null do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then update public.videos set views_count=views_count+1 where id=p_video_id; end if;
end
$$;

revoke all on function public.is_conversation_member(uuid) from public;
revoke all on function public.list_conversations(text) from public;
revoke all on function public.start_direct_conversation(text) from public;
revoke all on function public.record_video_view(uuid,text) from public;
grant execute on function public.is_conversation_member(uuid) to anon, authenticated, service_role;
grant execute on function public.list_conversations(text) to anon, authenticated, service_role;
grant execute on function public.start_direct_conversation(text) to anon, authenticated, service_role;
grant execute on function public.record_video_view(uuid,text) to anon, authenticated, service_role;
