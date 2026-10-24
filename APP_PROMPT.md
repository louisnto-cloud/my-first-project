# Build Prompt — eTop English Center App

> Paste this prompt into Claude Code (or any AI coding agent) to build the app.
> It captures all the decisions made with the owner.

---

Build a **student progress and learning app** for **eTop**, an English center in
Phan Thiet City, Vietnam, owned by Zhao. The center has **50–200 students** of
**mixed ages** (kids, teens, and adults).

## Product overview

The primary users are **students**. The #1 job of the app is letting students
(and their parents) see their **grades, test scores, and learning progress**.
Teachers and the owner manage everything through a built-in **admin panel**.

Build it as a **responsive web app first**, structured so it can later ship as
a mobile app (e.g. React + Capacitor, or a PWA with offline support and
add-to-home-screen). It must work beautifully on phones, since most students
and parents will use it on a phone.

## Roles

1. **Student** (main user)
   - Dashboard: current class, next lesson, latest scores, streak, and badges.
   - **Grades & progress**: test scores, homework marks, skill breakdown
     (listening / speaking / reading / writing), teacher comments, and a
     progress chart over time.
   - **Class schedule**: upcoming classes with day, time, room, and teacher.
   - **Homework**: assigned tasks with due dates; mark as done / submit answers.
   - **Vocabulary practice**: flashcards and self-check quizzes built from the
     word lists their class is currently studying.
   - **Gamification**: daily streaks for practicing, points for completing
     homework and quizzes, badges for milestones, and an optional class
     leaderboard.

2. **Teacher / Admin** (Zhao and staff)
   - Manage classes, students, and enrollment.
   - Enter test scores, homework results, and written comments per student.
   - Create homework assignments and vocabulary lists per class.
   - Manage the weekly schedule.
   - Admin (owner) role can manage teachers and see center-wide overview stats.

3. **Parent** (read-only)
   - Linked to one or more students.
   - Can view grades, attendance/schedule, teacher comments, and progress
     charts. Cannot edit anything.

## Auth

- **Email & password** sign-in for all roles.
- Teachers/admin create student accounts (and optional linked parent accounts);
  students don't self-register.
- Password reset via email. Role-based access control on every route and API.

## Language

- **Bilingual interface: Vietnamese and English** with a visible toggle,
  remembered per user. All UI strings go through an i18n layer (vi + en).
  Default to Vietnamese for parents, English for the student learning views is
  fine, but the toggle always wins.

## Design

- **Friendly & colorful** — warm, energetic, Duolingo-like, suitable for mixed
  ages (playful but not childish). Rounded cards, cheerful illustrations or
  emoji accents, clear large typography, satisfying micro-feedback when a
  student completes homework or keeps a streak.
- eTop branding placeholder: app name "eTop English" with a simple logo slot.

## Data model (suggested)

- `users` (role: student / teacher / admin / parent; parent↔student links)
- `classes` (name, level, teacher, schedule slots: weekday, time, room)
- `enrollments` (student ↔ class)
- `assessments` (test/quiz/homework, per class, with date and max score)
- `scores` (student × assessment, score + per-skill breakdown + teacher comment)
- `homework` (class, title, description, due date) and `homework_submissions`
- `vocab_lists` (class, unit) and `vocab_words` (term, meaning vi/en, example)
- `practice_activity` (student, date, type, points) → powers streaks/leaderboard
- `badges` and `student_badges`

## Tech suggestions (adjust if better options fit)

- Frontend: React + Vite + TypeScript + Tailwind, mobile-first.
- Backend: lightweight Node/Express (or Next.js full-stack) + SQLite/Postgres.
- i18n: a simple JSON-based vi/en dictionary.
- Charts: a small chart lib for progress over time.
- Seed the database with realistic demo data: ~6 classes across levels
  (Starters, Movers, Teens A2, Teens B1, IELTS, Adults Conversation),
  ~40 students with Vietnamese names, scores history, homework, and vocab
  lists — so the app is demo-able immediately.

## V1 acceptance criteria

- A student can log in and, within two taps, see their latest grade with a
  teacher comment, their next class, and today's homework.
- A teacher can log in, pick a class, and enter a test score + comment for a
  student in under a minute.
- A parent can log in and see their child's progress chart, in Vietnamese.
- Vocabulary flashcards work and completing a session extends the streak.
- The whole UI switches between Vietnamese and English with one toggle.
