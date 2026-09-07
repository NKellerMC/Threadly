# Threadly

**Threadly** é uma rede social experimental focada em duas formas de publicação: **threads** para texto/conversa e **clips** para vídeo curto. A proposta é combinar padrões úteis de redes sociais modernas com uma identidade própria, uma interface menos ruidosa e uma base técnica que possa crescer sem virar um emaranhado de remendos.

> Status: versão 3.1 em desenvolvimento ativo. Frontend, Firebase Authentication e backend Supabase estão configurados. A integração Firebase → Supabase usa Third-Party Auth.

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

O frontend usa somente configurações públicas do Firebase e a **publishable key** do Supabase. Chaves `service_role`, secret keys ou credenciais administrativas nunca devem entrar no navegador.

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
npm run dev
```

A configuração oficial de Firebase e Supabase já possui defaults públicos no frontend. Para substituir valores em desenvolvimento, use `.env.local` com as variáveis documentadas em `.env.example`.

Validação completa:

```bash
npm run check
```

## Firebase + Supabase

O Firebase oficial do Threadly usa o projeto `threadly-61b09`. No Supabase, ele deve permanecer registrado em **Authentication → Third-Party Auth → Firebase**.

O cliente Supabase recebe o JWT atual do Firebase desta forma:

```ts
createClient(url, publishableKey, {
  accessToken: async () => firebaseUser?.getIdToken(false) ?? null,
})
```

Para que o token seja tratado como `authenticated` pelo Postgres, os usuários Firebase precisam possuir o custom claim:

```json
{ "role": "authenticated" }
```

A Cloud Function de suporte está em `firebase/functions/src/index.ts`.

## Supabase

O backend oficial está ligado ao projeto Supabase **Threadly** e inclui:

- tabelas de perfis, threads, clips e interações;
- RLS nas tabelas públicas;
- buckets `videos`, `thumbnails` e `images`;
- funções para histórico e mensagens;
- triggers de contadores e notificações;
- Realtime para mensagens.

Documentação técnica adicional:

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/database.md`](docs/database.md)
- [`docs/security.md`](docs/security.md)
- [`docs/deployment.md`](docs/deployment.md)
- [`docs/migration-from-legacy.md`](docs/migration-from-legacy.md)

## Produção e GitHub Pages

O Vite usa:

```ts
base: '/Threadly/'
```

O endereço público é:

**https://nkellermc.github.io/Threadly/**

A publicação não depende de um GitHub Pages separado no repositório `Threadly`. O workflow do repositório `NKellerMC/NKellerMC.github.io` baixa a versão mais recente do Threadly, executa `npm run check`, compila o projeto e copia o resultado para `dist/Threadly/` antes de publicar o site principal. Isso evita conflito com o Pages já existente do site de THERAN.

O workflow também roda periodicamente para puxar mudanças recentes do `main` do Threadly. Neste repositório, `.github/workflows/check.yml` valida pushes e pull requests sem tentar criar um segundo Pages.

## Projeto antigo

O Threadly 3.x não é apenas uma camada nova sobre os HTMLs antigos. A base foi reestruturada. Arquivos que antes estavam vazios ou funcionavam como placeholders foram substituídos por módulos reais quando tinham uma responsabilidade útil; duplicações e fósseis arquiteturais foram removidos.

## Licença

**All Rights Reserved (ARR).** Este projeto não é open source. O código-fonte está visível por conveniência de desenvolvimento/publicação, mas isso não concede permissão para copiar, redistribuir, vender, relicenciar ou criar derivados. Consulte [`LICENSE.md`](LICENSE.md).

Copyright © 2026 Noah Keller. All rights reserved.
