# Meeting Inbox Processor

- **Suggested cadence:** every weekday afternoon, or run on demand after a heavy meeting day
- **Best used in:** Cowork project
- **Recommended skills:** Commercial Meeting Extractor, Open Loop Manager, Follow-Up Drafter
- **Why this exists:** It is the conversion engine from meetings into follow-through.

## Paste into a scheduled task:

Process the meeting inbox for this project.

Look for new or updated meeting materials from the last 24 hours that have not already been processed.

Check for:

- recordings
- transcripts
- notes files
- agendas
- supporting decks or workbooks
- relevant email threads created immediately before or after the meeting
- unprocessed rows in the Meeting Queue of the Control Tower workbook

For each truly new meeting:

1. Determine whether it is genuinely new or just another artifact from an already processed meeting.
2. Create or update a clean meeting summary.
3. Extract decisions, asks, actions, risks, opportunities, and what changed.
4. Update the Control Tower workbook in review-copy mode when clearly appropriate, or create a delta file.
5. Update the Decision Log, Risk Register, Customer Asks, Deck Backlog, and Meeting Queue when appropriate.
6. Draft follow-up communication if useful.
7. Flag any deck, workbook, forecast file, or tracker that now needs updating.
8. Note whether the meeting changed a commitment, changed the story, or created a new risk.

At the end, create a digest with:

- meetings processed
- major decisions
- new customer asks
- new risks
- new actions
- items requiring my review

Important:

- skip items already processed unless there is materially new information
- do not duplicate tracker items unless status or scope materially changed
- do not send drafts
- do not mark actions closed without evidence

Save outputs as:
`YYYY-MM-DD - [Project] - Meeting Summary - [Meeting Name]`
`YYYY-MM-DD - [Project] - Meeting Inbox Digest`
`DELTA - YYYY-MM-DD - [Project] - Control Tower`
