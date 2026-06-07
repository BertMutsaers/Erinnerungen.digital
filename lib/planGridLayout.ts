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
 * Two-pass layout algorithm.
 *
 * Pass 1 — assign a "desired" size to each card:
 *   • keyword highlight OR pinnedSize='lg-black' → lg-black
 *   • pinnedSize='large'                         → large
 *   • pinnedSize='medium'                        → medium
 *   • everything else (sm or unset)              → small (subject to pass 2)
 *
 * Pass 2 — enforce the pairing rule for small cards:
 *   • Two adjacent smalls → place side by side (col-span-1 each)
 *   • Lone small (no sm neighbour)  → upgrade to medium (col-span-2)
 *
 * Card color: DB value wins if set; otherwise computed from keywords.
 * DB sizes are never written back — layout is display-only.
 */
export function planGridLayout(memories: Memory[]): Memory[] {
  // ── Pass 1: desired sizes ─────────────────────────────────────────────────
  const sized = memories.map((mem): Memory & { cardSize: CardSize; cardColor: CardColor } => {
    const cardColor: CardColor = mem.cardColor ?? resolveCardColor(mem.title, mem.body)

    // Keywords always win — even manual overrides can't suppress death/birth highlights
    if (isHighlight(mem)) {
      return { ...mem, cardSize: 'lg-black', cardColor }
    }

    // Manual size: user explicitly chose this in EditSheet → use it directly
    if (mem.groesseManuell && mem.pinnedSize) {
      return { ...mem, cardSize: mem.pinnedSize, cardColor }
      // Note: 'small' from here still goes through Pass 2 pairing rule
    }

    // Automatic: use DB value as hint (seed data, KI suggestions)
    if (mem.pinnedSize === 'lg-black') return { ...mem, cardSize: 'lg-black', cardColor }
    if (mem.pinnedSize === 'large')   return { ...mem, cardSize: 'large',    cardColor }
    if (mem.pinnedSize === 'medium')  return { ...mem, cardSize: 'medium',   cardColor }

    // Unset or small → let Pass 2 decide (pair or upgrade)
    return { ...mem, cardSize: 'small', cardColor }
  })

  // ── Pass 2: pair smalls or upgrade lone ones ──────────────────────────────
  const result: Array<Memory & { cardSize: CardSize; cardColor: CardColor }> = []
  let i = 0

  while (i < sized.length) {
    const card = sized[i]

    if (card.cardSize === 'small') {
      const next = sized[i + 1]
      if (next?.cardSize === 'small') {
        // Pair: both go side by side
        result.push(card)
        result.push(next)
        i += 2
      } else if (card.groesseManuell) {
        // User explicitly chose sm → respect it even if lone (half-row with empty right cell)
        result.push(card)
        i += 1
      } else {
        // Automatic lone small → upgrade to medium
        result.push({ ...card, cardSize: 'medium' })
        i += 1
      }
    } else {
      // medium / large / lg-black: always full row, no pairing needed
      result.push(card)
      i += 1
    }
  }

  return result
}
