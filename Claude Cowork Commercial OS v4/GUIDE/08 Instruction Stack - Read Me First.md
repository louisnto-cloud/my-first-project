# Read Me First: How the Instruction Stack Works

Use the instruction layers for different jobs.

- **Global instructions** are for how you want Claude to behave everywhere.
- **Folder instructions** are for how the local working folder should be treated.
- **Project instructions** are for the account or function logic.
- **Account overlays** are for what matters specifically in Costco, FDM, or Sales Ops.

Do not merge all four into one block.
That creates a harder-to-govern system and makes future tuning slower.

The clean stack is:

> global behavior
> → folder behavior
> → project logic
> → account overlay

That is the intended design.
