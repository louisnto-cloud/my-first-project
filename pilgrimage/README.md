# 🕯️ The Pilgrimage

A personal, bilingual (English/Tiếng Việt) companion app for Jao's OCIA journey —
a pilgrimage through the real churches she has stood inside, from St. Joseph's
Cathedral in Hà Nội toward the baptismal font.

> Your parish and Father Matthew lead this journey. This app just walks beside you.

## Run it

```bash
npm install
npm run dev      # development server
npm run build    # static export to out/ (PWA, works fully offline)
```

## What's inside (Phases 1–4 complete)

- **Five worlds, 50 lessons, fully bilingual:** Hà Nội (who God is), Bruges
  (the whole Jesus arc incl. Holy Week), Paris (the Church and the Mass),
  Brussels (the seven sacraments, baptism front and center), her parish
  (the moral life, the liturgical year, the saints, hope, and her OCIA road)
  — plus three bonus worlds unlocked along the way: "Saints of Asia"
  (the 117 Martyrs, Our Lady of La Vang, St. Anê Lê Thị Thành), "The
  Holy Land" (Nazareth, the lake, the empty tomb), and "The Vatican"
  (Peter's tomb, the Pietà, Cardinal Nguyễn Văn Thuận).
- **The crown jewels:** Walk through the Mass (every moment, every response,
  every posture, EN/VI) and the Rosary trainer (bead by bead, all four
  mystery sets on their traditional days) — both in My Chapel.
- **Seven prayers** with traditional Vietnamese texts: Sign of the Cross,
  Our Father, Hail Mary, Glory Be, Apostles' Creed, Hail Holy Queen, Act of
  Contrition.
- **OCIA milestone tracker** with date entry and gentle countdowns;
  **liturgical season banner** computed from today's date; **Rose Window**
  achievements; **Daily Reliquary**; synthesized **sound layer** (bell +
  stamp thunk, off by default).

## Phase 1 details (the spine)

- **Three destinations, ever:** Today (one step, one button), The Road (the
  illuminated atlas map + Pilgrim's Passport), My Chapel (candles, prayers,
  journal, settings).
- **World 1 · Hà Nội — "Beginning":** 7 lessons + a Vigil, fully written in
  English and Vietnamese. Who is God, creation, the dignity of the person,
  prayer (hers is affirmed, not corrected), the Our Father, the family altar
  and the communion of saints, and the Vietnamese Martyrs.
- **Lesson player:** door → story cards → gentle questions (choice, predict,
  order, fill, match, tap-the-art) → a treasure → the candle ritual. Nothing
  punishes; wrong answers reveal the right one warmly and move on.
- **Pilgrim's Passport** with the Hà Nội stamp: stamp-press + ink-bleed
  animation when the Vigil is completed.
- **Candle streak** with no guilt mechanics; resume-anywhere persistence in
  localStorage; JSON export/import; PWA manifest + service worker.
- **Bilingual system:** every string is a paired `{en, vi, viStatus}` record;
  sacred terms follow the locked table in `src/content/terminology.ts`;
  unverified Vietnamese strings export from My Chapel → Settings for native
  review.

## Architecture

- Next.js (App Router, static export) + Tailwind. No backend, no accounts.
- All curriculum lives in typed content files under `src/content/`, fully
  separated from components.
- Artwork is original illuminated-style SVG in the five-token palette
  (`SacredArt`); `src/content/artworks.ts` is ready to be backed by real
  public-domain images from Wikimedia Commons (network policy blocked
  downloads in the build environment).

## Needs human review before Phase 2

- All Vietnamese strings marked `unverified` (export the list from
  My Chapel → Settings → Vietnamese review list).
- Doctrinal spot-check against the cited Catechism paragraphs
  (each lesson's `deeper.ccc`).
