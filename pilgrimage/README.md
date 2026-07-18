# 🕯️ The Pilgrimage

A bilingual (English/Tiếng Việt) companion app for anyone exploring the
Catholic faith or walking the RCIA road — framed as a pilgrimage through the
great holy places of the world: the Desert of Sinai, Jerusalem and the Holy
Land, Rome, Lourdes, and the Camino to Santiago — ending at the font of your
own parish.

> Your parish and your priest lead this journey. This app just walks beside you.

## Run it

```bash
npm install
npm run dev      # development server
npm run build    # static export to out/ (PWA, works fully offline)
```

## What's inside

- **Five worlds on the main road, fully bilingual:** the Desert (who God is),
  Jerusalem (the whole Jesus arc incl. Holy Week, Nazareth, the lake, and the
  empty tomb), Rome (the Church and the Mass, Peter's tomb, the Pietà),
  Lourdes (the seven sacraments, baptism front and center), and the Camino
  (the moral life, the liturgical year, the saints, hope, and the RCIA road)
  — plus a bonus "Saints of Asia" world (the faith's story in Việt Nam, the
  117 Martyrs, Our Lady of La Vang, St. Anê Lê Thị Thành).
- **The crown jewels:** Walk through the Mass (every moment, every response,
  every posture, EN/VI) and the Rosary trainer (bead by bead, all four
  mystery sets on their traditional days) — both in My Chapel.
- **Seven prayers** with traditional Vietnamese texts: Sign of the Cross,
  Our Father, Hail Mary, Glory Be, Apostles' Creed, Hail Holy Queen, Act of
  Contrition.
- **RCIA milestone tracker** with date entry and gentle countdowns;
  **liturgical season banner** computed from today's date; **Rose Window**
  achievements; **Daily Reliquary**; synthesized **sound layer** (bell +
  stamp thunk, off by default).

## Architecture

- Next.js (App Router, static export) + Tailwind. No backend, no accounts;
  all progress lives in localStorage with JSON export/import.
- All curriculum lives in typed content files under `src/content/`, fully
  separated from components. Every string is a paired `{en, vi, viStatus}`
  record; sacred terms follow the locked table in
  `src/content/terminology.ts`; unverified Vietnamese strings export from
  My Chapel → Settings for native review.
- Artwork is original illuminated-style SVG in a strict five-token palette
  (`SacredArt`); `src/content/artworks.ts` is ready to be backed by real
  public-domain images from Wikimedia Commons.

## Needs human review

- All Vietnamese strings marked `unverified` (export from My Chapel →
  Settings), and the Mass responses against the current Vietnamese Missal.
- Doctrinal spot-check against the cited Catechism paragraphs
  (each lesson's `deeper.ccc`).
