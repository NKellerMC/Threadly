-- Threadly 4.0 — corte final do fallback Firebase -> anon.
--
-- PRÉ-REQUISITO OBRIGATÓRIO:
-- 1) deploy de firebase/functions:ensureAuthenticatedRole;
-- 2) confirmar que um login novo/renovado recebe JWT com role='authenticated'.
--
-- NÃO aplique esta migration antes disso, ou os usuários que ainda estiverem sem
-- o custom claim perderão acesso ao Data API/Storage até renovarem a sessão.

-- O Threadly é uma aplicação autenticada: o publishable key sozinho não deve ter
-- acesso direto às tabelas/views da aplicação.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke select, insert, update, delete on storage.objects from anon;

-- SECURITY DEFINER RPCs devem ser inacessíveis pelo papel anon. A maioria abaixo
-- é chamada intencionalmente pelo cliente autenticado e valida o UID internamente.
revoke execute on function public.accept_message_request(uuid, boolean) from public, anon;
revoke execute on function public.block_user(text) from public, anon;
revoke execute on function public.create_group_conversation(text, text[]) from public, anon;
revoke execute on function public.edit_message(uuid, text) from public, anon;
revoke execute on function public.is_conversation_member(uuid) from public, anon;
revoke execute on function public.list_conversations(text) from public, anon;
revoke execute on function public.pin_thread_reply(uuid, boolean) from public, anon;
revoke execute on function public.pin_video_comment(uuid, boolean) from public, anon;
revoke execute on function public.record_video_view(uuid, text) from public, anon;
revoke execute on function public.request_or_follow(text) from public, anon;
revoke execute on function public.respond_collaboration(uuid, boolean) from public, anon;
revoke execute on function public.respond_follow_request(text, boolean) from public, anon;
revoke execute on function public.start_direct_conversation(text) from public, anon;
revoke execute on function public.unsend_message(uuid) from public, anon;

-- O papel authenticated continua autorizado apenas nas RPCs que o app usa.
grant execute on function public.accept_message_request(uuid, boolean) to authenticated, service_role;
grant execute on function public.block_user(text) to authenticated, service_role;
grant execute on function public.create_group_conversation(text, text[]) to authenticated, service_role;
grant execute on function public.edit_message(uuid, text) to authenticated, service_role;
grant execute on function public.is_conversation_member(uuid) to authenticated, service_role;
grant execute on function public.list_conversations(text) to authenticated, service_role;
grant execute on function public.pin_thread_reply(uuid, boolean) to authenticated, service_role;
grant execute on function public.pin_video_comment(uuid, boolean) to authenticated, service_role;
grant execute on function public.record_video_view(uuid, text) to authenticated, service_role;
grant execute on function public.request_or_follow(text) to authenticated, service_role;
grant execute on function public.respond_collaboration(uuid, boolean) to authenticated, service_role;
grant execute on function public.respond_follow_request(text, boolean) to authenticated, service_role;
grant execute on function public.start_direct_conversation(text) to authenticated, service_role;
grant execute on function public.unsend_message(uuid) to authenticated, service_role;

-- A função de trigger não é uma RPC de aplicação.
revoke all on function public.notify_mentions() from public, anon, authenticated;
