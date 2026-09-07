# Segurança

## O que pode ficar no navegador

As configurações do Web App do Firebase e a publishable/anon key do Supabase são credenciais de cliente. Elas não substituem autorização. A segurança real está em Firebase Auth + validação JWT + RLS.

Nunca coloque em `VITE_*`:

- Supabase `service_role`;
- Firebase Admin private key;
- service-account JSON;
- qualquer segredo com poder administrativo.

## RLS

Todas as tabelas sensíveis têm Row Level Security. Escritas conferem o `sub` do JWT Firebase. Likes, salvos, histórico, notificações e mensagens não são expostos entre usuários.

## Upload

Storage valida bucket e primeiro segmento do caminho contra o `sub`. O cliente valida MIME/tamanho antes do upload, mas a policy e os limites do bucket são a barreira de servidor.

## Firebase custom claim

A função `ensureAuthenticatedRole` só altera os claims do próprio usuário autenticado que chamou a função. O cliente não pode escolher arbitrary claims.

## Denúncias

O cliente pode inserir denúncias próprias, mas não possui policy de leitura/alteração. Moderação deve ocorrer em backend/admin separado.
