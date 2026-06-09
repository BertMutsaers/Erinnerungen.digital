const QUALITY         = 0.82
const PROFILE_SIZE    = 600
const PROFILE_QUALITY = 0.88

export interface ImageInfo {
  width:  number
  height: number
  kb:     number
}

export async function resizeImage(
  file: File,
  opts: { maxW?: number; maxH?: number } = {},
): Promise<{ blob: Blob; info: ImageInfo }> {
  const maxW = opts.maxW ?? 800
  const maxH = opts.maxH ?? 800

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')) }

    img.onload = () => {
      let w = img.width
      let h = img.height

      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) { reject(new Error('Canvas toBlob fehlgeschlagen')); return }
          resolve({ blob, info: { width: w, height: h, kb: Math.round(blob.size / 1024) } })
        },
        'image/jpeg',
        QUALITY,
      )
    }

    img.src = url
  })
}

/**
 * Resizes AND center-crops a profile photo to a square (600×600px).
 * sy is offset to 1/4 so faces (usually at top) stay visible.
 */
export async function resizeProfileImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')) }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = PROFILE_SIZE
      canvas.height = PROFILE_SIZE
      const ctx = canvas.getContext('2d')!

      const minDim = Math.min(img.width, img.height)
      const sx = (img.width  - minDim) / 2
      const sy = (img.height - minDim) / 4   // top-biased: faces stay in frame

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, PROFILE_SIZE, PROFILE_SIZE)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) { reject(new Error('Canvas toBlob fehlgeschlagen')); return }
          resolve(blob)
        },
        'image/jpeg',
        PROFILE_QUALITY,
      )
    }

    img.src = url
  })
}

/** Resize a user-account avatar to 400×400 px, center-cropped, JPEG 0.85.
 *  Only this reduced blob is uploaded — the original never leaves the browser. */
export async function resizeAvatarImage(file: File): Promise<Blob> {
  const SIZE    = 400
  const QUALITY = 0.85
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')) }
    img.onload  = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = SIZE
      canvas.height = SIZE
      const ctx    = canvas.getContext('2d')!
      const minDim = Math.min(img.width, img.height)
      const sx     = (img.width  - minDim) / 2
      const sy     = (img.height - minDim) / 2   // true center crop
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) { reject(new Error('Canvas toBlob fehlgeschlagen')); return }
          resolve(blob)
        },
        'image/jpeg',
        QUALITY,
      )
    }
    img.src = url
  })
}
