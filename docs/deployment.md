# Deploy

## 1. Firebase

1. Crie o projeto e um Web App.
2. Ative Authentication por Email/Password e Google.
3. Adicione `nkellermc.github.io` aos domínios autorizados.
4. Copie `firebase/.firebaserc.example` para `firebase/.firebaserc` e coloque o Project ID.
5. Em `firebase/functions`, rode `npm install && npm run build`.
6. Na pasta `firebase`, rode `firebase deploy --only functions`.

## 2. Supabase

1. Crie um projeto novo.
2. Em Authentication > Third-Party Auth, conecte o projeto Firebase correto.
3. Execute `supabase/migrations/001_core.sql` até `004_storage_grants_realtime.sql`, nessa ordem, no SQL Editor.
4. Copie Project URL e publishable key.

## 3. GitHub

No repositório `NKellerMC/Threadly`, crie Repository Variables com os nomes de `.env.example` (`VITE_*`). Em Settings > Pages, use GitHub Actions como source.

O workflow `.github/workflows/deploy.yml` executa typecheck, testes, build e deploy. A URL esperada é `https://nkellermc.github.io/Threadly/`.

## 4. Teste de fumaça

Após o deploy:

1. criar conta por email;
2. sair/entrar novamente;
3. login Google;
4. editar @ e bio;
5. publicar thread com imagem;
6. publicar clip e verificar miniatura;
7. curtir, salvar, comentar e responder;
8. seguir outro perfil;
9. abrir DM, enviar mensagem e verificar contador de não lidas;
10. abrir Histórico, Curtidos, Salvos e Studio em dois tamanhos de tela.
