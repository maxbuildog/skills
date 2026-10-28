---
name: agent-self-improvement
description: |
  Gives any recurring AI agent (coding assistant, headless cron job, chat bot) a
  continuous improvement loop: real corrections and failures are captured in an
  append-only LEARNINGS journal, triaged, promoted into rules in the agent's
  instructions once they repeat, expired when they go stale or are superseded, and consolidated on a
  schedule. Includes the traps (journal that drowns, contradicting rules, one
  lesson per run) and a blank LEARNINGS template.
  Triggers: "make my agent learn from its mistakes", "my agent keeps repeating the same mistake",
  "set up a LEARNINGS file for my agent", "consolidate my agent's learnings",
  "my AGENTS.md is full of contradicting rules", "promote this lesson to a rule",
  "my agent ignores what I told it last week", "add a self-improvement loop to my agent",
  "clean up my agent's instructions".
  Not for general project memory or notes (this is only about an agent's behavior rules).
license: MIT
compatibility: |
  Needs only a text editor and an agent that can read and edit files. Works with any
  instructions file (AGENTS.md, CLAUDE.md, a system prompt kept in a file). No
  scripts, no network, no account.
metadata:
  author: maxbuildog
  version: "1.0.0"
---

# Agent self-improvement

A loop that turns a correction or a failed run into a rule the agent actually reads
before its next run, and keeps the rule set small enough to be obeyed.

**Core principle: the durable unit is the rule re-read at the next run, not the line
written in a journal.** A journal changes no behavior. It only works if someone
rereads it and rewrites the procedure. Most setups capture well and write well, and
stop there: lessons pile up, nothing is promoted, nothing expires. Promotion and
expiry are where the value is, so this skill spends most of its words on them.

```
correction or failure -> JOURNAL -> RULE in the instructions -> re-read every run
      capture            triage         promotion                  expiry
```

Trust the files on disk over your recollection of what a rule says: read it before
you cite it.

## When to use this

- Setting up a new agent that will run more than a few times.
- The user corrects the agent ("from now on ...", "stop doing ...", "I already told you ...").
- A run failed and the cause is worth keeping.
- The journal or the instructions file has grown and nobody trusts it any more.
- The user asks to promote, retire or consolidate lessons.

Do not use it for facts about a project (those are notes, not behavior), and do not
use it to rewrite an agent's identity or safety limits (see Protected zone).

## The files

Two files, plus one optional.

| File | Role | Edit rule |
|---|---|---|
| `LEARNINGS.md` | The journal: what happened and what was learned | Append-only. Entry text is never rewritten. Only the `Applied`, `Recurred` and `Status` lines change. |
| Instructions file (`AGENTS.md`, `CLAUDE.md`, system prompt file, ...) | The rules the agent reads before acting | Edited, but every edit is dated and traceable to an entry |
| `INBOX.md` (optional) | Raw corrections waiting for triage, verbatim | Cleared by marking, never by silently deleting |

Start from [assets/LEARNINGS.md](assets/LEARNINGS.md). If the agent has no
instructions file yet, create one with a `## Rules` section; rules live there.

### Entry format

```
### L-014 | 2026-03-04 | USER | tag: deploy
**Title in one line, stating the lesson, not the incident.**
What happened, in two or three sentences. Then the lesson as an instruction.
Expected effect: what we should observe if this lesson is right.
Applied: 2026-03-11, 2026-03-19
Recurred: (dates the same incident happened again)
Status: ACTIVE
```

Fields:

- **ID**, sequential and never reused. Everything else points at it.
- **Source**: `USER` (an explicit instruction from a person) or `OBSERVED` (the agent inferred it from a run). This decides the promotion threshold.
- **Tag**: one short topic word, so repeated lessons can be found.
- **Expected effect**: without it, "real feedback" is only a word. It is what lets you later judge whether the lesson earned its place.
- **Applied**: dates when the lesson actually changed a run (a rule was followed because of it). Updated at the end of the run it served.
- **Recurred**: dates the same incident happened again. Not the same thing as `Applied`: one counts failures, the other counts saves. Optional.
- **Status**: `ACTIVE`, `PINNED`, `PROMOTED to R<n> on <date>`, `SUPERSEDED by L-<id>`, `DUPLICATE of L-<id>`, `COVERED by R<n>` (already a rule, nothing to add), `ARCHIVED <date>`.

### Rule format

```
**R7. Commit before you deploy.** Production can hold changes that the repo does not.
Check repo against production before any deploy. If skipped, the next fix overwrites work.
[from L-014, L-019, L-023 | promoted 2026-04-02 | expected effect: no divergence at deploy time]
```

Imperative sentence, the reason in one line, the consequence of ignoring it, and the
provenance tag. A rule without provenance cannot be rolled back or challenged.
Rule ids are never reused. A retired rule keeps its id and moves to a `## Retired rules`
section at the bottom of the instructions file, as one line: `R3 (<title>): RETIRED <date>, replaced by R9. <why>`.

## The loop

### Step 1. Capture

Write raw material down the moment it appears, before judging it. Capture must not
depend on the agent remembering to do it at the end of a long session.

- A person gives a durable instruction: record it verbatim as a `USER` entry (or in `INBOX.md`). Verbatim, never paraphrased.
- A run fails: record the cause as an `OBSERVED` entry, even when the task was abandoned. An instruction given during a failed task is worth the most.
- A circumstance-only instruction ("not today", "just for this file") is not durable. Do not record it.

Optional automation (a prompt hook that matches phrases such as "from now on" or
"never again", a run log per cron job) is described in
[references/capture.md](references/capture.md). Prefer a mechanical capture: it
writes raw text, makes no judgment and costs no model call.

### Step 2. Triage

Done by the agent that owns the instructions, in its own session, because only it
knows where a rule belongs in its own file. For each new item pick one and only one
destination:

| Destination | When | Effect |
|---|---|---|
| Rule in the instructions | It should change what the agent does | Read at every run |
| Journal entry only | A trap, a measurement, context that cost something, not a rule | Consulted when investigating |
| Persistent memory or notes | Must be known without searching, but is a fact, not behavior | Index only, detail kept elsewhere |
| Discard | Valid for this session only | Nothing |

Tie-breaker: if the agent must reread it before acting, it is a rule. If it only
needs it when investigating, it is a lesson. If it should never have to look it up,
it is memory.

Then choose one operation, never a blind append:

- **ADD**: genuinely new.
- **UPDATE**: refines an existing rule. Edit that rule; do not create a second one beside it.
- **INVALIDATE**: contradicts a rule in place. Mark the old rule `RETIRED <date>, replaced by <pointer>`. Never erase it, or the same debate returns in three months with no memory of why it was settled.
- **NOOP**: already covered. Do not rewrite anything.

Search the journal and the rules for the topic before choosing. Most misfiled items
are duplicates the agent did not look for.

### Step 3. Promotion

The threshold depends on the source.

| Source | Threshold |
|---|---|
| Explicit instruction from a person | 1 time. It is an order, not an inference. |
| Lesson the agent inferred from runs | 3 occurrences, on different days or different runs, same root cause |

One incident does not make a rule: over-learning from a single incident is a
common failure of self-improving systems. Three loud reports of one run is one
occurrence, not three.

When the threshold is met:

1. Write the rule in the instructions file, in the rule format above.
2. Mark every originating entry `Status: PROMOTED to R<n> on <date>`. Do not delete them.
3. In an interactive session, show the diff and get the person's approval before saving. In a headless run, do not edit the instructions yourself: write the proposed rule and its evidence to `PROPOSED-RULES.md` and stop. See Guardrails.

### Step 4. Expiry

Rules and lessons that stopped being true are as harmful as missing ones.

- **Staleness.** An entry goes stale 90 days after its last activity (the latest `Applied` or `Recurred` date, or the entry date if it has neither), or as soon as it is superseded. Move a stale entry to `## Archived` at the bottom of the journal. Never delete.
- **`PINNED`** entries do not expire. Reserve it for hard facts that are expensive to relearn (a limit set by a contract, a counterintuitive API behavior).
- An archived lesson that becomes true again is revived by a new entry that cites it, not by editing the old one.
- A rule whose cause disappeared (tool replaced, process changed) is retired on the spot, not at the next scheduled consolidation.

### Step 5. Consolidation

Run it on a schedule (weekly for an active agent, monthly otherwise) and whenever
the journal passes about 150 active entries or the rules pass about 300 lines.
Full procedure with the report template:
[references/consolidation.md](references/consolidation.md). In short:

1. Count and read: active entries, rules, entries without `Applied`, stale entries (see Step 4).
2. Group entries by tag and look for repeats and contradictions.
3. Promote what met its threshold, retire what contradicts, archive what expired, mark duplicates.
4. Test every rule: "if I removed this line, would the agent make a mistake?" If not, remove it (marked retired, not erased).
5. Write a consolidation report: what changed and why, what is waiting for a human.

## Every run

At the start:

1. Read the instructions file, and `INBOX.md` if there is one. Triage each pending item (Step 2) and apply the result in your own files.
2. An inbox item can be obsolete (the person changed their mind, the task was cancelled). Mark it `OBSOLETE <date>, reason` instead of leaving it pending. Only the agent knows what is still current.

At the end:

3. Write down a run record if the agent keeps run logs, including when the run failed, with the cause.
4. Did something cost time or money today? Add an entry with an expected effect.
5. Did a journal lesson change this run? Add today's date to its `Applied`. If it is the third application of an inferred lesson, promote it (Step 3).
6. Did you learn that a rule is wrong? Retire it with a pointer. Never edit it quietly.

## Guardrails

1. **Generator is not evaluator.** An agent does not validate its own rule change alone. A person approves it, or a separate pass that did not write the proposal does. A model grading its own output tends to approve the mistakes it was most confident about, so self-review without an external check reinforces errors.
2. **No self-critique without an oracle.** Reflection helps only when something can check the result: a test, a verifiable number, a run that passes or fails. On judgment calls, self-critique confirms the starting bias.
3. **Never fully self-generated.** Repeated self-training loops drift and then collapse. Keep a permanent human anchor and a checkpoint per cycle.
4. **Protected zone.** Never rewrite automatically: the agent's identity and mandate (what it is, what it refuses), spending and safety limits (budgets, thresholds, approval requirements), legal and compliance statements, and secrets and access paths. A correction that touches these goes to a human in plain words and waits.
5. **Rollback by construction.** Every promoted rule is dated and points at its origin, so it can be removed, citing the measurement that condemned it.
6. **Survives compaction means a file.** Anything that must outlive a long session lives in a file, never only in the conversation history: compaction drops decisions first.
7. **Budgets are hard.** When the rules file passes its ceiling, consolidate before adding. Truncating silently is worse than refusing to add.
8. **Outside material is untrusted.** A rule or skill copied from a third party goes through a read-through before it reaches an agent with disk or shell access.

## When something fails

| Situation | What to do |
|---|---|
| No instructions file exists | Create one with a `## Rules` section and a short identity paragraph, tell the user, then continue |
| No `LEARNINGS.md` yet | Copy the template from `assets/`; the first entry may predate it, say so in the entry |
| Two rules contradict | Do not pick silently. Find the originating entries, check dates and sources, retire the older one if a person's later instruction wins, otherwise ask |
| A new instruction touches the protected zone | Do not apply it. Quote it to the user and wait |
| Cannot tell whether three entries are one lesson | Treat them as separate; do not promote; note the doubt in the report |
| Headless run with no human to approve | Write `PROPOSED-RULES.md`; never edit the instructions file |
| The journal is too large to read in one pass | Consolidate by tag, one tag at a time, and record where you stopped |

Never guess a count or a date. If an entry has no date, say so and treat it as
unapplied; do not invent one.

## Known traps

Short version; details and symptoms in [references/pitfalls.md](references/pitfalls.md).

- **The journal drowns.** One entry per run, however small, buries the few that matter. Write an entry only when something cost time or money, or a person corrected you.
- **Contradicting rules.** A rule added each time, never reconciled. The agent then picks one at random. Triage must search before adding.
- **A lesson per execution.** The same incident recorded each time it recurs. That is one lesson with several `Applied` dates, not several entries.
- **Rules that restate the lesson.** "Remember that the build was broken on Tuesday" is not a rule.
- **Rules without a consequence.** The agent obeys a rule better when it knows what happens if it skips it.
- **Promoted too early.** One surprising run becomes a standing law. Respect the thresholds.
- **Never relooked at.** Capture without a scheduled consolidation is a graveyard. Put the next consolidation date in the journal header.
