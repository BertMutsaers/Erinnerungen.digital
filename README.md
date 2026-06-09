This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 11. POLAROID-INTRO

**Komponente:** `components/PolaroidIntro.tsx`  
**Route:** `/projekte/[id]/zeitstrahl` (ganz oben, füllt den ersten Bildschirm, 100 vh)  
**Läuft bei JEDEM Aufruf** der Zeitstrahl-Seite (keine sessionStorage-Sperre).

---

### Ablauf in drei Phasen

#### Phase 1 — Ausgabe (200 ms Pre-Delay + 8 s Slide)

Die Kamera (`/polaroid-kamera.png`) ist `position: fixed; top: 0; left: 50%` am oberen Viewport-Rand fixiert:

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

---

### Voraussetzung & Long-Press

- Erscheint nur, wenn ein Profilfoto vorhanden ist (`coverUrl`). Ohne Foto: Initialen auf cremem Hintergrund (`#F5F0E8`), kein Effekt.
- **500 ms Long-Press** auf das Polaroid öffnet ein Action Sheet: „Neues Foto wählen" oder „Foto entfernen".
