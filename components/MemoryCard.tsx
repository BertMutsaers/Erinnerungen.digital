'use client'

import Image from 'next/image'
import { Memory, CardColor } from '@/lib/types'
import { useLongPress } from '@/hooks/useLongPress'

interface Props {
  memory:      Memory
  onClick:     (m: Memory) => void
  onLongPress: (m: Memory) => void
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
  bg:        string
  titleColor:string
  metaColor: string
  photoBg:   string
}

const COLOR_TOKENS: Record<CardColor, ColorTokens> = {
  schwarz: { bg: '#1C1C1E', titleColor: '#FFFFFF', metaColor: 'rgba(255,255,255,0.6)', photoBg: '#2C2C2E' },
  gold:    { bg: '#F5F0E8', titleColor: '#8B6914', metaColor: '#A0845C', photoBg: '#EDE5D0' },
  rose:    { bg: '#FDF0F0', titleColor: '#9B4D4D', metaColor: '#B87070', photoBg: '#F5E0E0' },
  blau:    { bg: '#F0F4FF', titleColor: '#2A4080', metaColor: '#6B82B8', photoBg: '#DDE5FF' },
  weiss:   { bg: '#FFFFFF', titleColor: '#111111', metaColor: '#9B9B9B', photoBg: '#E8E8E8' },
}

export default function MemoryCard({ memory, onClick, onLongPress }: Props) {
  const { title, imageUrl, cardSize, cardColor, datumLabel, icon, kategorie } = memory

  const tokens   = COLOR_TOKENS[cardColor ?? 'weiss']
  const catLabel = kategorie ? (KATEGORIE_LABEL[kategorie] ?? '') : ''

  const { handlers, pressing } = useLongPress({
    onShortPress: () => onClick(memory),
    onLongPress:  () => onLongPress(memory),
  })

  const baseStyle: React.CSSProperties = {
    backgroundColor: tokens.bg,
    transform: pressing ? 'scale(0.97)' : 'scale(1)',
    transition: pressing ? 'transform 200ms ease' : 'transform 150ms ease',
  }

  // ── SMALL: 96px tall, horizontal — icon left / text right ───────────────
  if (cardSize === 'small') {
    return (
      <button
        {...handlers}
        style={{ ...baseStyle, height: 96 }}
        className="col-span-1 overflow-hidden rounded-[18px] shadow-sm flex flex-row text-left w-full select-none items-stretch"
      >
        {/* Icon / photo — square left side */}
        <div className="relative flex-shrink-0" style={{ width: 64, height: 96 }}>
          {imageUrl ? (
            <Image src={imageUrl} alt={title ?? ''} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[26px] select-none"
              style={{ backgroundColor: tokens.photoBg }}>
              {icon}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 flex flex-col justify-center px-2.5 min-w-0">
          {catLabel && (
            <p className="text-[9px] uppercase tracking-widest font-sans mb-0.5"
              style={{ color: tokens.metaColor }}>{catLabel}</p>
          )}
          {title && (
            <p className="font-serif font-semibold text-[12px] leading-tight line-clamp-3"
              style={{ color: tokens.titleColor }}>{title}</p>
          )}
          {datumLabel && (
            <p className="text-[10px] font-sans mt-1" style={{ color: tokens.metaColor }}>{datumLabel}</p>
          )}
        </div>
      </button>
    )
  }

  // ── MEDIUM: horizontal strip, fixed 96px ─────────────────────────────────
  if (cardSize === 'medium') {
    return (
      <button
        {...handlers}
        style={{ ...baseStyle, height: 96 }}
        className="col-span-2 overflow-hidden rounded-[18px] shadow-sm flex flex-row text-left w-full select-none items-stretch"
      >
        {/* Photo: 96×96 square on the left */}
        <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
          {imageUrl ? (
            <Image src={imageUrl} alt={title ?? ''} fill className="object-cover" sizes="96px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl select-none"
              style={{ backgroundColor: tokens.photoBg }}>
              {icon}
            </div>
          )}
        </div>

        {/* Text: fills remaining width */}
        <div className="flex-1 flex flex-col justify-center px-3 min-w-0">
          {catLabel && (
            <p className="text-[10px] uppercase tracking-widest font-sans mb-0.5"
              style={{ color: tokens.metaColor }}>{catLabel}</p>
          )}
          {title && (
            <p className="font-serif font-semibold text-[15px] leading-tight line-clamp-2"
              style={{ color: tokens.titleColor }}>{title}</p>
          )}
          {datumLabel && (
            <p className="text-[11px] font-sans mt-1" style={{ color: tokens.metaColor }}>{datumLabel}</p>
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center pr-3 flex-shrink-0">
          <span className="text-[18px] leading-none" style={{ color: '#C7C7CC' }}>›</span>
        </div>
      </button>
    )
  }

  // ── LARGE / LG-BLACK: photo top 170px + text block below ────────────────
  const isBlack = cardSize === 'lg-black'
  return (
    <button
      {...handlers}
      style={baseStyle}
      className="col-span-2 overflow-hidden rounded-[18px] shadow-sm flex flex-col text-left w-full select-none"
    >
      {/* Photo area: fixed 170px */}
      <div className="relative w-full flex-shrink-0" style={{ height: 170 }}>
        {imageUrl ? (
          <>
            <Image src={imageUrl} alt={title ?? ''} fill className="object-cover" sizes="430px" />
            {/* Dark overlay for lg-black so white text stays readable */}
            {isBlack && (
              <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl select-none"
            style={{ backgroundColor: tokens.photoBg }}>
            {icon}
          </div>
        )}
      </div>

      {/* Text block below photo */}
      <div className="px-4 py-3">
        {catLabel && (
          <p className="text-[10px] uppercase tracking-widest font-sans mb-1"
            style={{ color: tokens.metaColor }}>{catLabel}</p>
        )}
        {title && (
          <p className="font-serif font-bold text-[17px] leading-tight"
            style={{ color: tokens.titleColor }}>{title}</p>
        )}
        {datumLabel && (
          <p className="text-[11px] font-sans mt-1" style={{ color: tokens.metaColor }}>{datumLabel}</p>
        )}
      </div>
    </button>
  )
}
