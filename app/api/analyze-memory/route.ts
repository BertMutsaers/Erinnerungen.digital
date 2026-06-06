import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CardSize } from '@/lib/types'

const client = new Anthropic()

export interface AnalyzeEntry {
  titel:         string
  datum_tag:     number | null
  datum_monat:   number | null
  datum_jahr:    number | null
  datum_label:   string
  text:          string
  kategorie:     string
  icon:          string
  card_size:     CardSize
  karten_farbe:  'schwarz' | 'gold' | 'rose' | 'weiss'
  zeitgeschehen: string
}

export function fallbackCardSize(text: string): CardSize {
  const t = text.toLowerCase()
  const keywords = ['geboren', 'gestorben', 'geheiratet', 'gekauft', 'verstorben', 'meisterbrief', 'gründung', 'geburt', 'verstirbt', 'hochzeit']
  if (keywords.some((w) => t.includes(w))) return 'lg-black'
  if (text.length > 150) return 'large'
  if (text.length >= 50)  return 'medium'
  return 'small'
}

const SYSTEM = `Du bist ein Assistent für eine Erinnerungs-App über das Leben von Piet Mutsaers (1926–1982), einem niederländischen Fleischer und Unternehmer aus Tilburg/Osnabrück.

Analysiere den Text und extrahiere ALLE darin enthaltenen Ereignisse als JSON-Array.
Antworte NUR als JSON-Array, kein Markdown, keine Erklärungen.

Trenne Ereignisse anhand von:
- Verschiedenen Jahreszahlen oder Daten
- Konjunktionen wie "dann", "danach", "anschließend", "später", "außerdem"
- Neuen Absätzen
- Satzzeichen die einen Zeitsprung andeuten

Jedes Ereignis enthält:
- titel: Kurze Zusammenfassung, max. 5 Wörter, Deutsch
- datum_tag: Zahl oder null
- datum_monat: Zahl 1–12 oder null
- datum_jahr: Zahl oder null
- datum_label: Lesbarer Datumstext (z.B. "Sommer 1977", "März 1958", "17. Juni 1926")
- text: Vollständiger Beschreibungstext dieses Ereignisses
- kategorie: eines von kindheit | ausbildung | militaer | wanderjahre | familie | beruf | sonstiges
- icon: passendes Emoji
- card_size: "small" | "medium" | "large" | "lg-black"
  → "lg-black" für Lebenswenden (Geburt, Tod, Heirat, Firmenkauf, Meisterbrief)
  → "large" für ausführliche Einträge (>150 Zeichen)
  → "medium" für normale Einträge
  → "small" für kurze Notizen
- karten_farbe: "schwarz" | "gold" | "rose" | "weiss"
  → "schwarz" bei Tod / Abschied (verstorben, gestorben, tod)
  → "gold" bei Geburt (geboren, geburt)
  → "rose" bei Heirat / Liebe (geheiratet, hochzeit, heirat, verlobt)
  → "weiss" für alles andere
- zeitgeschehen: Ein prägnanter Satz Weltgeschehen im selben Jahr (Deutsch, max. 120 Zeichen, Format: "JAHR: Ereignis.")

Datum-Parsing:
- "März 1997" → datum_monat:3, datum_jahr:1997, datum_tag:null
- "17. Juni 1926" / "01.03.1923" → alle drei Felder
- "Frühjahr" → datum_monat:4, "Sommer" → 7, "Herbst" → 10, "Winter" → 1
- "ca. 1960" / nur Jahreszahl → datum_jahr, rest null`

export async function POST(req: NextRequest) {
  const { freitext } = await req.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json([{
      titel:         freitext.slice(0, 40),
      datum_tag:     null, datum_monat: null, datum_jahr: null, datum_label: '',
      text:          freitext,
      kategorie:     'sonstiges',
      icon:          '📝',
      card_size:     fallbackCardSize(freitext),
      karten_farbe:  'weiss' as const,
      zeitgeschehen: '',
    }] satisfies AnalyzeEntry[])
  }

  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: freitext }],
    })

    const raw     = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed  = JSON.parse(jsonStr) as AnalyzeEntry[]

    const validSizes: CardSize[] = ['small', 'medium', 'large', 'lg-black']
    const entries = (Array.isArray(parsed) ? parsed : [parsed]).map((e) => ({
      ...e,
      card_size: validSizes.includes(e.card_size) ? e.card_size : fallbackCardSize(e.text ?? ''),
    }))

    return NextResponse.json(entries)
  } catch (err) {
    console.error('/api/analyze-memory error:', err)
    return NextResponse.json([{
      titel:         freitext.slice(0, 40),
      datum_tag:     null, datum_monat: null, datum_jahr: null, datum_label: '',
      text:          freitext,
      kategorie:     'sonstiges',
      icon:          '📝',
      card_size:     fallbackCardSize(freitext),
      karten_farbe:  'weiss' as const,
      zeitgeschehen: '',
    }] satisfies AnalyzeEntry[])
  }
}
