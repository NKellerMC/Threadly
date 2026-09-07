import { requireSupabase } from '../lib/supabase'
import { validateVideoFile } from '../lib/validation'

function extension(file: File, fallback: string) {
  const found = file.name.split('.').pop()?.toLowerCase()
  return found && /^[a-z0-9]+$/.test(found) ? found : fallback
}

async function thumbnailFromVideo(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url
    const cleanup = () => URL.revokeObjectURL(url)
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(Math.max(video.duration * .12, .1), 1.5)
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      const maxWidth = 720
      const scale = Math.min(1, maxWidth / Math.max(1, video.videoWidth))
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) { cleanup(); resolve(null); return }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => { cleanup(); resolve(blob) }, 'image/jpeg', .82)
    }
    video.onerror = () => { cleanup(); resolve(null) }
    setTimeout(() => { if (video.readyState < 1) { cleanup(); resolve(null) } }, 8_000)
  })
}

export async function publishVideo(params: {
  userId: string
  file: File
  title: string
  description: string
  onProgress?: (status: string) => void
}): Promise<void> {
  validateVideoFile(params.file)
  const db = requireSupabase()
  const safeUid = params.userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const id = crypto.randomUUID()
  const videoPath = `${safeUid}/${id}.${extension(params.file, 'mp4')}`
  params.onProgress?.('Preparando miniatura…')
  const thumbnail = await thumbnailFromVideo(params.file)

  params.onProgress?.('Enviando vídeo…')
  const { error: uploadError } = await db.storage.from('videos').upload(videoPath, params.file, {
    cacheControl: '3600', upsert: false, contentType: params.file.type || 'video/mp4',
  })
  if (uploadError) throw uploadError

  let thumbnailUrl: string | null = null
  let thumbnailPath: string | null = null
  try {
    if (thumbnail) {
      thumbnailPath = `${safeUid}/${id}.jpg`
      const { error } = await db.storage.from('thumbnails').upload(thumbnailPath, thumbnail, { cacheControl:'86400', upsert:false, contentType:'image/jpeg' })
      if (!error) thumbnailUrl = db.storage.from('thumbnails').getPublicUrl(thumbnailPath).data.publicUrl
    }
    const videoUrl = db.storage.from('videos').getPublicUrl(videoPath).data.publicUrl
    params.onProgress?.('Publicando…')
    const { error: insertError } = await db.from('videos').insert({
      user_id: params.userId,
      title: params.title,
      description: params.description,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      storage_path: videoPath,
      thumbnail_path: thumbnailPath,
    })
    if (insertError) throw insertError
  } catch (error) {
    await db.storage.from('videos').remove([videoPath])
    if (thumbnailPath) await db.storage.from('thumbnails').remove([thumbnailPath])
    throw error
  }
}
