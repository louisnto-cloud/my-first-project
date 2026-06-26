# Historical Backfill

Use this once after bootstrap.

- **Best used in:** Cowork project
- **Recommended skills:** Commercial Meeting Extractor, Open Loop Manager
- **Why this exists:** It converts the last month of scattered activity into structured memory.

## Paste into Claude:

Backfill the last 30 days of this project into a usable operating record.

Review the most relevant items from the last 30 days:

- meeting transcripts and notes
- decks and deck review copies
- workbooks
- key email threads
- important files added or modified recently

For each meaningful item, determine whether it created or changed:

- an action
- a decision
- a customer ask
- a risk
- a deck backlog item
- a source-of-truth file

Update the Control Tower workbook in review-copy mode when possible.
If direct workbook editing is not appropriate, create clear delta files.

Then produce:

1. What changed in the last 30 days
2. Open loops still live
3. Decisions that now matter
4. Risks worth tracking
5. Deck story changes that should not be lost
6. What needs immediate cleanup or clarification

Important:

- do not duplicate actions already logged unless the status or scope materially changed
- do not mark items closed without evidence
- keep the result commercially useful rather than exhaustive

Save as:
`YYYY-MM-DD - [Project] - Historical Backfill`

and if needed:
`DELTA - YYYY-MM-DD - [Project] - Control Tower`
