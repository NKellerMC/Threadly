export const limits = {
  videoBytes: 200 * 1024 * 1024,
  imageBytes: 10 * 1024 * 1024,
  threadChars: 800,
  replyChars: 500,
  clipTitleChars: 120,
  clipDescriptionChars: 500,
} as const

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24)
}

export function validateUsername(value: string): string {
  const username = normalizeUsername(value)
  if (username.length < 3) throw new Error('O @ precisa ter entre 3 e 24 caracteres.')
  return username
}

export function validateVideoFile(file: Pick<File, 'type' | 'size'>): void {
  if (!VIDEO_TYPES.has(file.type)) throw new Error('Use MP4, WebM ou MOV.')
  if (file.size > limits.videoBytes) throw new Error('O vídeo passa de 200 MB.')
}

export function validateImageFile(file: Pick<File, 'type' | 'size'>): void {
  if (!IMAGE_TYPES.has(file.type)) throw new Error('Use JPG, PNG, WebP ou GIF.')
  if (file.size > limits.imageBytes) throw new Error('A imagem passa de 10 MB.')
}
