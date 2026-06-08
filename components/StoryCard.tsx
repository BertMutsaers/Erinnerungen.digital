'use client'

import Image from 'next/image'
import { Story, formatStoryDate } from '@/hooks/useStories'
import { useLongPress } from '@/hooks/useLongPress'

interface Props {
  story:       Story
  onClick:     (s: Story) => void
  onLongPress: (s: Story) => void
}

export default function StoryCard({ story, onClick, onLongPress }: Props) {
  const { handlers, pressing } = useLongPress({
    onShortPress: () => onClick(story),
    onLongPress:  () => onLongPress(story),
  })

  const preview = story.inhalt
    ? story.inhalt.replace(/\n+/g, ' ').slice(0, 160)
    : ''

  return (
    <article
      {...handlers}
      style={{
        borderRadius: 20,
        transform:  pressing ? 'scale(0.98)' : 'scale(1)',
        transition: pressing ? 'transform 200ms ease' : 'transform 150ms ease',
        cursor:     'pointer',
      }}
      className="w-full bg-white shadow-sm overflow-hidden select-none"
    >
      {/* Photo */}
      {story.fotoUrl ? (
        <div className="relative w-full" style={{ height: 180 }}>
          <Image
            src={story.fotoUrl}
            alt={story.titel}
            fill
            className="object-cover"
            sizes="430px"
            unoptimized
          />
        </div>
      ) : (
        <div
          className="w-full flex items-center justify-center"
          style={{ height: 100, background: 'linear-gradient(135deg, #F0F0F0, #E0E0E0)' }}
        >
          <span className="text-[40px] opacity-30">📖</span>
        </div>
      )}

      {/* Text */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-1.5">
        {story.tag && (
          <span
            className="self-start font-sans text-[11px] font-semibold text-white px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#111' }}
          >
            {story.tag}
          </span>
        )}
        <h3 className="font-serif font-bold text-[22px] leading-tight text-gray-900">
          {story.titel}
        </h3>
        {preview && (
          <p className="font-sans text-[14px] text-gray-500 leading-relaxed line-clamp-3">
            {preview}
          </p>
        )}
        {(story.erzaehler || story.createdAt) && (
          <p className="font-sans text-[12px] mt-0.5" style={{ color: '#707070' }}>
            {[story.erzaehler, formatStoryDate(story.createdAt)]
              .filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </article>
  )
}
