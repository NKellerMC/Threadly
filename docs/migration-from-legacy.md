# Migração do Threadly legado

O ZIP original continha dezenas de arquivos vazios. Eles não foram mantidos como cascas: cada responsabilidade útil foi migrada para módulos reais.

| Legado vazio | Implementação atual |
| --- | --- |
| `api/analytics.js` | `src/api/analytics.ts` |
| `api/comments.js` | `src/api/comments.ts` + replies em `src/api/threads.ts` |
| `api/follows.js` | `src/api/follows.ts` |
| `api/likes.js` | `src/api/likes.ts` |
| `api/notifications.js` | `src/api/notifications.ts` |
| `api/reels.js` | `src/api/reels.ts` |
| `api/search.js` | `src/api/search.ts` |
| `api/upload.js` | `src/api/upload.ts` |
| `api/users.js` | `src/api/users.ts` |
| `config/environment.js` | `src/lib/config.ts` + `.env.example` |
| `config/routes.js` | `src/App.tsx` |
| componentes HTML vazios | `src/components/*.tsx` |
| páginas HTML vazias | `src/pages/*.tsx` |
| CSS fragmentado/vazio | `src/styles/*.css` |
| edge functions vazias | SQL/RPCs em `supabase/schema.sql` e `firebase/functions` |
| testes vazios | `src/lib/validation.test.ts` |
| docs vazios | `docs/*.md` |

Arquivos legados que só duplicavam responsabilidades foram removidos. Manter arquivo vazio “porque existia antes” não é compatibilidade; é dívida técnica com fantasia de organização.
