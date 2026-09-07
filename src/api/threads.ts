import { auth } from '../lib/firebase'
import { signedMediaUrl, userMediaPath } from '../lib/media'
import { requireSupabase } from '../lib/supabase'
import type { Audience, MediaEditState, PollData, ThreadMedia, ThreadPost, ThreadReply } from '../lib/types'
import { validateImageFile, validateVideoFile } from '../lib/validation'
import { mapThread, mapThreadReply } from './mappers'

async function hydrateMedia(posts: ThreadPost[]): Promise<ThreadPost[]> {
  if (!posts.length) return posts
  const db = requireSupabase(); const ids = posts.map(p => p.id)
  const { data: mediaRows, error } = await db.from('thread_media').select('*').in('thread_id', ids).order('position', { ascending:true })
  if (error) throw error
  const byThread = new Map<string, ThreadMedia[]>()
  for (const row of mediaRows ?? []) {
    const path = String(row.storage_path)
    const item: ThreadMedia = { id:String(row.id), type:String(row.media_type) as ThreadMedia['type'], storagePath:path, url:await signedMediaUrl('images',path), position:Number(row.position??0), altText:String(row.alt_text??''), editMetadata:row.edit_metadata&&typeof row.edit_metadata==='object'?row.edit_metadata as MediaEditState:undefined }
    const key=String(row.thread_id); const current=byThread.get(key)??[]; current.push(item); byThread.set(key,current)
  }
  return Promise.all(posts.map(async post=>({ ...post, imageUrl:post.imagePath?await signedMediaUrl('images',post.imagePath,post.imageUrl):post.imageUrl, media:byThread.get(post.id)??[] })))
}

async function hydrateSocialMeta(posts:ThreadPost[]):Promise<ThreadPost[]>{
  if(!posts.length)return posts
  const db=requireSupabase();const me=auth?.currentUser?.uid;const ids=posts.map(p=>p.id);const ownerIds=[...new Set(posts.map(p=>p.userId))]
  const [pollsResult,collabsResult,pinsResult]=await Promise.all([
    db.from('polls').select('id,thread_id,question,ends_at').in('thread_id',ids),
    db.from('collaborations').select('target_id,collaborator_id,status').eq('target_type','thread').eq('status','accepted').in('target_id',ids),
    db.from('profile_pins').select('user_id,target_id').eq('target_type','thread').in('user_id',ownerIds).in('target_id',ids),
  ])
  if(pollsResult.error)throw pollsResult.error;if(collabsResult.error)throw collabsResult.error;if(pinsResult.error)throw pinsResult.error
  const pollRows=pollsResult.data??[];const pollIds=pollRows.map(p=>String(p.id))
  const [optionsResult,votesResult]=pollIds.length?await Promise.all([
    db.from('poll_options').select('id,poll_id,label,position').in('poll_id',pollIds).order('position',{ascending:true}),
    db.from('poll_votes').select('poll_id,option_id,user_id').in('poll_id',pollIds),
  ]):[{data:[],error:null},{data:[],error:null}]
  if(optionsResult.error)throw optionsResult.error;if(votesResult.error)throw votesResult.error
  const voteCounts=new Map<string,number>();const myVotes=new Map<string,string>()
  for(const vote of votesResult.data??[]){const optionId=String(vote.option_id);voteCounts.set(optionId,(voteCounts.get(optionId)??0)+1);if(me&&String(vote.user_id)===me)myVotes.set(String(vote.poll_id),optionId)}
  const pollByThread=new Map<string,PollData>()
  for(const poll of pollRows){const pid=String(poll.id);const options=(optionsResult.data??[]).filter(o=>String(o.poll_id)===pid).map(o=>({id:String(o.id),label:String(o.label),position:Number(o.position??0),votes:voteCounts.get(String(o.id))??0}));pollByThread.set(String(poll.thread_id),{id:pid,question:String(poll.question),endsAt:poll.ends_at?String(poll.ends_at):null,options,myOptionId:myVotes.get(pid)??null,totalVotes:options.reduce((sum,o)=>sum+o.votes,0)})}
  const collabs=new Map<string,string[]>();for(const row of collabsResult.data??[]){const key=String(row.target_id);collabs.set(key,[...(collabs.get(key)??[]),String(row.collaborator_id)])}
  const pinned=new Set((pinsResult.data??[]).map(row=>`${String(row.user_id)}:${String(row.target_id)}`))
  return posts.map(post=>({...post,poll:pollByThread.get(post.id)??null,collaboratorIds:collabs.get(post.id)??[],pinned:pinned.has(`${post.userId}:${post.id}`)}))
}

async function decorate(posts: ThreadPost[]): Promise<ThreadPost[]> {
  const hydrated = await hydrateSocialMeta(await hydrateMedia(posts))
  const uid = auth?.currentUser?.uid
  if (!uid || !hydrated.length) return hydrated
  const db = requireSupabase(); const ids = hydrated.map(p => p.id)
  const [likes, saves, reposts] = await Promise.all([
    db.from('thread_likes').select('thread_id').eq('user_id', uid).in('thread_id', ids),
    db.from('thread_bookmarks').select('thread_id').eq('user_id', uid).in('thread_id', ids),
    db.from('reposts').select('target_id').eq('user_id', uid).eq('target_type','thread').in('target_id', ids),
  ])
  if(likes.error)throw likes.error;if(saves.error)throw saves.error;if(reposts.error)throw reposts.error
  const liked=new Set((likes.data??[]).map(r=>String(r.thread_id)));const saved=new Set((saves.data??[]).map(r=>String(r.thread_id)));const reposted=new Set((reposts.data??[]).map(r=>String(r.target_id)))
  return hydrated.map(p=>({...p,liked:liked.has(p.id),saved:saved.has(p.id),reposted:reposted.has(p.id)}))
}

