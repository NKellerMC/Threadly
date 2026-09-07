# Threadly

**Threadly** é uma rede social experimental focada em duas formas de publicação: **threads** para texto/conversa e **clips** para vídeo curto. A ideia não é reproduzir o Instagram pixel por pixel; é pegar padrões que funcionam em redes sociais modernas e construir uma identidade própria, com menos ruído e uma base técnica que aguente evolução real.

> Status: versão 3.1 em desenvolvimento ativo. O frontend e o backend Supabase estão conectados. O login Firebase está preparado no código, mas depende da criação/configuração do projeto Firebase.

## O que existe hoje

- Feed **Para você** e **Seguindo**
- Threads com imagem e respostas
- Clips com autoplay, thumbnails e contagem de visualizações
- Curtidas, salvos e histórico
- Perfis, edição de perfil e sistema de seguidores
- Busca, Explorar, Trending e hashtags
- Comentários em clips
- Notificações
- Mensagens diretas em tempo real
- Denúncias
- Studio com métricas
- PWA básica (manifest + service worker)
- Layout responsivo para celular e desktop

## Stack

| Camada | Tecnologia |
| --- | --- |
| UI | React 19 + TSX |
| Linguagem | TypeScript |
| Build | Vite |
| Rotas | React Router |
| Login | Firebase Authentication |
| Banco | Supabase Postgres |
| Vídeos/imagens | Supabase Storage |
| Realtime | Supabase Realtime |
| Segurança | PostgreSQL RLS |
| Testes | Vitest |
| Deploy | GitHub Pages + GitHub Actions |

## Arquitetura

O Threadly separa autenticação e dados deliberadamente:

1. **Firebase Auth** autentica o usuário.
2. O Firebase emite o ID token.
3. O cliente Supabase recebe esse token por `accessToken`.
4. O Supabase valida o Firebase como Third-Party Auth e aplica RLS no Postgres, Storage e Realtime.
5. Vídeos, thumbnails e imagens ficam no Supabase Storage; metadados e relações sociais ficam no Postgres.

A antiga chave Supabase que existia no projeto original não é utilizada. Este repositório usa uma **publishable key**, que é própria para aplicações públicas no navegador. Chaves `service_role`/secretas nunca devem entrar no frontend.

## Estrutura

```text
src/
  api/          acesso ao Supabase
  components/   componentes reutilizáveis
  context/      estado de autenticação
  lib/          configuração, tipos e utilitários
  pages/        telas/rotas
  styles/       CSS global e componentes
supabase/
  migrations/   schema, RLS, Storage, funções, triggers e grants
firebase/
  functions/    função para custom claim role=authenticated
docs/           arquitetura, segurança e implantação
```

## Rodando localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Validação completa:

```bash
npm run check
```

## Configuração do Firebase

O código já espera as variáveis abaixo:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Depois de criar o projeto Firebase, ele precisa ser registrado em **Supabase → Authentication → Third-Party Auth → Firebase**, e os usuários Firebase precisam receber o custom claim:

```json
{ "role": "authenticated" }
```

A Cloud Function necessária está em `firebase/functions/src/index.ts`.

## Supabase

O backend oficial deste repositório está ligado ao projeto Supabase **Threadly**. O backend está versionado em `supabase/migrations/` (001 → 004); `supabase/schema.sql` funciona como índice das migrações e inclui:

- tabelas de perfis, threads, clips e interações;
- RLS em todas as tabelas públicas;
- buckets `videos`, `thumbnails` e `images`;
- funções para histórico/mensagens;
- triggers de contadores e notificações;
- publicação Realtime para mensagens.

Documentação técnica adicional:

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/database.md`](docs/database.md)
- [`docs/security.md`](docs/security.md)
- [`docs/deployment.md`](docs/deployment.md)
- [`docs/migration-from-legacy.md`](docs/migration-from-legacy.md)

## GitHub Pages

O Vite está configurado com `base: '/Threadly/'`. O endereço esperado é:

**https://nkellermc.github.io/Threadly/**

Todo push em `main` dispara `.github/workflows/deploy.yml`, que valida TypeScript/testes, gera `dist/` e publica o artefato no GitHub Pages.

## Projeto antigo

O Threadly 3.x não é apenas uma camada nova sobre os HTMLs antigos. A base foi reestruturada. Arquivos que antes estavam vazios ou funcionavam como placeholders foram substituídos por módulos reais quando tinham uma responsabilidade útil; duplicações e fósseis arquiteturais foram removidos.

## Licença

**All Rights Reserved (ARR).** Este projeto não é open source. O código-fonte está visível por conveniência de desenvolvimento/publicação, mas isso não concede permissão para copiar, redistribuir, vender, relicenciar ou criar derivados. Consulte [`LICENSE.md`](LICENSE.md).

Copyright © 2026 Noah Keller. All rights reserved.
