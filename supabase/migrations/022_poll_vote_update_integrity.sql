drop policy if exists "poll votes own update" on public.poll_votes;
create policy "poll votes own update"
on public.poll_votes
for update
to anon, authenticated
using (user_id = private.threadly_uid())
with check (
  user_id = private.threadly_uid()
  and exists (
    select 1 from public.poll_options o
    where o.id = poll_votes.option_id
      and o.poll_id = poll_votes.poll_id
  )
);
