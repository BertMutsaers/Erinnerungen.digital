'use client'

/**
 * KiReviewScreen — Etappe C + D
 * Zeigt den KI-Vorschlag prüf- und editierbar an (Etappe C),
 * und speichert nach Bestätigung in die DB (Etappe D).
 */

import { useState } from 'react'
import type { ExtractResult, ExtractedStammdaten, ExtractedEreignis, Kategorie } from '@/app/api/extract-rohtext/route'

// ── Typen ───────────────────────────────────────────────────────────────────

type ReviewEreignis = ExtractedEreignis & { _id: string }

const KATEGORIEN: { key: Kategorie; label: string }[] = [
  { key: 'kindheit',    label: 'Kindheit'    },
  { key: 'ausbildung',  label: 'Ausbildung'  },
  { key: 'militaer',    label: 'Militär'     },
  { key: 'wanderjahre', label: 'Wanderjahre' },
  { key: 'familie',     label: 'Familie'     },
  { key: 'beruf',       label: 'Beruf'       },
  { key: 'sonstiges',   label: 'Sonstiges'   },
]

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  result:     ExtractResult
  projectId:  string          // book_id === project_id
  onDiscard:  () => void
  onSaved:    () => void      // nach erfolgreichem Speichern (Etappe D)
}

// ── Hilfskomponenten ────────────────────────────────────────────────────────

function InlineField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="font-sans text-[12px] w-[90px] flex-shrink-0" style={{ color: '#AEAEB2' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 font-sans text-[14px] text-gray-900 bg-transparent outline-none placeholder-gray-300 min-w-0"
      />
    </div>
  )
}

function InlineTextarea({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="font-sans text-[12px] w-[90px] flex-shrink-0 pt-0.5" style={{ color: '#AEAEB2' }}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="flex-1 font-sans text-[14px] text-gray-900 bg-transparent outline-none placeholder-gray-300 resize-none min-w-0 leading-relaxed"
      />
    </div>
  )
}

// ── Stammdaten-Editor ───────────────────────────────────────────────────────

function StammdatenEditor({
  value, onChange,
}: { value: ExtractedStammdaten; onChange: (v: ExtractedStammdaten) => void }) {
  function set(key: keyof ExtractedStammdaten, val: string) {
    onChange({ ...value, [key]: val.trim() || null })
  }
  return (
    <div className="divide-y" style={{ borderColor: '#F2F2F7' }}>
      <InlineField
        label="Geburtsdatum" value={value.geburtsdatum_text ?? ''}
        onChange={(v) => set('geburtsdatum_text', v)} placeholder="z.B. 24. Februar 1935"
      />
      <InlineField
        label="Geburtsort" value={value.geburtsort ?? ''}
        onChange={(v) => set('geburtsort', v)} placeholder="z.B. Amsterdam"
      />
      <InlineField
        label="Sterbedatum" value={value.sterbedatum_text ?? ''}
        onChange={(v) => set('sterbedatum_text', v)} placeholder="z.B. 12. März 2019"
      />
      <InlineField
        label="Sterbeort" value={value.sterbeort ?? ''}
        onChange={(v) => set('sterbeort', v)} placeholder="z.B. Rotterdam"
      />
      <InlineTextarea
        label="Bio" value={value.bio ?? ''}
        onChange={(v) => set('bio', v)} placeholder="Kurze Biografie (optional)"
      />
    </div>
  )
}

// ── Edit-Fields im Ereignis-Expander ────────────────────────────────────────

function EditField({
  label, value, onChange, placeholder, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <p className="font-sans text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#AEAEB2' }}>{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-[10px] font-sans text-[14px] text-gray-900 outline-none"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
      />
    </div>
  )
}

function EditTextarea({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p className="font-sans text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#AEAEB2' }}>{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 rounded-[10px] font-sans text-[14px] text-gray-900 outline-none resize-none leading-relaxed"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
      />
    </div>
  )
}

// ── Einzelne Ereignis-Zeile ─────────────────────────────────────────────────

