import { auth } from '../lib/firebase'
import type { FollowState } from '../lib/types'
import { getRelationship, requestFollow, unfollowOrCancel } from './social'

export async function getFollowState(targetUserId: string): Promise<FollowState> {
  const uid = auth?.currentUser?.uid
  if (!uid || uid === targetUserId) return 'none'
  return (await getRelationship(targetUserId)).follow
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  return (await getFollowState(targetUserId)) === 'following'
}

export async function toggleFollowState(targetUserId: string, current: FollowState): Promise<FollowState> {
  if (current === 'none') return requestFollow(targetUserId)
  return unfollowOrCancel(targetUserId, current)
}

export async function toggleFollow(targetUserId: string, following: boolean): Promise<boolean> {
  const next = await toggleFollowState(targetUserId, following ? 'following' : 'none')
  return next === 'following'
}
