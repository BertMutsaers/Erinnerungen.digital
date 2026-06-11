/**
 * POST /api/save-ki-result — Etappe D
 *
 * Schreibt den vom Nutzer geprüften KI-Vorschlag in die DB:
 *   1. UPDATE projects  → Stammdaten (Geburts-/Sterbedaten, Orte)
 *   2. UPDATE books     → description (bio)
 *   3. INSERT memories  → alle Ereignisse als Batch (ein einziger Request)
 *
 * rohtext bleibt erhalten – er wird NICHT gelöscht.
 * Auth läuft über RLS; nur der Besitzer darf schreiben.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import type { ExtractedStammdaten, ExtractedEreignis, Kategorie } from '@/app/api/extract-rohtext/route'

// ── Icon-Defaults nach Kategorie ─────────────────────────────────────────────
const ICON: Record<Kategorie, string> = {
  kindheit:    '👶',
  ausbildung:  '📚',
  militaer:    '🪖',
  wanderjahre: '🗺️',
  familie:     '👨‍👩‍👧',
  beruf:        '💼',
  sonstiges:   '📝',
}

// ── Hilfsfunktion: ISO-Datum aus Teilfeldern ──────────────────────────────────
function toHappenedAt(e: ExtractedEreignis): string | null {
  if (e.datum_jahr && e.datum_monat && e.datum_tag) {
    return `${e.datum_jahr}-${String(e.datum_monat).padStart(2, '0')}-${String(e.datum_tag).padStart(2, '0')}`
  }
  if (e.datum_jahr && e.datum_monat) {
    return `${e.datum_jahr}-${String(e.datum_monat).padStart(2, '0')}-01`
  }
  if (e.datum_jahr) {
    return `${e.datum_jahr}-01-01`
  }
  return null
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

  const body = await req.json() as {
    projectId:  string
    stammdaten: ExtractedStammdaten
    ereignisse: ExtractedEreignis[]
  }
  const { projectId, stammdaten, ereignisse } = body

  if (!projectId) return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 })

  // ── 1. Ownership-Check via RLS ─────────────────────────────────────────────
  const { data: proj, error: projErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projErr || !proj) {
    return NextResponse.json({ error: 'Projekt nicht gefunden oder kein Zugriff' }, { status: 404 })
  }

  // ── 2. Stammdaten → projects UPDATE ───────────────────────────────────────
  // Nur Felder setzen, die tatsächlich einen Wert haben (keine leeren Strings).
  // rohtext wird bewusst NICHT angefasst – bleibt erhalten.
  const projectPatch: Record<string, unknown> = {}
  if (stammdaten.geburtsdatum_text) projectPatch.geburtsdatum_text = stammdaten.geburtsdatum_text
  if (stammdaten.geburtsdatum_jahr) projectPatch.geburtsdatum_jahr = stammdaten.geburtsdatum_jahr
  if (stammdaten.geburtsort)        projectPatch.geburtsort        = stammdaten.geburtsort
  if (stammdaten.sterbedatum_text)  projectPatch.sterbedatum_text  = stammdaten.sterbedatum_text
  if (stammdaten.sterbedatum_jahr)  projectPatch.sterbedatum_jahr  = stammdaten.sterbedatum_jahr
  if (stammdaten.sterbeort)         projectPatch.sterbeort         = stammdaten.sterbeort

  // Geburtsjahr aus Datum-Text extrahieren falls nicht explizit vorhanden
  if (!projectPatch.geburtsdatum_jahr && stammdaten.geburtsdatum_text) {
    const m = stammdaten.geburtsdatum_text.match(/\b(1[89]\d\d|20\d\d)\b/)
    if (m) projectPatch.geburtsdatum_jahr = parseInt(m[1])
  }
  if (!projectPatch.sterbedatum_jahr && stammdaten.sterbedatum_text) {
    const m = stammdaten.sterbedatum_text.match(/\b(1[89]\d\d|20\d\d)\b/)
    if (m) projectPatch.sterbedatum_jahr = parseInt(m[1])
  }

  if (Object.keys(projectPatch).length > 0) {
    const { error: updErr } = await supabase
      .from('projects')
      .update(projectPatch)
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (updErr) {
      return NextResponse.json({ error: `Stammdaten konnten nicht gespeichert werden: ${updErr.message}` }, { status: 500 })
    }
  }

  // ── 3. Bio → books UPDATE (description) ───────────────────────────────────
  if (stammdaten.bio?.trim()) {
    const { error: bioErr } = await supabase
      .from('books')
      .update({ description: stammdaten.bio.trim() })
      .eq('id', projectId)   // books.id === project.id (gleiche UUID)
      .eq('owner_id', user.id)

    if (bioErr) {
      // Bio-Fehler ist nicht kritisch – wir loggen nur und machen weiter
      console.warn('/api/save-ki-result bio update failed:', bioErr.message)
    }
  }

  // ── 4. Ereignisse → memories BATCH INSERT ────────────────────────────────
  if (ereignisse.length === 0) {
    return NextResponse.json({ saved: 0 })
  }

  const rows = ereignisse.map((e) => ({
    book_id:     projectId,
    title:       e.titel || '(ohne Titel)',
    body:        e.beschreibung || null,
    happened_at: toHappenedAt(e),
    datum_label: e.datum_text ?? (e.datum_jahr ? String(e.datum_jahr) : ''),
    datum_jahr:  e.datum_jahr  ?? null,
    datum_monat: e.datum_monat ?? null,
    datum_tag:   e.datum_tag   ?? null,
    card_size:   'medium' as const,
    kategorie:   e.kategorie   ?? 'sonstiges',
    icon:        e.kategorie ? (ICON[e.kategorie] ?? '📝') : '📝',
    body_extra:  null,    // kein Zeitgeschehen-Text aus rohtext-Extraktion
  }))

  const { error: insertErr } = await supabase
    .from('memories')
    .insert(rows)

  if (insertErr) {
    // Stammdaten wurden bereits gespeichert; der Client kann den Insert-Teil erneut versuchen.
    return NextResponse.json({
      error:          `Ereignisse konnten nicht gespeichert werden: ${insertErr.message}`,
      stammdatenSaved: true,   // damit der Client weiß, was schon durch ist
    }, { status: 500 })
  }

  return NextResponse.json({ saved: rows.length })
}
