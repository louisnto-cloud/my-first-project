# Control Tower Workbook — Data Dictionary

`Commercial_Control_Tower_Template_v2.xlsx` is the operational landing zone for the system. One workbook per project. Put it in `/02 Control Tower` in the project folder and mark it as the approved source of truth in the File Index tab.

Rebuild it any time with:

```bash
python3 build_control_tower.py
```

The build is deterministic — no timestamps or randomness — so re-running produces the same file. Example rows use live `=TODAY()` formulas so the dates stay current; delete the example rows before real use (they are clearly marked).

## Tabs and fields

### Dashboard
Fast status read. KPI tiles are live `COUNTIF`/`COUNTIFS` formulas over the other tabs (open actions, overdue, P0/P1, missing owner, missing due date, open customer asks, high risks, decisions to revisit, deck backlog, unprocessed meetings). Set the project name in cell **D4**. Anything that should raise an alarm turns red when non-zero.

### Action Tracker — the accountability layer
| Field | Notes |
|---|---|
| ID | `A-001`, `A-002`, … |
| Action | What is to be done |
| Owner | Blank owner is flagged on the Dashboard |
| Priority | `P0 / P1 / P2 / P3` (dropdown) |
| Type | `Customer-facing / Internal` (dropdown) — keep the two separate |
| Status | `Open / In Progress / Waiting / Blocked / Done / Dropped` (dropdown) |
| Due Date | Past-due rows highlight red automatically while not Done |
| Created | Date the item was logged |
| Source Meeting | Traceability back to where it came from |
| Notes / Evidence | Required before marking Done — never close without evidence |

### Decision Log
Important decisions that should not be buried in notes. Status: `Decided / Revisit / Superseded`.

### Risk Register
Live risks with `Severity` and `Likelihood` (`High/Medium/Low`), mitigation, owner, status, review date. High-severity rows highlight.

### Customer Asks
What the retailer or stakeholder asked for and the internal action needed to close it. Links to Action Tracker items.

### Deck Backlog
What the current deck needs to change: current state → needed change → why it matters, with priority.

### Meeting Queue
What has come in and whether it has been processed. **One meeting = one queue entry**, even with multiple artifacts (this is the duplicate-prevention rule).

### File Index
Which file is the real source of truth. Status: `Approved (source of truth) / Working copy / Review copy / Archive / Superseded`. Refresh this when Claude keeps using the wrong file.

## How Claude should use it
- Update in **review-copy mode** by default; create a `DELTA -` file if direct edit is not appropriate.
- Merge duplicates that are materially the same.
- Flag missing owners, missing due dates, overdue, blocked, and slipping items.
- Never mark anything Done or closed without evidence.

> No summary is finished until the parts that matter have landed here.
