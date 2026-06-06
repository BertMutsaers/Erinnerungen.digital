import { Memory, CardSize, CardColor } from './types'

const HIGHLIGHT_KEYWORDS = [
  'geburt', 'geboren',
  'verstirbt', 'verstorben', 'gestorben',
  'hochzeit', 'geheiratet',
  'meisterbrief',
  'kauf fa.', 'gründung',
]

const COLOR_RULES: { color: CardColor; keywords: string[] }[] = [
  { color: 'schwarz', keywords: ['verstorben', 'gestorben', 'tod', 'verstirbt'] },
  { color: 'gold',    keywords: ['geboren', 'geburt'] },
  { color: 'rose',    keywords: ['geheiratet', 'hochzeit', 'heirat', 'verlobt'] },
]

function isHighlight(m: Memory): boolean {
  const text = `${m.title ?? ''} ${m.body ?? ''}`.toLowerCase()
  return HIGHLIGHT_KEYWORDS.some((k) => text.includes(k))
}

export function resolveCardColor(title = '', body = ''): CardColor {
  const text = `${title} ${body}`.toLowerCase()
  for (const rule of COLOR_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.color
  }
  return 'weiss'
}

/**
 * Plans card sizes AND colors for the full grid.
 * card_size and card_color stored in DB are ignored — always recomputed.
 *
 * Size cycle for non-highlights: sm · sm · md · repeat
 * lg-black always starts at a row boundary (promote prev sm → md if needed).
 * Trailing lone sm → promoted to md.
 */
export function planGridLayout(memories: Memory[]): Memory[] {
  const result: Array<Memory & { cardSize: CardSize; cardColor: CardColor }> = []
  let cyclePos: 0 | 1 | 2 = 0

  for (const mem of memories) {
    const cardColor = resolveCardColor(mem.title, mem.body)

    if (isHighlight(mem)) {
      if (cyclePos === 1) {
        result[result.length - 1] = { ...result[result.length - 1], cardSize: 'medium' }
        cyclePos = 0
      }
      result.push({ ...mem, cardSize: 'lg-black', cardColor })
      cyclePos = 0
    } else {
      if (cyclePos === 0) {
        result.push({ ...mem, cardSize: 'small', cardColor })
        cyclePos = 1
      } else if (cyclePos === 1) {
        result.push({ ...mem, cardSize: 'small', cardColor })
        cyclePos = 2
      } else {
        result.push({ ...mem, cardSize: 'medium', cardColor })
        cyclePos = 0
      }
    }
  }

  if (cyclePos === 1 && result.length > 0) {
    result[result.length - 1] = { ...result[result.length - 1], cardSize: 'medium' }
  }

  return result
}
