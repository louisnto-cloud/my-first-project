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
