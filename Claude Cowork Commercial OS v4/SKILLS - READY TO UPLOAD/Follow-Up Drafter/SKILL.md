---
name: Follow-Up Drafter
description: Use to draft post-meeting and post-thread follow-up communication — recap emails, internal notes, and next-step messages — grounded in the actual decisions, asks, and commitments. Drafts only; never sends. Keeps customer-facing language professional and supportable. Not for extracting the meeting (use Commercial Meeting Extractor) or tracker hygiene (use Open Loop Manager).
---

# Follow-Up Drafter

> Authored to the Claude Cowork Commercial OS v4 spec. The Operator Guide names this skill but does not include its body; this is written to the system's conventions. Tune to taste.

## What this skill does

Draft the follow-up that closes the loop after a meeting or thread — a recap, confirmation of next steps, or an internal handoff note — grounded in what was actually decided and committed.

## When to use

- After the Commercial Meeting Extractor has produced structured items and a follow-up is useful.
- Within the Meeting Inbox Processor for the draft-follow-up step.
- "Draft me a recap / next-steps email" for a specific meeting or thread.

## When NOT to use

- Extracting the signal first → use **Commercial Meeting Extractor**.
- Cleaning up the tracker → use **Open Loop Manager**.

## How to draft

1. **Ground it** in the structured items: decisions, customer asks, actions (with owners and due dates), and what changed. Use current approved files from the File Index.
2. **Choose the form** — customer-facing recap, internal note, or next-steps message — based on the audience.
3. **Write it** professional, concise, and clear; practical, not robotic.
4. **Stay supportable** — only state what the evidence supports; do not over-commit on the user's behalf.

## Output

1. The draft (subject line + body for emails).
2. A short note of the commitments it states and their owners/dates.
3. Flags for anything sensitive that should be checked before sending.

## Rules

- Draft only — never send or publish.
- Do not invent commitments, owners, due dates, or numbers.
- Keep customer-facing drafts professional and supportable.
- Mark where the user needs to confirm a detail before sending.

## Done when

There is a clean, review-ready draft that accurately reflects the decisions and commitments, with anything risky flagged — and nothing has been sent.
