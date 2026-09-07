import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { Comment } from '../lib/types'
import { mapComment } from './mappers'

function uid(){const id=auth?.currentUser?.uid;if(!id)throw new Error('Sua sessão expirou. Entre novamente.');return id}

export async function getVideoComments(videoId:string):Promise<Comment[]>{const me=uid();const db=requireSupabase();const{data,error}=await db.from('video_comments_public').select('*').eq('video_id',videoId).order('pinned_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:true}).limit(200);if(error)throw error;const comments=(data??[]).map(mapComment);if(!comments.length)return comments;const{data:likes,error:likeError}=await db.from('video_comment_likes').select('comment_id').eq('user_id',me).in('comment_id',comments.map(c=>c.id));if(likeError)throw likeError;const liked=new Set((likes??[]).map(r=>String(r.comment_id)));return comments.map(c=>({...c,liked:liked.has(c.id)}))}

export async function addVideoComment(videoId:string,body:string,replyToId?:string|null):Promise<Comment>{const me=uid();const text=body.trim();if(!text)throw new Error('Escreva um comentário.');const db=requireSupabase();const{data,error}=await db.from('video_comments').insert({video_id:videoId,user_id:me,body:text,reply_to_id:replyToId??null}).select('id').single();if(error)throw error;const{data:row,error:readError}=await db.from('video_comments_public').select('*').eq('id',data.id).single();if(readError)throw readError;return mapComment(row)}

export async function toggleCommentLike(commentId:string,liked:boolean):Promise<boolean>{const me=uid();const db=requireSupabase();if(liked){const{error}=await db.from('video_comment_likes').delete().eq('comment_id',commentId).eq('user_id',me);if(error)throw error;return false}const{error}=await db.from('video_comment_likes').insert({comment_id:commentId,user_id:me});if(error)throw error;return true}
export async function editVideoComment(commentId:string,body:string):Promise<void>{const text=body.trim();if(!text)throw new Error('O comentário não pode ficar vazio.');const db=requireSupabase();const{error}=await db.from('video_comments').update({body:text,edited_at:new Date().toISOString()}).eq('id',commentId).eq('user_id',uid());if(error)throw error}
export async function deleteVideoComment(commentId:string):Promise<void>{uid();const db=requireSupabase();const{error}=await db.from('video_comments').delete().eq('id',commentId);if(error)throw error}
export async function pinVideoComment(commentId:string,pinned:boolean):Promise<void>{const db=requireSupabase();const{error}=await db.rpc('pin_video_comment',{p_comment_id:commentId,p_pin:!pinned});if(error)throw error}
