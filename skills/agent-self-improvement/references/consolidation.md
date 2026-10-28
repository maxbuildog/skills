# Consolidation procedure

Run on a schedule, or when the journal passes about 150 active entries, or the rules
pass about 300 lines. It is done by the agent that owns the files, not by an outside
tool: only the owner knows where a rule belongs and whether it is still true.

An outside reviewer may count and flag (file sizes, missing dates, stale entries). It must not judge what a lesson says.

## Inputs

- `LEARNINGS.md`
- The instructions file
- Run records or inbox since the last consolidation, if any
- Today's date (read it, do not assume it)

## Steps

1. **Inventory.** Count active entries, archived entries, rules, rule lines. List entries with no `Applied` date and stale entries. An entry goes stale 90 days after its last activity (the latest `Applied` or `Recurred` date, or the entry date if it has neither), or as soon as it is superseded.
2. **Group by tag.** For each tag, read the entries together. Note: repeats of one lesson, entries that contradict each other, entries that contradict a rule.
3. **Decide per group**, using only these outcomes:
   - *Repeat meeting its threshold* (inferred: 3 occurrences on different days or runs; person's instruction: 1): draft the rule, mark entries `PROMOTED`.
   - *Repeat below threshold*: keep the first entry, mark the others `DUPLICATE of <first>`, and add their dates to the first entry's `Recurred` line so the count is not lost.
   - *Contradiction with a rule*: the later explicit instruction from a person wins. If the contradiction comes from inferred entries only, do not retire the rule; mark `needs human` in the report.
   - *Contradiction between entries*: keep the one with the later date and stronger source, mark the other `SUPERSEDED by <id>`.
   - *Stale*: archive it, unless `PINNED`. An entry goes stale 90 days after its last activity (the latest `Applied` or `Recurred` date, or the entry date if it has neither), or as soon as it is superseded.
4. **Protected zone check.** If a draft rule touches identity, spending or safety limits, compliance statements or secrets, do not apply it. List it in the report under "waiting for a human".
5. **Deletion test on the rules.** For each rule, ask: "if I removed this line, would the agent make a mistake?" If no, retire it. Look for rules that restate a lesson, rules that overlap, and rules with no consequence stated.
6. **Apply.** Edit the instructions file (or write `PROPOSED-RULES.md` if no human is present or approval is required), then update statuses in the journal. `Applied`, `Recurred` and `Status` are the only lines of an entry you may touch.
7. **Re-read the result.** Open the instructions file and check there is no remaining contradiction and that every rule has provenance. Open the journal and check that each promoted entry points at a rule that exists.
8. **Update the header** of the journal: last consolidation date, next due date.
9. **Write the report** (below).

## Report template

```
# Consolidation report, <date>

Counts before: <n> active entries, <n> rules (<n> lines). After: <n>, <n> (<n> lines).

Promoted
- R<n> <title> from L-.., L-.., L-.. (<threshold met: why>)

Retired or superseded
- R<n> retired: <why>, replaced by <pointer>
- L-.. superseded by L-..

Duplicates marked
- L-.. and L-.. of L-..

Archived (stale or superseded)
- L-..

Deletion test
- Retired rules that failed it: R<n> (<why>)

Waiting for a human
- <item>, <why it is not applied>

Doubts
- <anything uncertain, stated plainly>

Next consolidation: <date>
```

A report with an empty "Doubts" section is suspicious. State what you could not
verify.

## After consolidating

The test of a good consolidation is that the instructions file got shorter or stayed
the same size while the number of lessons it reflects went up. If it only grew, the
deletion test was skipped.
