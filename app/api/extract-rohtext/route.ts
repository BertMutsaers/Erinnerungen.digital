/**
 * POST /api/extract-rohtext
 * Extracts structured timeline data from a project's rohtext using Claude.
 * Etappe B: extraction + display only — nothing is written to the DB here.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSupabaseServer } from '@/lib/supabase-server'

const client = new Anthropic()

export type Kategorie = 'kindheit' | 'ausbildung' | 'militaer' | 'wanderjahre' | 'familie' | 'beruf' | 'sonstiges'

export interface ExtractedStammdaten {
  geburtsdatum_text?: string | null
  geburtsdatum_jahr?: number | null
  geburtsort?:        string | null
  sterbedatum_text?:  string | null
  sterbedatum_jahr?:  number | null
  sterbeort?:         string | null
  bio?:               string | null
}

export interface ExtractedEreignis {
  titel:       string
  datum_jahr:  number | null
  datum_monat: number | null
  datum_tag:   number | null
  datum_text:  string | null
  hat_datum:   boolean
  kategorie:   Kategorie | null
  beschreibung: string | null
  unsicher:    boolean
}

export interface ExtractResult {
  stammdaten: ExtractedStammdaten
  ereignisse: ExtractedEreignis[]
}

const SYSTEM = `Du bist ein Assistent für eine digitale Erinnerungs-App.

Deine Aufgabe: Aus einem Freitext über das Leben einer Person strukturierte Daten extrahieren.

WICHTIGE REGELN:
- NICHTS erfinden oder hinzufügen. Nur extrahieren, was im Text steht oder unmittelbar daraus folgt.
- Wenn ein Datum nicht genannt ist: datum_jahr null lassen, dat_text mit ungenauen Angaben füllen, hat_datum=false.
- Wenn etwas geschätzt oder unsicher ist: unsicher=true setzen.
- Ereignisse in chronologischer Reihenfolge zurückgeben (so gut wie möglich).
- Antworte AUSSCHLIESSLICH als JSON-Objekt. Kein Markdown, keine Erklärungen, kein Text davor oder danach.

JSON-Schema (genau so zurückgeben):
{
  "stammdaten": {
    "geburtsdatum_text": "string oder null — z.B. '17. Juni 1926'",
    "geburtsdatum_jahr": "Zahl oder null",
    "geburtsort": "string oder null",
    "sterbedatum_text": "string oder null",
    "sterbedatum_jahr": "Zahl oder null",
    "sterbeort": "string oder null",
    "bio": "1-2 Sätze Zusammenfassung der Person — nur wenn genug Infos vorhanden, sonst null"
  },
  "ereignisse": [
    {
      "titel": "Kurzer Titel, max. 6 Wörter, Deutsch",
      "datum_jahr": "Zahl oder null",
      "datum_monat": "Zahl 1-12 oder null",
      "datum_tag": "Zahl oder null",
      "datum_text": "Lesbarer Datumstext z.B. 'Sommer 1961' oder null wenn kein Datum erkennbar",
      "hat_datum": "true wenn irgendein Datum erkennbar ist, sonst false",
      "kategorie": "eines von: kindheit | ausbildung | militaer | wanderjahre | familie | beruf | sonstiges — oder null wenn unklar",
      "beschreibung": "Kurze Beschreibung aus dem Text oder null",
      "unsicher": "true wenn Datum oder Inhalt unsicher/geschätzt ist"
    }
  ]
}

Datum-Parsing:
- '24.02.1955' → datum_tag:24, datum_monat:2, datum_jahr:1955
- 'März 1997' → datum_monat:3, datum_jahr:1997, datum_tag:null
- 'Frühjahr/Frühling' → monat:3, 'Sommer' → 7, 'Herbst' → 9, 'Winter' → 12
- 'ca. 1960' / 'in den 60ern' → datum_jahr:1960, unsicher:true
- 'nach dem Krieg' o.ä. → datum_text mit der Formulierung, datum_jahr null

LÄNGE: Halte jeden "beschreibung"-Wert unter 100 Zeichen. Titel max. 5 Wörter. Keine Wiederholungen.`

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 })

  // Fetch rohtext — verify ownership via RLS
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('rohtext, titel')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projErr || !project) return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  if (!project.rohtext?.trim()) return NextResponse.json({ error: 'Kein Text vorhanden' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    // Dev fallback without API key
    return NextResponse.json({
      stammdaten: { bio: 'KI nicht verfügbar (kein API-Key).' },
      ereignisse: [{
        titel: 'Beispiel-Ereignis',
        datum_jahr: null, datum_monat: null, datum_tag: null,
        datum_text: null, hat_datum: false,
        kategorie: 'sonstiges',
        beschreibung: project.rohtext.slice(0, 100),
        unsicher: true,
      }],
    } satisfies ExtractResult)
  }

  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: `Leben von: ${project.titel}\n\n${project.rohtext}` }],
    })

    const raw     = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed  = JSON.parse(jsonStr) as ExtractResult

    return NextResponse.json(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('/api/extract-rohtext error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
