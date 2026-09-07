import { auth } from '../lib/firebase'
import { signedMediaUrl } from '../lib/media'
import { requireSupabase } from '../lib/supabase'
import type { Audience, Story } from '../lib/types'

function uid(): string {
  const id = auth?.currentUser?.uid
  if (!id) throw new Error('Sua sessão expirou. Entre novamente.')
  return id
}

export type HighlightItem = { storyId:string; mediaType:'image'|'video'; mediaUrl:string; caption:string; createdAt:string }
export type Highlight = { id:string; userId:string; title:string; items:HighlightItem[]; createdAt:string }

export async function getStoryArchive(): Promise<Story[]> {
  const me=uid();const db=requireSupabase()
  const{data,error}=await db.from('stories').select('*').eq('user_id',me).order('created_at',{ascending:false}).limit(200)
  if(error)throw error
  return Promise.all((data??[]).map(async row=>({
    id:String(row.id),userId:me,username:'',displayName:auth?.currentUser?.displayName||'Você',avatarUrl:auth?.currentUser?.photoURL,
    mediaType:String(row.media_type) as Story['mediaType'],mediaUrl:await signedMediaUrl('stories',String(row.storage_path)),storagePath:String(row.storage_path),caption:String(row.caption??''),audience:String(row.audience??'followers') as Audience,createdAt:String(row.created_at),expiresAt:String(row.expires_at),editMetadata:row.edit_metadata??{},
  })))
}

export async function getHighlights(userId:string):Promise<Highlight[]>{
  const db=requireSupabase();const{data,error}=await db.from('highlights').select('*').eq('user_id',userId).order('created_at',{ascending:true});if(error)throw error
  const highlights=data??[];if(!highlights.length)return[]
  const ids=highlights.map(h=>String(h.id));const{data:items,error:itemError}=await db.from('highlight_items').select('highlight_id,story_id,position').in('highlight_id',ids).order('position',{ascending:true});if(itemError)throw itemError
  const storyIds=[...new Set((items??[]).map(i=>String(i.story_id)))];const{data:stories,error:storyError}=storyIds.length?await db.from('stories').select('id,media_type,storage_path,caption,created_at').in('id',storyIds):{data:[],error:null};if(storyError)throw storyError
  const storyMap=new Map<string,HighlightItem>();for(const row of stories??[]){storyMap.set(String(row.id),{storyId:String(row.id),mediaType:String(row.media_type) as 'image'|'video',mediaUrl:await signedMediaUrl('stories',String(row.storage_path)),caption:String(row.caption??''),createdAt:String(row.created_at)})}
  return highlights.map(h=>({id:String(h.id),userId:String(h.user_id),title:String(h.title),createdAt:String(h.created_at),items:(items??[]).filter(i=>String(i.highlight_id)===String(h.id)).map(i=>storyMap.get(String(i.story_id))).filter((item):item is HighlightItem=>Boolean(item))}))
}

export async function createHighlightFromArchive(title:string,storyIds:string[]):Promise<void>{
  const text=title.trim();if(!text)throw new Error('Dê um nome ao Destaque.');if(!storyIds.length)throw new Error('Escolha pelo menos um Story.')
  const db=requireSupabase();const{data,error}=await db.from('highlights').insert({user_id:uid(),title:text}).select('id').single();if(error)throw error
  const{error:itemError}=await db.from('highlight_items').insert(storyIds.map((storyId,position)=>({highlight_id:data.id,story_id:storyId,position})));if(itemError){await db.from('highlights').delete().eq('id',data.id);throw itemError}
}
export async function deleteHighlight(id:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('highlights').delete().eq('id',id).eq('user_id',uid());if(error)throw error}

export type PollOption={id:string;label:string;position:number;votes:number}
export type PollData={id:string;question:string;endsAt?:string|null;options:PollOption[];myOptionId?:string|null;totalVotes:number}
export async function createThreadPoll(threadId:string,question:string,labels:string[]):Promise<void>{
  const clean=labels.map(v=>v.trim()).filter(Boolean).slice(0,4);if(!question.trim()||clean.length<2)throw new Error('A enquete precisa de uma pergunta e pelo menos duas opções.')
  const db=requireSupabase();const{data,error}=await db.from('polls').insert({thread_id:threadId,question:question.trim()}).select('id').single();if(error)throw error
  const{error:optionError}=await db.from('poll_options').insert(clean.map((label,position)=>({poll_id:data.id,label,position})));if(optionError)throw optionError
}
export async function getThreadPoll(threadId:string):Promise<PollData|null>{
  const me=uid();const db=requireSupabase();const{data:poll,error}=await db.from('polls').select('*').eq('thread_id',threadId).maybeSingle();if(error)throw error;if(!poll)return null
  const[optionsResult,votesResult]=await Promise.all([db.from('poll_options').select('*').eq('poll_id',poll.id).order('position',{ascending:true}),db.from('poll_votes').select('option_id,user_id').eq('poll_id',poll.id)])
  if(optionsResult.error)throw optionsResult.error;if(votesResult.error)throw votesResult.error
  const counts=new Map<string,number>();let mine:string|null=null;for(const vote of votesResult.data??[]){const option=String(vote.option_id);counts.set(option,(counts.get(option)??0)+1);if(String(vote.user_id)===me)mine=option}
  const options=(optionsResult.data??[]).map(o=>({id:String(o.id),label:String(o.label),position:Number(o.position),votes:counts.get(String(o.id))??0}));return{id:String(poll.id),question:String(poll.question),endsAt:poll.ends_at?String(poll.ends_at):null,options,myOptionId:mine,totalVotes:options.reduce((sum,o)=>sum+o.votes,0)}
}
export async function votePoll(pollId:string,optionId:string):Promise<void>{const me=uid();const db=requireSupabase();const{error}=await db.from('poll_votes').upsert({poll_id:pollId,option_id:optionId,user_id:me},{onConflict:'poll_id,user_id'});if(error)throw error}

