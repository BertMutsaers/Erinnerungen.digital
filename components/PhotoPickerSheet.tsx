'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'


interface LibraryPhoto {
  id:  string
  url: string
}

interface Props {
  open:     boolean
  albumId:  string
  bookId?:  string
  onClose:  () => void
  onAdded:  (count: number) => void
}

export default function PhotoPickerSheet({ open, albumId, onClose, onAdded, bookId }: Props) {
  const BOOK_ID = bookId
  const [photos,   setPhotos]   = useState<LibraryPhoto[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!open) { setSelected(new Set()); return }
    document.body.style.overflow = 'hidden'
    setLoading(true)
    // Load all photos NOT already in this album, and not in any other album
    supabase
      .from('media')
      .select('id, url')
      .eq('book_id', BOOK_ID)
      .eq('typ', 'foto')
      .is('album_id', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPhotos(data ?? [])
        setLoading(false)
      })
    return () => { document.body.style.overflow = '' }
  }, [open, albumId])

  if (!open) return null

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleAdd() {
    if (selected.size === 0) { onClose(); return }
    setSaving(true)
    const ids = Array.from(selected)
    await supabase.from('media').update({ album_id: albumId }).in('id', ids)
    setSaving(false)
    onAdded(ids.length)
    onClose()
  }

  const count = selected.size

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" />
      <div className="fixed inset-0 z-50 mx-auto max-w-[430px] flex flex-col bg-[#F2F2F7]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="font-sans text-[15px] text-gray-500 active:opacity-60">Abbrechen</button>
          <p className="font-sans text-[15px] font-semibold text-gray-900">Fotos auswählen</p>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="font-sans text-[15px] font-semibold active:opacity-60 disabled:opacity-40"
            style={{ color: count > 0 ? '#000' : '#999' }}
          >
            {saving ? '…' : 'Fertig'}
          </button>
        </div>

        {/* Count bar */}
        <div className="px-4 py-2 flex-shrink-0">
          <p className="font-sans text-[13px]" style={{ color: '#707070' }}>
            {count === 0 ? 'Fotos antippen um sie auszuwählen' : `${count} ${count === 1 ? 'Foto' : 'Fotos'} gewählt`}
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-3 gap-[2px]">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse" style={{ aspectRatio: '1/1' }} />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <p className="font-sans text-[15px] text-gray-400">Keine Fotos in der Bibliothek</p>
              <p className="font-sans text-[13px] text-gray-400">Lade zuerst Fotos unter Media hoch</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[2px]">
              {photos.map((photo) => {
                const isSelected = selected.has(photo.id)
                return (
                  <button
                    key={photo.id}
                    onClick={() => toggle(photo.id)}
                    className="relative select-none"
                    style={{ aspectRatio: '1/1' }}
                  >
                    <Image
                      src={photo.url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width:430px) 33vw"
                      unoptimized
                    />
                    {/* Selection overlay */}
                    {isSelected && (
                      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
                    )}
                    {/* Checkmark */}
                    <div
                      className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full"
                      style={{
                        width:       22,
                        height:      22,
                        background:  isSelected ? '#000' : 'rgba(255,255,255,0.6)',
                        border:      isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.8)',
                        transition:  '150ms ease',
                      }}
                    >
                      {isSelected && <span className="text-white" style={{ fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>

                    {/* Blue selection border */}
                    {isSelected && (
                      <div className="absolute inset-0 pointer-events-none" style={{ border: '3px solid #000' }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
