import { auth } from '../lib/firebase'
import { signedMediaUrl, uploadUserMedia } from '../lib/media'
import { requireSupabase } from '../lib/supabase'
import type { Audience, Channel, ChannelPost, FollowRequestItem, FollowState, MediaEditState, NoteItem, Profile, RelationshipState, SavedCollection, Story, StoryGroup } from '../lib/types'
import { validateImageFile, validateVideoFile } from '../lib/validation'
import { mapProfile } from './mappers'

function uid(): string {
  const id=auth?.currentUser?.uid
  if(!id) throw new Error('Sua sessão expirou. Entre novamente.')
  return id
}

export async function updatePrivacySettings(input: { isPrivate:boolean; allowMessagesFrom:'everyone'|'following'|'none'; allowMentionsFrom:'everyone'|'following'|'none'; allowCommentsFrom:'everyone'|'following'|'none'; showActivityStatus:boolean }): Promise<void> {
  const db=requireSupabase(); const {error}=await db.from('profiles').update({is_private:input.isPrivate,allow_messages_from:input.allowMessagesFrom,allow_mentions_from:input.allowMentionsFrom,allow_comments_from:input.allowCommentsFrom,show_activity_status:input.showActivityStatus,updated_at:new Date().toISOString()}).eq('id',uid())
  if(error) throw error
}

export async function getRelationship(targetId:string):Promise<RelationshipState>{
  const me=uid(); if(me===targetId)return{follow:'none',blocked:false,restricted:false,muted:false,closeFriend:false}
  const db=requireSupabase()
  const [follow,request,block,restriction,mute,close]=await Promise.all([
    db.from('follows').select('following_id').eq('follower_id',me).eq('following_id',targetId).maybeSingle(),
    db.from('follow_requests').select('target_id').eq('requester_id',me).eq('target_id',targetId).maybeSingle(),
    db.from('blocks').select('blocked_id').eq('blocker_id',me).eq('blocked_id',targetId).maybeSingle(),
    db.from('restrictions').select('restricted_id').eq('owner_id',me).eq('restricted_id',targetId).maybeSingle(),
    db.from('mutes').select('muted_id').eq('owner_id',me).eq('muted_id',targetId).maybeSingle(),
    db.from('close_friends').select('friend_id').eq('owner_id',me).eq('friend_id',targetId).maybeSingle(),
  ])
  for(const result of [follow,request,block,restriction,mute,close])if(result.error)throw result.error
  const state:FollowState=follow.data?'following':request.data?'requested':'none'
  return{follow:state,blocked:Boolean(block.data),restricted:Boolean(restriction.data),muted:Boolean(mute.data),closeFriend:Boolean(close.data)}
}

export async function requestFollow(targetId:string):Promise<FollowState>{
  const db=requireSupabase(); const {data,error}=await db.rpc('request_or_follow',{p_target_id:targetId}); if(error)throw error
  return String(data) as FollowState
}
export async function unfollowOrCancel(targetId:string,state:FollowState):Promise<FollowState>{
  const me=uid(); const db=requireSupabase()
  if(state==='following'){const{error}=await db.from('follows').delete().eq('follower_id',me).eq('following_id',targetId);if(error)throw error}
  if(state==='requested'){const{error}=await db.from('follow_requests').delete().eq('requester_id',me).eq('target_id',targetId);if(error)throw error}
  return'none'
}

export async function getFollowRequests():Promise<FollowRequestItem[]>{
  const me=uid();const db=requireSupabase();const{data,error}=await db.from('follow_requests').select('requester_id,created_at').eq('target_id',me).order('created_at',{ascending:false});if(error)throw error
  const ids=(data??[]).map(r=>String(r.requester_id));if(!ids.length)return[]
  const{data:profiles,error:profileError}=await db.from('profiles_public').select('*').in('id',ids);if(profileError)throw profileError
  const map=new Map((profiles??[]).map(row=>{const p=mapProfile(row);return[p.id,p]}))
  return(data??[]).map(row=>{const p=map.get(String(row.requester_id));return{requesterId:String(row.requester_id),username:p?.username??'threader',displayName:p?.displayName??'Threader',avatarUrl:p?.avatarUrl,createdAt:String(row.created_at)}})
}
export async function respondFollowRequest(requesterId:string,accept:boolean):Promise<void>{const db=requireSupabase();const{error}=await db.rpc('respond_follow_request',{p_requester_id:requesterId,p_accept:accept});if(error)throw error}

export async function setRelationshipFlag(kind:'block'|'restrict'|'mute'|'close_friend',targetId:string,enabled:boolean):Promise<void>{
  const me=uid();const db=requireSupabase()
  if(kind==='block'){
    if(enabled){const{error}=await db.rpc('block_user',{p_target_id:targetId});if(error)throw error}else{const{error}=await db.from('blocks').delete().eq('blocker_id',me).eq('blocked_id',targetId);if(error)throw error}
    return
  }
  const config={restrict:['restrictions','owner_id','restricted_id'],mute:['mutes','owner_id','muted_id'],close_friend:['close_friends','owner_id','friend_id']} as const
  const [table,ownerCol,targetCol]=config[kind]
  if(enabled){const{error}=await db.from(table).insert({[ownerCol]:me,[targetCol]:targetId});if(error&&error.code!=='23505')throw error}
  else{const{error}=await db.from(table).delete().eq(ownerCol,me).eq(targetCol,targetId);if(error)throw error}
}

