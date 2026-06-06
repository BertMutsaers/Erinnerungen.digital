'use client'

import Image from 'next/image'
import { Memory, CardColor } from '@/lib/types'

interface Props {
  memory: Memory
  onClick: (m: Memory) => void
}

const KATEGORIE_LABEL: Record<string, string> = {
  kindheit:    'Kindheit',
  ausbildung:  'Ausbildung',
  militaer:    'Militär',
  wanderjahre: 'Wanderjahre',
  familie:     'Familie',
  beruf:       'Bedford',
  sonstiges:   '',
}

interface ColorTokens {
  bg:         string
  titleColor: string
  metaColor:  string
  photoBg:    string
}

const COLOR_TOKENS: Record<CardColor, ColorTokens> = {
  schwarz: {
    bg:         '#1C1C1E',
    titleColor: '#FFFFFF',
    metaColor:  '#6B6B6B',
    photoBg:    '#2C2C2E',
  },
  gold: {
    bg:         '#F5F0E8',
    titleColor: '#8B6914',
    metaColor:  '#A0845C',
    photoBg:    '#EDE5D0',
  },
  rose: {
    bg:         '#FDF0F0',
    titleColor: '#9B4D4D',
    metaColor:  '#B87070',
    photoBg:    '#F5E0E0',
  },
  weiss: {
    bg:         '#FFFFFF',
    titleColor: '#111111',
    metaColor:  '#9B9B9B',
    photoBg:    '#E8E8E8',
  },
}

export default function MemoryCard({ memory, onClick }: Props) {
  const { title, imageUrl, cardSize, cardColor, datumLabel, icon, kategorie } = memory

  const isSmall  = cardSize === 'small'
  const colSpan  = isSmall ? 'col-span-1' : 'col-span-2'
  const tokens   = COLOR_TOKENS[cardColor]
  const catLabel = kategorie ? (KATEGORIE_LABEL[kategorie] ?? '') : ''

  return (
    <button
      onClick={() => onClick(memory)}
      style={{ backgroundColor: tokens.bg }}
      className={`${colSpan} overflow-hidden rounded-[18px] shadow-sm flex flex-col text-left w-full active:scale-[0.97] transition-transform duration-150`}
    >
      {/* Photo / placeholder — 58% via padding-top */}
      <div className="relative w-full" style={{ paddingTop: '58%' }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title ?? ''}
            fill
            className="object-cover"
            sizes="(max-width: 430px) 50vw, 215px"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: tokens.photoBg }}
          >
            {icon && (
              <span className={`${isSmall ? 'text-2xl' : 'text-4xl'} select-none`}>
                {icon}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Text area */}
      <div className="flex-1 px-3 py-2.5 flex flex-col gap-0.5">
        {catLabel && (
          <p
            className="text-[10px] uppercase tracking-widest font-sans"
            style={{ color: tokens.metaColor }}
          >
            {catLabel}
          </p>
        )}
        {title && (
          <p
            className={`font-serif font-semibold leading-tight ${isSmall ? 'text-[13px]' : 'text-[15px]'} line-clamp-2`}
            style={{ color: tokens.titleColor }}
          >
            {title}
          </p>
        )}
        {datumLabel && (
          <p
            className="text-[11px] font-sans mt-0.5"
            style={{ color: tokens.metaColor }}
          >
            {datumLabel}
          </p>
        )}
      </div>
    </button>
  )
}
