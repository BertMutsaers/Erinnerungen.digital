'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { Album } from '@/hooks/useAlbums'

interface Props {
  album:       Album
  onLongPress: (a: Album) => void
  basePath?:  string
}

export default function AlbumCard({ album, onLongPress, basePath = '' }: Props) {
  const router  = useRouter()
  const [pressed, setPressed] = useState(false)
  const longTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tapStarted = useRef(false)

  function onPointerDown() {
    tapStarted.current = true
    setPressed(true)
    longTimer.current = setTimeout(() => {
      tapStarted.current = false
      setPressed(false)
      onLongPress(album)
    }, 500)
  }

  function onPointerUp() {
    clearTimeout(longTimer.current!)
    if (!tapStarted.current) return
    tapStarted.current = false
    setPressed(false)
    router.push(`/albums/${album.id}?from=${encodeURIComponent(basePath + '/media')}`)
  }

  function onPointerLeave() {
    clearTimeout(longTimer.current!)
    tapStarted.current = false
    setPressed(false)
  }

  const urls    = album.previewUrls.slice(0, 3)
  const dateStr = album.datumText?.trim() || (album.datumJahr ? String(album.datumJahr) : '')

  return (
    <div
      className="col-span-2 bg-white overflow-hidden select-none flex flex-row"
      style={{
        borderRadius: 20,
        height:     176,
        cursor:     'pointer',
        transform:  pressed ? 'scale(0.97)' : 'scale(1)',
        transition: pressed ? 'transform 150ms ease' : 'transform 150ms ease',
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
    >
      {/* ── Photo strip (45%) ── */}
      <div
        className="flex-shrink-0 flex flex-row overflow-hidden"
        style={{ width: '45%', borderRadius: '20px 0 0 20px' }}
      >
        {urls.length === 0 ? (
          <div className="flex-1 flex items-center justify-center" style={{ background: '#E8E8E8', fontSize: 24, color: '#B0B0B0' }}>
            📷
          </div>
        ) : (
          urls.map((url, i) => (
            <div
              key={i}
              className="relative flex-1 h-full"
              style={{ borderLeft: i > 0 ? '2px solid #F2F2F7' : 'none' }}
            >
              <Image src={url} alt="" fill className="object-cover object-center" sizes="60px" unoptimized />
            </div>
          ))
        )}
      </div>

      {/* ── Text area ── */}
      <div className="flex-1 flex flex-col justify-center min-w-0" style={{ padding: '14px 16px', gap: 4 }}>
        <p
          className="font-serif font-bold line-clamp-2 leading-tight"
          style={{ fontSize: 16, color: '#000', lineHeight: 1.2 }}
        >
          {album.titel}
        </p>
        <p className="font-sans" style={{ fontSize: 12, color: '#707070' }}>
          🗂️ {album.photoCount} {album.photoCount === 1 ? 'Foto' : 'Fotos'}
        </p>
        {dateStr && (
          <p className="font-sans" style={{ fontSize: 11, color: '#B0B0B0', marginTop: 2 }}>
            {dateStr}
          </p>
        )}
      </div>
    </div>
  )
}
