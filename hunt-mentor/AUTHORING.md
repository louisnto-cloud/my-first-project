# AUTHORING.md: how to write a Hunt Mentor session

Read CLAUDE.md first (voice, style, accuracy). This file is the file format.
Look at `content/phase1/02-licences.md` as the model example.

## File
- One Markdown file per session: `content/phase<N>/<NN>-<slug>.md` (species: `content/phase4/`).
- Front matter (exact keys):
```
---
id: short-unique-slug
phase: 4
num: 1
title: Mule deer
minutes: 15
checked: 2026-10-01
---
```

## Body
- Text before the first `## ` is screen 1. Each `## Heading` starts a new screen (one screen = one phone page, keep each short: 3 to 9 bullets).
- `### Sub heading` allowed inside a screen.
- Bullets `- `, numbered `1. `, nested by 2 spaces. Tables with `|`.
- Certainty badge: write `(85%)` right after a fact. Every factual line gets one.
- `VERIFY` (capitals) auto highlights. Use when not confirmed.
- Glossary link: `[[MU]]` or `[[MU|Management Unit]]`. Only for terms in `content/glossary.md`. If you need a new term, list it in your final report (do NOT edit glossary.md).
- Links: `[text](https://...)`.
- Callouts (block quotes with a type):
  - `> [!why]` one line why it matters (start of every session)
  - `> [!rule]` Grandpa's rule (wisdom, not law)
  - `> [!mistake]` 3 common mistakes as bullets
  - `> [!field]` do this in the field
  - `> [!lean]` my lean (opinion)
  - `> [!tip]` tip (opinion)
  - `> [!warn]` safety or legal warning
  - `> [!law]` a rule statement
- Checklist (ticks saved on phone; id must be unique across the app):
````
```checklist unique-id
Item one
Item two
```
````
- Diagram: draw an SVG yourself in `diagrams/<name>.svg`, then embed:
````
```diagram name
```
````
  - SVG rules: `viewBox` set, no width/height attributes, no external refs, no copied art. Big labels (font-size >= 14 in a ~400 wide viewBox), `font-family="sans-serif"`. Colours: ink #23261f, moss #2f3a2b, sage #8a9a6b, bark #6b4f35, accent #e8590c, paper #fffaf0 (diagrams sit on a light card in both themes). Every shape has an explicit fill.
- Quiz (last block in file), JSON array, `answer` is the 0 based index, `why` explains:
````
```quiz
[{"q": "Question?", "options": ["A", "B", "C"], "answer": 1, "why": "Because..."}]
```
````

## Required screens (CLAUDE.md template)
Why it matters, key points, diagram where it helps, Grandpa's rule, common mistakes, do this in the field, quiz (3 to 5), Sources (with links, certainty, date checked).

## Style gate
- No em dashes. No hyphens in prose ("non toxic", "4 point", "white tailed"). Official codes like MU 3-19 are allowed.
- Spell out each acronym the first time per session.
- Run `node build.mjs` from `hunt-mentor/`. It must print no "Style lint" lines. Fix any it reports.

## Accuracy
- Rules (seasons, limits, fees, legal methods): official sources only. The gov.bc.ca and canada.ca sites are blocked from this environment; you may cite search result previews of official pages, but cap certainty at 85% and say "(search preview)" in Sources. Never invent dates, limits, fees, MU numbers, place names or phone numbers. Write VERIFY instead.
- Biology and skills: cite real sources. Label hunter lore and opinion as Tip or Grandpa's rule.

## Photos (added 2026-10-02)
- Real photos are allowed ONLY if public domain, CC0, CC BY or CC BY-SA (any version). Never CC BY-NC, CC BY-ND, "all rights reserved", or unknown licence. Government of Canada and BC government photos are Crown copyright: do not use.
- Source of choice: Wikimedia Commons API (`https://commons.wikimedia.org/w/api.php`, prop=imageinfo, iiprop=url|extmetadata, iiurlwidth=900). Read `LicenseShortName`, `Artist`, `LicenseUrl`, `descriptionurl` from extmetadata. Send a User-Agent header.
- Files: `photos/<id>.jpg` (max 900 px wide, JPEG quality about 75, aim under 120 KB) and `photos/sm/<id>.jpg` (480 px wide, quality about 62, used inside the single file backup). Make both with Pillow.
- Manifest: one JSON array per topic in `data/photos/<topic>.json`. Entry keys: `id` (lowercase, letters, digits, hyphens), `species`, `caption` (plain English, what to look at), `author` (plain text, no HTML), `licence` (e.g. "CC BY 2.0", "Public domain", "CC0"), `licenceUrl`, `source` (the Commons file page URL), optional `card: true` with `cardBack` (and `cardFront`, `cardDeck`) to make a flashcard.
- Use in a session: a fenced block on its own lines:
````
```photo mule-deer-buck
```
````
  Optional caption override after the id on the same line. The build adds the credit line automatically.
- Look at every photo with the Read tool before using it: right species, right sex or age for the caption, clear and in focus, animal fills the frame, no captions burned into the image, no obvious captive setting unless the caption says so.
- Photos are illustrations. ID clues in the text stay the source of truth.

- Gallery (several photos on one screen, 2 per row). Put ids on the first line, or one `id | caption` per line:
````
```gallery
mule-deer-buck | Buck, side view. Note the forked antlers.
mule-deer-doe | Doe, front view. Big ears, black tipped tail.
```
````
  A gallery counts as most of a screen. Put 2 to 6 photos in one, then start a new `## ` screen.
- Habitat and sign photos count too: the plants deer browse, the slough a mallard lands on, a track in mud, a rub, a bed. Caption what to look at, in plain words.

## Rule Book sessions (phase 7, added 2026-10-02)
- Purpose: the app carries the rules themselves. Never write "check the synopsis", "see the regulations" or "refer to the book" in place of content. Give the rule, then the source.
- Source: the official synopsis, 2 October 2026 edition (printed page = PDF page minus 2). Cite like "(99%, page 11, 2 October 2026 edition)". Rules from other official texts: cite the section.
- Exact official wording goes in a `> [!law]` callout, in quotation marks, verbatim. Follow it with one plain English line.
- Season tables: Markdown tables with columns Species | MUs | Class | Season | Notes, one table per species. Bag limits in a separate table. Check every cell against the page image (make one with `pdftoppm -r 110 -f N -l N file.pdf out`) and the page text. A cell you cannot read: write VERIFY, never guess.
- Maps: name the map (Map C7) and give its boundary in the synopsis words. Never invent a boundary.
- Screen 1 of every rule book session starts with `> [!warn] Study aid only. The official regulations are the law.` and the edition date.
- Certainty: 99% for a direct read, 85 to 95% for your reading of a rule (say "my reading").
