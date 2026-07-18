---
name: Hygiene Auditor
description: Use to audit the health of the operating system itself — tracker hygiene, File Index accuracy, duplicate meetings, stale statuses, missing owners and due dates, and drift between what was decided and what is logged. Produces a scored health report and a fix list. Not for producing commercial content; this checks that the system is trustworthy.
---

# Hygiene Auditor

> Optional / Full-Mode skill. Supports the "hygiene audits" deliverable named in the Project Instructions and the Success Scorecard. Authored to the Claude Cowork Commercial OS v4 spec.

## What this skill does

Audit whether the system is still trustworthy. This is the skill that checks the checker: it looks at the Control Tower, File Index, and meeting flow and reports where the operating discipline is leaking.

## When to use

- The summaries look good but nothing is moving.
- Duplicates, wrong-file edits, or stale trackers are creeping in.
- A periodic (e.g. monthly) health check of the system before a review.

## What to audit

1. **Action Tracker hygiene** — missing owners, missing due dates, overdue, blocked, repeatedly slipping, items marked Done without evidence.
2. **Duplicate control** — meetings processed more than once; one meeting should be one Meeting Queue entry.
3. **File Index accuracy** — is the current approved deck/workbook/forecast clearly marked? Any ambiguous "final_final" files?
4. **Decision drift** — decisions made in meetings that never landed in the Decision Log.
5. **Ask closure** — customer asks with no internal owner or action.
6. **Deck freshness** — backlog items that the story clearly needs but that are not logged.
7. **Landing rate** — are meeting outputs actually landing in the workbook, or only in prose?

## Output

1. **System health score** — a simple rating per area (Good / Watch / Fix), most urgent first.
2. **The leak** — the single biggest thing undermining trust right now.
3. **Fix list** — concrete, ordered actions, each pointing at the tab or file to touch and the on-demand prompt to run (e.g. Action Tracker Refresh, Source of Truth Refresh).
4. **Scorecard read** — where this maps to the five success measures (missed follow-ups, actions with owner+date, prep time, meeting-to-tracker time, deck freshness lag).

## Rules

- Diagnose and recommend — do not mass-edit master files as part of the audit.
- Distinguish confirmed problems from suspected ones.
- Never close or "fix" items without evidence; surface them instead.

## Done when

You know the single leak to fix first, have a scored read of each area, and have a concrete ordered fix list tied to the right prompts and files.
