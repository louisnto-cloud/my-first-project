# Why This System Is Built This Way

This version is deliberately opinionated.

It is built around how Claude Cowork actually works today, and around the practical mistakes that make most AI operating systems fall apart after the first week.

## 1. The system is built around projects, not around one giant prompt

Cowork projects have their own instructions, context, memory, and project-specific scheduled tasks. That means the cleanest design is one project per account or business area, not one oversized workspace with everything mixed together.

Why that matters:
When Costco, FDM, and Sales Ops live in the same memory space, weak context leaks everywhere. One project per business area keeps the context cleaner and the outputs more trustworthy.

## 2. The system uses a workbook because prose does not compound

Meeting summaries are helpful, but summaries alone do not build an operating system.

The part that compounds is structured follow-through:

- actions
- decisions
- risks
- asks
- deck changes
- source-of-truth files

That is why the Control Tower workbook exists. It turns one-off meeting intelligence into a running commercial memory.

## 3. The workbook is now one-project-per-file on purpose

Earlier versions allowed for more multi-account flexibility, but that added friction.

This version assumes:

- one workbook per project
- one project per account or function

That removes repetitive columns, reduces clutter, and makes the file actually usable by a human. You do not need to tell the workbook that every Costco row belongs to Costco.

## 4. Skills are narrow because narrow skills are more reliable

Claude's skill system works best when each skill handles one repeatable workflow well.

That is why the pack separates:

- meeting extraction
- open-loop management
- daily briefs
- deck story work
- follow-up drafting

This is better than a giant "do everything" skill because it improves consistency and reduces accidental context bloat.

## 5. The first scheduled stack is only three tasks

This is not because more automation is impossible.
It is because more automation becomes noisy faster than most people expect.

The first three tasks cover the full operating loop:

- before meetings
- after meetings
- weekly consolidation

If those three are not clearly useful, the rest will not save you.

## 6. Review-copy mode is the default because trust matters more than speed

Cowork can work across open Excel and PowerPoint files.
That is useful.
It is also exactly where people lose trust if the system edits too aggressively.

So this system defaults to:

- read-only analysis,
- draft outputs,
- review copies,
- explicit overwrite only when you ask for it.

That makes the system slightly slower and far more usable.

## 7. Folder instructions are kept simple on purpose

Global instructions should hold your broad preferences.
Project instructions should hold the account logic.
Folder instructions should mostly define how the folder behaves.

Why not cram everything into folder instructions?
Because folder instructions can be updated by Claude during a session. If they are doing too much, they become unstable and harder to govern.

## 8. Connectors come before plugins and computer use

Use the cleanest signal path first.
That means:

1. connected systems like Microsoft 365,
2. your dedicated local folder,
3. the workbook and files in the project,
4. only then plugins or computer use when needed.

The reason is simple: cleaner inputs create more reliable outputs.

## 9. This is an accountability system first, a content system second

If you remember one thing, remember this:

The job of the system is not to create nicer notes.
The job is to make sure the important thing shows up again at the right time, in the right place, with the right owner.

That is why the design looks the way it does.
