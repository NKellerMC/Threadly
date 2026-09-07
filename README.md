# Threadly

**Threadly** é uma rede social focada em duas formas de publicação: **threads** para texto e conversa e **clips** para vídeo curto. A proposta é combinar padrões úteis de redes sociais modernas com uma identidade própria, uma interface menos ruidosa e uma base técnica que possa crescer sem virar um emaranhado de remendos.

> Status: **Threadly 3.3**. Firebase Authentication, Supabase Postgres/Storage e a integração Firebase → Supabase por Third-Party Auth fazem parte do fluxo oficial de produção.

## O que existe hoje

- Login obrigatório antes de acessar a aplicação
- Cadastro por email/senha com escolha de **@usuário único**
- Login com Google via Firebase Authentication
- Recuperação e alteração de senha
- Alteração e verificação de email
- Configurações privadas da conta separadas do perfil público
- Alteração de nome, @usuário, bio e site
- Exclusão da própria conta com reautenticação e confirmação explícita
- Verificação de disponibilidade de username em tempo real
- Feed **Para você** e **Seguindo**
- Threads com imagem e respostas
- Clips com autoplay, thumbnails e contagem real de visualizações
- Curtidas, salvos e histórico persistentes
- Perfis e sistema de seguidores
- Busca, Explorar, Trending e hashtags
- Comentários em clips
- Notificações
- Mensagens diretas persistentes em tempo real
- Contagem de não lidas e marcação de conversa como lida
- Denúncias
- Studio com métricas reais
- PWA básica (manifest + service worker)
- Layout responsivo para celular e desktop

O produto não possui modo demonstração nem fallback para usuários, posts, métricas ou conversas fictícias. Um banco novo começa vazio e passa a mostrar somente atividade criada por usuários reais.

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
| Segurança | PostgreSQL RLS + grants mínimos |
| Testes | Vitest |
| Deploy | GitHub Pages + GitHub Actions |

## Arquitetura

O Threadly separa autenticação e dados deliberadamente:

1. **Firebase Auth** autentica o usuário.
2. O Firebase emite o ID token.
3. O cliente Supabase recebe esse token por `accessToken`.
4. O Supabase valida o Firebase como Third-Party Auth.
5. As políticas RLS validam explicitamente `iss`, `aud` e `sub` do projeto Firebase oficial antes de permitir operações privadas.
6. O perfil da conta é criado no Postgres na primeira sessão e deixa de ser sobrescrito em logins posteriores.
7. Vídeos, thumbnails e imagens ficam no Supabase Storage; metadados, relações sociais e mensagens ficam no Postgres.

O frontend usa somente configurações públicas do Firebase e a **publishable key** do Supabase. Chaves `service_role`, `sb_secret_*`, Firebase Admin ou credenciais administrativas nunca devem entrar no navegador.

## Autenticação

As rotas do produto ficam atrás de uma barreira de autenticação. Um visitante sem sessão é levado para `/login` antes de ver feed, mensagens, perfil ou qualquer outra área interna.

A tela oficial de entrada possui:

- email e senha;
- cadastro com nome, @usuário, email, senha e confirmação;
- checagem de disponibilidade do @ antes da criação;
- login com Google;
- recuperação de senha;
- retorno automático à rota originalmente solicitada após login.

O Firebase oficial do Threadly usa o projeto `threadly-61b09`. No Supabase, ele deve permanecer registrado em **Authentication → Third-Party Auth → Firebase**.

O cliente Supabase recebe o JWT atual do Firebase desta forma:

```ts
createClient(url, publishableKey, {
  accessToken: async () => firebaseUser?.getIdToken(false) ?? null,
})
```

Firebase não adiciona `role: authenticated` aos ID tokens por padrão. O Threadly não depende de uma Cloud Function para conseguir abrir a sessão: enquanto o token Firebase é validado pelo Third-Party Auth, as operações privadas aceitam o papel Postgres `anon` somente quando o JWT possui o issuer e audience corretos do projeto `threadly-61b09` e um `sub` válido. Essa regra está versionada em `006_firebase_jwt_without_custom_role.sql`.

### Login com Google no GitHub Pages

O Threadly usa `signInWithPopup()` em vez de `signInWithRedirect()`. Em hospedagens externas ao Firebase, o fluxo por redirect depende de armazenamento cross-origin do helper de autenticação e pode falhar em navegadores modernos que bloqueiam esse acesso. O popup elimina essa dependência para o deploy atual no GitHub Pages.

## Usernames

O @usuário é tratado como identidade única do perfil.

