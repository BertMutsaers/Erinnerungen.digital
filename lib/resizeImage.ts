const QUALITY = 0.82

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
