-- Threadly 3.1 — Supabase backend usando Firebase Auth como Third-Party Auth.
-- Requisitos:
-- 1) Supabase > Authentication > Third-Party Auth > Firebase, com o mesmo Project ID.
-- 2) O ID token Firebase precisa conter custom claim: role = "authenticated".
-- 3) O frontend usa a publishable key/anon key; NUNCA service_role no navegador.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name text not null default 'Threader' check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 240),
  website text check (website is null or char_length(website) <= 240),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  video_url text not null,
  thumbnail_url text,
  storage_path text,
  thumbnail_path text,
  likes_count integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  views_count integer not null default 0 check (views_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 800),
  image_url text,
  image_path text,
  likes_count integer not null default 0 check (likes_count >= 0),
  replies_count integer not null default 0 check (replies_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.threads add column if not exists image_path text;

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.thread_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.video_likes (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create table if not exists public.thread_likes (
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.bookmarks (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create table if not exists public.thread_bookmarks (
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.follows (
  follower_id text not null references public.profiles(id) on delete cascade,
  following_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.video_views (
  id bigint generated always as identity primary key,
  video_id uuid not null references public.videos(id) on delete cascade,
  viewer_id text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists video_views_user_once_idx on public.video_views(video_id, viewer_id) where viewer_id is not null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  actor_id text references public.profiles(id) on delete cascade,
  type text not null check (type in ('like','comment','follow','mention','system')),
  text text not null check (char_length(text) <= 300),
  target_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('video','thread','profile')),
  target_id text not null,
  reason text not null check (char_length(reason) between 2 and 80),
  details text check (details is null or char_length(details) <= 800),
  status text not null default 'open' check (status in ('open','reviewing','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id text not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists videos_created_at_idx on public.videos (created_at desc);
create index if not exists videos_user_id_idx on public.videos (user_id, created_at desc);
create index if not exists threads_created_at_idx on public.threads (created_at desc);
create index if not exists threads_user_id_idx on public.threads (user_id, created_at desc);
create index if not exists comments_video_id_idx on public.video_comments (video_id, created_at);
create index if not exists replies_thread_id_idx on public.thread_replies (thread_id, created_at);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists views_viewer_idx on public.video_views (viewer_id, created_at desc);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists members_user_idx on public.conversation_members (user_id, conversation_id);
