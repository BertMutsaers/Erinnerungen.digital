'use client'

import { useEffect, useRef, useState, useCallback, PointerEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { resizeProfileImage } from '@/lib/resizeImage'

interface Props {
  coverUrl?:  string
  name:       string
  years:      string
  bookId:     string
  onUploaded: (url: string) => void
  onRemoved:  () => void
  onToast:    (msg: string) => void
  readOnly?:  boolean
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default function PolaroidIntro({
  coverUrl, name, years, bookId, onUploaded, onRemoved, onToast, readOnly = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [pressed,      setPressed]      = useState(false)
  const [showSheet,    setShowSheet]    = useState(false)
  const [uploading,    setUploading]    = useState(false)

  // Development layers: start at 0, fade in during Phase 3
  const [p1Opacity,   setP1Opacity]   = useState(0)
  const [p2Opacity,   setP2Opacity]   = useState(0)

  type CameraPhase = 'eject' | 'cameraOut' | 'done'
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>('eject')

  // Controls the polaroid slide: false = hidden at –80vh, true = slides to center
  const [ejectSlid,   setEjectSlid]   = useState(false)

  // ── Timing constants ──────────────────────────────────────────────────
  // Phase 1: polaroid slides out of camera slot (8 s transition + 200 ms pre-delay)
  const EJECT_DURATION_MS = 8000
  const EJECT_START_DELAY = 200
  const EJECT_MS          = EJECT_START_DELAY + EJECT_DURATION_MS

  // Phase 2: camera exits upward after polaroid is fully out (1.2 s)
  const CAMERA_OUT_MS = 1200

  // Phase 3 (development) starts 150–300 ms after camera has gone

  const longTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Animation orchestration ───────────────────────────────────────────
  // Runs on every mount (i.e. every time the Zeitstrahl page is opened).
  useEffect(() => {
    if (!coverUrl) return

    // Phase 1: tiny pause so the browser renders the hidden start position,
    // then trigger the CSS transition that slides the polaroid into view
    const t0 = setTimeout(() => setEjectSlid(true), EJECT_START_DELAY)

    // Phase 2: camera slides upward out of view once polaroid is fully out
    const t1 = setTimeout(() => setCameraPhase('cameraOut'), EJECT_MS)
    const t2 = setTimeout(() => setCameraPhase('done'),      EJECT_MS + CAMERA_OUT_MS)

    // Phase 3: photo "develops" via two opacity transitions running in parallel
    const td1 = setTimeout(() => setP1Opacity(1), EJECT_MS + CAMERA_OUT_MS + 150)
    const td2 = setTimeout(() => setP2Opacity(1), EJECT_MS + CAMERA_OUT_MS + 300)

    return () => {
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2)
      clearTimeout(td1); clearTimeout(td2)
    }
  }, [coverUrl])

  // ── Long-press (opens action sheet) ──────────────────────────────────
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

  // ── Upload ────────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setShowSheet(false)
    if (file.size > 10 * 1024 * 1024) { onToast('Bild zu groß — max. 10MB'); return }

    setUploading(true)
    try {
      const blob = await resizeProfileImage(file)
      const path = `${bookId}/profile.jpg`
      const { error: upErr } = await supabase.storage
        .from('profile-photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw new Error(upErr.message)

      const { data } = supabase.storage.from('profile-photos').getPublicUrl(path)
      // Store URL with cache-buster so the next page load picks up the new image
      // without the browser serving the old cached file from the same path.
      const urlWithBuster = `${data.publicUrl}?v=${Date.now()}`
      const { error: dbErr } = await supabase.from('books')
        .update({ cover_url: urlWithBuster }).eq('id', bookId)
      if (dbErr) throw new Error(dbErr.message)
      await supabase.from('projects').update({ cover_url: urlWithBuster }).eq('id', bookId)

      onUploaded(urlWithBuster)
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
        {/* ── Phase 1 & 2: Camera (fixed at viewport top) ────────────── */}
        {cameraPhase !== 'done' && (
          <img
            src="/polaroid-kamera2.png"
            alt=""
            style={{
              position:   'fixed',
              top:        0,
              left:       '50%',
              // Slight left offset so the camera's output slot is centered over the polaroid
              transform:  cameraPhase === 'cameraOut'
                ? `translateX(calc(-50% - 8px)) translateY(-110%)`
                : `translateX(calc(-50% - 8px)) translateY(0)`,
              width:      'min(117vw, 506px)',
              zIndex:     100,
              transition: cameraPhase === 'cameraOut'
                ? `transform ${CAMERA_OUT_MS}ms ease-in`
                : 'none',
            }}
          />
        )}

        {/* ── Polaroid frame ─────────────────────────────────────────── */}
        <div style={{ position: 'relative', width: '88vw', maxWidth: 380 }}>
          <div
            onPointerDown={readOnly ? undefined : onPointerDown}
            onPointerUp={readOnly ? undefined : () => cancelPress()}
            onPointerLeave={readOnly ? undefined : () => cancelPress()}
            onPointerCancel={readOnly ? undefined : () => cancelPress()}
            style={{
              background: '#FFFFFF',
              padding:    '16px 16px 52px 16px',
              boxShadow:  '0 4px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.10)',
              width:      '100%',
              // Phase 1: start hidden above viewport, CSS transition slides it to center
              transform:  !ejectSlid && cameraPhase === 'eject'
                ? `translateY(-80vh)`
                : pressed ? 'scale(0.97)' : 'scale(1)',
              transition: cameraPhase === 'eject'
                ? `transform ${EJECT_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
                : pressed ? 'transform 200ms ease' : 'transform 150ms ease',
              willChange: cameraPhase === 'eject' ? 'transform' : 'auto',
              cursor:     'pointer',
              userSelect: 'none',
              zIndex:     1,
            }}
          >
            {/* Photo area */}
            <div style={{ aspectRatio: '1/1', overflow: 'hidden', position: 'relative' }}>
              {coverUrl ? (
                <>
                  {/*
                    Phase 3: Three stacked image layers with different filters.
                    Base is always visible (washed out). P1 and P2 fade in via
                    CSS transition to simulate chemical photo development.
                  */}
                  {([
                    // Base: overexposed/washed-out starting state
                    { filter: 'brightness(2.6) contrast(0.15) saturate(0) sepia(0.5)', opacity: 1,        transition: 'none' },
                    // P1: mid-development tone, fades in over 20 s
                    { filter: 'brightness(1.3) contrast(0.7) saturate(0.6) sepia(0.15)', opacity: p1Opacity, transition: 'opacity 20s ease-out' },
                    // P2: fully developed / normal image, fades in over 28 s
                    { filter: 'none',                                                     opacity: p2Opacity, transition: 'opacity 28s ease-out' },
                  ] as const).map((layerStyle, i) => (
                    <img
                      key={i}
                      src={coverUrl}
                      alt=""
                      style={{
                        position:       i === 0 ? 'relative' : 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        width:          '100%',
                        height:         '100%',
                        objectFit:      'cover',
                        objectPosition: 'center top',
                        display:        'block',
                        ...layerStyle,
                      }}
                    />
                  ))}
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
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
        </div>

        {!coverUrl && (
          <p style={{ fontFamily: 'system-ui', fontSize: 11, color: '#B0B0B0', marginTop: 12, textAlign: 'center' }}>
            Drücke länger um ein Foto hinzuzufügen
          </p>
        )}

        <p style={{ fontFamily: 'system-ui', fontSize: 13, color: 'rgba(0,0,0,0.35)', marginTop: coverUrl ? 20 : 10, letterSpacing: '0.15em' }}>
          {years}
        </p>

        <div className="absolute bottom-8 animate-bounce" style={{ color: 'rgba(0,0,0,0.25)', fontSize: 20 }}>↓</div>
      </div>

      {!readOnly && <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />}

      {!readOnly && showSheet && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] pb-4 px-4">
            <div className="bg-white rounded-[18px] overflow-hidden shadow-xl mb-3">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[13px] font-sans font-semibold text-gray-400 text-center">Profilfoto ändern</p>
              </div>
              <button onClick={() => { setShowSheet(false); setTimeout(() => fileRef.current?.click(), 50) }}
                className="w-full px-4 py-4 text-left font-sans text-[16px] text-gray-900 flex items-center gap-3 active:bg-gray-50">
                <span>📷</span> Neues Foto wählen
              </button>
              {coverUrl && (
                <>
                  <div className="h-px bg-gray-100 mx-4" />
                  <button onClick={handleRemove}
                    className="w-full px-4 py-4 text-left font-sans text-[16px] text-red-500 flex items-center gap-3 active:bg-red-50">
                    <span>🗑️</span> Foto entfernen
                  </button>
                </>
              )}
            </div>
            <button onClick={() => setShowSheet(false)}
              className="w-full py-4 bg-white rounded-[18px] font-sans font-semibold text-[16px] text-gray-900 active:opacity-70">
              Abbrechen
            </button>
          </div>
        </>
      )}
    </>
  )
}
