-- Threadly 3.3 — username uniqueness/availability + least-privilege grants.

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

create or replace function public.username_available(p_username text, p_user_id text default null)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p_username ~ '^[a-z0-9_.]{3,24}$'
    and not exists (
      select 1
      from public.profiles p
      where lower(p.username) = lower(p_username)
        and (p_user_id is null or p.id <> p_user_id)
    );
$$;

revoke all on function public.username_available(text, text) from public;
grant execute on function public.username_available(text, text) to anon, authenticated;

revoke all on table
  public.profiles,
  public.videos,
  public.threads,
  public.video_comments,
  public.thread_replies,
  public.video_likes,
  public.thread_likes,
  public.bookmarks,
  public.thread_bookmarks,
  public.follows,
  public.video_views,
  public.notifications,
  public.reports,
  public.conversations,
  public.conversation_members,
  public.messages
from anon, authenticated;

grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.videos to anon, authenticated;
grant select, insert, update, delete on public.threads to anon, authenticated;
grant select, insert, delete on public.video_comments to anon, authenticated;
grant select, insert, delete on public.thread_replies to anon, authenticated;
grant select, insert, delete on public.video_likes to anon, authenticated;
grant select, insert, delete on public.thread_likes to anon, authenticated;
grant select, insert, delete on public.bookmarks to anon, authenticated;
grant select, insert, delete on public.thread_bookmarks to anon, authenticated;
grant select, insert, delete on public.follows to anon, authenticated;
grant select on public.video_views to anon, authenticated;
grant select, update on public.notifications to anon, authenticated;
grant insert on public.reports to anon, authenticated;
grant select on public.conversations to anon, authenticated;
grant select, update on public.conversation_members to anon, authenticated;
grant select, insert on public.messages to anon, authenticated;

revoke all on table
  public.profiles_public,
  public.videos_public,
  public.threads_public,
  public.video_comments_public,
  public.thread_replies_public,
  public.notifications_public
from anon, authenticated;

grant select on public.profiles_public, public.videos_public, public.threads_public,
  public.video_comments_public, public.thread_replies_public to anon, authenticated;
grant select on public.notifications_public to anon, authenticated;
