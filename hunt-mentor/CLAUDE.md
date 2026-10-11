# CLAUDE.md: Hunt Mentor rules (every session follows these)

## What this is
- Hunt Mentor: a personal hunting school on the phone. Zero to expert.
- Static Progressive Web App (PWA: a website that installs like an app and works offline).
- Full brief: see PLAN.md. Sources: see SOURCES.md.

## How to talk to the owner
- Point form. Short lines. One idea per line. No paragraph over 3 lines.
- Plain English. Explain like they are new, never like they are slow.
- Mentor voice: calm, direct, practical.
- Give options with pros and cons, then "My lean:". The owner makes the call.
- Never assume. State every assumption as "Assumption:".
- Never guess a person's name or role. Ask.
- Work in phases. After each phase: fact check, show, wait for "go".
- End every message with the live app link (owner rule, 2026-10-11): https://louisnto-cloud.github.io/my-first-project/hunt-mentor/ (map: add #/map).
- Small build choices: decide, log in PLAN.md. Content or cost changes: ask.

## Writing style (app content and chat)
- No em dashes. No hyphens in prose: "non toxic", "step by step", "4 point buck".
  - Exceptions allowed only where the hyphen is part of an official name, code or URL.
- Spell out every acronym the first time it appears on each screen.
  - Format: "MU (Management Unit)". Every term also goes in the glossary.
- Canadian spelling. "Licence" is the noun, "license" the verb.
- Metric first. Yards in brackets where hunters use yards: "100 m (109 yd)".
- Gear: show entry, mid and premium tiers, Canadian prices, "price checked" date.

## Accuracy rules (non negotiable)
- Never invent a rule, season, bag limit, date, fee, MU number, place name or phone number.
- Can't confirm it from a source? Write VERIFY and leave the value blank.
- Source order for rules:
  1. BC Hunting and Trapping Regulations Synopsis, 2026 to 2028 edition
     (in force 1 July 2026 to 30 June 2028), plus in season updates and corrections.
  2. BC Wildlife Act and its regulations.
  3. Federal Migratory Birds Regulations, 2022, and the ECCC (Environment and
     Climate Change Canada) BC migratory bird hunting summary.
  4. Federal Firearms Act and the storage, display and transport regulations
     (RCMP, Royal Canadian Mounted Police, Canadian Firearms Program).
  5. BC Off Road Vehicle Act, BC Trespass Act, BC Parks rules, local discharge bylaws.
  6. Each other jurisdiction's official hunting regulations.
- Every rule shows: plain English, certainty %, source name, link, page or section, date checked.
- Certainty scale:
  - 95 to 100%: read directly in the official source.
  - 80 to 94%: official source, some interpretation.
  - 60 to 79%: reliable secondary source.
  - Under 60%: not a fact. Label it "Tip" or mark VERIFY.
- Tactics, tips and "Grandpa's rules" are opinion. Label them.
- Seasons, limits and fees live in `data/regs.json` plus per region season tables in `data/seasons/`,
  with a `lastChecked` date per entry.
- Every screen with rules shows the banner:
  "Study aid only. The official regulations are the law."
- Log every source in SOURCES.md.

## Session template (every content session)
- Title and minutes
- Why it matters (1 line)
- Key points (5 to 9 bullets)
- Diagram (where it helps, hand drawn SVG)
- Grandpa's rule (1 to 3 lines, labelled wisdom)
- Common mistakes (3)
- Do this in the field
- Quiz (3 to 5 questions, every answer explained)
- Sources, certainty %, date checked

## Species template
- ID (male, female, young, look alikes) / Where in BC by season and near bases /
  Senses and daily pattern / Yearly pattern / Food, water, cover / Tracks and sign /
  Tactics (options, pros, cons) / Firearm, load, max range / Shot placement diagram /
  Legal specifics / Meat care and yield / Beginner mistakes / Grandpa's rules

## Tech rules
- Static site. No backend, no accounts, no trackers, no paid services.
- One Markdown file per session in `content/`. Front matter holds metadata.
- Diagrams: hand drawn SVG only. Big clear labels.
- Photos (owner decision 2026-10-02): public domain or Creative Commons only, credit shown under each photo and on the Photo credits page. See AUTHORING.md. No other copied images.
- No runtime frameworks. Tiny vanilla JavaScript. Build step may use Node.
- Must work offline after first load. Also ship a single HTML file backup.
- User data (progress, checklists, journal) stays in the phone's local storage only.

## End of every phase
- Fact check: list every rule claim, source, certainty. Fix or mark VERIFY.
- Style check: no em dashes, no hyphens in prose, acronyms spelled out,
  point form, no paragraph over 3 lines. Run `npm run lint:style`.
- Test: airplane mode, small phone screen (360 px wide), all links, quiz scoring.
- Report: done, VERIFY list, next. Wait for "go".