- formato: 3–24 caracteres;
- permitido: `a-z`, `0-9`, ponto e `_`;
- normalizado para minúsculas;
- verificação de disponibilidade no cadastro e na edição;
- índice único normal e índice único em `lower(username)` no Postgres;
- a restrição do banco é a autoridade final, então duas pessoas não conseguem reservar o mesmo @ mesmo que tentem ao mesmo tempo.

O nome de exibição pode se repetir. O **@usuário não**.

## Configurações da conta

`/settings` separa dados públicos e privados.

### Perfil público

- nome de exibição;
- @usuário;
- bio;
- site.

### Conta privada

- email atual;
- status de verificação do email;
- métodos de login conectados;
- alteração de email com nova confirmação;
- alteração de senha para contas que usam email/senha;
- redefinição de senha;
- nova verificação de email;
- encerramento da sessão;
- exclusão da própria conta e dos dados ligados ao perfil.

Alterações sensíveis usam reautenticação do Firebase. Contas por senha confirmam a senha atual; contas Google confirmam identidade pelo Google. A exclusão exige também a confirmação textual `EXCLUIR`.

## Chat

O Direct do Threadly usa somente dados persistidos no Supabase:

- `conversations` identifica a conversa;
- `conversation_members` guarda participantes e `last_read_at`;
- `messages` guarda cada mensagem;
- `start_direct_conversation` cria ou reutiliza uma única conversa por par de usuários;
- `list_conversations` devolve participante, última mensagem e quantidade não lida;
- Supabase Realtime entrega novas mensagens sem recarregar a página.

A migração `005_real_chat_remove_demo_seed.sql` remove o seed antigo de demonstração e adiciona uma chave determinística para impedir conversas diretas duplicadas do mesmo par de usuários. A migração `006_firebase_jwt_without_custom_role.sql` permite que esse fluxo funcione com o ID token Firebase padrão.

## Sobre `.env` e chaves públicas

Arquivos `.env`, `.env.local`, `.env.production` e `.env.*.local` estão ignorados pelo Git.

Ainda assim, há uma distinção importante: **variável de ambiente de frontend não é segredo**. Todo valor `VITE_*` usado no navegador é incorporado ao bundle e pode ser inspecionado por quem recebe o site. Portanto:

- usar `.env` melhora organização e evita commits acidentais;
- isso não esconde a Firebase Web API key nem a Supabase publishable key do usuário final;
- a proteção real do Supabase vem de RLS, validação do JWT e privilégios SQL mínimos;
- `service_role`, `sb_secret_*`, service accounts e private keys jamais podem ir para `VITE_*`.

Consulte [`docs/security.md`](docs/security.md) para a política detalhada.

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
  functions/    utilitários opcionais para Firebase
docs/           arquitetura, segurança e implantação
```

## Rodando localmente

```bash
npm install
npm run dev
```

Para substituir a configuração pública em desenvolvimento, use `.env.local` com as variáveis documentadas em `.env.example`.

Validação completa:

```bash
npm run check
```

## Supabase

O backend oficial está ligado ao projeto Supabase **Threadly** e inclui:

- tabelas de perfis, threads, clips e interações;
- RLS nas tabelas públicas;
- grants reduzidas aos verbos realmente usados;
- buckets `videos`, `thumbnails` e `images`;
- funções para histórico e mensagens;
- triggers de contadores e notificações;
- Realtime para mensagens;
- unicidade case-insensitive de usernames;
- policy de exclusão limitada ao próprio perfil.

As migrações ficam em `supabase/migrations/001...008` e o índice está em `supabase/schema.sql`.

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

A publicação não depende de um GitHub Pages separado no repositório `Threadly`. O workflow do repositório `NKellerMC/NKellerMC.github.io` baixa a versão mais recente do Threadly, executa a validação, compila o projeto e copia o resultado para `dist/Threadly/` antes de publicar o site principal.

Neste repositório, `.github/workflows/check.yml` valida pushes e pull requests sem tentar criar um segundo Pages.

## Projeto antigo

O Threadly 3.x não é apenas uma camada nova sobre os HTMLs antigos. A base foi reestruturada. Arquivos que antes estavam vazios ou funcionavam como placeholders foram substituídos por módulos reais quando tinham uma responsabilidade útil; duplicações e fósseis arquiteturais foram removidos.

## Licença

**All Rights Reserved (ARR).** Este projeto não é open source. O código-fonte está visível por conveniência de desenvolvimento/publicação, mas isso não concede permissão para copiar, redistribuir, vender, relicenciar ou criar derivados. Consulte [`LICENSE.md`](LICENSE.md).

Copyright © 2026 Noah Keller. All rights reserved.
