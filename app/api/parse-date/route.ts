import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface ParsedDate {
  datum_tag:   number | null
  datum_monat: number | null
  datum_jahr:  number | null
  datum_text:  string
}

const SYSTEM = `Extrahiere aus einem Datum-Text die strukturierten Datumswerte.
Antworte NUR als JSON, kein Markdown:
{"datum_tag": null, "datum_monat": 1, "datum_jahr": 1992, "datum_text": "Januar 1992"}

Regeln:
- Nur Jahr bekannt → datum_tag: null, datum_monat: null
- Monat + Jahr → datum_tag: null
- Jahreszeiten: Frühling/Frühjahr=3, Sommer=6, Herbst=9, Winter=12
- ca./circa/etwa/um → trotzdem Jahr extrahieren
- Kein Jahr erkennbar → datum_jahr: null
- datum_text = lesbarer Originaltext, leicht bereinigt`

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ datum_tag: null, datum_monat: null, datum_jahr: null, datum_text: text ?? '' })

    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: `Datum-Text: "${text}"` }],
    })

    const raw    = (msg.content[0] as { type: string; text: string }).text.trim()
    const json   = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(json) as ParsedDate
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('parse-date error:', err)
    return NextResponse.json({ datum_tag: null, datum_monat: null, datum_jahr: null, datum_text: '' })
  }
}
