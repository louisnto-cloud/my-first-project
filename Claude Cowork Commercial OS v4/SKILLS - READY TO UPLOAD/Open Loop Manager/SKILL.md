---
name: Open Loop Manager
description: Use to keep the accountability layer honest — managing open actions, customer asks, decisions, risks, and deck-backlog items across the Control Tower. Merges duplicates, flags missing owners and due dates, surfaces overdue, blocked, and slipping items, and separates customer-facing commitments from internal actions. Not for extracting a single meeting (use Commercial Meeting Extractor).
---

# Open Loop Manager

> Authored to the Claude Cowork Commercial OS v4 spec. The Operator Guide names this skill but does not include its body; this is written to the system's conventions. Tune to taste.

## What this skill does

Maintain the open loops so nothing important drifts. This is the hygiene and accountability skill: it keeps the Control Tower trustworthy across many items, rather than processing any single source.

## When to use

- Building the open-loops view during bootstrap or backfill.
- Refreshing the Action Tracker when it feels stale.
- The Monday open-loops review when too much is drifting.
- Any task that says "keep me honest about owners, due dates, and follow-through."

## When NOT to use

- Converting one meeting into items → use **Commercial Meeting Extractor**.
- Drafting a follow-up → use **Follow-Up Drafter**.

## How to manage open loops

1. **Gather** the open items across Action Tracker, Customer Asks, Decision Log, Risk Register, and Deck Backlog (current approved workbook from the File Index).
2. **Check each item:**
   - Is the owner clear?
   - Is the due date clear?
   - Is the status accurate against the latest evidence?
   - Is it overdue, blocked, or repeatedly slipping?
   - Is it customer-facing or internal-only?
   - Is it a duplicate of a materially-same item?
3. **Act:**
   - Merge duplicates that are materially the same.
   - Flag missing owners, missing due dates, overdue, blocked, and slipping items.
   - Separate customer-facing commitments from internal actions.
   - Never mark anything done or closed without evidence.

## Output

1. **Open-loops health summary** — counts: open, overdue, blocked, no owner, no due date.
2. **Needs-my-decision list** — items that cannot move without you.
3. **Stale / closable list** — items that look done, with the evidence gap noted.
4. **Recommended cleanups** — merges, re-owners, re-dates.
5. **Control Tower handoff** — which tabs to update, in review-copy or delta mode.

## Rules

- Do not overwrite master files; review-copy or delta only.
- Do not invent owners, due dates, or status changes.
- Distinguish confirmed facts from assumptions.

## Done when

Every open loop has a clear owner, due date, and accurate status — or is explicitly flagged for your decision — and duplicates are merged.
