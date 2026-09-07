export type Audience = 'public' | 'followers' | 'close_friends'
export type FollowState = 'none' | 'requested' | 'following'

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
  isPrivate?: boolean
  allowMessagesFrom?: 'everyone' | 'following' | 'none'
  allowMentionsFrom?: 'everyone' | 'following' | 'none'
  allowCommentsFrom?: 'everyone' | 'following' | 'none'
  showActivityStatus?: boolean
}

export type ThreadMedia = {
  id: string
  type: 'image' | 'video'
  url: string
  storagePath?: string | null
  position: number
  altText?: string
  editMetadata?: MediaEditState
}

export type ThreadPost = {
  id: string
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  body: string
  imageUrl?: string | null
  imagePath?: string | null
  media?: ThreadMedia[]
  createdAt: string
  likes: number
  replies: number
  liked?: boolean
  saved?: boolean
  audience?: Audience
  commentsEnabled?: boolean
  commentPolicy?: 'everyone' | 'following' | 'none'
  locationName?: string | null
  editedAt?: string | null
  reposted?: boolean
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
  replyToId?: string | null
  editedAt?: string | null
  pinned?: boolean
  likes?: number
  liked?: boolean
}

export type MediaEditState = {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  rotate: 0 | 90 | 180 | 270
  aspect: 'original' | '1:1' | '4:5' | '9:16' | '16:9'
  trimStart: number
  trimEnd: number | null
  text?: string
  textSize?: number
  textY?: number
  sticker?: string
  stickerSize?: number
  stickerX?: number
  stickerY?: number
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
  storagePath?: string | null
  thumbnailUrl?: string | null
  thumbnailPath?: string | null
  createdAt: string
  likes: number
  comments: number
  views: number
  liked?: boolean
  saved?: boolean
  followingAuthor?: boolean
  audience?: Audience
  commentsEnabled?: boolean
  commentPolicy?: 'everyone' | 'following' | 'none'
  locationName?: string | null
  editMetadata?: MediaEditState
  editedAt?: string | null
  reposted?: boolean
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
  replyToId?: string | null
  editedAt?: string | null
  pinned?: boolean
  likes?: number
  liked?: boolean
}

export type Story = {
  id: string
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  mediaType: 'image' | 'video'
  mediaUrl: string
  storagePath?: string | null
  caption: string
  audience: Audience
  createdAt: string
  expiresAt: string
  viewed?: boolean
  editMetadata?: MediaEditState
}

export type StoryGroup = {
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  stories: Story[]
  hasUnseen: boolean
}

export type NoteItem = {
  id: string
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  body: string
  audience: 'followers' | 'close_friends'
  expiresAt: string
}

export type FollowRequestItem = {
  requesterId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  createdAt: string
}

export type RelationshipState = {
  follow: FollowState
  blocked: boolean
  restricted: boolean
  muted: boolean
  closeFriend: boolean
}

export type NotificationItem = {
  id: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'story' | 'follow_request' | 'repost' | 'message' | 'collaboration'
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
  title?: string | null
  kind?: 'direct' | 'group'
  lastMessage: string
  lastMessageAt: string
  unread: number
  requestState?: 'requested' | 'accepted' | 'declined'
  pinned?: boolean
}

export type MessageReaction = {
  userId: string
  emoji: string
}

export type MessageAttachment = {
  id: string
  mediaType: 'image' | 'video' | 'audio' | 'file'
  url: string
  storagePath?: string | null
  fileName?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  replyToId?: string | null
  editedAt?: string | null
  deletedAt?: string | null
  sharedType?: 'thread' | 'video' | 'story' | 'profile' | null
  sharedId?: string | null
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
}

export type SavedCollection = {
  id: string
  name: string
  updatedAt: string
  itemCount?: number
}

export type Channel = {
  id: string
  ownerId: string
  title: string
  description: string
  memberCount?: number
  joined?: boolean
}

export type ChannelPost = {
  id: string
  channelId: string
  userId: string
  body: string
  createdAt: string
}
