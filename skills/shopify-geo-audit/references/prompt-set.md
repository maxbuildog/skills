# Building the buyer question set

Twelve questions, four intents, three each. They must come from the store's real catalogue and be phrased the way a shopper types, not the way a marketer writes.

The set is the measurement instrument. If it is built badly, every number downstream is meaningless.

## Step 1: read the catalogue

From `/products.json`, work out what the store actually sells: the product category, the price band, the country it serves, and the two or three attributes it competes on (organic, refillable, for sensitive skin, single origin, under 30 minutes, made in France).

Show the user your reading in one sentence before you go further, and let them correct it. A wrong category produces twelve wrong questions and a report that looks authoritative and is worthless.

## Step 2: the four intents

**A. Category discovery (3 questions).** No brand name. This is where a shopper starts and where most stores are invisible.

> best olive oil for finishing dishes
> what olive oil should I buy for everyday cooking
> good olive oil under $30

**B. Attribute and problem (3 questions).** The specific need the catalogue answers. This is where a small store can beat a big one, because the answer is narrow.

> olive oil that is not bitter
> which cooking oil has the highest smoke point
> olive oil in a squeeze bottle

**C. Brand-aware (3 questions).** Now the brand is allowed. Tests whether an assistant knows anything about the store at all, and what it thinks.

> is Graza olive oil any good
> Graza vs Brightland
> where can I buy Graza

**D. Purchase-ready (3 questions).** Someone about to spend money. Tests whether the store's own site wins, or a marketplace and a listicle take the click.

> best value olive oil to buy online
> olive oil gift set for a home cook
> which olive oil brands ship to Canada

## Rules

**Use the shopper's words.** "Cream for dry skin", not "moisturiser SKU with hyaluronic acid".

**Never put the brand in intent A or B.** Naming the brand guarantees a mention and destroys the measurement. Nine of the twelve questions must be answerable without knowing the store exists.

**One product category per set.** A store selling both candles and furniture needs two runs, not one blended set. Blending produces a meaningless average.

**Match the market.** A French store gets French questions. Assistants answer differently by language, and a store that is invisible in English may be fine in French, which is itself the finding.

**Do not tune the set after seeing results.** Rewriting a question because the store did not show up turns the measurement into a search for a flattering number. If a question was badly built, throw the whole run out and start over, and say so.

## What to record per question

| Field | Meaning |
|---|---|
| Question | Verbatim, as it was searched |
| Intent | A, B, C or D |
| Store appeared | yes or no, domain or brand anywhere in the results |
| Who appeared instead | The brands and retailers surfaced, in order |
| Source type | Brand's own site, marketplace, review site, listicle, forum |

The last column is often the most useful thing in the report. A category where every answer comes from listicles is won by getting into listicles, not by editing structured data. A category where assistants quote brand sites directly is won by fixing the store. These are different projects, and the source type is what tells them apart.

## Reading the result

**0 of 12** is not necessarily a store problem. Check layer 1 first: a blocked crawler or a `noindex` explains it mechanically, and nothing else matters until that is fixed.

**Mentions only in intent C** is the most common outcome for a small brand. It means assistants know the store exists when asked by name, and never bring it up otherwise. The gap is category presence, which is earned off-site, not on the product page.

**Mentions in A or B** is genuinely good and worth saying so plainly.

Twelve questions is a small sample. Say so in the report. It is enough to tell "invisible" from "sometimes present", and not enough to rank anything.
