# Deploy

## 1. Firebase Auth no plano gratuito

O Threadly usa Firebase Authentication como provedor de identidade e Supabase como banco, Storage e Realtime.

No plano Spark, o Firebase Authentication continua funcionando para Email/Senha e Google. O que não entra no plano gratuito é o deploy das Cloud Functions que seriam usadas apenas para adicionar o custom claim `role: authenticated`.

Por isso o Threadly **não depende de Cloud Functions**.

### Console do Firebase

No projeto `threadly-61b09`:

1. em **Authentication > Sign-in method**, habilite **Email/Password**;
2. habilite **Google**;
3. em **Authentication > Settings > Authorized domains**, confirme `nkellermc.github.io`.

Só isso é necessário no Firebase para a arquitetura gratuita atual.

## 2. Como a autenticação conversa com o Supabase

O cliente Supabase recebe o ID token real do Firebase por `accessToken`.

Firebase não inclui `role: authenticated` por padrão. Portanto, no Data API do Supabase esse JWT entra sob o papel Postgres `anon`. No Threadly isso não equivale a um visitante anônimo: todas as operações sensíveis usam RLS/RPCs que verificam o token Firebase e aceitam somente tokens com:

- `iss = https://securetoken.google.com/threadly-61b09`;
- `aud = threadly-61b09`;
- `sub` presente e correspondente ao UID que está realizando a operação.

Uma chamada que tenha apenas a publishable key do Supabase, sem um JWT Firebase válido do projeto oficial, não satisfaz essas regras.

A migration `006_firebase_jwt_without_custom_role.sql` implementa essa compatibilidade. As migrations posteriores continuam usando `private.threadly_uid()` e ownership por UID nas policies.

> Não aplique um cutover que revogue o papel `anon` enquanto o projeto estiver usando Firebase Spark sem custom claim. Isso impediria os usuários Firebase de acessar Data API, Storage e Realtime.

## 3. Supabase

1. em **Authentication > Third-Party Auth**, conecte o Firebase `threadly-61b09`;
2. mantenha RLS habilitado em todas as tabelas expostas;
3. mantenha os buckets privados e use URLs assinadas quando necessário;
4. aplique as migrations de `supabase/migrations` em ordem numérica;
5. nunca coloque `service_role`, `sb_secret_*` ou credenciais Firebase Admin no frontend.

A publishable key do Supabase é uma chave de cliente. A proteção efetiva dos dados fica em RLS, grants e validação do JWT.

## 4. GitHub Pages

O repositório `NKellerMC/Threadly` só valida o código. A publicação de produção é feita pelo Pages principal em `NKellerMC/NKellerMC.github.io`.

O workflow do site principal baixa `NKellerMC/Threadly@main`, executa `npm run check`, copia `dist/` para `dist/Threadly/` e publica tudo junto.

URL de produção:

```text
https://nkellermc.github.io/Threadly/
```

O `vite.config.ts` já usa a base `/Threadly/`.

## 5. Validação automática

`.github/workflows/check.yml` valida:

- TypeScript;
- testes Vitest;
- build Vite.

Não há etapa de Cloud Functions porque a versão oficial atual não depende delas.

## 6. Teste de fumaça

Após um deploy:

1. criar conta por email;
2. sair/entrar novamente;
3. login Google;
4. editar @ e bio;
5. publicar Thread com carrossel;
6. publicar Clip e verificar miniatura;
7. publicar e excluir Story;
8. curtir, salvar, comentar, responder e excluir conteúdo próprio;
9. seguir outro perfil;
10. abrir DM, criar grupo e enviar mensagem;
11. abrir Histórico, Curtidos, Salvos, Ferramentas e Studio;
12. testar desktop e celular.
