# Banco e Storage

`supabase/migrations/` é a fonte de verdade reproduzível do backend. Execute os arquivos `001` → `004` em ordem; `supabase/schema.sql` é apenas o índice humano dessa sequência.

## Tabelas

- `profiles`: perfil público vinculado ao Firebase UID.
- `videos`: metadados de clips; arquivo fica no Storage.
- `threads`: posts textuais e imagem opcional.
- `video_comments` / `thread_replies`: conversa em conteúdo.
- `video_likes` / `thread_likes`: curtidas por usuário.
- `bookmarks` / `thread_bookmarks`: itens salvos.
- `follows`: grafo de seguidores.
- `video_views`: histórico e contagem de visualizações.
- `notifications`: atividade derivada por triggers.
- `reports`: denúncias enviadas pelo cliente, sem leitura pública.
- `conversations`, `conversation_members`, `messages`: mensagens diretas.

## Buckets

- `videos`: até 200 MB; MP4/WebM/MOV.
- `thumbnails`: miniaturas geradas localmente do vídeo.
- `images`: até 10 MB; imagens de threads.

Os buckets são públicos para conteúdo publicado, mas escrita/alteração/remoção exige JWT autenticado e pasta iniciada pelo UID do usuário.

## Mensagens

A checagem `is_conversation_member(uuid)` é `SECURITY DEFINER` para evitar policy RLS auto-referente em `conversation_members`. O usuário só lê conversas das quais participa e só atualiza o próprio `last_read_at`.
