# ⭐ Anh Ngữ E’TOP

A student progress & learning app for **Trung tâm Anh Ngữ E’TOP** (Phan Thiết, Vietnam).
Built mobile-first as a web app, with a fully bilingual Vietnamese/English interface.

> **Branding:** the official E’TOP logo shown across the app (login, header,
> favicon) is the single file `public/logo.png` — replace it to update the
> branding everywhere at once.

See [`APP_PROMPT.md`](./APP_PROMPT.md) for the full product spec.

## What's inside

| Role | What they get |
|---|---|
| 🧑‍🎓 **Student** | Dashboard with streak & points, grades with skill breakdown and progress chart, class schedule, homework checklist, vocabulary flashcards & quizzes, badges and a class leaderboard |
| 🧑‍🏫 **Teacher** | Class overview, gradebook (enter scores + comments per student), assign homework, create vocabulary lists |
| 👩‍💼 **Owner (admin)** | Everything teachers get, plus center-wide stats across all classes |
| 👨‍👦 **Parent** | Read-only view of their child's grades, schedule, homework, and badges |

## Run it

```bash
npm install
npm run dev      # development server
npm run build    # production build (also type-checks)
npx tsx scripts/smoke.ts   # sanity-check the seeded demo data
```

## Demo accounts (password: `etop123`)

| Role | Email |
|---|---|
| Student | `minh@etop.vn` |
| Parent | `phuhuynh@etop.vn` |
| Teacher | `lan@etop.vn` |
| Owner | `zhao@etop.vn` |

The app ships with a seeded demo database — 6 classes, 40 students, score
history, homework, and vocabulary lists — stored in the browser's
localStorage. The **Reset demo data** link on the teacher overview restores it.

## Architecture notes

- **Stack:** React 18 + TypeScript + Vite + Tailwind CSS + React Router.
- **Data layer:** all reads/writes go through `src/store.tsx` (`useApp()`),
  currently backed by localStorage with seed data from `src/seed.ts`. To move
  to a real backend, replace `loadDB`/`mutate` with API calls — pages and
  components don't need to change.
- **i18n:** every UI string goes through `t()` in `src/i18n.tsx` with `vi`
  and `en` dictionaries; the toggle persists per device.
- **Mobile app path:** it's a responsive SPA, ready to be wrapped with
  Capacitor or extended into a PWA (manifest + service worker) later.

---

# 🌿 Organika Vietnamese Business Academy

A single-file language learning app (`organika-academy.html`) for Vietnamese
business fluency, aimed at supplement/CPG sales work in Ho Chi Minh City.

**Live:** https://louisnto-cloud.github.io/my-first-project/organika/
(open on a phone and use Share → Add to Home Screen to install it like an app)

## What's inside

- 310+ vocabulary terms in five tiers (survival → expert trade negotiation),
  each with pronunciation guide, bilingual example, Southern-dialect note,
  and usage tip
- Practice modes: Mixed, flashcards, quiz (EN→VI / VI→EN / listen),
  type-the-answer, sentence builder, pronunciation drill, and a VND price
  listening trainer
- 12 role-play buyer dialogues with cultural notes, hide-my-lines practice,
  and hands-free Play All
- Leitner spaced repetition, streaks, daily goal, achievements, weak-spot
  analytics
- Vietnam Market Intel briefings and a pronoun/tone/register primer
- Audio: Google's Vietnamese neural voice with device-voice fallback and a
  slow toggle; progress auto-saves locally with JSON export/import

## Tech notes

- One HTML file, no build step; deployed by the `deploy-organika` job in
  `.github/workflows/deploy.yml` to `/organika` on GitHub Pages
- Vocabulary lives in the `VRAW` array (marked `ADD NEW TERMS HERE`);
  a version badge in the header (`APP_VERSION`) identifies deploys
