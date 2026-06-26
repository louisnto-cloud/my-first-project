# Start Here: 30-Minute Setup

This is the short path.

Do not try to install everything on day one. The whole point of this version is that it works in layers.

## What you are building

You are building a closed commercial loop:

> meeting or file comes in
> → Claude extracts the signal
> → the signal lands in one reliable place
> → the right items resurface on a schedule
> → the next meeting, deck, or decision starts with current context

That loop is what saves time. Not the summaries by themselves.

## The minimum viable setup

Use one Cowork project for one business area.

For the first pilot, use:

- one project: Costco
- one workbook: `Commercial_Control_Tower_Template_v2.xlsx`
- five skills: Meeting Extractor, Open Loop Manager, Daily Brief Builder, Deck Story Builder, Follow-Up Drafter
- three scheduled tasks: Daily Commercial Brief, Meeting Inbox Processor, Friday Account Pulse

That is enough to tell you whether the system is working.

## The actual 30-minute sequence

### Minutes 1 to 5
Update Claude Desktop and confirm Cowork is available.
If you use Microsoft 365, connect that first.
If you use Slack for real internal decisions, connect Slack second.
Do not install random plugins before the core workflow is stable.

### Minutes 6 to 10
Create a dedicated local folder for the Costco pilot.
Use this shape:

- `/01 Inbox`
- `/02 Control Tower`
- `/03 Meetings`
- `/04 Decks`
- `/05 Workbooks`
- `/06 Briefs and Reviews`
- `/07 Reference`

Put the workbook template into /02 Control Tower.

### Minutes 11 to 15
Create a Cowork project from that folder.
Paste in:

- `COPY INTO CLAUDE/Global Instructions.md`
- `COPY INTO CLAUDE/Folder Instructions.md`
- `COPY INTO CLAUDE/Project Instructions - Generic.md`
- `COPY INTO CLAUDE/Account Overlay - Costco.md`

Do not merge everything into one giant instruction block. Keep the stack clean.

### Minutes 16 to 20
Install the five core skills from SKILLS - READY TO UPLOAD.
Do not upload every optional skill yet.
You want the smallest toolset that still solves the job.

### Minutes 21 to 25
Run these two setup tasks manually:

- `SETUP TASKS/1 - Account Bootstrap.md`
- `SETUP TASKS/2 - Historical Backfill.md`

These create the first usable context layer.

### Minutes 26 to 30
Schedule these three tasks:

- `SCHEDULE THESE/1 - Daily Commercial Brief.md`
- `SCHEDULE THESE/2 - Meeting Inbox Processor.md`
- `SCHEDULE THESE/3 - Friday Account Pulse.md`

Then stop.
Use the system for one week before adding more automation.

## What good looks like after week one

You should see five improvements:

1. You prepare faster for meetings.
2. You miss fewer follow-ups.
3. You know what changed since the last touchpoint.
4. Your deck backlog becomes visible instead of living in your head.
5. Your open commitments stop drifting.

If those five things are not improving, do not add more prompts. Fix the workflow that is leaking.

## What not to do

- Do not schedule customer-facing sends.
- Do not let Claude overwrite master files by default.
- Do not give broad folder access if a dedicated working folder will do.
- Do not judge the system by how polished the prose is.

Judge it by whether it improves follow-through and decision quality.

## The fastest pilot path

Costco first.
Then FDM.
Then Sales Ops.

That order matters because it forces the system to prove itself on real account work before it spreads.
