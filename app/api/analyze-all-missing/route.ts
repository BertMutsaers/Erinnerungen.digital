import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const anthropic = new Anthropic()

const BOOK_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const ZEITGESCHEHEN_PROMPT = `Schreibe einen einzigen lebendigen Satz über das was in diesem Jahr oder dieser Zeit in der Welt, in Deutschland oder den Niederlanden besonders war — aus der Perspektive eines normalen Menschen der damals lebte.

Nicht trocken wie ein Lexikon, sondern so als würde man es sich erzählen.

Beispiele:
'1953: Während Piet seinen Meisterbrief macht, stirbt Stalin — und ganz Europa atmet auf.'
'1969: Im selben Sommer in dem Piet Bedford kauft, betritt Neil Armstrong den Mond.'
'1958: Adenauer regiert, der VW Käfer ist überall — Deutschland erlebt sein Wirtschaftswunder.'

Verwende den Namen der Person (aus dem Kontext) und das Jahr des Ereignisses.
Maximal 2 Sätze, persönlich und lebendig.
Antworte NUR mit dem Zeitgeschehen-Text, kein JSON, keine Anführungszeichen.`

const ICON_KATEGORIE_PROMPT = `Du analysierst eine Erinnerung über Piet Mutsaers (1926–1982), niederländischer Fleischer und Unternehmer.

Antworte NUR mit einem kompakten JSON-Objekt:
{
  "icon": "ein passendes Emoji",
  "kategorie": "kindheit|ausbildung|militaer|wanderjahre|familie|beruf|sonstiges"
}

Kein Markdown, keine Erklärungen.`

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST() {
  // Fetch all memories that need analysis
  const { data: memories, error } = await supabase
    .from('memories')
    .select('id, title, body, datum_label, datum_jahr, icon, kategorie, body_extra')
    .eq('book_id', BOOK_ID)
    .order('datum_jahr', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const missing = (memories ?? []).filter(
    (m) => !m.body_extra?.trim()
  )

  // Stream progress as newline-delimited JSON
  const encoder = new TextEncoder()
  const total = missing.length

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      send({ type: 'start', total })

      for (let i = 0; i < missing.length; i++) {
        const mem = missing[i]
        send({ type: 'progress', done: i, total, current: mem.title ?? mem.id })

        try {
          const context = `Ereignis: "${mem.title ?? ''}"
Datum: ${mem.datum_label ?? mem.datum_jahr ?? ''}
Beschreibung: ${mem.body ?? '(keine)'}
Person: Piet Mutsaers`

          // 1. Generate zeitgeschehen
          const ztMsg = await anthropic.messages.create({
            model:      'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: `${ZEITGESCHEHEN_PROMPT}\n\n${context}`,
            }],
          })
          const zeitgeschehen = (ztMsg.content[0] as { type: string; text: string }).text.trim()

          // 2. Generate icon + kategorie only if missing
          const needsMeta = !mem.icon?.trim() || !mem.kategorie?.trim()
          let icon      = mem.icon      ?? null
          let kategorie = mem.kategorie ?? null

          if (needsMeta) {
            const metaMsg = await anthropic.messages.create({
              model:      'claude-haiku-4-5-20251001',
              max_tokens: 80,
              messages: [{
                role: 'user',
                content: `${ICON_KATEGORIE_PROMPT}\n\nEreignis: "${mem.title ?? ''}"\nDatum: ${mem.datum_label ?? ''}\nBeschreibung: ${mem.body ?? ''}`,
              }],
            })
            const raw = (metaMsg.content[0] as { type: string; text: string }).text.trim()
            try {
              const parsed = JSON.parse(raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, ''))
              if (!icon)      icon      = parsed.icon      ?? icon
              if (!kategorie) kategorie = parsed.kategorie ?? kategorie
            } catch { /* keep existing values */ }
          }

          // 3. Write to DB
          const update: Record<string, string | null> = { body_extra: zeitgeschehen }
          if (icon)      update.icon      = icon
          if (kategorie) update.kategorie = kategorie

          await supabase.from('memories').update(update).eq('id', mem.id)

          send({ type: 'done_item', id: mem.id, title: mem.title, zeitgeschehen })
        } catch (err) {
          send({ type: 'error_item', id: mem.id, error: String(err) })
        }

        // Rate-limit pause between requests
        if (i < missing.length - 1) await sleep(1000)
      }

      send({ type: 'complete', total, processed: missing.length })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Total':       String(total),
    },
  })
}
