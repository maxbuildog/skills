# Building the audience question set

Twelve questions, four intents, three each. They must come from what the site is actually about and be phrased the way its audience types, not the way a marketer writes.

The set is the measurement instrument. If it is built badly, every number downstream is meaningless.

## Step 1: read what the site is about

From the pages sampled in layer 1, work out what the site actually offers: the topic or category, who it serves, the country and language, and the two or three things it competes on (free, open source, for beginners, enterprise-grade, single-origin, made in France, under 30 minutes).

Show the user your reading in one sentence before you go further, and let them correct it. A wrong topic produces twelve wrong questions and a report that looks authoritative and is worthless.

## Step 2: the four intents

Examples below use a fictional "a tool that converts PDFs to spreadsheets". Replace them with the site's real topic, in its audience's words.

**A. Topic discovery (3 questions).** No brand name. This is where someone starts, and where most sites are invisible.

> how do I get tables out of a PDF into Excel
> best way to convert a PDF to a spreadsheet
> free tool to extract data from PDFs

**B. Problem and attribute (3 questions).** The specific need the site answers. This is where a small site can beat a big one, because the answer is narrow.

> convert a scanned PDF table to CSV
> PDF to Excel without losing the formatting
> extract data from hundreds of PDFs at once

**C. Brand-aware (3 questions).** Now the brand or site name is allowed. Tests whether an assistant knows anything about the site at all, and what it thinks.

> is <BrandName> any good
> <BrandName> vs <a known competitor>
> is <BrandName> free

**D. Decision-ready (3 questions).** Someone about to choose or buy. Tests whether the site's own pages win, or an aggregator, a listicle or a review site takes the click.

> best PDF to Excel tool for accountants
> most accurate PDF table extractor
> which PDF converter handles bank statements

## Rules

**Use the audience's words.** "Get tables out of a PDF", not "tabular data extraction via OCR pipeline".

**Never put the brand in intent A or B.** Naming the brand guarantees a mention and destroys the measurement. Nine of the twelve questions must be answerable without knowing the site exists.

**One topic per set.** A site covering both tax software and payroll needs two runs, not one blended set. Blending produces a meaningless average.

**Match the market.** A French site gets French questions. Assistants answer differently by language, and a site that is invisible in English may be fine in French, which is itself the finding.

**Do not tune the set after seeing results.** Rewriting a question because the site did not show up turns the measurement into a search for a flattering number. If a question was badly built, throw the whole run out and start over, and say so.

## What to record per question

| Field | Meaning |
|---|---|
| Question | Verbatim, as it was searched |
| Intent | A, B, C or D |
| Site appeared | yes or no, domain or brand anywhere in the results |
| Who appeared instead | The sites and brands surfaced, in order |
| Source type | Brand's own site, marketplace or aggregator, review site, listicle, forum |

The last column is often the most useful thing in the report. A topic where every answer comes from listicles is won by getting into listicles, not by editing structured data. A topic where assistants quote source sites directly is won by fixing the site. These are different projects, and the source type is what tells them apart.

## Reading the result

**0 of 12** is not necessarily a site problem. Check layer 1 first: a blocked crawler or a `noindex` explains it mechanically, and nothing else matters until that is fixed.

**Mentions only in intent C** is the most common outcome for a small site. It means assistants know the site exists when asked by name, and never bring it up otherwise. The gap is topic presence, which is earned off-site, not on the page.

**Mentions in A or B** is genuinely good and worth saying so plainly.

Twelve questions is a small sample. Say so in the report. It is enough to tell "invisible" from "sometimes present", and not enough to rank anything.