function EreignisRow({
  ereignis, isFirst, isEditing, onToggle, onChange, onDelete,
}: {
  ereignis:  ReviewEreignis
  isFirst:   boolean
  isEditing: boolean
  onToggle:  () => void
  onChange:  (patch: Partial<ExtractedEreignis>) => void
  onDelete:  () => void
}) {
  return (
    <div style={{ borderTop: isFirst ? 'none' : '1px solid #F2F2F7' }}>
      {/* ── Kompakte Zeile ── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-5 py-3 text-left active:bg-gray-50 transition-colors"
      >
        {/* Jahr */}
        <span
          className="font-sans text-[12px] font-semibold w-10 flex-shrink-0 text-right pt-0.5"
          style={{ color: '#C7C7CC' }}
        >
          {ereignis.datum_jahr ?? '—'}
        </span>

        {/* Titel + Labels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-sans text-[14px] font-semibold text-gray-900 leading-snug">
              {ereignis.titel}
            </span>
            {ereignis.unsicher && (
              <span
                className="font-sans text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none"
                style={{ background: '#FFF5CC', color: '#8A6D00' }}
              >
                geschätzt
              </span>
            )}
          </div>
          {ereignis.datum_text && ereignis.datum_text !== String(ereignis.datum_jahr) && (
            <p className="font-sans text-[11px] mt-0.5" style={{ color: '#AEAEB2' }}>
              {ereignis.datum_text}
            </p>
          )}
          {ereignis.beschreibung && !isEditing && (
            <p className="font-sans text-[12px] mt-0.5 leading-snug text-gray-400 line-clamp-1">
              {ereignis.beschreibung}
            </p>
          )}
        </div>

        {/* Chevron */}
        <span className="flex-shrink-0 mt-0.5 text-[11px]" style={{ color: '#C7C7CC' }}>
          {isEditing ? '▲' : '▼'}
        </span>
      </button>

      {/* ── Aufgeklappter Editor ── */}
      {isEditing && (
        <div className="px-5 pb-5 flex flex-col gap-3" style={{ background: '#F9F9F9' }}>
          <EditField
            label="Titel" value={ereignis.titel}
            onChange={(v) => onChange({ titel: v })}
          />

          <div className="grid grid-cols-2 gap-2">
            <EditField
              label="Jahr" type="number"
              value={ereignis.datum_jahr ? String(ereignis.datum_jahr) : ''}
              onChange={(v) => onChange({ datum_jahr: v ? parseInt(v) : null })}
              placeholder="z.B. 1961"
            />
            <EditField
              label="Datumstext"
              value={ereignis.datum_text ?? ''}
              onChange={(v) => onChange({ datum_text: v.trim() || null })}
              placeholder="z.B. Sommer 1961"
            />
          </div>

          {/* Kategorie-Chips */}
          <div>
            <p className="font-sans text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#AEAEB2' }}>
              Kategorie
            </p>
            <div className="flex flex-wrap gap-1.5">
              {KATEGORIEN.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => onChange({ kategorie: k.key })}
                  className="px-3 py-1 rounded-full font-sans text-[12px] font-medium transition-colors"
                  style={
                    ereignis.kategorie === k.key
                      ? { background: '#1C1C1E', color: '#fff' }
                      : { background: '#EBEBF0', color: '#3C3C3E' }
                  }
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <EditTextarea
            label="Beschreibung"
            value={ereignis.beschreibung ?? ''}
            onChange={(v) => onChange({ beschreibung: v.trim() || null })}
            placeholder="Kurze Beschreibung (optional)"
          />

          {/* Unsicher + Löschen */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ereignis.unsicher}
                onChange={(e) => onChange({ unsicher: e.target.checked })}
                className="w-4 h-4 rounded accent-gray-800"
              />
              <span className="font-sans text-[13px] text-gray-600">Datum unsicher / geschätzt</span>
            </label>
            <button
              type="button"
              onClick={onDelete}
              className="font-sans text-[13px] font-medium active:opacity-60"
              style={{ color: '#FF3B30' }}
            >
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hauptkomponente ─────────────────────────────────────────────────────────

export default function KiReviewScreen({ result, projectId, onDiscard, onSaved }: Props) {
  const [stammdaten, setStammdaten] = useState<ExtractedStammdaten>({ ...result.stammdaten })
  const [ereignisse, setEreignisse] = useState<ReviewEreignis[]>(() =>
    result.ereignisse.map((e, i) => ({ ...e, _id: String(i) }))
  )
  const [deletedIds,  setDeletedIds]  = useState<Set<string>>(new Set())
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)

  const active        = ereignisse.filter((e) => !deletedIds.has(e._id))
  const unsicherCount = active.filter((e) => e.unsicher).length

  function updateEreignis(id: string, patch: Partial<ExtractedEreignis>) {
    setEreignisse((prev) => prev.map((e) => (e._id === id ? { ...e, ...patch } : e)))
  }

  function deleteEreignis(id: string) {
    setDeletedIds((prev) => new Set([...prev, id]))
    if (editingId === id) setEditingId(null)
  }

  function addEreignis() {
    const newId = `new-${Date.now()}`
    const newE: ReviewEreignis = {
      _id: newId,
      titel:       'Neues Ereignis',
      datum_jahr:  null, datum_monat: null, datum_tag: null,
      datum_text:  null, hat_datum:   false,
      kategorie:   'sonstiges',
      beschreibung: null,
      unsicher:    false,
    }
    setEreignisse((prev) => [...prev, newE])
    setEditingId(newId)
  }

  // ── Etappe D: echtes Speichern ────────────────────────────────────────────
  async function handleConfirm() {
    if (saving) return  // Mehrfach-Klick verhindern
    setSaving(true)
    setSaveError(null)

    const payload = {
      projectId,
      stammdaten,
      ereignisse: active.map(({ _id: _unused, ...rest }) => rest),
    }

    try {
      const res = await fetch('/api/save-ki-result', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      // Gespeichert → Review-Screen schließen + Zeitstrahl neu laden
      onSaved()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Review-Screen ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F2F2F7]" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
        <button
          onClick={onDiscard}
          disabled={saving}
          className="font-sans text-[15px] active:opacity-60 disabled:opacity-30"
          style={{ color: '#9B9B9B' }}
        >
          Verwerfen
        </button>
        <p className="font-sans text-[13px] font-semibold text-gray-900">KI-Vorschlag prüfen</p>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="font-sans text-[15px] font-semibold active:opacity-60 disabled:opacity-40"
          style={{ color: '#1C1C1E' }}
        >
          {saving ? '…' : 'Übernehmen'}
        </button>
      </header>

      <div className="px-4 py-5 pb-32 flex flex-col gap-4">

        {/* ── Banner ──────────────────────────────────────────────────────── */}
        <div className="rounded-[14px] bg-white px-5 py-4 flex items-start gap-3 shadow-sm">
          <span className="text-[24px] leading-none mt-0.5">✨</span>
          <div>
            <p className="font-sans text-[14px] font-semibold text-gray-900">
              {active.length} Ereignisse erkannt
            </p>
            <p className="font-sans text-[12px] mt-0.5 leading-relaxed" style={{ color: '#9B9B9B' }}>
              {unsicherCount > 0
                ? `${unsicherCount} als unsicher markiert – bitte prüfen. Tippe auf ein Ereignis zum Bearbeiten.`
                : 'Prüfe und korrigiere bei Bedarf. Tippe auf ein Ereignis zum Bearbeiten.'}
            </p>
          </div>
        </div>

        {/* ── Stammdaten ───────────────────────────────────────────────────── */}
        <section>
          <p className="font-sans text-[10px] uppercase tracking-widest px-1 mb-2" style={{ color: '#AEAEB2' }}>
            Stammdaten
          </p>
          <div className="rounded-[16px] bg-white shadow-sm overflow-hidden">
            <StammdatenEditor value={stammdaten} onChange={setStammdaten} />
          </div>
        </section>

        {/* ── Ereignis-Liste ───────────────────────────────────────────────── */}
        <section>
          <p className="font-sans text-[10px] uppercase tracking-widest px-1 mb-2" style={{ color: '#AEAEB2' }}>
            Ereignisse
          </p>
          <div className="rounded-[16px] bg-white shadow-sm overflow-hidden">
            {active.length === 0 && (
              <p className="px-5 py-6 font-sans text-[14px] text-center" style={{ color: '#9B9B9B' }}>
                Alle Ereignisse gelöscht.
              </p>
            )}
            {active.map((e, i) => (
              <EreignisRow
                key={e._id}
                ereignis={e}
                isFirst={i === 0}
                isEditing={editingId === e._id}
                onToggle={() => setEditingId(editingId === e._id ? null : e._id)}
                onChange={(patch) => updateEreignis(e._id, patch)}
                onDelete={() => deleteEreignis(e._id)}
              />
            ))}

            {/* Hinzufügen */}
            <button
              type="button"
              onClick={addEreignis}
              className="w-full flex items-center gap-2 px-5 py-3.5 font-sans text-[14px] active:bg-gray-50 transition-colors"
              style={{ borderTop: '1px solid #F2F2F7', color: '#3C3C3E' }}
            >
              <span className="text-[20px] font-light leading-none">＋</span>
              <span>Ereignis hinzufügen</span>
            </button>
          </div>
        </section>

        {/* ── Fehler-Banner ───────────────────────────────────────────────── */}
        {saveError && (
          <div className="rounded-[14px] px-5 py-4" style={{ background: '#FFF0F0', border: '1px solid #FFCDD2' }}>
            <p className="font-sans text-[13px] font-semibold" style={{ color: '#C62828' }}>
              Fehler beim Speichern
            </p>
            <p className="font-sans text-[12px] mt-1 leading-relaxed" style={{ color: '#E53935' }}>
              {saveError}
            </p>
            <p className="font-sans text-[12px] mt-2" style={{ color: '#9B9B9B' }}>
              Deine Korrekturen sind noch vorhanden. Tippe erneut auf „Zeitstrahl übernehmen".
            </p>
          </div>
        )}

      </div>

      {/* ── Sticky Bottom Bar ────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 px-4 py-4 flex gap-3"
        style={{ maxWidth: 430, margin: '0 auto' }}>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="flex-1 py-3 rounded-[14px] font-sans text-[15px] font-medium active:opacity-70 disabled:opacity-30"
          style={{ background: '#F2F2F7', color: '#3C3C3E' }}
        >
          Verwerfen
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="flex-[2] py-3 rounded-[14px] font-sans text-[15px] font-semibold active:opacity-70 disabled:opacity-60 transition-opacity"
          style={{ background: '#1C1C1E', color: '#fff' }}
        >
          {saving
            ? <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                <span>Wird gespeichert …</span>
              </span>
            : 'Zeitstrahl übernehmen →'
          }
        </button>
      </div>
    </div>
  )
}
