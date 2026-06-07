/**
 * Generates a JPEG thumbnail from the first page of a PDF file.
 * Uses PDF.js v6 with a locally served worker (public/pdf.worker.min.mjs).
 */
export async function generatePdfThumbnail(file: File): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist')

  // Use local worker copied to /public
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
  const pdf  = await loadingTask.promise
  const page = await pdf.getPage(1)

  const naturalVp = page.getViewport({ scale: 1 })
  const scale     = 300 / naturalVp.width
  const vp        = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(vp.width)
  canvas.height = Math.round(vp.height)

  const ctx = canvas.getContext('2d')!

  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/jpeg',
      0.85,
    )
  })
}
