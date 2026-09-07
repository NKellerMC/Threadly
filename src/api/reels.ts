import { auth } from '../lib/firebase'
import { signedMediaUrl } from '../lib/media'
import { requireSupabase } from '../lib/supabase'
import type { VideoPost } from '../lib/types'
import { mapVideo } from './mappers'

async function resolveMedia(video:VideoPost):Promise<VideoPost>{const[videoUrl,thumbnailUrl]=await Promise.all([signedMediaUrl('videos',video.storagePath,video.videoUrl),signedMediaUrl('thumbnails',video.thumbnailPath,video.thumbnailUrl)]);return{...video,videoUrl,thumbnailUrl:thumbnailUrl||null}}

async function decorateVideos(videos:VideoPost[]):Promise<VideoPost[]>{
  const resolved=await Promise.all(videos.map(resolveMedia));if(!resolved.length)return resolved
  const uid=auth?.currentUser?.uid;const db=requireSupabase();const ids=resolved.map(v=>v.id);const ownerIds=[...new Set(resolved.map(v=>v.userId))]
  const [collabs,pins]=await Promise.all([
    db.from('collaborations').select('target_id,collaborator_id').eq('target_type','video').eq('status','accepted').in('target_id',ids),
    db.from('profile_pins').select('user_id,target_id').eq('target_type','video').in('user_id',ownerIds).in('target_id',ids),
  ])
  if(collabs.error)throw collabs.error;if(pins.error)throw pins.error
  const collaboratorMap=new Map<string,string[]>();for(const row of collabs.data??[]){const key=String(row.target_id);collaboratorMap.set(key,[...(collaboratorMap.get(key)??[]),String(row.collaborator_id)])}
  const pinned=new Set((pins.data??[]).map(row=>`${String(row.user_id)}:${String(row.target_id)}`))
  let enriched=resolved.map(v=>({...v,collaboratorIds:collaboratorMap.get(v.id)??[],pinned:pinned.has(`${v.userId}:${v.id}`)}))
  if(!uid)return enriched
  const[likes,saves,follows,reposts]=await Promise.all([db.from('video_likes').select('video_id').eq('user_id',uid).in('video_id',ids),db.from('bookmarks').select('video_id').eq('user_id',uid).in('video_id',ids),db.from('follows').select('following_id').eq('follower_id',uid).in('following_id',ownerIds),db.from('reposts').select('target_id').eq('user_id',uid).eq('target_type','video').in('target_id',ids)])
  if(likes.error)throw likes.error;if(saves.error)throw saves.error;if(follows.error)throw follows.error;if(reposts.error)throw reposts.error
  const liked=new Set((likes.data??[]).map(r=>String(r.video_id)));const saved=new Set((saves.data??[]).map(r=>String(r.video_id)));const following=new Set((follows.data??[]).map(r=>String(r.following_id)));const reposted=new Set((reposts.data??[]).map(r=>String(r.target_id)))
  enriched=enriched.map(v=>({...v,liked:liked.has(v.id),saved:saved.has(v.id),followingAuthor:following.has(v.userId),reposted:reposted.has(v.id)}));return enriched
}

export async function getVideos(options:{userId?:string;limit?:number}={}):Promise<VideoPost[]>{const db=requireSupabase();let query=db.from('videos_public').select('*').order('created_at',{ascending:false}).limit(options.limit??30);if(options.userId)query=query.eq('user_id',options.userId);const{data,error}=await query;if(error)throw error;return decorateVideos((data??[]).map(mapVideo))}
export async function getVideo(videoId:string):Promise<VideoPost|null>{const db=requireSupabase();const{data,error}=await db.from('videos_public').select('*').eq('id',videoId).maybeSingle();if(error)throw error;if(!data)return null;return(await decorateVideos([mapVideo(data)]))[0]}
export async function recordView(videoId:string):Promise<void>{const viewerId=auth?.currentUser?.uid;if(!viewerId)return;const sessionKey=`threadly:view:${videoId}`;if(sessionStorage.getItem(sessionKey))return;sessionStorage.setItem(sessionKey,'1');const db=requireSupabase();const{error}=await db.rpc('record_video_view',{p_video_id:videoId,p_viewer_id:viewerId});if(error)sessionStorage.removeItem(sessionKey)}
export async function getTrendingVideos(limit=24):Promise<VideoPost[]>{const db=requireSupabase();const since=new Date(Date.now()-7*86400000).toISOString();const{data,error}=await db.from('videos_public').select('*').gte('created_at',since).order('views_count',{ascending:false}).limit(limit);if(error)throw error;return decorateVideos((data??[]).map(mapVideo))}
export async function getWatchHistory():Promise<VideoPost[]>{const uid=auth?.currentUser?.uid;if(!uid)throw new Error('Sua sessão expirou. Entre novamente.');const db=requireSupabase();const{data:views,error}=await db.from('video_views').select('video_id,created_at').eq('viewer_id',uid).order('created_at',{ascending:false}).limit(80);if(error)throw error;const ids=[...new Set((views??[]).map(row=>String(row.video_id)))];if(!ids.length)return[];const{data,error:videoError}=await db.from('videos_public').select('*').in('id',ids);if(videoError)throw videoError;const index=new Map(ids.map((id,i)=>[id,i]));return decorateVideos((data??[]).map(mapVideo).sort((a,b)=>(index.get(a.id)??99)-(index.get(b.id)??99)))}
export async function getLikedVideos():Promise<VideoPost[]>{const uid=auth?.currentUser?.uid;if(!uid)throw new Error('Sua sessão expirou. Entre novamente.');const db=requireSupabase();const{data:likes,error}=await db.from('video_likes').select('video_id').eq('user_id',uid).order('created_at',{ascending:false});if(error)throw error;const ids=(likes??[]).map(row=>String(row.video_id));if(!ids.length)return[];const{data,error:videoError}=await db.from('videos_public').select('*').in('id',ids);if(videoError)throw videoError;const index=new Map(ids.map((id,i)=>[id,i]));return decorateVideos((data??[]).map(mapVideo).sort((a,b)=>(index.get(a.id)??99)-(index.get(b.id)??99)))}
