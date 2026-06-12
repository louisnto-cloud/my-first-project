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

## What's in Phase 1 (this build)

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
