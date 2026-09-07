import type { Comment, NotificationItem, Profile, ThreadPost, ThreadReply, VideoPost } from '../lib/types'

export const mapProfile = (row: Record<string, unknown>): Profile => ({
  id: String(row.id),
  username: String(row.username ?? 'threader'),
  displayName: String(row.display_name ?? row.username ?? 'Threader'),
  bio: String(row.bio ?? ''),
  avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  website: row.website ? String(row.website) : null,
  followers: Number(row.followers_count ?? 0),
  following: Number(row.following_count ?? 0),
  createdAt: row.created_at ? String(row.created_at) : undefined,
})

export const mapThread = (row: Record<string, unknown>): ThreadPost => ({
  id: String(row.id),
  userId: String(row.user_id),
  username: String(row.username ?? 'threader'),
  displayName: String(row.display_name ?? row.username ?? 'Threader'),
  avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  body: String(row.body ?? ''),
  imageUrl: row.image_url ? String(row.image_url) : null,
  createdAt: String(row.created_at ?? new Date().toISOString()),
  likes: Number(row.likes_count ?? 0),
  replies: Number(row.replies_count ?? 0),
})

export const mapThreadReply = (row: Record<string, unknown>): ThreadReply => ({
  id: String(row.id),
  threadId: String(row.thread_id),
  userId: String(row.user_id),
  username: String(row.username ?? 'threader'),
  displayName: String(row.display_name ?? row.username ?? 'Threader'),
  avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  body: String(row.body ?? ''),
  createdAt: String(row.created_at ?? new Date().toISOString()),
})

export const mapVideo = (row: Record<string, unknown>): VideoPost => ({
  id: String(row.id),
  userId: String(row.user_id),
  username: String(row.username ?? 'threader'),
  displayName: String(row.display_name ?? row.username ?? 'Threader'),
  avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  title: String(row.title ?? ''),
  description: String(row.description ?? ''),
  videoUrl: String(row.video_url ?? ''),
  thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
  createdAt: String(row.created_at ?? new Date().toISOString()),
  likes: Number(row.likes_count ?? 0),
  comments: Number(row.comments_count ?? 0),
  views: Number(row.views_count ?? 0),
})

export const mapComment = (row: Record<string, unknown>): Comment => ({
  id: String(row.id),
  videoId: String(row.video_id),
  userId: String(row.user_id),
  username: String(row.username ?? 'threader'),
  displayName: String(row.display_name ?? row.username ?? 'Threader'),
  avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  body: String(row.body ?? ''),
  createdAt: String(row.created_at ?? new Date().toISOString()),
})

export const mapNotification = (row: Record<string, unknown>): NotificationItem => ({
  id: String(row.id),
  type: (String(row.type ?? 'system') as NotificationItem['type']),
  actorId: row.actor_id ? String(row.actor_id) : null,
  actorUsername: row.actor_username ? String(row.actor_username) : null,
  actorDisplayName: row.actor_display_name ? String(row.actor_display_name) : null,
  actorAvatarUrl: row.actor_avatar_url ? String(row.actor_avatar_url) : null,
  text: String(row.text ?? ''),
  targetUrl: row.target_url ? String(row.target_url) : null,
  createdAt: String(row.created_at ?? new Date().toISOString()),
  read: Boolean(row.read_at),
})