export async function getThreads(options:{userId?:string;limit?:number;followingOnly?:boolean}={}):Promise<ThreadPost[]>{
  const db=requireSupabase()
  if(options.followingOnly){const uid=auth?.currentUser?.uid;if(!uid)throw new Error('Sua sessão expirou. Entre novamente.');const{data:followRows,error:followError}=await db.from('follows').select('following_id').eq('follower_id',uid);if(followError)throw followError;const ids=(followRows??[]).map(r=>String(r.following_id));if(!ids.length)return[];const{data,error}=await db.from('threads_public').select('*').in('user_id',ids).order('created_at',{ascending:false}).limit(options.limit??40);if(error)throw error;return decorate((data??[]).map(mapThread))}
  let query=db.from('threads_public').select('*').order('created_at',{ascending:false}).limit(options.limit??40);if(options.userId)query=query.eq('user_id',options.userId);const{data,error}=await query;if(error)throw error;return decorate((data??[]).map(mapThread))
}

export async function getThread(threadId:string):Promise<ThreadPost|null>{const db=requireSupabase();const{data,error}=await db.from('threads_public').select('*').eq('id',threadId).maybeSingle();if(error)throw error;return data?(await decorate([mapThread(data)]))[0]:null}

type ThreadMediaInput={file:File;editMetadata?:MediaEditState;altText?:string}
export async function createThread(userId:string,body:string,media?:File|File[]|ThreadMediaInput[]|null,options:{audience?:Audience;commentsEnabled?:boolean;commentPolicy?:'everyone'|'following'|'none';locationName?:string}={}):Promise<string>{
  const db=requireSupabase();const raw=!media?[]:Array.isArray(media)?media:[media];const items:ThreadMediaInput[]=raw.map(item=>item instanceof File?{file:item}:item);if(items.length>10)throw new Error('Um carrossel pode ter no máximo 10 mídias.');const uploaded:string[]=[];let insertedId=''
  try{const{data:inserted,error:insertError}=await db.from('threads').insert({user_id:userId,body,image_url:null,image_path:null,audience:options.audience??'public',comments_enabled:options.commentsEnabled??true,comment_policy:options.commentPolicy??'everyone',location_name:options.locationName?.trim()||null}).select('id').single();if(insertError)throw insertError;insertedId=String(inserted.id)
    for(let index=0;index<items.length;index++){const{file,editMetadata,altText}=items[index];const isVideo=file.type.startsWith('video/');if(isVideo)validateVideoFile(file);else validateImageFile(file);const path=userMediaPath(userId,file,isVideo?'mp4':'jpg');const{error:uploadError}=await db.storage.from('images').upload(path,file,{cacheControl:'86400',upsert:false,contentType:file.type});if(uploadError)throw uploadError;uploaded.push(path);const{error:mediaError}=await db.from('thread_media').insert({thread_id:insertedId,media_type:isVideo?'video':'image',storage_path:path,position:index,alt_text:altText?.trim()||'',edit_metadata:editMetadata??{}});if(mediaError)throw mediaError}
    return insertedId
  }catch(error){if(uploaded.length)await db.storage.from('images').remove(uploaded);if(insertedId)await db.from('threads').delete().eq('id',insertedId).eq('user_id',userId);throw error}
}

export async function editThread(threadId:string,body:string,settings?:{commentsEnabled?:boolean;commentPolicy?:'everyone'|'following'|'none';locationName?:string}):Promise<void>{const uid=auth?.currentUser?.uid;if(!uid)throw new Error('Sua sessão expirou.');const db=requireSupabase();const{error}=await db.from('threads').update({body:body.trim(),edited_at:new Date().toISOString(),...(settings??{})}).eq('id',threadId).eq('user_id',uid);if(error)throw error}
export async function getThreadReplies(threadId:string):Promise<ThreadReply[]>{const db=requireSupabase();const{data,error}=await db.from('thread_replies_public').select('*').eq('thread_id',threadId).order('created_at',{ascending:true}).limit(200);if(error)throw error;return(data??[]).map(mapThreadReply)}
export async function addThreadReply(threadId:string,body:string,replyToId?:string|null):Promise<ThreadReply>{const uid=auth?.currentUser?.uid;if(!uid)throw new Error('Sua sessão expirou. Entre novamente para responder.');const text=body.trim();if(!text)throw new Error('Escreva uma resposta.');const db=requireSupabase();const{data,error}=await db.from('thread_replies').insert({thread_id:threadId,user_id:uid,body:text,reply_to_id:replyToId??null}).select('id').single();if(error)throw error;const{data:row,error:readError}=await db.from('thread_replies_public').select('*').eq('id',data.id).single();if(readError)throw readError;return mapThreadReply(row)}
