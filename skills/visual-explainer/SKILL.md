---
name: visual-explainer
description: |
  Turns a technical subject (a process, a piece of code, a small SaaS, an agent
  chain, an automation workflow, an architecture decision) into ONE short,
  self-contained HTML page that a non-technical reader can follow. Facts are
  gathered from disk first, then laid out in a fixed block skeleton, written
  under a no-jargon contract, and reviewed as a newcomer before delivery.
  Triggers: "explain this to me like I'm not technical", "make me a visual
  explainer of this system", "I didn't understand what you just built, make a
  one-page presentation", "turn this workflow into a page my client can read",
  "write a plain-language walkthrough of this code", "make a diagram page for
  this architecture decision", "explain what this agent chain does, visually",
  "demystify this automation for my team".
  Not for technical documentation (write a README) or a run report.
license: MIT
compatibility: |
  Needs an agent that can read local files and write one .html file, plus a
  shell limited to `git log` (to read a repository's history) and `wc` (to count
  visible words). No dependency, no account, no network access: the page it
  produces opens offline by double-click. Publishing the page anywhere is
  outside this skill.
allowed-tools: Read Write Glob Grep Bash(git log *) Bash(wc *)
metadata:
  author: maxbuildog
  version: "1.0.0"
---

# Visual explainer

Produce one HTML file that a smart, busy, non-technical person reads in about
six minutes and walks away able to re-explain the subject to someone else. That
is the success test, not "the page looks good".

This skill reads local files and writes one `.html` file. It talks to no
network and no service. Hosting or sharing the file is up to the user.

**Trust the files on disk, not your memory of the conversation.** Chat memory
rounds numbers, mixes up paths and goes stale. A page that invents is worse than
no page, because the reader has no way to contradict it.

## When to use this

- The user did not understand something technical you built or described, and
  a chat summary will not fix it.
- The user wants a presentation, a walkthrough or a "plain language" page for a
  system they must operate, sell, or hand over.
- You finished a chunk of work large enough that ten paragraphs of chat would be
  the wrong delivery.

Do not use this for reference documentation, API docs or a log of a run. Those
describe what a thing is. This page transfers a mental model.

## The principle

Give the reader a correct mental picture first, then hang the parts on it. Never
the reverse. Four laws follow.

1. **Why before how.** Start from the problem that disappears, not the architecture.
2. **One master analogy, held to the end.** One metaphor for the whole system,
   reused in every block. Two competing metaphors are zero metaphors.
3. **Small first, then assembled.** Show each mechanism alone before combining.
4. **Detail is available, never imposed.** Everything technical lives in a
   folded `<details>`. The surface reads without a single click.

## Inputs

| Input | Required | How to get it |
|---|---|---|
| The subject | yes | Ask if it is not clear. A folder, a file, a repo, or "the thing we just built". |
| The reader | yes | Who reads it? Default: an intelligent adult from business, not engineering. Ask once if it changes the analogy. |
| The language | no | Write in the reader's language. Default: the language of the request. |
| Output path | no | Default `explainers/YYYY-MM-DD_<subject>.html` in the working directory. |

Never guess the subject's state. If you cannot tell whether it runs in
production, say so on the page.

## Modes

| Mode | When | What changes |
|---|---|---|
| **Warm** (default) | You built the thing in this session | The session is an index of what to re-read, not a source of truth |
| **Cold** | The user points at an existing system | Everything starts from disk. Budget real time for the fact-gathering |
| **Express** | A small subject: one script, one decision | Blocks 1, 2, 4, 5, 7 and 10, one diagram, no block 6. Add block 8 if anything can fail in production |

Visible-word budget (words outside folded `<details>`), by number of parts to present:

| Parts | Visible words | Reading time |
|---|---|---|
| 1 to 2 (express) | 700 to 1,100 | 3 to 4 min |
| 3 to 4 | 1,400 to 2,100 | 6 to 8 min |
| 5 or more | split into two linked pages | |

