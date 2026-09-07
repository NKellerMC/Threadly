insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('videos','videos',true,209715200,array['video/mp4','video/webm','video/quicktime'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('thumbnails','thumbnails',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('images','images',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select to anon,authenticated using (bucket_id in ('videos','thumbnails','images'));
drop policy if exists "media owner insert" on storage.objects;
create policy "media owner insert" on storage.objects for insert to authenticated with check (bucket_id in ('videos','thumbnails','images') and (storage.foldername(name))[1]=(select auth.jwt()->>'sub'));
drop policy if exists "media owner update" on storage.objects;
create policy "media owner update" on storage.objects for update to authenticated using (bucket_id in ('videos','thumbnails','images') and (storage.foldername(name))[1]=(select auth.jwt()->>'sub')) with check (bucket_id in ('videos','thumbnails','images') and (storage.foldername(name))[1]=(select auth.jwt()->>'sub'));
drop policy if exists "media owner delete" on storage.objects;
create policy "media owner delete" on storage.objects for delete to authenticated using (bucket_id in ('videos','thumbnails','images') and (storage.foldername(name))[1]=(select auth.jwt()->>'sub'));

revoke all on function public.on_video_like_change() from public;
revoke all on function public.on_thread_like_change() from public;
revoke all on function public.on_comment_change() from public;
revoke all on function public.on_thread_reply_change() from public;
revoke all on function public.on_follow_insert() from public;
revoke all on function public.touch_conversation() from public;
revoke all on function public.touch_updated_at() from public;
revoke all on function public.is_conversation_member(uuid) from public;
revoke all on function public.record_video_view(uuid,text) from public;
revoke all on function public.start_direct_conversation(text) from public;
revoke all on function public.list_conversations(text) from public;

grant select on public.profiles_public,public.videos_public,public.threads_public,public.video_comments_public,public.thread_replies_public to anon,authenticated;
grant select on public.notifications_public to authenticated;
grant select on public.profiles,public.videos,public.threads,public.video_comments,public.thread_replies,public.follows to anon,authenticated;
grant select,insert,update,delete on public.profiles,public.videos,public.threads,public.video_comments,public.thread_replies,public.video_likes,public.thread_likes,public.bookmarks,public.thread_bookmarks,public.follows,public.video_views,public.notifications,public.reports,public.conversations,public.conversation_members,public.messages to authenticated;
grant usage,select on sequence public.video_views_id_seq to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.record_video_view(uuid,text) to authenticated;
grant execute on function public.start_direct_conversation(text) to authenticated;
grant execute on function public.list_conversations(text) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
