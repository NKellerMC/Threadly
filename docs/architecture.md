# Arquitetura

O Threadly 3.1 é uma SPA em React + TypeScript construída pelo Vite.

## Camadas

- `src/pages`: telas e composição de fluxos.
- `src/components`: peças reutilizáveis de UI.
- `src/api`: acesso aos domínios do backend; nenhuma página monta queries Supabase diretamente.
- `src/context/AuthContext.tsx`: estado de sessão Firebase e sincronização de perfil/claim.
- `src/lib/firebase.ts`: Firebase Web SDK.
- `src/lib/supabase.ts`: cliente Supabase que injeta o ID token atual do Firebase em `accessToken`.
- `supabase/schema.sql`: banco, RLS, Storage, triggers, RPCs e Realtime.
- `firebase/functions`: função Admin que garante o custom claim `role=authenticated`.

## Fluxo de identidade

1. O usuário entra pelo Firebase Authentication.
2. `AuthContext` chama `ensureAuthenticatedRole` quando necessário.
3. A Cloud Function grava o custom claim `role=authenticated` usando Firebase Admin.
4. O frontend força refresh do ID token.
5. O cliente Supabase lê esse token no callback `accessToken`.
6. O Supabase valida o JWT pela integração Third-Party Auth e executa RLS usando `auth.jwt()->>'sub'`.

Não existe Supabase Auth paralelo. Duas sessões para a mesma pessoa seriam complexidade inútil.

## Roteamento

`HashRouter` foi escolhido porque o GitHub Pages não oferece rewrites de SPA. A raiz de assets é `/Threadly/`, definida em `vite.config.ts`.

## Modo demonstração

Sem variáveis de backend, o app usa dados de demonstração para navegação visual. Ações que exigem persistência são bloqueadas ou retornam explicitamente ao modo demo; credenciais inválidas não são mascaradas como sucesso real.
