import type { ChatMessage, Comment, ConversationSummary, NotificationItem, Profile, ThreadPost, VideoPost } from './types'

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

export const demoProfiles: Profile[] = [
  { id:'demo-noah', username:'noahk', displayName:'Noah Keller', bio:'Histórias, tecnologia e ideias que ainda não decidiram o que querem ser.', followers:1842, following:318, avatarUrl:null },
  { id:'demo-maya', username:'mayaluz', displayName:'Maya Luz', bio:'Fotografia, som ambiente e zero paciência para trend reciclada.', followers:12940, following:412, avatarUrl:null },
  { id:'demo-lucas', username:'lucasframes', displayName:'Lucas Frames', bio:'Filmo cidades quando elas param de tentar parecer bonitas.', followers:8870, following:221, avatarUrl:null },
  { id:'demo-sarah', username:'sarahc', displayName:'Sarah Chapman', bio:'Design, cultura e pequenas obsessões.', followers:5270, following:396, avatarUrl:null },
]

export const demoThreads: ThreadPost[] = [
  { id:'t1', userId:'demo-noah', username:'noahk', displayName:'Noah Keller',
    body:'A melhor rede social é aquela em que você lembra do que leu depois de fechar o app.',
    createdAt:ago(8), likes:184, replies:23 },
  { id:'t2', userId:'demo-maya', username:'mayaluz', displayName:'Maya Luz',
    body:'Hot take: descobrir coisa nova é melhor do que ser perseguido pelo mesmo algoritmo por três semanas.',
    imageUrl:'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    createdAt:ago(37), likes:913, replies:76 },
  { id:'t3', userId:'demo-lucas', username:'lucasframes', displayName:'Lucas Frames',
    body:'Gravei isso andando sem roteiro. O algoritmo provavelmente vai odiar. Ótimo sinal.',
    createdAt:ago(91), likes:352, replies:41 },
  { id:'t4', userId:'demo-sarah', username:'sarahc', displayName:'Sarah Chapman',
    body:'Interfaces boas não precisam gritar “olha como eu sou diferente”. Elas só param de atrapalhar.',
    createdAt:ago(160), likes:604, replies:58 },
]

export const demoVideos: VideoPost[] = [
  { id:'v1', userId:'demo-maya', username:'mayaluz', displayName:'Maya Luz',
    title:'Um minuto longe do ruído', description:'Sem trend. Sem texto gigante. Só isso.',
    videoUrl:'https://videos.pexels.com/video-files/3129957/3129957-hd_1080_1920_25fps.mp4',
    createdAt:ago(18), likes:2401, comments:128, views:18043 },
  { id:'v2', userId:'demo-lucas', username:'lucasframes', displayName:'Lucas Frames',
    title:'Cidade depois da chuva', description:'Som ligado melhora muito.',
    videoUrl:'https://videos.pexels.com/video-files/853800/853800-hd_1920_1080_30fps.mp4',
    createdAt:ago(67), likes:1288, comments:64, views:9407 },
  { id:'v3', userId:'demo-sarah', username:'sarahc', displayName:'Sarah Chapman',
    title:'Luz que muda a sala', description:'Quarenta segundos, nenhuma fala.',
    videoUrl:'https://videos.pexels.com/video-files/2795405/2795405-hd_1920_1080_25fps.mp4',
    createdAt:ago(190), likes:874, comments:39, views:7220 },
]

export const demoComments: Comment[] = [
  { id:'c1', videoId:'v1', userId:'demo-lucas', username:'lucasframes', displayName:'Lucas Frames', body:'O som dessa rua é metade do vídeo.', createdAt:ago(7) },
  { id:'c2', videoId:'v1', userId:'demo-sarah', username:'sarahc', displayName:'Sarah Chapman', body:'Finalmente um vídeo que não me manda “esperar até o final”.', createdAt:ago(4) },
]

export const demoNotifications: NotificationItem[] = [
  { id:'n1', type:'like', actorId:'demo-maya', actorUsername:'mayaluz', actorDisplayName:'Maya Luz', text:'curtiu sua thread.', createdAt:ago(12), read:false },
  { id:'n2', type:'follow', actorId:'demo-lucas', actorUsername:'lucasframes', actorDisplayName:'Lucas Frames', text:'começou a seguir você.', createdAt:ago(41), read:false },
  { id:'n3', type:'comment', actorId:'demo-sarah', actorUsername:'sarahc', actorDisplayName:'Sarah Chapman', text:'respondeu ao seu clip.', createdAt:ago(125), read:true },
  { id:'n4', type:'mention', actorId:'demo-maya', actorUsername:'mayaluz', actorDisplayName:'Maya Luz', text:'mencionou você em uma conversa.', createdAt:ago(1440), read:true },
]

export const demoConversations: ConversationSummary[] = [
  { id:'chat-maya', participantId:'demo-maya', participantUsername:'mayaluz', participantName:'Maya Luz', lastMessage:'Esse layout ficou muito mais limpo.', lastMessageAt:ago(5), unread:2 },
  { id:'chat-lucas', participantId:'demo-lucas', participantUsername:'lucasframes', participantName:'Lucas Frames', lastMessage:'Te mando o vídeo bruto depois.', lastMessageAt:ago(74), unread:0 },
  { id:'chat-sarah', participantId:'demo-sarah', participantUsername:'sarahc', participantName:'Sarah Chapman', lastMessage:'Acho que a busca finalmente está boa.', lastMessageAt:ago(900), unread:0 },
]

export const demoMessages: Record<string, ChatMessage[]> = {
  'chat-maya': [
    { id:'m1', conversationId:'chat-maya', senderId:'demo-noah', body:'Você viu a nova tela de explorar?', createdAt:ago(16) },
    { id:'m2', conversationId:'chat-maya', senderId:'demo-maya', body:'Vi. Agora parece produto, não wireframe.', createdAt:ago(11) },
    { id:'m3', conversationId:'chat-maya', senderId:'demo-maya', body:'Esse layout ficou muito mais limpo.', createdAt:ago(5) },
  ],
}
