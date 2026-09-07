import { describe, expect, it } from 'vitest'
import { normalizeUsername, validateImageFile, validateUsername, validateVideoFile } from './validation'

describe('validação de publicação', () => {
  it('normaliza usernames sem caracteres perigosos', () => {
    expect(normalizeUsername('  Noah Keller!!! ')).toBe('noahkeller')
    expect(normalizeUsername('A.B_C')).toBe('a.b_c')
  })

  it('rejeita username curto', () => {
    expect(() => validateUsername('x')).toThrow(/3 e 24/)
  })

  it('aceita vídeo suportado e rejeita tipo/tamanho inválido', () => {
    expect(() => validateVideoFile({ type: 'video/mp4', size: 1024 })).not.toThrow()
    expect(() => validateVideoFile({ type: 'application/pdf', size: 1024 })).toThrow(/MP4/)
    expect(() => validateVideoFile({ type: 'video/mp4', size: 201 * 1024 * 1024 })).toThrow(/200 MB/)
  })

  it('valida imagens publicáveis', () => {
    expect(() => validateImageFile({ type: 'image/webp', size: 1024 })).not.toThrow()
    expect(() => validateImageFile({ type: 'image/svg+xml', size: 1024 })).toThrow(/JPG/)
  })
})
