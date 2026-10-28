# Pitfalls, with symptoms and fixes

## 1. The journal drowns

**Symptom**: hundreds of entries, most are one-line run diaries, nobody (including the
agent) can find the three that matter. Capture works, behavior does not change.
**Cause**: an entry written every run "to be safe".
**Fix**: write an entry only when something cost time or money or a person corrected
the agent. Consolidate by tag. Archive, do not delete. Count entries carrying an
`Applied` date: if it is zero after a month, the loop is not closing.

## 2. Contradicting rules

**Symptom**: the agent behaves differently on the same input from one run to the next.
Two rules say opposite things ("always ask before editing" and "never ask, just fix").
**Cause**: ADD used where UPDATE or INVALIDATE was needed; no search before adding.
**Fix**: search rules and journal for the topic during triage. On conflict, the later
explicit instruction from a person wins; retire the older rule with a pointer. If
unsure which wins, ask.

## 3. One lesson per execution

**Symptom**: ten entries with the same title and different dates.
**Cause**: the agent records the incident each time it recurs instead of recognizing it.
**Fix**: if you notice the repeat while writing, add the date to the `Recurred` line of
the first entry instead of a new entry. If the repeats were already written as
separate entries, mark the later ones `DUPLICATE of` the first at consolidation and
copy their dates into `Recurred`. Three independent occurrences promote it. Ten entries would otherwise look like
ten lessons and inflate the journal for nothing.

## 4. A rule that restates the lesson

**Symptom**: rules read like diary lines ("Last week the export failed because of the
date format").
**Fix**: a rule is an imperative with a reason and a consequence. Keep the story in
the journal.

## 5. A rule with no consequence

**Symptom**: the agent knows the rule and skips it under time pressure.
**Fix**: add what breaks if it is skipped, in one clause.

## 6. Promotion on one incident

**Symptom**: a rare event becomes a standing law and the agent becomes rigid or
overcautious everywhere.
**Fix**: honor the thresholds: 1 for a person's explicit instruction, 3 for an
inferred lesson. Count independent occurrences, not repetitions within one run.

## 7. The agent rewrites its own constraints

**Symptom**: after a few cycles the agent's limits (budget, approvals, scope) have
quietly loosened because "experience showed they were unnecessary".
**Fix**: protected zone. Those limits change only by a person's explicit decision,
never by a promotion.

## 8. Self-confirming loop

**Symptom**: every proposed rule is accepted, quality slowly drops.
**Cause**: the agent that proposed a change also approves it, and no oracle checks it.
**Fix**: a person or a separate pass approves. Where a deterministic check exists
(a test, a measurable outcome), run it before and after.

## 9. Nobody looks again

**Symptom**: a journal with no consolidation date, growing indefinitely.
**Fix**: put "next consolidation due" in the journal header and in whatever schedules
the agent. A consolidation that is not scheduled does not happen.

## 10. Obsolete instructions kept alive

**Symptom**: pending inbox items from months ago, rules about tools that no longer
exist. An outside observer concludes the agent never reads its inbox.
**Fix**: mark items `OBSOLETE <date>, reason` and retire stale rules immediately.

## 11. Rules file too long to be read

**Symptom**: past a few hundred lines the agent follows the first rules and drifts on
the rest.
**Fix**: hard ceiling (about 300 lines). Above it, consolidate before adding. Apply
the deletion test to every line.
