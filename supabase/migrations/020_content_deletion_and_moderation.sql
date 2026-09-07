-- Exclusão e moderação de comentários/respostas.
-- O Threadly atualmente recebe o JWT do Firebase via Third-Party Auth; por isso
-- as policies verificam explicitamente issuer/audience/sub com is_threadly_firebase_jwt().

drop policy if exists "comments owner delete" on public.video_comments;
drop policy if exists "comments author or video owner delete" on public.video_comments;
create policy "comments author or video owner delete"
on public.video_comments
for delete
to anon, authenticated
using (
  public.is_threadly_firebase_jwt()
  and (
    (select auth.jwt()->>'sub') = user_id
    or exists (
      select 1 from public.videos v
      where v.id = video_id
        and v.user_id = (select auth.jwt()->>'sub')
    )
  )
);

drop policy if exists "thread replies owner delete" on public.thread_replies;
drop policy if exists "thread replies author or thread owner delete" on public.thread_replies;
create policy "thread replies author or thread owner delete"
on public.thread_replies
for delete
to anon, authenticated
using (
  public.is_threadly_firebase_jwt()
  and (
    (select auth.jwt()->>'sub') = user_id
    or exists (
      select 1 from public.threads t
      where t.id = thread_id
        and t.user_id = (select auth.jwt()->>'sub')
    )
  )
);

create index if not exists video_comments_user_id_idx on public.video_comments(user_id);
create index if not exists thread_replies_user_id_idx on public.thread_replies(user_id);
create index if not exists video_comments_reply_to_id_idx on public.video_comments(reply_to_id) where reply_to_id is not null;
create index if not exists thread_replies_reply_to_id_idx on public.thread_replies(reply_to_id) where reply_to_id is not null;
