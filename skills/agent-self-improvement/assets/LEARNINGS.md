# LEARNINGS

<!--
  Append-only journal for ONE agent. Method: the agent-self-improvement skill.

  RULES OF THIS FILE
  - Add entries at the end of "Active". Never rewrite an entry's text.
  - You may change only three lines of an existing entry: "Applied", "Recurred"
    and "Status".
  - Never delete. Retire, supersede or archive instead.
  - Write an entry only when something cost time or money, or a person
    corrected the agent. Not one per run.
  - Next consolidation is due on the date below. Update it after each one.
-->

Agent: <name of the agent this journal belongs to>
Instructions file: <path, e.g. AGENTS.md>
Last consolidation: <YYYY-MM-DD or "never">
Next consolidation due: <YYYY-MM-DD>

<!--
  ENTRY TEMPLATE. Copy, fill, append under "Active". IDs are sequential, never reused.

  Source:
    USER      explicit, durable instruction from a person  -> promote after 1 time
    OBSERVED  lesson the agent inferred from runs          -> promote after 3 occurrences
                                                              (different days or runs, same cause)
  Status values:
    ACTIVE | PINNED | PROMOTED to R<n> on <date> | SUPERSEDED by L-<id>
    | DUPLICATE of L-<id> | COVERED by R<n> | ARCHIVED <date>

  ### L-001 | YYYY-MM-DD | USER or OBSERVED | tag: <one word>
  **One line stating the lesson, not the incident.**
  What happened in two or three sentences, then the lesson as an instruction.
  Expected effect: what we should see if this lesson is right.
  Applied: (dates it changed a run, newest last)
  Recurred: (optional; dates the same incident happened again)
  Status: ACTIVE
-->

## Active

<!-- entries go here -->

## Archived

<!--
  An entry goes stale 90 days after its last activity (the latest `Applied` or `Recurred` date, or the entry date if it has neither), or as soon as it is superseded.
  Stale entries move here.
  Keep the original text. Add the line: Status: ARCHIVED <date>, reason.
  PINNED entries never move here.
-->
