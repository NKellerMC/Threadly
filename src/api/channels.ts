import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'

function uid(){const id=auth?.currentUser?.uid;if(!id)throw new Error('Sua sessão expirou.');return id}

export async function deleteChannelPost(postId:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('channel_posts').delete().eq('id',postId).eq('user_id',uid());if(error)throw error}
export async function deleteChannel(channelId:string):Promise<void>{const db=requireSupabase();const{error}=await db.from('channels').delete().eq('id',channelId).eq('owner_id',uid());if(error)throw error}
