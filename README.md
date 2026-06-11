# erinnerungen.digital — Projektdokumentation

Next.js-App für digitale Erinnerungsbücher (EB). Nutzer können Lebensgeschichten, Zeitstrahlen, Fotos und Geschichten erfassen und optional per privatem Link teilen.

---

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL, RLS, Storage, Auth) |
| Supabase Client | `@supabase/ssr` (SSR-sicher) |
| KI | Anthropic SDK (`@anthropic-ai/sdk`), `claude-haiku-4-5-20251001` |
| Schriften | Playfair Display (Überschriften), System-Sans |
| Deployment | geplant: Vercel |

---

## 1. Authentifizierung

### Methode
E-Mail + Passwort via Supabase Auth (`signInWithPassword`, `signUp`, `resetPasswordForEmail`).

### Flows

#### Registrierung
1. `signUp()` mit `emailRedirectTo: ${origin}/auth/callback?next=/dashboard`
2. E-Mail-Bestätigung ist **aktiv** in Supabase („Confirm email").  
   → Nach `signUp()` wird geprüft ob `data.session === null`:  
   - `null`: Bestätigungs-Screen mit Resend-Button (Cooldown: 60 s)
   - Session vorhanden (Bestätigung deaktiviert): direkt zu `/dashboard`
3. Bestätigungs-Link → `/auth/callback` → `/dashboard`
4. Login fängt „E-Mail noch nicht bestätigt" ab und zeigt eine deutsche Fehlermeldung.

#### Login
Standard `signInWithPassword`. Bei Fehler deutsche Meldung. Nach Erfolg → `redirectTo` (Query-Param) oder `/dashboard`.

#### Logout
`signOut()` → `window.location.href = '/'` (Landing-Page).

#### Passwort-Reset
1. „Passwort vergessen?" → `resetPasswordForEmail(email, { redirectTo: ${origin}/auth/callback?next=/auth/reset })`
2. Nutzer klickt Link → `/auth/callback` → `/auth/reset`
3. `/auth/reset`: Formular für neues Passwort (`updateUser({ password })`)

#### Auth-Screen-Tabs
`/auth?tab=register` → öffnet auf „Registrieren"  
`/auth` oder `?tab=login` → öffnet auf „Anmelden"

Verwendung auf der Landing-Page:
- „Kostenlos starten" → `/auth?tab=register`
- „Anmelden" → `/auth`

### Seitenschutz

**Zwei Ebenen:** Middleware (Server-Side Redirect) + RLS (Datenbankebene).

#### Middleware (`middleware.ts`)
Öffentliche Routen (kein Auth nötig):
```
/            (Landing-Page)
/auth/*      (Login, Register, Reset, Callback)
/demo/*      (Demo-Modus)
/teilen/*    (Öffentliche EB-Freigabe per Token)
/projekte/c0000000*  (Legacy-Demo-Route)
```
Alle anderen Routen → Redirect zu `/auth?redirect=<ursprünglicher-Pfad>`.

Eingeloggte Nutzer auf `/auth` → Redirect zu `/dashboard`.

#### RLS
Alle Tabellen (`projects`, `books`, `memories`, `stories`, `media`, `albums`, `profiles`) haben Row Level Security. Schreib-Zugriff nur für den Besitzer. Lese-Zugriff auf geteilte Inhalte nur via SECURITY DEFINER-RPCs (siehe Abschnitt 3).

### Offener Punkt — SMTP ⚠️
Der eingebaute Supabase-Mail-Versand ist stark rate-limited (nur wenige Mails/Stunde) und ausschließlich für Tests geeignet. Vor Live-Gang eigenen SMTP-Dienst eintragen (Supabase Dashboard → Authentication → Settings → SMTP Settings), z.B. Resend, Postmark oder SendGrid.

---

## 2. Benutzerkonto & Onboarding

### Tabelle `profiles`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `vorname` | text | |
| `nachname` | text | |
| `anzeigename` | text | optionaler Überschreiber für Begrüßung |
| `avatar_url` | text | URL inkl. Cache-Buster `?v=<timestamp>` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | auto-update via Trigger |

**RLS:** Policy „Eigenes Profil" — `auth.uid() = id` (alle Operationen).  
**Auto-Anlage:** Trigger `on_auth_user_created` auf `auth.users` legt nach jeder Registrierung automatisch eine leere `profiles`-Zeile an (migration_023).

Speichern: immer per `upsert({ id, vorname, nachname, anzeigename }, { onConflict: 'id' })`.

### /konto-Seite (`app/konto/`)
- Vorname, Nachname, Anzeigename bearbeiten
- E-Mail: read-only
- Avatar-Upload: Browser-Resize auf 400×400 JPEG (`resizeAvatarImage` aus `lib/resizeImage.ts`), Bucket `avatars`, Pfad `${user.id}/avatar.jpg`
- Abmelden-Button

### Onboarding für neue Nutzer (`components/OnboardingScreen.tsx`)
Erscheint auf dem Dashboard, wenn `profile.vorname` leer ist.
- **Vorname ist Pflichtfeld** — kein „Später"-Link, kein Überspringen
- Felder: Vorname*, Nachname (optional), Anzeigename (optional)
- Kein Avatar-Upload hier (→ in /konto ergänzbar)
- Nach Speichern: `window.location.href = '/dashboard'` (Server liest frisches Profil → Onboarding erscheint nie wieder)
- Bestehende Nutzer mit gesetztem Vorname sehen es nie

### Ansprache-Fallback (überall einheitlich)
```
anzeigename.trim()  →  vorname.trim()  →  neutrales „Guten Tag" (kein Name)
```
**Wichtig:** `anzeigename` wird **nicht** automatisch mit dem Vornamen befüllt. Das Feld bleibt leer in der DB, wenn der Nutzer nichts einträgt. Der Fallback auf den Vornamen passiert nur bei der **Anzeige**. Kein E-Mail-Prefix (`user.email.split('@')[0]`) mehr.

---

## 3. Öffentliches Teilen (geheimer Link)

### Schema (migration_025 + migration_026)
Neue Spalten auf `projects`:
| Spalte | Typ | Beschreibung |
|---|---|---|
| `share_token` | text unique | nicht-ratbarer Zufalls-Token |
| `shared_at` | timestamptz | Zeitpunkt der ersten Token-Erstellung |
| `share_active` | boolean NOT NULL DEFAULT false | An/Aus-Schalter ohne Token-Verlust |

Index: `idx_projects_share_token` auf `(share_token) WHERE share_token IS NOT NULL`.

### SECURITY DEFINER RPCs
Anonyme Besucher haben **keinen direkten Tabellenzugriff**. Alle öffentlichen Lesezugriffe laufen über RPCs, die intern `share_active = true` prüfen:

| Funktion | Gibt zurück |
|---|---|
| `get_project_by_share_token(p_token)` | `setof projects` |
| `book_id_for_share_token(p_token)` | `uuid` (interne Hilfsfunktion) |
| `get_memories_by_share_token(p_token)` | `setof memories` |
| `get_stories_by_share_token(p_token)` | `setof stories` |
| `get_media_by_share_token(p_token)` | `setof media` |
| `get_albums_by_share_token(p_token)` | `setof albums` |

### Öffentliche Ansicht
Route: `/teilen/[token]/*` — Zeitstrahl, Geschichten, Ereignisse, Medien, Alben als read-only (kein Bearbeiten, keine PrivatNav).

### Steuerung im EB-Editor (`components/ProjectEditSheet.tsx`)
- iOS-Toggle: „Öffentlich über privaten Link" → setzt `share_active`
- Token wird beim ersten Aktivieren generiert, beim Deaktivieren **nicht gelöscht** (Token bleibt → Re-Aktivierung stellt denselben Link wieder her)
- „Link kopieren"-Button (nur sichtbar wenn aktiv), Clipboard-Fallback für HTTP

### Dashboard-Kennzeichen
Globus-Icon auf EB-Karte wenn `share_active = true`.

### API-Routen
- `GET /api/share?projectId=` — Token-Status abfragen
- `POST /api/share` — Actions: `enable`, `disable`, `create`, `regenerate`
- `DELETE /api/share` — Token löschen

### Abgrenzung
Eine separate öffentliche **Galerie** (Suche, Entdecken) ist **nicht** Teil dieser Funktion — eigenes späteres Feature mit eigenem Schalter.

---

## 4. KI-Erstellungs-Flow für neue Erinnerungsbücher

### Etappe A — Neue EB-Maske (`app/projekte/neu/page.tsx`)
Felder für den Typ „Person":
- Vorname (Pflicht), Nachname (Pflicht)
- Profilfoto (optional, `resizeProfileImage` → 400×400 JPEG, Bucket `profile-photos`, Pfad `${projectId}/profile.jpg`)
- Freitextfeld „Was du weißt" (optional, min-height 180px)

Datum-/Ortsfelder werden **nicht** mehr in der Maske abgefragt (bleiben in DB, nullable — Etappe B extrahiert sie aus dem Freitext).

Nach Anlage:
- `projects.rohtext` = Freitext (migration_027: `alter table projects add column if not exists rohtext text`)
- `books.cover_url` = Profilfoto-URL (direkt im `books.insert` — nicht per separatem upsert)
- Redirect: `window.location.href = /projekte/${projectId}/zeitstrahl`

### Etappe B — KI-Extraktion (`app/api/extract-rohtext/route.ts`)
- Liest `projects.rohtext` nach Ownership-Check (`user_id = auth.uid()`)
- Ruft `claude-haiku-4-5-20251001` mit deutschem System-Prompt auf (max_tokens: 8192)
- Extrahiert: `stammdaten` + `ereignisse` als JSON
- Erfindет nichts; markiert Unsicheres mit `unsicher: true`; ungenaue Daten als `datum_text` / `hat_datum: false`
- Ergebnis liegt nur im State (`kiResult`) — **kein DB-Write**

Extrahierte Typen (exportiert aus der Route):
```ts
ExtractedStammdaten { geburtsdatum_text, geburtsdatum_jahr, geburtsort,
                      sterbedatum_text, sterbedatum_jahr, sterbeort, bio }
ExtractedEreignis   { titel, datum_jahr, datum_monat, datum_tag, datum_text,
                      hat_datum, kategorie, beschreibung, unsicher }
Kategorie = 'kindheit' | 'ausbildung' | 'militaer' | 'wanderjahre' |
            'familie' | 'beruf' | 'sonstiges'
```

### Etappe C — Review-Screen (`components/KiReviewScreen.tsx`)
- Stammdaten-Editor: alle Felder direkt editierbar
- Ereignis-Liste: Tap → aufgeklappter Editor (Titel, Jahr, Datumstext, Kategorie-Chips, Beschreibung, Unsicher-Checkbox)
- „geschätzt"-Badge (gelb) bei `unsicher: true`
- Ereignisse löschen / hinzufügen
- Alles nur im State — **kein DB-Write bis zur Bestätigung**

### Etappe D — Speichern (`app/api/save-ki-result/route.ts`)
Beim Klick auf „Zeitstrahl übernehmen":
1. `UPDATE projects` — Stammdaten (nur gesetzte Felder; Jahreszahl ggf. aus Datumstext extrahiert)
2. `UPDATE books` — `description` = Bio (nicht-kritisch, Fehler nur geloggt)
3. `INSERT memories` — Batch-Insert aller Ereignisse (ein einziger DB-Request)

**Mehrfach-Klick-Schutz:** `if (saving) return`-Guard.  
**Fehlerfall:** `projects`-Update ist idempotent → Nutzer kann wiederholen.  
**`rohtext` bleibt erhalten** — wird nicht gelöscht.

Mapping Ereignis → Memory:
| Ereignis-Feld | memories-Spalte |
|---|---|
| `titel` | `title` |
| `beschreibung` | `body` |
| `datum_jahr/monat/tag` | `datum_jahr/monat/tag` + `happened_at` (ISO-Datum) |
| `datum_text` | `datum_label` |
| `kategorie` | `kategorie` |
| Icon nach Kategorie | `icon` |
| `'medium'` | `card_size` (Default) |

---

## 5. Design & UI

### Designsystem
- **Monochrom** (Schwarz/Weiß/Grau), Akzent: keine Farben außer Fehler-Rot
- **Playfair Display** für Überschriften, System-Sans für Fließtext
- max-width `430px` (Mobile-First), Cards mit `rounded-[16px]`, `bg-[#F2F2F7]` als Seiten-BG

### Dashboard-Grid
- Mobil: 2 Spalten
- Ab md: 3 Spalten, ab lg: 4, ab xl: 5
- CSS-Klasse `.dashboard-grid` in `globals.css`
- Typ-Label auf EB-Karten entfernt

### Navigations-Logik
- Logo → im eingeloggten Bereich immer zum `/dashboard`
- Eingeloggte Nutzer auf `/` werden von der Middleware **nicht** umgeleitet (Middleware tut das nicht für `/`; die Landing-Page selbst prüft den Auth-Status und leitet ggf. weiter)
- Logout → `/` (Landing-Page)

---

## 6. Datenbankstruktur (Übersicht)

Migrationen: `supabase/migration_001.sql` bis `migration_027.sql`.

### Wichtige Tabellen
| Tabelle | Zweck |
|---|---|
| `profiles` | Nutzerprofil (vorname, nachname, anzeigename, avatar_url) |
| `projects` | Erinnerungsbuch-Metadaten (titel, typ, cover_url, rohtext, share_token, share_active, Stammdaten) |
| `books` | Verknüpfung Nutzer ↔ Projekt (id = project_id), title, description, cover_url |
| `memories` | Zeitstrahl-Einträge (title, body, datum_*, kategorie, card_size, icon) |
| `stories` | Geschichten/Texte zu einem EB |
| `media` | Fotos/Videos (url, album_id, book_id) |
| `albums` | Fotoalben (titel, datum_*, cover_url, book_id) |

### Storage-Buckets
| Bucket | Inhalt | Pfad |
|---|---|---|
| `profile-photos` | Profilfotos neuer EB-Flow | `${projectId}/profile.jpg` |
| `avatars` | Nutzer-Avatare (/konto) | `${user.id}/avatar.jpg` |
| `memory-photos` | Zeitstrahl-Fotos | — |

---

## 7. API-Routen (Übersicht)

| Route | Methoden | Beschreibung |
|---|---|---|
| `/api/share` | GET, POST, DELETE | Share-Token verwalten |
| `/api/analyze-memory` | POST | KI-Analyse für neue Memories (Freitext → Einträge) |
| `/api/extract-rohtext` | POST | KI-Extraktion aus EB-Freitext (Etappe B) |
| `/api/save-ki-result` | POST | Extrahierte Daten in DB speichern (Etappe D) |
| `/auth/callback` | GET | Supabase Auth-Callback (nach E-Mail-Bestätigung / Passwort-Reset) |

---

## 8. Offene Punkte / Nächste Schritte

| Thema | Status |
|---|---|
| **SMTP** ⚠️ | Vor Live-Gang eigenen Mail-Dienst in Supabase eintragen (Resend / Postmark / SendGrid). Aktuell nur Test-Rate-Limit. |
| **Frischer Account testen** | Passwort-Reset, Registrierung + Onboarding-Durchlauf mit echtem Account (sobald Mail-Limit frei). |
| **Supabase Redirect-URLs** | Produktions-Domain eintragen: `https://<domain>/auth/callback` und `https://<domain>/**`. Aktuell nur `localhost:3000`. |
| **Öffentliche Galerie** | Separates Feature (Entdecken/Suche) — noch nicht begonnen. Eigener Schalter, unabhängig vom privaten Teilen-Link. |
| **Deployment** | Vercel geplant, noch nicht eingerichtet. |

---

## 11. POLAROID-INTRO

**Komponente:** `components/PolaroidIntro.tsx`  
**Route:** `/projekte/[id]/zeitstrahl` (ganz oben, füllt den ersten Bildschirm, 100 vh)  
**Läuft bei JEDEM Aufruf** der Zeitstrahl-Seite (keine sessionStorage-Sperre).  
**Kamera-Grafik:** `/public/polaroid-kamera2.png` (941 × 289 px)

---

### Ablauf in drei Phasen

#### Phase 1 — Ausgabe (200 ms Pre-Delay + 8 s Slide)

Die Kamera (`/polaroid-kamera2.png`) ist `position: fixed; top: 0; left: 50%` am oberen Viewport-Rand fixiert:

| Eigenschaft | Wert |
|---|---|
| Breite | `min(117vw, 506px)` |
| Horizontaler Versatz | `translateX(calc(-50% - 8px))` — Output-Schlitz über Polaroid-Mitte |
| z-index | 100 |

Das Polaroid startet bei `translateY(-80vh)` (komplett hinter der Kamera verborgen).  
Nach `200 ms` Pre-Delay (damit der Browser die Ausgangsposition rendert) löst `ejectSlid = true` folgende CSS-Transition aus:

```
transition: transform 8000ms cubic-bezier(0.16, 1, 0.3, 1)
```

Das Polaroid gleitet in **8 s** mit sanftem Ease-Out von `−80 vh` auf `translateY(0)` (Bildschirmmitte).  
**Polaroid-Maße:** `width: 88vw`, max. `380px`, Padding `16px 16px 52px 16px`.

---

#### Phase 2 — Apparat fährt weg (1,2 s)

Startet **8,2 s** nach Mount (`EJECT_START_DELAY 200 ms + EJECT_DURATION_MS 8000 ms`):

```
transition: transform 1200ms ease-in   →   translateX(calc(-50% - 8px)) translateY(-110%)
```

Die Kamera verlässt den Viewport nach oben. Nach weiteren 1,2 s (`cameraPhase = 'done'`) wird das `<img>` der Kamera aus dem DOM entfernt.

---

#### Phase 3 — Entwicklung (20 s / 28 s, parallel)

Startet **9,35 s / 9,5 s** nach Mount (Phase 1 + Phase 2 + 150 ms / 300 ms Buffer).

Drei deckungsgleich gestapelte `<img>`-Ebenen desselben Profilfotos (inline `position: absolute, inset: 0`):

| Ebene | CSS-Filter | Opacity | Transition |
|---|---|---|---|
| **Base** | `brightness(2.6) contrast(0.15) saturate(0) sepia(0.5)` | immer `1` (blass/überbelichtet) | — |
| **P1** | `brightness(1.3) contrast(0.7) saturate(0.6) sepia(0.15)` | `0 → 1` | `opacity 20s ease-out`, startet +150 ms nach Phase-2-Ende |
| **P2** | `none` (Normalbild) | `0 → 1` | `opacity 28s ease-out`, startet +300 ms nach Phase-2-Ende |

P1 und P2 laufen parallel. Nach ca. 20 s mittlere Entwicklung, nach ca. 28 s vollständig entwickelt.

---

### Profilfoto & Cache-Busting

Beim Upload wird die URL mit `?v=<timestamp>` gespeichert (`books.cover_url` + `projects.cover_url`).  
Damit bezieht `usePerson` beim nächsten Seitenaufruf immer die neue Bildversion — Browser-Cache-Miss garantiert.

**Konsistenz:** Neuer EB-Flow schreibt `cover_url` direkt im `books.insert` — nicht per separatem upsert. `books.cover_url` und `projects.cover_url` müssen übereinstimmen; Dashboard liest `projects.cover_url`, Polaroid liest `books.cover_url` via `usePerson`.

---

### Voraussetzung & Long-Press

- Erscheint nur, wenn ein Profilfoto vorhanden ist (`coverUrl`). Ohne Foto: Initialen auf cremem Hintergrund (`#F5F0E8`), kein Effekt.
- **500 ms Long-Press** auf das Polaroid öffnet ein Action Sheet: „Neues Foto wählen" oder „Foto entfernen".
