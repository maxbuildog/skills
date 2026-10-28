# The ten blocks, in detail

Reference for step 2 of `SKILL.md`. For each block: the goal, what to write,
what makes it fail, and a short sample.

The order is a curve of interest. Do not permute it.

---

## Block 1: One sentence

**Goal.** In ten seconds the reader knows what it is and whether it is alive.

**Content.** One sentence of 20 words at most, a status badge, two or three key
numbers. Say the state honestly: running in production, built but not connected,
prototype, decision only.

**Fails when** the sentence contains a technology name. "A Node service that polls
an API" says nothing. "A robot that checks every night which patient files are missing a signature" says everything.

> A machine that checks each night which appointments in a clinic's calendar have no
> confirmed patient, and lists them for the front desk. *Running in production* ·
> 120 appointments checked a night (sample figure).

---

## Block 2: The problem (before, now)

**Goal.** Justify the thing's existence. This is the block that makes people read on.

**Content.** Two columns. Left, life without the system, in physical gestures the
reader recognizes. Right, life with it. One gain line below, as a number if it was
measured, otherwise "not measured".

**Fails when** the "before" is abstract ("lack of scalability"). It must be
physical: "you opened forty tabs on Sunday night".

---

## Block 3: The master analogy

**Goal.** Install the mental image that carries the whole page.

**Content.** Three to five lines. One metaphor, from the physical daily world of
the reader (shop, restaurant, post office, factory, doorman, workshop). Then a
correspondence table of three to five rows: "in the system / in the picture". Then
one line on where the picture stops.

**Hard rule.** The analogy is reused, in the same words, in blocks 4, 5 and 6.
An analogy introduced then dropped is worse than none: it convinces the reader
they understood.

**Fails when** two metaphors coexist, or when the metaphor is itself technical
("it is like a load balancer"). An analogy must step down one level of abstraction.

> Think of it as the **receiving dock of a warehouse**. Someone checks each delivery
> against the order, sets damaged goods aside, sends the rest to the right aisle,
> and refuses what nobody ordered.
>
> | In the system | In the picture |
> |---|---|
> | The incoming files | The delivery trucks |
> | The checker | The person at the dock |
> | The reject list | The "never accept from this supplier" list |

---

## Block 4: The map

**Goal.** Show the parts and their sequence at a glance.

**Content.** One SVG diagram, 3 to 6 boxes, oriented arrows, plain-language labels.
Two or three caption lines that tell the diagram out loud.

**Fails when** there are more than 6 boxes, file names in the boxes, crossing
arrows, or a diagram that needs zooming. Too many parts: overview here, zooms in
block 6.

---

## Block 5: One real case

**Goal.** The highest-yield block. Follow ONE named, concrete case from start
to finish.

**Content.** Four to seven numbered steps. Each says what happens (one sentence),
which part does it (by its analogy name) and what comes out. Use a real instance
from the logs when one exists, and say so. If it is reconstructed, say that too.

**Fails when** steps are in the conditional or generic ("the system may then...").
Write present tense with values: "Tuesday 04:10, the robot opens the calendar of the Lyon clinic".

---

## Block 6: The parts, one by one

**Goal.** The detail, but shelved, and always plugged into the analogy.

**Content.** One card per part, four to eight cards. Each card, in this order:

1. Readable name, plus a tag that carries true information (a cadence or a state);
2. **Job** in one jargon-free sentence;
3. **In the picture**: half a line;
4. **When it runs**: the trigger in plain words ("every night at 4", "when a patient replies");
5. **If it dies**: the symptom the reader would see;
6. A folded `<details>` named "Technical detail": paths, IDs, code, parameters.
   There and only there.

**Fails when** the cards are a copy of the README. The README says what a thing
is; here we say what it does for someone who did not build it.

---

## Block 7: What this changes for you

**Goal.** Make the page actionable. Without it the page is a beautiful useless object.

**Content.** Three short lists: what you do now (the real gestures: command, button,
page to open); what you no longer have to do; what to watch and how often (the one
indicator that matters, and where it lives).

**Fails when** it points at a file without saying what to look at in it.

---

## Block 8: When it breaks, and what is not done

**Goal.** Honesty. This block separates a teaching page from a brochure.

**Content.** Two parts.

- **Foreseeable failures**: a table `symptom you see, probable cause, what to do`.
  The symptom is described from the reader's seat ("the 8 a.m. reminder messages
  are missing"), not from the log.
- **Accepted limits**: what the system cannot do, what stays manual, what was
  never tested, and **every unknown from the fact sheet**. This list is never
  erased to look tidy.

**Fails when** everything is green. A system with no known limit is a system
nobody looked at closely.

---

## Block 9: Numbers and glossary

**Goal.** Orders of magnitude, and a translation of the jargon.

**Content.** A few figures (monthly cost, volumes, durations), each with the
**date of the measurement** and its provenance. A figure without a date rots
silently. Then the glossary: every technical term used in the page, translated in
one line. The glossary is the price of the right to use a technical word.

Skippable only if the page contains neither money nor jargon (rare).

---

## Block 10: Check that you understood

**Goal.** Give the reader a way to measure their own understanding, and give you a
quality signal.

**Content.** Three questions, no more and no fewer, each with its answer in a `<details>`. They
test how it works, not vocabulary:

- one on the "why" (block 2);
- one on the sequence (blocks 4 and 5);
- one on a failure (block 8), the most useful of the three.

**Fails when** the questions are a vocabulary quiz ("what does IMAP mean?"). Test
the mental model, not memory.

> **It is 9 a.m. and no reminder went out this morning. Where do you start?**
> The 9 a.m. check report: it says which of the ten checks is red. If the report
> itself is missing, look one step earlier, at the server.

---

## Express mode

Small subject: blocks 1, 2, 4, 5, 7 and 10, one diagram, no block 6. Add block 8
as soon as anything can fail in production: it is the last block to sacrifice.
Block 10 stays in every mode, since it is the page's only quality signal.