async function profilesFor(ids:string[]):Promise<Map<string,Profile>>{
  if(!ids.length)return new Map();const db=requireSupabase();const{data,error}=await db.from('profiles_public').select('*').in('id',[...new Set(ids)]);if(error)throw error
  return new Map((data??[]).map(row=>{const p=mapProfile(row);return[p.id,p]}))
}

export async function getStories():Promise<StoryGroup[]>{
  const me=uid();const db=requireSupabase();const now=new Date().toISOString();const{data,error}=await db.from('stories').select('*').gt('expires_at',now).order('created_at',{ascending:true}).limit(200);if(error)throw error
  const rows=data??[];const profiles=await profilesFor(rows.map(r=>String(r.user_id)));const{data:views,error:viewError}=await db.from('story_views').select('story_id').eq('viewer_id',me).in('story_id',rows.map(r=>String(r.id)));if(viewError&&rows.length)throw viewError
  const viewed=new Set((views??[]).map(v=>String(v.story_id)));const grouped=new Map<string,StoryGroup>()
  for(const row of rows){const userId=String(row.user_id);const p=profiles.get(userId);const path=String(row.storage_path);const story:Story={id:String(row.id),userId,username:p?.username??'threader',displayName:p?.displayName??'Threader',avatarUrl:p?.avatarUrl,mediaType:String(row.media_type) as Story['mediaType'],mediaUrl:await signedMediaUrl('stories',path),storagePath:path,caption:String(row.caption??''),audience:String(row.audience??'followers') as Audience,createdAt:String(row.created_at),expiresAt:String(row.expires_at),viewed:viewed.has(String(row.id)),editMetadata:row.edit_metadata as MediaEditState}
    const group=grouped.get(userId)??{userId,username:story.username,displayName:story.displayName,avatarUrl:story.avatarUrl,stories:[],hasUnseen:false};group.stories.push(story);if(!story.viewed)group.hasUnseen=true;grouped.set(userId,group)}
  return[...grouped.values()].sort((a,b)=>Number(b.userId===me)-Number(a.userId===me)||Number(b.hasUnseen)-Number(a.hasUnseen))
}

export async function createStory(file:File,caption:string,audience:Audience,editMetadata?:MediaEditState):Promise<void>{
  const me=uid();const isVideo=file.type.startsWith('video/');if(isVideo)validateVideoFile(file);else validateImageFile(file)
  const db=requireSupabase();const path=await uploadUserMedia('stories',me,file,isVideo?'mp4':'jpg')
  const{error}=await db.from('stories').insert({user_id:me,media_type:isVideo?'video':'image',storage_path:path,caption:caption.trim(),audience,edit_metadata:editMetadata??{}});if(error){await db.storage.from('stories').remove([path]);throw error}
}
export async function viewStory(storyId:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('story_views').upsert({story_id:storyId,viewer_id:uid()},{onConflict:'story_id,viewer_id'});if(error)throw error}
export async function reactStory(storyId:string,emoji:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('story_reactions').upsert({story_id:storyId,user_id:uid(),emoji},{onConflict:'story_id,user_id'});if(error)throw error}
export async function deleteStory(storyId:string):Promise<void>{const db=requireSupabase();const me=uid();const{data,error}=await db.from('stories').select('storage_path').eq('id',storyId).eq('user_id',me).maybeSingle();if(error)throw error;if(!data)return;const{error:deleteError}=await db.from('stories').delete().eq('id',storyId).eq('user_id',me);if(deleteError)throw deleteError;await db.storage.from('stories').remove([String(data.storage_path)])}

export async function createHighlight(title:string,storyIds:string[]):Promise<void>{const db=requireSupabase();const{data,error}=await db.from('highlights').insert({user_id:uid(),title:title.trim()}).select('id').single();if(error)throw error;if(storyIds.length){const{error:itemError}=await db.from('highlight_items').insert(storyIds.map((storyId,position)=>({highlight_id:data.id,story_id:storyId,position})));if(itemError)throw itemError}}

