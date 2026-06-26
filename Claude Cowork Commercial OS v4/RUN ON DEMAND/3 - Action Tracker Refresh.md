# Action Tracker Refresh

- **Best used when:** the tracker feels stale, noisy, or no longer trustworthy
- **Best used in:** Cowork project
- **Recommended skills:** Open Loop Manager
- **Why this exists:** It restores hygiene to the Action Tracker so the accountability layer can be trusted again.

> Authored to the system's spec. The Operator Guide names this prompt but does not include its body; this version follows the guide's conventions. Tune to taste.

## Paste into Claude:

Refresh the Action Tracker in the Control Tower workbook for this project.
Work from the current approved workbook in the File Index.

Review every open and recently closed action and check:

- is the owner clear?
- is the due date clear?
- is the status accurate against the latest evidence?
- is it overdue, blocked, or repeatedly slipping?
- is it a customer-facing commitment or an internal-only action?
- is it a duplicate of another row that is materially the same?

Then:

1. Merge duplicates that are materially the same.
2. Flag missing owners and missing due dates.
3. Flag overdue, blocked, and repeatedly slipping items.
4. Separate customer-facing commitments from internal actions.
5. Do not mark anything done or closed without evidence.

Produce:

1. A tracker health summary (counts: open, overdue, blocked, no owner, no due date)
2. The items that need my decision
3. The items that look stale and may be closable, with the evidence gap noted
4. Recommended cleanups

Important:

- update the workbook in review-copy mode, or create a delta file — do not overwrite the master
- do not invent owners, due dates, or status changes

Save as:
`YYYY-MM-DD - [Project] - Action Tracker Refresh`
and if needed:
`DELTA - YYYY-MM-DD - [Project] - Control Tower`
