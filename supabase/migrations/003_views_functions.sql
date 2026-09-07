create or replace view public.profiles_public with (security_invoker=true) as
select p.id,p.username,p.display_name,p.bio,p.website,p.avatar_url,p.created_at,
  (select count(*)::int from public.follows f where f.following_id=p.id) followers_count,
  (select count(*)::int from public.follows f where f.follower_id=p.id) following_count
from public.profiles p;

create or replace view public.videos_public with (security_invoker=true) as
select v.id,v.user_id,coalesce(p.username,'threader') username,coalesce(p.display_name,'Threader') display_name,p.avatar_url,
  v.title,v.description,v.video_url,v.thumbnail_url,v.likes_count,v.comments_count,v.views_count,v.created_at
from public.videos v left join public.profiles p on p.id=v.user_id;

create or replace view public.threads_public with (security_invoker=true) as
select t.id,t.user_id,coalesce(p.username,'threader') username,coalesce(p.display_name,'Threader') display_name,p.avatar_url,
  t.body,t.image_url,t.likes_count,t.replies_count,t.created_at
from public.threads t left join public.profiles p on p.id=t.user_id;

create or replace view public.video_comments_public with (security_invoker=true) as
select c.id,c.video_id,c.user_id,coalesce(p.username,'threader') username,coalesce(p.display_name,'Threader') display_name,p.avatar_url,c.body,c.created_at
from public.video_comments c left join public.profiles p on p.id=c.user_id;

create or replace view public.thread_replies_public with (security_invoker=true) as
select r.id,r.thread_id,r.user_id,coalesce(p.username,'threader') username,coalesce(p.display_name,'Threader') display_name,p.avatar_url,r.body,r.created_at
from public.thread_replies r left join public.profiles p on p.id=r.user_id;

create or replace view public.notifications_public with (security_invoker=true) as
select n.id,n.user_id,n.actor_id,n.type,n.text,n.target_url,n.read_at,n.created_at,
  p.username actor_username,p.display_name actor_display_name,p.avatar_url actor_avatar_url
from public.notifications n left join public.profiles p on p.id=n.actor_id;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists videos_touch_updated_at on public.videos;
create trigger videos_touch_updated_at before update on public.videos for each row execute function public.touch_updated_at();
drop trigger if exists threads_touch_updated_at on public.threads;
create trigger threads_touch_updated_at before update on public.threads for each row execute function public.touch_updated_at();

create or replace function public.on_video_like_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  update public.videos set likes_count=likes_count+1 where id=new.video_id;
  insert into public.notifications(user_id,actor_id,type,text,target_url)
    select v.user_id,new.user_id,'like','curtiu seu clip.','#/watch/'||v.id from public.videos v where v.id=new.video_id and v.user_id<>new.user_id;
  return new;
 else update public.videos set likes_count=greatest(0,likes_count-1) where id=old.video_id; return old; end if;
end $$;
drop trigger if exists video_like_counter on public.video_likes;
create trigger video_like_counter after insert or delete on public.video_likes for each row execute function public.on_video_like_change();

create or replace function public.on_thread_like_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  update public.threads set likes_count=likes_count+1 where id=new.thread_id;
  insert into public.notifications(user_id,actor_id,type,text,target_url)
    select t.user_id,new.user_id,'like','curtiu sua thread.','#/post/'||t.id from public.threads t where t.id=new.thread_id and t.user_id<>new.user_id;
  return new;
 else update public.threads set likes_count=greatest(0,likes_count-1) where id=old.thread_id; return old; end if;
end $$;
drop trigger if exists thread_like_counter on public.thread_likes;
create trigger thread_like_counter after insert or delete on public.thread_likes for each row execute function public.on_thread_like_change();

create or replace function public.on_comment_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  update public.videos set comments_count=comments_count+1 where id=new.video_id;
  insert into public.notifications(user_id,actor_id,type,text,target_url)
    select v.user_id,new.user_id,'comment','comentou no seu clip.','#/watch/'||v.id from public.videos v where v.id=new.video_id and v.user_id<>new.user_id;
  return new;
 else update public.videos set comments_count=greatest(0,comments_count-1) where id=old.video_id; return old; end if;
end $$;
drop trigger if exists comment_counter on public.video_comments;
create trigger comment_counter after insert or delete on public.video_comments for each row execute function public.on_comment_change();

