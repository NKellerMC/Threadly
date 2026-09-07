import type { MediaEditState } from './types'

export const DEFAULT_MEDIA_EDIT: MediaEditState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  rotate: 0,
  aspect: 'original',
  trimStart: 0,
  trimEnd: null,
  text: '',
  textSize: 42,
  textY: 82,
  sticker: '',
  stickerSize: 64,
  stickerX: 82,
  stickerY: 18,
}

export function editCssFilter(state: MediaEditState): string {
  const warmSepia = Math.max(0, state.warmth) / 100 * 0.22
  const coolHue = Math.max(0, -state.warmth) / 100 * -10
  return `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%) sepia(${warmSepia}) hue-rotate(${coolHue}deg)`
}

function targetRatio(aspect: MediaEditState['aspect']): number | null {
  if (aspect === '1:1') return 1
  if (aspect === '4:5') return 4 / 5
  if (aspect === '9:16') return 9 / 16
  if (aspect === '16:9') return 16 / 9
  return null
}

function cropRect(width: number, height: number, aspect: MediaEditState['aspect']) {
  const ratio = targetRatio(aspect)
  if (!ratio) return { x: 0, y: 0, width, height }
  const source = width / height
  if (source > ratio) {
    const w = height * ratio
    return { x: (width - w) / 2, y: 0, width: w, height }
  }
  const h = width / ratio
  return { x: 0, y: (height - h) / 2, width, height: h }
}

function drawOverlays(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, state: MediaEditState) {
  if (state.warmth !== 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    ctx.globalAlpha = Math.min(.22, Math.abs(state.warmth) / 100 * .22)
    ctx.fillStyle = state.warmth > 0 ? '#ff9b54' : '#5b86ff'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  const text = state.text?.trim()
  if (text) {
    const size = Math.max(18, Math.min(120, state.textSize ?? 42))
    const y = height * Math.max(0, Math.min(100, state.textY ?? 82)) / 100
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${size}px Inter, system-ui, sans-serif`
    ctx.lineWidth = Math.max(3, size * .09)
    ctx.strokeStyle = 'rgba(0,0,0,.72)'
    ctx.fillStyle = '#fff'
    ctx.strokeText(text, width / 2, y, width * .9)
    ctx.fillText(text, width / 2, y, width * .9)
    ctx.restore()
  }

  const sticker = state.sticker?.trim()
  if (sticker) {
    const size = Math.max(24, Math.min(180, state.stickerSize ?? 64))
    const x = width * Math.max(0, Math.min(100, state.stickerX ?? 82)) / 100
    const y = height * Math.max(0, Math.min(100, state.stickerY ?? 18)) / 100
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${size}px sans-serif`
    ctx.fillText(sticker, x, y)
    ctx.restore()
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = .92): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível renderizar a imagem.')), type, quality))
}

export async function renderEditedImage(file: File, state: MediaEditState): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const rotated = state.rotate === 90 || state.rotate === 270
  const baseW = rotated ? bitmap.height : bitmap.width
  const baseH = rotated ? bitmap.width : bitmap.height
  const crop = cropRect(baseW, baseH, state.aspect)
  const max = 1800
  const scale = Math.min(1, max / Math.max(crop.width, crop.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(crop.width * scale))
  canvas.height = Math.max(1, Math.round(crop.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não disponibilizou o editor de imagem.')

  const stage = document.createElement('canvas')
  stage.width = baseW
  stage.height = baseH
  const sctx = stage.getContext('2d')
  if (!sctx) throw new Error('Seu navegador não disponibilizou o editor de imagem.')
  sctx.save()
  sctx.translate(baseW / 2, baseH / 2)
  sctx.rotate(state.rotate * Math.PI / 180)
  sctx.filter = editCssFilter(state)
  sctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  sctx.restore()

  ctx.drawImage(stage, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
  drawOverlays(ctx, canvas.width, canvas.height, state)
  bitmap.close()
  const blob = await canvasBlob(canvas)
  const stem = file.name.replace(/\.[^.]+$/, '') || 'threadly'
  return new File([blob], `${stem}-threadly.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

export async function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => { const duration = Number.isFinite(video.duration) ? video.duration : 0; URL.revokeObjectURL(url); resolve(duration) }
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler este vídeo.')) }
    video.src = url
  })
}

export async function renderEditedVideo(file: File, state: MediaEditState, onProgress?: (progress: number) => void): Promise<File> {
  const media = await import('mediabunny')
  const { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp4OutputFormat, BufferTarget, Quality } = media
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
  const videoTrack = await input.getPrimaryVideoTrack()
  if (!videoTrack) throw new Error('O arquivo não possui uma faixa de vídeo editável.')
  const rawW = await videoTrack.getDisplayWidth()
  const rawH = await videoTrack.getDisplayHeight()
  const rotated = state.rotate === 90 || state.rotate === 270
  const displayW = rotated ? rawH : rawW
  const displayH = rotated ? rawW : rawH
  const crop = cropRect(displayW, displayH, state.aspect)
  const maxSide = 1080
  const scale = Math.min(1, maxSide / Math.max(crop.width, crop.height))
  const outW = Math.max(2, Math.round(crop.width * scale / 2) * 2)
  const outH = Math.max(2, Math.round(crop.height * scale / 2) * 2)
  const target = new BufferTarget()
  const output = new Output({ format: new Mp4OutputFormat(), target })
  const duration = await input.computeDuration()
  const start = Math.max(0, Math.min(state.trimStart || 0, Math.max(0, duration - .05)))
  const end = state.trimEnd == null ? duration : Math.max(start + .05, Math.min(state.trimEnd, duration))

  const conversion = await Conversion.init({
    input,
    output,
    trim: { start, end },
    video: {
      rotate: state.rotate,
      crop: { left: crop.x, top: crop.y, width: crop.width, height: crop.height },
      width: outW,
      height: outH,
      fit: 'fill',
      forceTranscode: true,
      quality: new Quality('high'),
      hardwareAcceleration: 'prefer-hardware',
      process: (sample: any) => {
        const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(outW, outH) : document.createElement('canvas')
        canvas.width = outW
        canvas.height = outH
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
        if (!ctx) return sample
        ctx.filter = editCssFilter(state)
        sample.draw(ctx, 0, 0, outW, outH)
        ctx.filter = 'none'
        drawOverlays(ctx, outW, outH, state)
        return canvas
      },
      processedWidth: outW,
      processedHeight: outH,
    },
    audio: { quality: new Quality('high') },
  })
  conversion.onProgress = progress => onProgress?.(progress)
  await conversion.execute()
  const buffer = target.buffer
  input.dispose()
  if (!buffer) throw new Error('O editor não conseguiu gerar o vídeo final.')
  const stem = file.name.replace(/\.[^.]+$/, '') || 'clip'
  return new File([buffer], `${stem}-threadly.mp4`, { type: 'video/mp4', lastModified: Date.now() })
}

export async function renderEditedMedia(file: File, state: MediaEditState, onProgress?: (progress: number) => void): Promise<File> {
  if (file.type.startsWith('image/')) return renderEditedImage(file, state)
  if (file.type.startsWith('video/')) return renderEditedVideo(file, state, onProgress)
  throw new Error('Este tipo de arquivo não é compatível com o editor.')
}
