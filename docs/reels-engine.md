# Motor de Clips

## Reprodução

`VideoCard` usa `IntersectionObserver` para tocar o clip quando ele entra na área ativa e pausar fora dela. Isso evita dezenas de vídeos tocando/decodificando ao mesmo tempo.

## Upload

`src/api/upload.ts` valida MIME e limite de 200 MB, cria caminho por Firebase UID + UUID, gera thumbnail em canvas, envia vídeo e miniatura para buckets separados e só então grava os metadados no Postgres. Se o insert falhar, os objetos enviados são removidos.

## Views

`record_video_view` só é executável por usuários autenticados. A combinação `(video_id, viewer_id)` impede múltiplas contagens do mesmo usuário para o mesmo clip no histórico persistente. O frontend ainda usa `sessionStorage` para evitar chamadas repetidas durante a mesma sessão.

## Feed

`getTrendingVideos` e os feeds usam o Supabase real quando configurado. Dados demo existem apenas como fallback visual quando o backend está ausente.
