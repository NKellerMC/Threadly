# Segurança

## Chaves públicas não são segredos

As configurações do Firebase Web App e a `publishable key` do Supabase são credenciais de cliente. Em uma SPA elas terminam no JavaScript entregue ao navegador e podem ser lidas pelo usuário, mesmo quando entram no build por `.env` ou GitHub Actions.

Por isso, `.env` é útil para organização e para impedir commits acidentais, mas **não transforma uma chave de frontend em segredo**.

Nunca coloque no frontend, em `VITE_*`, no repositório ou no bundle:

- Supabase `service_role` / `sb_secret_*`;
- Firebase Admin private key;
- service-account JSON;
- tokens administrativos ou segredos de backend.

O Threadly usa somente a publishable key no cliente. `.gitignore` bloqueia `.env`, `.env.local`, `.env.production` e `.env.*.local`.

## Firebase → Supabase

O Firebase Authentication emite o ID token do usuário. O cliente Supabase envia esse token por `accessToken`.

Como o Firebase Third-Party Auth pode chegar ao Postgres com o papel SQL `anon` quando não há custom claim `role`, o Threadly não confia no nome do papel sozinho. As policies privadas exigem simultaneamente:

- `sub` presente;
- `iss = https://securetoken.google.com/threadly-61b09`;
- `aud = threadly-61b09`;
- o `sub` correspondente ao dono da linha.

## RLS e privilégios mínimos

Todas as tabelas sensíveis usam Row Level Security. Além do RLS, as grants amplas padrão foram reduzidas: cada tabela concede apenas os verbos SQL necessários ao produto. Por exemplo, denúncias só permitem `INSERT`; mensagens permitem `SELECT`/`INSERT`; perfis permitem `SELECT`/`INSERT`/`UPDATE`.

Usernames têm restrição de formato e índices únicos no valor original e em `lower(username)`, impedindo duplicatas inclusive por diferença de maiúsculas/minúsculas.

## Dados privados

Likes privados, salvos, histórico, notificações, conversas e mensagens só são liberados quando o JWT pertence ao projeto Firebase oficial e ao usuário correto. Perfis/posts públicos continuam legíveis porque são conteúdo social público por desenho.

## Upload

Storage valida bucket e o primeiro segmento do caminho contra o `sub` do JWT. O cliente valida MIME/tamanho antes do upload, e os buckets também têm limites de tamanho e tipos aceitos.

## Denúncias

O cliente pode inserir denúncias próprias, mas não recebe leitura ou alteração delas. Moderação deve ocorrer em backend/admin separado.
