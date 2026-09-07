-- Threadly 3.3 — exclusão da própria conta.
-- As FKs relacionadas ao perfil usam ON DELETE CASCADE onde aplicável.

drop policy if exists "profiles owner delete" on public.profiles;
create policy "profiles owner delete"
on public.profiles
for delete
to anon, authenticated
using (
  (select public.is_threadly_firebase_jwt())
  and (select auth.jwt()->>'sub') = id
);

grant delete on public.profiles to anon, authenticated;
