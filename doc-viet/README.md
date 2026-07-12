# Đọc & Viết — Zero to Expert 🪷

A standalone web app that teaches an English speaker to **read and write Vietnamese**, from absolute zero to expert, over a 6-month programme. Mobile-first, no login, no backend — all progress lives in `localStorage`.

## Run it

```bash
cd doc-viet
npm install
npm run dev      # local dev server
npm run build    # type-check + production build (dist/)
```

## What's inside

- **📚 Learn** — 33 lessons across 6 months (chữ Quốc ngữ alphabet → the six tones → syllables & spelling rules → sentences, pronouns & politeness → từ ghép/từ láy/Hán Việt → figurative language & register → news, essays and a 300-word capstone). Sequential month unlocking plus a 12-question placement test.
- **📖 Library** — 12 graded Vietnamese stories (2 per level) with karaoke read-along highlighting, tap-any-word audio, per-story vocabulary and English comprehension quizzes.
- **🔁 Review** — spaced-repetition deck built from lesson key words + story vocab. Multiple-choice first; words graduate to typed recall (diacritics required, with a "check your tone marks" hint). Plus flashcards with Again/Got-it cycling.
- **⭐ Me** — XP levels (Người mới 🐣 → Chuyên gia 🎓), 14-day streak calendar, badges, printable graduation certificate.

## Vietnamese-specific details

- Audio uses the browser SpeechSynthesis API with `lang: 'vi-VN'`; a visible notice appears if no Vietnamese voice is installed.
- Dictation and typed recall compare **with diacritics**; a tappable helper row provides ă â đ ê ô ơ ư and applies the five tone marks to the last vowel.
- The six-tone lesson ships a tap-to-hear board for the classic *ma mà má mả mã mạ* sextet.
- XP is guarded by a one-time award ledger, so answers can never be re-farmed.
