import { Memory } from './types'
import { planGridLayout } from './planGridLayout'

export interface Phase {
  key:      string
  label:    string
  memories: Memory[]
}

export type GroupingMode = 'phase' | 'decade' | 'none'

// ── Phase grouping (KI-kategorien) ───────────────────────────────────────
const PHASE_ORDER = [
  { key: 'kindheit',    label: 'Kindheit & Jugend' },
  { key: 'ausbildung',  label: 'Ausbildung' },
  { key: 'militaer',    label: 'Militär' },
  { key: 'wanderjahre', label: 'Wanderjahre' },
  { key: 'familie',     label: 'Familie' },
  { key: 'beruf',       label: 'Beruf' },
  { key: 'sonstiges',   label: 'Sonstiges' },
]

export const FILTER_CHIPS = [
  { key: 'alle',        label: 'Alle'        },
  { key: 'kindheit',    label: 'Kindheit'    },
  { key: 'ausbildung',  label: 'Ausbildung'  },
  { key: 'militaer',    label: 'Militär'     },
  { key: 'wanderjahre', label: 'Wanderjahre' },
  { key: 'familie',     label: 'Familie'     },
  { key: 'beruf',       label: 'Beruf'       },
]

export function groupByPhase(memories: Memory[], activeFilter: string): Phase[] {
  const laid = planGridLayout(memories)
  const filtered = activeFilter === 'alle'
    ? laid
    : laid.filter((m) => m.kategorie === activeFilter)

  return PHASE_ORDER
    .map(({ key, label }) => ({
      key,
      label,
      memories: filtered.filter((m) => m.kategorie === key),
    }))
    .filter((p) => p.memories.length > 0)
}

// ── Decade grouping ───────────────────────────────────────────────────────
export function groupByDecade(memories: Memory[], activeFilter: string): Phase[] {
  const laid = planGridLayout(memories)

  // Build decade map
  const map = new Map<string, Memory[]>()
  for (const m of laid) {
    const decade = m.datumJahr ? `${Math.floor(m.datumJahr / 10) * 10}er` : 'Unbekannt'
    if (!map.has(decade)) map.set(decade, [])
    map.get(decade)!.push(m)
  }

  const all: Phase[] = Array.from(map.entries())
    .sort(([a], [b]) => {
      const aNum = parseInt(a) || 9999
      const bNum = parseInt(b) || 9999
      return aNum - bNum
    })
    .map(([label, mems]) => ({ key: label, label, memories: mems }))

  if (activeFilter === 'alle') return all
  return all.filter((p) => p.key === activeFilter)
}

// ── No grouping — single chronological list ───────────────────────────────
export function groupByNone(memories: Memory[]): Phase[] {
  const laid = planGridLayout(memories)
  if (laid.length === 0) return []
  return [{ key: 'alle', label: '', memories: laid }]
}

// ── Decade chip list from memories ────────────────────────────────────────
export function decadeChips(memories: Memory[]): { key: string; label: string }[] {
  const decades = new Set<string>()
  for (const m of memories) {
    if (m.datumJahr) decades.add(`${Math.floor(m.datumJahr / 10) * 10}er`)
  }
  const sorted = Array.from(decades).sort((a, b) => parseInt(a) - parseInt(b))
  return [{ key: 'alle', label: 'Alle' }, ...sorted.map((d) => ({ key: d, label: d }))]
}