export type CollaborationInvite={id:string;targetType:'thread'|'video';targetId:string;ownerId:string;collaboratorId:string;status:'pending'|'accepted'|'declined';createdAt:string}
export async function inviteCollaborator(targetType:'thread'|'video',targetId:string,username:string):Promise<void>{
  const db=requireSupabase();const normalized=username.trim().replace(/^@/,'').toLowerCase();if(!normalized)return
  const{data:profile,error:profileError}=await db.from('profiles').select('id').eq('username',normalized).maybeSingle();if(profileError)throw profileError;if(!profile)throw new Error('Não encontrei esse @usuário.');if(String(profile.id)===uid())throw new Error('Você já é autor dessa publicação.')
  const{error}=await db.from('collaborations').insert({target_type:targetType,target_id:targetId,owner_id:uid(),collaborator_id:String(profile.id)});if(error)throw error
}
export async function getCollaborationInvites():Promise<CollaborationInvite[]>{const me=uid();const db=requireSupabase();const{data,error}=await db.from('collaborations').select('*').or(`owner_id.eq.${me},collaborator_id.eq.${me}`).order('created_at',{ascending:false});if(error)throw error;return(data??[]).map(r=>({id:String(r.id),targetType:String(r.target_type) as 'thread'|'video',targetId:String(r.target_id),ownerId:String(r.owner_id),collaboratorId:String(r.collaborator_id),status:String(r.status) as CollaborationInvite['status'],createdAt:String(r.created_at)}))}
export async function respondCollaboration(id:string,accept:boolean):Promise<void>{const db=requireSupabase();const{error}=await db.rpc('respond_collaboration',{p_id:id,p_accept:accept});if(error)throw error}
export async function getAcceptedCollaborators(targetType:'thread'|'video',targetId:string):Promise<string[]>{const db=requireSupabase();const{data,error}=await db.from('collaborations').select('collaborator_id').eq('target_type',targetType).eq('target_id',targetId).eq('status','accepted');if(error)throw error;return(data??[]).map(r=>String(r.collaborator_id))}

export async function toggleProfilePin(targetType:'thread'|'video',targetId:string):Promise<boolean>{
  const me=uid();const db=requireSupabase();const{data:existing,error}=await db.from('profile_pins').select('target_id').eq('user_id',me).eq('target_type',targetType).eq('target_id',targetId).maybeSingle();if(error)throw error
  if(existing){const{error:del}=await db.from('profile_pins').delete().eq('user_id',me).eq('target_type',targetType).eq('target_id',targetId);if(del)throw del;return false}
  const{count,error:countError}=await db.from('profile_pins').select('*',{count:'exact',head:true}).eq('user_id',me);if(countError)throw countError;if((count??0)>=3)throw new Error('Você pode fixar no máximo 3 publicações no perfil.')
  const{error:insert}=await db.from('profile_pins').insert({user_id:me,target_type:targetType,target_id:targetId,position:count??0});if(insert)throw insert;return true
}
export async function getProfilePins(userId:string):Promise<Array<{targetType:'thread'|'video';targetId:string;position:number}>>{const db=requireSupabase();const{data,error}=await db.from('profile_pins').select('*').eq('user_id',userId).order('position',{ascending:true});if(error)throw error;return(data??[]).map(r=>({targetType:String(r.target_type) as 'thread'|'video',targetId:String(r.target_id),position:Number(r.position)}))}

export type PromptItem={id:string;userId:string;body:string;createdAt:string;entries:number}
export async function createPrompt(body:string):Promise<string>{const text=body.trim();if(!text)throw new Error('Escreva um prompt.');const db=requireSupabase();const{data,error}=await db.from('prompts').insert({user_id:uid(),body:text}).select('id').single();if(error)throw error;return String(data.id)}
export async function getPrompts():Promise<PromptItem[]>{const db=requireSupabase();const{data,error}=await db.from('prompts').select('*').order('created_at',{ascending:false}).limit(80);if(error)throw error;const ids=(data??[]).map(r=>String(r.id));const{data:entries,error:entryError}=ids.length?await db.from('prompt_entries').select('prompt_id').in('prompt_id',ids):{data:[],error:null};if(entryError)throw entryError;const counts=new Map<string,number>();for(const row of entries??[]){const id=String(row.prompt_id);counts.set(id,(counts.get(id)??0)+1)}return(data??[]).map(r=>({id:String(r.id),userId:String(r.user_id),body:String(r.body),createdAt:String(r.created_at),entries:counts.get(String(r.id))??0}))}
export async function addPromptEntry(promptId:string,targetType:'thread'|'video',targetId:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('prompt_entries').insert({prompt_id:promptId,user_id:uid(),target_type:targetType,target_id:targetId});if(error)throw error}
