'use client'

import { useEffect, useRef } from 'react'
import { MediaItem } from '@/hooks/useMedia'
import { getVideoEmbed } from '@/hooks/useMedia'

interface Props {
  item:    MediaItem | null
  onClose: () => void
}

export default function VideoPlayerSheet({ item, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const embedUrl = item ? getVideoEmbed(item.url) : null

  // Stop video on close by blanking the src
  useEffect(() => {
    if (!item && iframeRef.current) {
      iframeRef.current.src = ''
    }
  }, [item])

  useEffect(() => {
    if (item) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [item])

  if (!item || !embedUrl) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px]"
        style={{ borderRadius: '18px 18px 0 0', overflow: 'hidden', background: '#000' }}
      >
        {/* Video: 16:9 */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{
              position:     'absolute',
              inset:        0,
              width:        '100%',
              height:       '100%',
              border:       'none',
              borderRadius: '18px 18px 0 0',
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 flex items-center justify-center rounded-full font-sans font-bold text-white"
            style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.6)', fontSize: 16 }}
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        {/* Title */}
        {item.titel && (
          <div className="px-4 py-3 bg-[#111]">
            <p className="font-sans text-[15px] font-medium text-white truncate">
              {item.titel}
            </p>
            {item.datumJahr && (
              <p className="font-sans text-[12px] text-gray-400 mt-0.5">{item.datumJahr}</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
