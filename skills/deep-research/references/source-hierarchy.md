# Source hierarchy, and how to judge an unknown source

**Apply this yourself, before writing.** A reader should never have to tell an official document from a tweet: you do it and show it in the register.

## 1. The four tiers

| Tier | What it is | What it proves | Possible label |
|---|---|---|---|
| **1. Official and primary** | A publisher's documentation, pricing page, changelog, source code, specification, statute text, court decision, company registry, regulatory filing, patent, official statistics, data measured by you | What the thing IS, or what its author commits to. Not what it is worth | `[F]` alone |
| **2. Empirical study** | Peer-reviewed paper, reproducible benchmark with published method, report with sample size and period, independent measurement | An effect measured under stated conditions. Check population, geography, date | `[F]` alone, with the condition |
| **3. Practitioner with data** | An operator who shows real numbers (dashboard, quantified post-mortem, integration write-up with code), a specialist journalist who cites reopenable primary sources, an analyst who publishes the method | Real experience in its context. Generalizes only if two independent groups agree | `[F]` if two independent groups, else `[H]` |
| **4. Opinion and social** | Tweet, forum thread, review video, newsletter, blog without data, guru, comparison page, press release, pitch | A signal: someone thinks or feels this. An idea to check. The users' vocabulary. **Never a fact** | `[H]` only |

Three clarifications that prevent the commonest mistakes:

- **Your own notes are tier 1 for what they measured** (an error you observed, a cost you recorded) **and tier 4 for what they report** (a date read somewhere, a copied price).
- **A press release or marketing page is tier 4**, even on the official site: the publisher says what it wants believed. Its pricing page and documentation are tier 1: it commits there.
- **A general news article** is tier 3 when it cites primary sources you can reopen, tier 4 otherwise.

## 2. Where to start, by domain

| Domain | Tier 1, open first | Tier 2 | Tier 3 | Tier 4 (signal) |
|---|---|---|---|---|
| **Web platforms and search** | Official search documentation, patents | Correlation studies with published method | Practitioners who publish their own analytics | Social posts, newsletters, gurus |
| **Tool, API, SaaS** | Docs, pricing page, changelog, status page, repository (issues, last push), terms of service | Reproducible benchmarks | Integration write-ups with code, post-mortems | Review sites (manipulable), launch tweets |
| **Market and pain** | National statistics offices, registries, annual reports | Sector studies with method and sample | Operators showing their numbers | Forums, social posts, blog "TAM" figures (copied in loops) |
| **Regulatory and legal** | The statute or regulator's text, published decisions, platform developer policies | Academic doctrine | Law firms that cite the text | Blogs that summarize, forums |
| **Person or company** | Company registries, official filings, the company's own site and careers page | | Specialist press with sources, interviews | Social networks, rumor |
| **Recent trend** | Dated official announcements, changelogs | | Dated practitioners, high-vote tech forum threads | Social, video (natural ground of this type: strong signal, weak truth) |
| **Literature and science** | The paper itself (preprint server, DOI), the data | Meta-analyses, replications | Explanations by a researcher in the field | Summary threads, press |
| **Market and product data** | Official product pages, public registries and transparency libraries (a long run shows continued spend, never profitability), verified reviews | Published A/B tests with method | Operators with numbers | Third-party tracking tools, gurus, "best-seller" lists |

## 3. Judging an unknown source in three minutes

In this order. **Leave the page to judge it**; do not judge it by its design or its own "about" page. Reading laterally, meaning leaving the page to see what others say about it, is more reliable than judging a page on its own design or its own "about" section.

1. **Stop.** Do I know this source? Does the stake justify the time?
2. **Investigate the source elsewhere.** Search the domain name. Who publishes it, who funds it, what is the business model (affiliate links, a tool it sells, an agency)? Write the **interest** in the register: "sells the tool", "agency that benefits from inflated costs", "none".
3. **Find better coverage.** For a load-bearing claim, search for the best source on the claim itself instead of staying with the one that brought it.
4. **Trace to origin.** A quote, figure or screenshot should lead back to its original context. If every path ends at one emission (a press release, a consultancy study, an unsourced encyclopedia page), it is **one** independence group, however many copies.
5. **One-line CRAAP per source**: date (currency), relevance to the question asked, authority (who speaks, with what standing), accuracy (does it show its work), purpose (inform, sell, persuade).

## 4. Signatures of a source to exclude

Mark `excluded` in the register and never cite:

- Near-identical repeated sections, generic paragraphs without a figure, name or date, no author or a generic bio, no original data, uniform tone across dozens of articles, tight publishing cadence: **content farm or search-engine page**.
- Every product carries an affiliate tag and the first in the list pays best: **affiliate list**.
- "Sponsored", "partner", "presented by": **marketing**, weigh it as such.
- Rate ranges appearing **only** on vendor and agency blogs, with no method or sample: treat them as marketing until a method is shown.

## 5. Known source traps

- **Software reviews are manipulable.** Review platforms live off the vendors listed. Read the 1 to 3 star reviews sorted by date, weigh by volume and regularity, never by the average.
- **Declared revenue** (marketplace listings, founder tweets) is self-reported. Only figures connected to a payment processor are verified.
- **App store data** are estimates, even from serious providers. Treat them as orders of magnitude.
- **API prices change within months.** Read the price on the official page on the day of the search, never in a comparison.
- **A "0" in an anonymized statistic is not a zero.** Some tools suppress rows below a threshold.
- **A long-running ad or listing proves continued spend, never profitability.**
- **A market figure with no link to its methodology** is `[E]` at best.
