# Source of Truth Refresh

- **Best used when:** Claude keeps using the wrong files, or the File Index is stale
- **Best used in:** Cowork project
- **Recommended skills:** Open Loop Manager
- **Why this exists:** It rebuilds the File Index so the system reliably uses the current approved files.

> Authored to the system's spec. The Operator Guide names this prompt but does not include its body; this version follows the guide's conventions. Tune to taste.

## Paste into Claude:

Refresh the source-of-truth picture for this project.
Work inside this project and its connected context.

Review the files in the project and identify, for each important artifact type:

- the current approved deck
- the current working deck (review copy)
- the current approved Control Tower workbook
- the current approved forecast, pricing, and launch files
- any duplicates, stale versions, or ambiguous "final_final" files

Then:

1. Update or create the File Index so the current approved file of each type is clearly marked.
2. Mark working copies and review copies distinctly from approved masters.
3. Flag conflicts where it is unclear which file is current, and recommend how to resolve.
4. Flag files that should be archived, renamed, or merged — but do not move or rename without my go-ahead.

Produce:

1. The refreshed File Index (current approved files clearly marked)
2. A list of ambiguities and conflicts to resolve
3. Recommended cleanups, with traceability preserved

Important:

- do not delete, move, or rename source-of-truth files without explicit approval
- update the File Index in review-copy mode or as a delta if direct edit is not appropriate
- preserve traceability at all times

Save as:
`YYYY-MM-DD - [Project] - Source of Truth Refresh`
and if needed:
`DELTA - YYYY-MM-DD - [Project] - Control Tower`
