# Troubleshooting

## Problem: the summaries are good but nothing is actually moving

**Cause:**
The system is extracting, but not landing the output in the workbook or backlog.

**Fix:**
Run `RUN ON DEMAND/3 - Action Tracker Refresh.md` and `RUN ON DEMAND/9 - Source of Truth Refresh.md`.
Then confirm the Meeting Inbox Processor is updating the workbook or creating delta files.

## Problem: too many duplicates

**Cause:**
Meetings are being processed multiple times from different artifacts.

**Fix:**
Use the Meeting Queue properly.
One meeting should have one queue entry, even if it has multiple artifacts.

## Problem: Claude is updating the wrong file

**Cause:**
The File Index is weak or stale.

**Fix:**
Refresh the File Index and mark the current approved deck, current approved workbook, and current working copy clearly.

## Problem: scheduled tasks are not running

**Cause:**
The Claude Desktop app is closed, the computer is asleep, or the task is paused.

**Fix:**
Confirm the app is open, the machine is awake, and the task is active on the Scheduled page.

## Problem: skill quality is inconsistent

**Cause:**
The skill is too broad, or the task prompt is vague.

**Fix:**
Use the narrowest skill that matches the job.
If needed, force the skill by invoking it directly with / during setup.

## Problem: cross-app updates are failing

**Cause:**
The workbook or deck is not open, or cross-app access is not enabled.

**Fix:**
Open both files first.
Then run the task again with a very explicit output target.

## Problem: the system feels heavy

**Cause:**
Too many routines were added before the core loop was stable.

**Fix:**
Turn everything off except:

- Daily Commercial Brief
- Meeting Inbox Processor
- Friday Account Pulse

Then rebuild from there.