export async function getNotes():Promise<NoteItem[]>{const db=requireSupabase();const{data,error}=await db.from('notes').select('*').gt('expires_at',new Date().toISOString()).order('updated_at',{ascending:false});if(error)throw error;const rows=data??[];const profiles=await profilesFor(rows.map(r=>String(r.user_id)));return rows.map(row=>{const p=profiles.get(String(row.user_id));return{id:String(row.id),userId:String(row.user_id),username:p?.username??'threader',displayName:p?.displayName??'Threader',avatarUrl:p?.avatarUrl,body:String(row.body),audience:String(row.audience) as NoteItem['audience'],expiresAt:String(row.expires_at)}})}
export async function saveNote(body:string,audience:'followers'|'close_friends'):Promise<void>{const me=uid();const db=requireSupabase();const text=body.trim();if(!text){await db.from('notes').delete().eq('user_id',me);return}const{error}=await db.from('notes').upsert({user_id:me,body:text,audience,expires_at:new Date(Date.now()+86400000).toISOString(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error}

export async function toggleRepost(targetType:'thread'|'video',targetId:string,reposted:boolean,comment=''):Promise<boolean>{const me=uid();const db=requireSupabase();if(reposted){const{error}=await db.from('reposts').delete().eq('user_id',me).eq('target_type',targetType).eq('target_id',targetId);if(error)throw error;return false}const{error}=await db.from('reposts').insert({user_id:me,target_type:targetType,target_id:targetId,comment:comment.trim()});if(error)throw error;return true}

export async function saveDraft(kind:'thread'|'clip'|'story',payload:Record<string,unknown>,draftId?:string):Promise<string>{const me=uid();const db=requireSupabase();if(draftId){const{error}=await db.from('drafts').update({payload,updated_at:new Date().toISOString()}).eq('id',draftId).eq('user_id',me);if(error)throw error;return draftId}const{data,error}=await db.from('drafts').insert({user_id:me,kind,payload}).select('id').single();if(error)throw error;return String(data.id)}
export async function getDrafts():Promise<Array<{id:string;kind:'thread'|'clip'|'story';payload:Record<string,unknown>;updatedAt:string}>>{const db=requireSupabase();const{data,error}=await db.from('drafts').select('*').eq('user_id',uid()).order('updated_at',{ascending:false});if(error)throw error;return(data??[]).map(r=>({id:String(r.id),kind:String(r.kind) as 'thread'|'clip'|'story',payload:(r.payload??{}) as Record<string,unknown>,updatedAt:String(r.updated_at)}))}
export async function deleteDraft(id:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('drafts').delete().eq('id',id).eq('user_id',uid());if(error)throw error}

export async function getCollections():Promise<SavedCollection[]>{const db=requireSupabase();const{data,error}=await db.from('collections').select('*').eq('user_id',uid()).order('updated_at',{ascending:false});if(error)throw error;return(data??[]).map(r=>({id:String(r.id),name:String(r.name),updatedAt:String(r.updated_at)}))}
export async function createCollection(name:string):Promise<string>{const db=requireSupabase();const{data,error}=await db.from('collections').insert({user_id:uid(),name:name.trim()}).select('id').single();if(error)throw error;return String(data.id)}
export async function addToCollection(collectionId:string,targetType:'thread'|'video',targetId:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('collection_items').upsert({collection_id:collectionId,target_type:targetType,target_id:targetId},{onConflict:'collection_id,target_type,target_id'});if(error)throw error}

export async function getChannels():Promise<Channel[]>{const me=uid();const db=requireSupabase();const{data,error}=await db.from('channels').select('*').order('updated_at',{ascending:false});if(error)throw error;const rows=data??[];const ids=rows.map(r=>String(r.id));const{data:members,error:memberError}=ids.length?await db.from('channel_members').select('channel_id,user_id').in('channel_id',ids):{data:[],error:null};if(memberError)throw memberError;const count=new Map<string,number>();const joined=new Set<string>();for(const m of members??[]){const id=String(m.channel_id);count.set(id,(count.get(id)??0)+1);if(String(m.user_id)===me)joined.add(id)}return rows.map(r=>({id:String(r.id),ownerId:String(r.owner_id),title:String(r.title),description:String(r.description??''),memberCount:count.get(String(r.id))??0,joined:joined.has(String(r.id))}))}
export async function createChannel(title:string,description:string):Promise<string>{const me=uid();const db=requireSupabase();const{data,error}=await db.from('channels').insert({owner_id:me,title:title.trim(),description:description.trim()}).select('id').single();if(error)throw error;await db.from('channel_members').insert({channel_id:data.id,user_id:me,role:'member'});return String(data.id)}
export async function joinChannel(channelId:string,joined:boolean):Promise<boolean>{const me=uid();const db=requireSupabase();if(joined){const{error}=await db.from('channel_members').delete().eq('channel_id',channelId).eq('user_id',me);if(error)throw error;return false}const{error}=await db.from('channel_members').insert({channel_id:channelId,user_id:me,role:'member'});if(error)throw error;return true}
export async function getChannelPosts(channelId:string):Promise<ChannelPost[]>{const db=requireSupabase();const{data,error}=await db.from('channel_posts').select('*').eq('channel_id',channelId).order('created_at',{ascending:true}).limit(300);if(error)throw error;return(data??[]).map(r=>({id:String(r.id),channelId:String(r.channel_id),userId:String(r.user_id),body:String(r.body),createdAt:String(r.created_at)}))}
export async function postToChannel(channelId:string,body:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('channel_posts').insert({channel_id:channelId,user_id:uid(),body:body.trim()});if(error)throw error}