create or replace function public.on_thread_reply_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  update public.threads set replies_count=replies_count+1 where id=new.thread_id;
  insert into public.notifications(user_id,actor_id,type,text,target_url)
    select t.user_id,new.user_id,'comment','respondeu sua thread.','#/post/'||t.id from public.threads t where t.id=new.thread_id and t.user_id<>new.user_id;
  return new;
 else update public.threads set replies_count=greatest(0,replies_count-1) where id=old.thread_id; return old; end if;
end $$;
drop trigger if exists thread_reply_counter on public.thread_replies;
create trigger thread_reply_counter after insert or delete on public.thread_replies for each row execute function public.on_thread_reply_change();

create or replace function public.on_follow_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.notifications(user_id,actor_id,type,text,target_url) values(new.following_id,new.follower_id,'follow','começou a seguir você.','#/profile'); return new; end $$;
drop trigger if exists follow_notification on public.follows;
create trigger follow_notification after insert on public.follows for each row execute function public.on_follow_insert();

create or replace function public.touch_conversation() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.conversations set updated_at=now() where id=new.conversation_id; return new; end $$;
drop trigger if exists message_touch_conversation on public.messages;
create trigger message_touch_conversation after insert on public.messages for each row execute function public.touch_conversation();

create or replace function public.record_video_view(p_video_id uuid,p_viewer_id text default null)
returns void language plpgsql security definer set search_path=public as $$
declare actual_viewer text:=auth.jwt()->>'sub'; inserted_count int:=0;
begin
 if not exists(select 1 from public.videos where id=p_video_id) then return; end if;
 if actual_viewer is null or not exists(select 1 from public.profiles where id=actual_viewer) then return; end if;
 insert into public.video_views(video_id,viewer_id) values(p_video_id,actual_viewer)
   on conflict (video_id,viewer_id) where viewer_id is not null do nothing;
 get diagnostics inserted_count=row_count;
 if inserted_count>0 then update public.videos set views_count=views_count+1 where id=p_video_id; end if;
end $$;

create or replace function public.start_direct_conversation(p_other_user_id text)
returns uuid language plpgsql security definer set search_path=public as $$
declare me text:=auth.jwt()->>'sub'; existing_id uuid; new_id uuid;
begin
 if me is null then raise exception 'not authenticated'; end if;
 if me=p_other_user_id then raise exception 'cannot message self'; end if;
 if not exists(select 1 from public.profiles where id=p_other_user_id) then raise exception 'profile not found'; end if;
 select c.id into existing_id from public.conversations c
 join public.conversation_members a on a.conversation_id=c.id and a.user_id=me
 join public.conversation_members b on b.conversation_id=c.id and b.user_id=p_other_user_id
 where c.kind='direct' and (select count(*) from public.conversation_members x where x.conversation_id=c.id)=2 limit 1;
 if existing_id is not null then return existing_id; end if;
 insert into public.conversations default values returning id into new_id;
 insert into public.conversation_members(conversation_id,user_id) values(new_id,me),(new_id,p_other_user_id);
 return new_id;
end $$;

create or replace function public.list_conversations(p_user_id text)
returns table(id uuid,participant_id text,participant_username text,participant_name text,participant_avatar_url text,last_message text,last_message_at timestamptz,unread bigint)
language plpgsql security definer set search_path=public as $$
declare me text:=auth.jwt()->>'sub';
begin
 if me is null or me<>p_user_id then raise exception 'forbidden'; end if;
 return query select c.id,other.user_id,p.username,p.display_name,p.avatar_url,coalesce(last_msg.body,''),coalesce(last_msg.created_at,c.updated_at),
 (select count(*) from public.messages um where um.conversation_id=c.id and um.sender_id<>me and um.created_at>coalesce(mine.last_read_at,'epoch'::timestamptz))
 from public.conversations c
 join public.conversation_members mine on mine.conversation_id=c.id and mine.user_id=me
 join public.conversation_members other on other.conversation_id=c.id and other.user_id<>me
 join public.profiles p on p.id=other.user_id
 left join lateral(select m.body,m.created_at from public.messages m where m.conversation_id=c.id order by m.created_at desc limit 1) last_msg on true
 order by coalesce(last_msg.created_at,c.updated_at) desc;
end $$;
