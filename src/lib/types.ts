export type Profile = {
  id: string
  username: string
  displayName: string
  bio: string
  avatarUrl?: string | null
  website?: string | null
  followers: number
  following: number
  createdAt?: string
}

export type ThreadPost = {
  id: string
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  body: string
  imageUrl?: string | null
  createdAt: string
  likes: number
  replies: number
  liked?: boolean
  saved?: boolean
}

export type ThreadReply = {
  id: string
  threadId: string
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  body: string
  createdAt: string
}

export type VideoPost = {
  id: string
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  title: string
  description: string
  videoUrl: string
  thumbnailUrl?: string | null
  createdAt: string
  likes: number
  comments: number
  views: number
  liked?: boolean
  saved?: boolean
  followingAuthor?: boolean
}

export type Comment = {
  id: string
  videoId: string
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  body: string
  createdAt: string
}

export type NotificationItem = {
  id: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system'
  actorId?: string | null
  actorUsername?: string | null
  actorDisplayName?: string | null
  actorAvatarUrl?: string | null
  text: string
  targetUrl?: string | null
  createdAt: string
  read: boolean
}

export type SearchResults = {
  profiles: Profile[]
  threads: ThreadPost[]
  videos: VideoPost[]
}

export type CreatorStats = {
  videos: number
  threads: number
  totalViews: number
  totalLikes: number
  followers: number
  last30DaysViews: number
}

export type ConversationSummary = {
  id: string
  participantId: string
  participantUsername: string
  participantName: string
  participantAvatarUrl?: string | null
  lastMessage: string
  lastMessageAt: string
  unread: number
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
}
