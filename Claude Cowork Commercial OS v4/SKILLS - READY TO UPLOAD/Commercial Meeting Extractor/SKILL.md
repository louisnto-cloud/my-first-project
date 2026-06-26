---
name: Commercial Meeting Extractor
description: Use when a meeting transcript, recording, notes file, or agenda needs to be turned into structured commercial signal — decisions, customer asks, actions, risks, opportunities, and what changed. The conversion engine from a meeting into follow-through that lands in the Control Tower. Not for drafting the follow-up email (use Follow-Up Drafter) or building a daily brief (use Daily Brief Builder).
---

# Commercial Meeting Extractor

> Authored to the Claude Cowork Commercial OS v4 spec. The Operator Guide names this skill but does not include its body; this is written to the system's conventions. Tune to taste.

## What this skill does

Turn one meeting's raw material into clean, structured commercial signal that can land in the Control Tower workbook. One meeting in, one set of structured outputs out.

## When to use

- A new transcript, recording, notes file, or agenda has arrived.
- The Meeting Inbox Processor needs per-meeting extraction.
- You want a single meeting converted into tracker-ready items.

## When NOT to use

- Drafting the follow-up message → use **Follow-Up Drafter**.
- Building the morning brief → use **Daily Brief Builder**.
- Managing the overall open-loop hygiene across many items → use **Open Loop Manager**.

## How to extract

1. **Identify the meeting.** Confirm it is genuinely new, not another artifact (e.g. transcript + notes) of a meeting already processed. If it duplicates an existing Meeting Queue entry, say so and stop.
2. **Read for signal, not summary.** Pull out what is decided, asked, committed, at risk, or changed — not a play-by-play.
3. **Classify each item** into exactly one of:
   - **Decision** — what was decided (vs. merely discussed)
   - **Customer ask** — what the retailer / stakeholder requested
   - **Action** — internal commitment, with owner and due date if stated
   - **Risk** — what could go wrong, with severity if discernible
   - **Opportunity** — upside worth pursuing
   - **What changed** — movement since the last touchpoint
4. **Be strict about evidence.** Do not invent owners, due dates, numbers, or commitments. Mark anything inferred as inferred. Do not confuse discussion with decision.

## Output

1. **Meeting summary** — short, commercial, readable in under 2 minutes.
2. **Structured items**, grouped by type (Decisions / Customer Asks / Actions / Risks / Opportunities / What Changed), each with owner, due date, and status where known and an explicit gap flag where not.
3. **Control Tower handoff** — which tabs to update (Decision Log, Risk Register, Customer Asks, Deck Backlog, Meeting Queue), in review-copy or delta mode.
4. **Flags** — whether the meeting changed a commitment, changed the story, or created a new risk.

## Rules

- Do not overwrite master files; update in review-copy mode or create a delta.
- Do not mark anything closed without evidence.
- Do not duplicate items already logged unless status or scope materially changed.
- Do not send anything.

## Done when

The meeting's decisions, asks, actions, and risks are captured as structured items ready to land in the Control Tower — with owners, due dates, and evidence gaps made explicit.
