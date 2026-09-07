-- notify_mentions() existe apenas como função de trigger; não é uma RPC pública.
revoke all on function public.notify_mentions() from public, anon, authenticated;
