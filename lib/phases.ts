import { Memory } from './types'
import { planGridLayout } from './planGridLayout'

export interface Phase {
  key: string
  label: string
  memories: Memory[]
}

const PHASE_ORDER = [
  { key: 'kindheit',    label: 'Kindheit & Jugend' },
  { key: 'ausbildung',  label: 'Ausbildung' },
  { key: 'militaer',    label: 'Militär' },
  { key: 'wanderjahre', label: 'Wanderjahre' },
  { key: 'familie',     label: 'Familie' },
  { key: 'beruf',       label: 'Bedford' },
  { key: 'sonstiges',   label: 'Lebensende' },
]

export const FILTER_CHIPS = [
  { key: 'alle',        label: 'Alle' },
  { key: 'kindheit',    label: 'Kindheit' },
  { key: 'ausbildung',  label: 'Ausbildung' },
  { key: 'militaer',    label: 'Militär' },
  { key: 'wanderjahre', label: 'Wanderjahre' },
  { key: 'familie',     label: 'Familie' },
  { key: 'beruf',       label: 'Bedford' },
]

export function groupByPhase(memories: Memory[], activeFilter: string): Phase[] {
  // Run layout algorithm on the full chronological list first,
  // so card sizes are decided globally (not per-phase).
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