If the request explicitly contains a decision section ("what you did AND what you
propose"), count it as an extra part and allow 2,100 to 2,400 words, trimming the
retrospective, never the proposals. If the user asks for a single page, keep a
single file and make the parts sections of it. Count the words for real before
delivering (extract the visible text to a scratch file, then run `wc -w` on it). A page that overflows is not more complete, it is less read. Cut in
block 6 (merge parts), never in blocks 2, 8 and 10: they carry the value.

## Procedure

### 1. Gather the facts

Before writing one sentence, fill this fact sheet (in your scratch space, not in the
deliverable):

```
SUBJECT : one line
STATE   : runs in production / built but not connected / prototype / decision only
PER PART:
  - human-readable name        ("the intake desk", not "workflow 4f2a")
  - REAL path or identifier, verified by opening it
  - its job in one sentence, no jargon
  - what triggers it           (a schedule? a click? another part?)
  - what it produces, and for whom
  - what breaks if it dies     (the symptom the reader would see, not the error text)
NUMBERS : volumes, costs, durations. Each with its PROVENANCE and date:
          observed by me now / read in a document / reported by someone else
UNKNOWN : what you did not verify. This list ends up in block 8. It never disappears.
```

Where to look, in order: the files themselves (open them, do not recall them);
the project's README or notes and recent run logs; for code, the entry point and
then follow the calls, no exhaustive reading; the commit history if there is a
repository (`git log`), since it gives the true order of events.

Rules that cost real mistakes:

- Re-open every file you will talk about, even in warm mode.
- **Files you wrote earlier in this same session are sources to re-read, not
  sources to believe.** Ask of each line: observation or deduction? Mark deductions.
- **The first number to re-verify is the one you just told the user in chat.**
  It is the likeliest to be an estimate presented as a measurement.
- A number from a document or a third party is written with its source ("the
  audit found..."), never in the present tense of observation.
- **If the fact-gathering contradicts a document, fix the document before writing the
  page**, or the two diverge.

Exit test: every claim you plan to write has a line in the sheet behind it.
Otherwise it is not written, or it is written as an admitted uncertainty ("I did
not check X").

### 2. Lay out the skeleton

Ten blocks, in this order. The order is an interest curve: hook (1 to 2), image
(3 to 4), show it for real (5), detail (6), make it actionable (7 to 8), close (9 to 10).
Read [references/blocks.md](references/blocks.md) now for what each block holds
and how it fails.

| # | Block | Question it answers | Required |
|---|---|---|---|
| 1 | One sentence | What is it, does it run? | yes |
| 2 | The problem (before / now) | Why does it exist, what disappeared? | yes |
| 3 | The master analogy | What picture do I keep? | yes |
| 4 | The map | How do the parts connect? 3 to 6 boxes | yes |
| 5 | One real case, step by step | What happens on one concrete case? | yes |
| 6 | The parts, one by one | What does each piece do? | yes (not express) |
| 7 | What this changes for you | What do I do on Monday? | yes |
| 8 | When it breaks, and what is not done | Symptoms, fixes, limits, unknowns | yes |
| 9 | Numbers and glossary | Orders of magnitude, jargon translated | if jargon or money |
| 10 | Check that you understood | 3 questions, answers folded | yes |

Block 10 is the only reliable feedback on the page's quality: a question the
reader cannot answer points at the block to rewrite.

### 3. Write under the no-jargon contract

Full rules with before/after pairs are in
[references/writing-contract.md](references/writing-contract.md). Read it before
drafting. The five rules that give 80 percent of the result:

1. **No untranslated technical term.** First use: bold term plus an immediate
   plain translation in parentheses, then an entry in the glossary.
2. **Nothing technical in the visible flow.** No code block, file path, ID,
   command or variable name outside a folded "Technical detail".
3. **Short sentences.** One idea each. Two commas and a "which" means split it.
4. **Numbers, not adverbs.** "220 patient files a night", not "a large volume". If the
   number is unknown, write "not measured".
5. **Banned words:** "just", "simply", "obviously", "of course", "as you know",
   "trivial", "all you have to do". They tell the reader their confusion is a
   fault. Also banned without proof: "robust", "optimized", "seamless".

Tone: a colleague at a whiteboard, present tense, active voice. Nothing to sell,
nothing that must be positive. **A shaky system is presented as shaky**, because
that is precisely what the reader cannot see alone.

Three honesty traps:

- **Illustration details are new claims.** A count, a duration, "it was about to
  do X" added to make the story lively is not in your sheet. Verify it or cut it.
- **Do not convert into a familiar unit without showing the calculation**
  ("about a hundred pages"). It manufactures a number. Compare two numbers you
  already measured instead ("twice last month's volume").
- **Be most careful when correcting a false statement.** The correction is written
  fast, under the thrill of discovery, and that is where the second error slips in.

### 4. Build the page

Start from [assets/template.html](assets/template.html): one self-contained file,
light and dark theme, components for every block, five ready diagram patterns.

Non-negotiable technical rules:

- **One file, zero external dependency.** CSS and JS inline, no CDN, no remote
  font, images as `data:` URIs. The page must open offline by double-click.
- **Set `lang` on the `<html>` element to the reader's language** (`en`, `fr`,
  `de`...), and write the `<title>` in that language. Screen readers and browser
  hyphenation depend on it.
- **Keep the `<meta charset="utf-8">`.** Without it, accented text breaks
  silently when the file is opened locally.
- **Diagrams are hand-written inline SVG.** Never a diagram library or a
  text-to-diagram tool that loads scripts: it breaks offline and in locked-down
  viewers. At most 6 boxes per diagram; above that, one deliberately vague
  overview plus zooms in block 6. Box text is plain language, never file names.
  Label each arrow with what travels along it. The diagram must still read in
  black and white: color underlines, it never carries the information.
- **Phone-readable.** Relative units; a wide diagram sits in an
  `overflow-x:auto` container. The page body never scrolls sideways.

### 5. Make the look fit the subject

The template is a starting point, not an identity. Derive 4 to 6 colors from the
world of the subject (a night-watch system suggests cold slates, a money subject
something else) and keep green, amber and red for meaning only, never decoration.
Keep it sober and editorial: serif body, no emoji, no icon cards. **A marker must
carry true information** (a cadence, a state, an order). Otherwise it is
decoration, and decoration lowers the page.

### 6. Review as a newcomer, then deliver

Read the page top to bottom without opening any `<details>`. Answer each:

- [ ] Do I understand what it is for before reaching the first diagram?
- [ ] Is there a word I could not define? Search for it: each untranslated term is a bug.
- [ ] Does the master analogy of block 3 still hold in block 6, or was it dropped on the way?
- [ ] Does every claim come from the fact sheet? Hunt invented figures: the highest-yield check.
- [ ] Is every benefit claimed in the plural, and every number already told to the user in chat, verified case by case? Block 2 is the most exposed: that is where people round up to sell.
- [ ] Do I know what to do on Monday morning (block 7)?
- [ ] Could I say what was NOT done (block 8)?
- [ ] Could I answer the three questions of block 10 without unfolding the answers?

Any "no" means rewriting that block. This pass costs minutes and catches most
failed pages. Then check mechanically:

- Count visible words against the budget.
- Search the file for `http`, `src=`, `<link` and `@import`: there should be none
  that load anything (anchors to pages the reader may click are fine).
- Every `<details>` is closed and every id used by the table of contents exists.

Deliver the file path, then at most three lines in chat: what the page covers,
where it is, and the open question if there is one. Do not re-summarize the page
in chat; that is precisely the behavior this skill replaces.

### When something fails

| Situation | What to do |
|---|---|
| The subject is too big for the budget | Split into two linked pages at a natural seam. Never shrink blocks 2, 8, 10. |
| A file you need is unreadable or missing | Say so in block 8. Do not reconstruct it from memory. |
| You cannot tell whether it runs in production | Say "state not verified" in the status line. Do not pick the flattering option. |
| No honest analogy fits | Use the reader's own daily setting and state where it breaks. Never stack two metaphors. |
| The numbers are not available | Write "not measured". That is information, not an admission of failure. |

## Before you finish

1. The file exists, opens offline, and the review checklist is all ticked.
2. Every unknown from the fact sheet appears in block 8.
3. If the page corrects a belief about a live system, update any note or document
   that still states the old version.
