'use client'

import { useEffect, useRef, useState, useCallback, PointerEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { resizeImage } from '@/lib/resizeImage'

interface Props {
  coverUrl?:  string
  name:       string
  years:      string
  bookId:     string
  onUploaded: (url: string) => void
  onRemoved:  () => void
  onToast:    (msg: string) => void
}

const DURATION   = 25_000
const CANVAS_PX  = 600

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default function PolaroidIntro({
  coverUrl, name, years, bookId, onUploaded, onRemoved, onToast,
}: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const fileRef    = useRef<HTMLInputElement>(null)

  // Long-press state
  const [pressed,        setPressed]        = useState(false)
  const [showSheet,      setShowSheet]      = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const longTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Canvas photo development ────────────────────────────────────────
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    const canvas = canvasRef.current
    if (!canvas || !coverUrl) return

    const ctx = canvas.getContext('2d')!
    canvas.width  = CANVAS_PX
    canvas.height = CANVAS_PX

    const seen = typeof sessionStorage !== 'undefined' &&
                 sessionStorage.getItem('polaroid-seen') === '1'

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = coverUrl

    img.onload = () => {
      if (seen) { ctx.drawImage(img, 0, 0, CANVAS_PX, CANVAS_PX); return }

      let startTime: number | null = null

      function frame(now: number) {
        if (!startTime) startTime = now
        const progress = Math.min((now - startTime) / DURATION, 1)
        const S = CANVAS_PX

        ctx.clearRect(0, 0, S, S)
        const sat = progress < 0.8 ? 1 + (1 - progress / 0.8) * 0.35 : 1
        ctx.filter = `saturate(${sat})`
        ctx.drawImage(img, 0, 0, S, S)
        ctx.filter = 'none'

        if (progress < 1) {
          if (progress < 0.2) {
            ctx.fillStyle = 'rgba(255,251,234,1)'
            ctx.fillRect(0, 0, S, S)
            for (let i = 0; i < 300; i++) {
              const a = 0.02 + Math.random() * 0.05
              ctx.fillStyle = `rgba(${160 + Math.random()*60},${140 + Math.random()*40},${110 + Math.random()*30},${a})`
              ctx.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5)
            }
          } else {
            const t      = progress < 0.8 ? (progress - 0.2) / 0.6 : 1
            const revealY = t * S
            const creamA  = progress < 0.9 ? 1 : (1 - progress) / 0.1
            if (creamA > 0) {
              ctx.fillStyle = `rgba(255,251,234,${creamA})`
              ctx.fillRect(0, revealY, S, S - revealY)
            }
            if (t > 0 && t < 1 && progress < 0.9) {
              const g = ctx.createLinearGradient(0, revealY - 50, 0, revealY + 10)
              g.addColorStop(0, 'rgba(255,255,248,0)')
              g.addColorStop(0.55, 'rgba(255,255,252,0.75)')
              g.addColorStop(1, 'rgba(255,255,248,0)')
              ctx.fillStyle = g
              ctx.fillRect(0, revealY - 50, S, 60)
            }
          }
          rafRef.current = requestAnimationFrame(frame)
        } else {
          if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('polaroid-seen', '1')
        }
      }
      rafRef.current = requestAnimationFrame(frame)
    }

    return () => cancelAnimationFrame(rafRef.current)
  }, [coverUrl])

  // ── Long-press handlers ─────────────────────────────────────────────
  const cancelPress = useCallback(() => {
    if (scaleTimer.current) clearTimeout(scaleTimer.current)
    if (longTimer.current)  clearTimeout(longTimer.current)
    setPressed(false)
  }, [])

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    scaleTimer.current = setTimeout(() => setPressed(true), 300)
    longTimer.current  = setTimeout(() => {
      setPressed(false)
      if (navigator.vibrate) navigator.vibrate(40)
      setShowSheet(true)
    }, 500)
  }

  // ── Upload logic ────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setShowSheet(false)
    if (file.size > 10 * 1024 * 1024) { onToast('Bild zu groß — max. 10MB'); return }

    setUploading(true)
    try {
      const { blob } = await resizeImage(file, { maxW: 1200, maxH: 800 })
      const path = `${bookId}/profile.jpg`
      const { error: upErr } = await supabase.storage
        .from('profile-photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw new Error(upErr.message)

      const { data } = supabase.storage.from('profile-photos').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('books')
        .update({ cover_url: data.publicUrl }).eq('id', bookId)
      if (dbErr) throw new Error(dbErr.message)

      // Reset session so development animation plays again
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('polaroid-seen')

      onUploaded(`${data.publicUrl}?t=${Date.now()}`)
      onToast('✓ Profilfoto gespeichert')
    } catch (err) {
      onToast('Fehler: ' + String(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemove() {
    setShowSheet(false)
    try {
      await supabase.storage.from('profile-photos').remove([`${bookId}/profile.jpg`])
      await supabase.from('books').update({ cover_url: null }).eq('id', bookId)
      onRemoved()
      onToast('Foto entfernt')
    } catch (err) { onToast('Fehler: ' + String(err)) }
  }

  return (
    <>
      <div
        className="relative flex flex-col items-center justify-center"
        style={{ height: '100vh', backgroundColor: '#F2F2F7' }}
      >
        {/* ── Polaroid frame ────────────────────────────────────────── */}
        <div
          onPointerDown={onPointerDown}
          onPointerUp={() => cancelPress()}
          onPointerLeave={() => cancelPress()}
          onPointerCancel={() => cancelPress()}
          style={{
            background: '#FFFFFF',
            padding:    '16px 16px 52px 16px',
            boxShadow:  '0 4px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.10)',
            width:      '88vw',
            maxWidth:   380,
            transform:  pressed ? 'scale(0.97)' : 'scale(1)',
            transition: pressed ? 'transform 200ms ease' : 'transform 150ms ease',
            cursor:     'pointer',
            userSelect: 'none',
          }}
        >
          {/* Photo area */}
          <div style={{ aspectRatio: '1/1', overflow: 'hidden', position: 'relative' }}>
            {coverUrl ? (
              <>
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
                {uploading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 13, fontFamily: 'system-ui' }}>Hochladen …</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ width: '100%', paddingTop: '100%', position: 'relative', backgroundColor: '#F5F0E8' }}>
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display, serif', fontSize: 48, fontWeight: 700, color: '#9A8A78' }}>
                  {getInitials(name)}
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 15, fontStyle: 'italic', color: '#3C3C3E', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
            {name}
          </p>
        </div>

        {/* Hint when no photo */}
        {!coverUrl && (
          <p style={{ fontFamily: 'system-ui', fontSize: 11, color: '#B0B0B0', marginTop: 12, textAlign: 'center' }}>
            Drücke länger um ein Foto hinzuzufügen
          </p>
        )}

        {/* Years */}
        <p style={{ fontFamily: 'system-ui', fontSize: 13, color: 'rgba(0,0,0,0.35)', marginTop: coverUrl ? 20 : 10, letterSpacing: '0.15em' }}>
          {years}
        </p>

        {/* Scroll hint */}
        <div className="absolute bottom-8 animate-bounce" style={{ color: 'rgba(0,0,0,0.25)', fontSize: 20 }}>↓</div>
      </div>

      {/* ── Hidden file input ────────────────────────────────────────── */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* ── Action Sheet ─────────────────────────────────────────────── */}
      {showSheet && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] pb-4 px-4">
            <div className="bg-white rounded-[18px] overflow-hidden shadow-xl mb-3">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[13px] font-sans font-semibold text-gray-400 text-center">Profilfoto ändern</p>
              </div>
              <button
                onClick={() => { setShowSheet(false); setTimeout(() => fileRef.current?.click(), 50) }}
                className="w-full px-4 py-4 text-left font-sans text-[16px] text-gray-900 flex items-center gap-3 active:bg-gray-50"
              >
                <span>📷</span> Neues Foto wählen
              </button>
              {coverUrl && (
                <>
                  <div className="h-px bg-gray-100 mx-4" />
                  <button
                    onClick={handleRemove}
                    className="w-full px-4 py-4 text-left font-sans text-[16px] text-red-500 flex items-center gap-3 active:bg-red-50"
                  >
                    <span>🗑️</span> Foto entfernen
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setShowSheet(false)}
              className="w-full py-4 bg-white rounded-[18px] font-sans font-semibold text-[16px] text-gray-900 active:opacity-70"
            >
              Abbrechen
            </button>
          </div>
        </>
      )}
    </>
  )
}
