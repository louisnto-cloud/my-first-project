---
name: Prompt Builder
description: Use to design a new Cowork workflow, prompt, or skill from a plain description of the job — producing a project-safe prompt, a skill description if it should become one, a schedule recommendation, the correct write mode, and success criteria. The engine behind the New Workflow Prompt Builder. Not for running an existing workflow; this designs new ones.
---

# Prompt Builder

> Optional / Full-Mode skill. Referenced by `RUN ON DEMAND/10 - New Workflow Prompt Builder.md`. Authored to the Claude Cowork Commercial OS v4 spec.

## What this skill does

Turn a one-line description of a job into a ready-to-paste Cowork workflow: a safe, well-scoped prompt plus the metadata that decides where it lives, how it runs, and how you know it worked.

## When to use

- "I want a workflow for X."
- Turning a repeated ad-hoc request into a reusable prompt or skill.
- Standardizing a prompt so it stops producing inconsistent output.

## How to build

1. **Clarify the job** in one sentence: the input, the output, and who reads it.
2. **Write the project-safe prompt** using the system's conventions:
   - start from the File Index / current approved files
   - separate confirmed facts from assumptions
   - do not invent owners, dates, or numbers
   - hand off into the Control Tower, deck backlog, or a follow-up draft
   - end with an explicit save-as name
3. **Decide if it should be a skill** — narrow and repeatable → yes; write the skill description.
4. **Recommend a cadence** — one-off, on-demand, daily, weekly, monthly — or none.
5. **Set the write mode** — pick exactly one:
   - read-only diagnostic
   - draft-only output
   - review-copy update
   - explicit overwrite only
6. **Define success criteria** — what a good run produces, and what would make it a bad run.

## Output

1. The ready-to-paste prompt
2. Whether it should be a skill, and the skill description if so
3. Schedule recommendation
4. Write mode (one of the four)
5. Success criteria (2–5 checks)
6. Where the output should land

## Rules

- Optimize for commercial usefulness, trust, low ambiguity, low duplicate work, and a strong handoff.
- Default to the safest write mode that still does the job.
- Make grounded assumptions and state them; keep the result paste-ready.

## Done when

There is a paste-ready prompt plus its schedule, write mode, and success criteria — safe to drop into Cowork without further editing.
