import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface DateEstimate {
  datum_jahr:      number | null
  datum_jahrzehnt: string | null
  konfidenz:       'hoch' | 'mittel' | 'niedrig'
}

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const file      = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Keine Datei' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64      = Buffer.from(arrayBuffer).toString('base64')
    const mediaType   = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `Schätze anhand des Fotos (Bildqualität, Farben, Kleidung, Frisuren, Gegenstände, Technik) das ungefähre Aufnahmedatum.
Antworte NUR als JSON ohne Markdown:
{"datum_jahr": 1965, "datum_jahrzehnt": "1960er", "konfidenz": "niedrig"}

datum_jahr: wahrscheinlichstes Jahr oder null wenn unbekannt
datum_jahrzehnt: Jahrzehnt als String (z.B. "1960er") oder null
konfidenz: "hoch" (erkennbares Datum/Jahr sichtbar), "mittel" (klare Hinweise), "niedrig" (nur grobe Schätzung)`
          },
        ],
      }],
    })

    const raw    = (message.content[0] as { type: string; text: string }).text.trim()
    const json   = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const result = JSON.parse(json) as DateEstimate
    return NextResponse.json(result)
  } catch (err) {
    console.error('estimate-photo-date error:', err)
    return NextResponse.json({ datum_jahr: null, datum_jahrzehnt: null, konfidenz: 'niedrig' })
  }
}
