# Writing contract: writing for someone who did not build the thing

Reference for step 3 of `SKILL.md`. This is where a page that "looks clear"
separates from a page that makes the reader autonomous.

---

## 1. The reader, precisely

Intelligent, busy, not an engineer. They run a business or a team and read fast.
They have **no obligation** to know languages, protocols, data formats, names of
infrastructure tools, or theory (idempotence, queues, caching).

They know very well: commerce, advertising, customers, money, risk, delegation.
**Every analogy must draw from there.**

So never write to prove the quality of the work. Write to transfer a mental model.
A page that impresses and teaches nothing failed.

---

## 2. The six rules, with before and after

### R1: No technical term left untranslated at first use

| Before | After |
|---|---|
| The webhook triggers the workflow. | A **trigger address** (a URL that waits for another program to ping it) wakes the **processing chain**, the series of automatic steps. |
| Patient records are stored in a SQLite database. | Patients are kept in a **database file** on the server: a big binder you can search, but which lives in one place only. |
| The cron runs at 04:10 UTC. | A **timer** starts the job **every day at 6:10 a.m. your time** (the server's clock runs on UTC). |

The technical term may exist, since the reader will hear it elsewhere. It may not
exist **alone**. Rule: bold, immediate translation, glossary entry.

### R2: Nothing technical in the visible flow

No code block, file path, ID, command or variable name in the text read without
clicking. All of it is true and useful and goes in a `<details>` titled
**"Technical detail"**. The surface tells, the depth proves.

Exception: a proper name the reader will see in their own interface (a button, a
folder name, a command they type themselves). That is their vocabulary, not jargon.

### R3: Short sentences

One idea per sentence. A sentence with "which", "as well as", or two commas gets
split. Aim for 15 to 20 words. Paragraphs are three lines, never eight.

### R4: Numbers, never adverbs

| Before | After |
|---|---|
| Many invoices are checked. | 200 invoices a night. |
| It is very fast. | 40 seconds from click to result. |
| It costs little. | About 4 dollars a month (measured on a given date). |
| It works well. | Out of 300 pallets scanned, 280 matched the order. The other 20 did not. |

(Figures above are invented illustrations of the style.) If the number does not
exist, write **"not measured"**. That is information, not a confession.

### R5: Banned words

> just · simply · basically · as you know · obviously · of course · trivial ·
> all you have to do · no problem · robust (without proof) · optimized (without a figure) · seamless

The first group tells the reader their confusion is their fault. The rest are
claims that cannot be checked, therefore noise.

### R6: Tone, a colleague at a whiteboard, not a salesperson

Direct address. Active voice. Present tense. "We" is fine, "I" is fine when the
agent speaks of what it did or did not do.

**A shaky system is presented as shaky.** It is the only way the reader can
arbitrate. Useful phrasings: "it works, but it rests on X, which was never
tested", "I did not verify Y", "this figure comes from a single pass, it is not
worth much".

---

## 3. Making a good analogy

A useful analogy has **three** properties. If one is missing, look for another.

1. **Familiar**: a physical place the reader frequents (shop, restaurant, post
   office, warehouse, reception desk, workshop, garage).
2. **Structurally correct**: roles map one to one. If the system has a component
   that filters, the analogy has a doorman. If the analogy has a boss and the
   system has none, the analogy lies.
3. **Extensible**: you can house the failure in it. "If the person at the loading dock falls ill,
   deliveries pile up and nobody notices" is what you want to be able to say in block 8.

**Boundary test, once per page.** Say aloud where the analogy stops and write it
down if that prevents a misreading. An honest analogy gains in credit what it loses
in elegance.

A reservoir that works well:

- **agent chain** -> a restaurant brigade (each on their station, a head chef passing plates);
- **processing queue** -> the line at a checkout;
- **filter or scoring** -> a doorman with criteria;
- **scheduled job** -> an alarm clock that rings at the same time daily;
- **database** -> the filing cabinet in the back office;
- **API** -> a service counter: you fill a precise form, you get a precise answer back;
- **cache** -> stock kept under the counter;
- **fallback or guardrail** -> the spare wheel, or the spare keys at the neighbor's.

---

## 4. Writing a diagram (the text inside matters more than the drawing)

- **Six boxes at most.** Otherwise two diagrams.
- A box carries a **role name in plain language** ("The checker"), not a file name.
- Arrows run in one dominant direction: left to right, or top to bottom. Not both.
- Each arrow is **labeled with what travels along it** ("the customer's reply",
  "today's list"), not with a technical verb.
- Anything breakable or fragile may be marked (dashed border plus a note).
- The diagram must remain understandable in black and white: color underlines, it
  does not carry the information.

---

## 5. Length

The budget depends on the number of parts: see the table in `SKILL.md`. Too long
is not a layout problem, it means the page is trying to say everything. Cut in
block 6 (merge parts), not in blocks 2, 8 and 10.

---

## 6. Last filter before delivering

Ask **one** question: *"If the reader reads this and nothing else, can they
re-explain the system to someone else tomorrow?"*

If not, it is almost always block 3 (the analogy) or block 5 (the real case) that
is weak. Rewrite those first, not the layout.
