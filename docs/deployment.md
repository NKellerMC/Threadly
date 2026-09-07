# Deploy

## 1. Firebase Auth + claim `authenticated`

O Threadly usa Firebase Authentication como provedor de identidade e Supabase como banco, Storage e Realtime. Para o Supabase executar as consultas com o papel Postgres correto, o ID token do Firebase precisa conter:

```json
{
  "role": "authenticated"
}
```

O código da função já está em `firebase/functions/src/index.ts` e o projeto Firebase oficial já está configurado em `firebase/.firebaserc` como `threadly-61b09`.

### Console do Firebase

1. Abra o projeto `threadly-61b09` no Firebase Console.
2. Em **Authentication > Sign-in method**, habilite **Email/Password**.
3. No mesmo local, habilite **Google**.
4. Em **Authentication > Settings > Authorized domains**, confirme `nkellermc.github.io`.
5. Para implantar Cloud Functions, o projeto precisa estar no plano **Blaze**. Configure também alertas/limites de orçamento se for habilitar faturamento.

### Implantar a callable que adiciona o claim

Instale o Node.js 24 e a Firebase CLI. Depois, a partir de um clone deste repositório:

```bash
npm install -g firebase-tools
firebase login
cd firebase
firebase use threadly-61b09
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions:ensureAuthenticatedRole
```

A função é uma HTTPS Callable em `us-central1`. Ela só aceita uma conta já autenticada e só adiciona `role: authenticated` aos custom claims da própria conta que fez a chamada.

O frontend chama essa função automaticamente quando um usuário entra e ainda não possui o claim. Em seguida força a renovação do ID token, então usuários existentes são migrados no próximo login sem precisar editar cada conta manualmente.

### Como conferir o claim

Depois do deploy da função:

1. abra o Threadly;
2. saia e entre novamente;
3. no DevTools do navegador, execute temporariamente uma inspeção do ID token via Firebase ou confira o usuário no backend;
4. o token renovado deve conter `role: "authenticated"`.

Enquanto a função ainda não estiver implantada, o frontend mantém a compatibilidade temporária com a migration legada que aceita JWT Firebase válido como `anon`, evitando derrubar o site durante a transição.

## 2. Supabase

1. Em **Authentication > Third-Party Auth**, conecte o projeto Firebase `threadly-61b09`.
2. Confirme que Project URL e publishable key são os usados pelo frontend.
3. Para uma instalação nova, aplique as migrations de `supabase/migrations` em ordem numérica.
4. Só aplique a migration de hardening que remove o fallback `anon` depois de confirmar que a callable do Firebase está implantada e que os tokens já recebem `role: authenticated`.

O cliente Supabase usa o ID token do Firebase via `accessToken`, em vez de criar uma segunda sessão de autenticação.

## 3. GitHub Pages

O workflow `.github/workflows/deploy.yml` executa os testes/build e publica `dist/` no GitHub Pages.

No repositório `NKellerMC/Threadly`:

1. abra **Settings > Pages**;
2. em **Build and deployment > Source**, selecione **GitHub Actions**;
3. faça push para `main` ou rode manualmente o workflow **Publicar Threadly**.

URL esperada:

```text
https://nkellermc.github.io/Threadly/
```

O `vite.config.ts` já usa a base `/Threadly/`.

## 4. Validação automática

`.github/workflows/check.yml` valida dois projetos:

- frontend: TypeScript, testes e build Vite;
- `firebase/functions`: instalação das dependências e compilação TypeScript.

Isso impede que uma alteração no código do login seja aprovada enquanto a Cloud Function correspondente estiver quebrada.

## 5. Teste de fumaça

Após o deploy completo:

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
12. testar desktop e celular;
13. confirmar que o usuário recebe `role: authenticated` no token Firebase.
