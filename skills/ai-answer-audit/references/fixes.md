# Fixes, by finding code

One entry per code the audit can emit. The fixes are platform-neutral on purpose: this skill audits any website, so it names the mechanism (a `robots.txt` line, a JSON-LD block, a server-rendered field) rather than a single CMS. Translate it to whatever the site runs on, and quote the mechanism, do not paraphrase it into something vaguer.

Order matters. A perfect schema on a page nobody is allowed to fetch changes nothing.

---

## Crawler access

### `ai_search_crawler_blocked`, CRITICAL

**What it means.** `robots.txt` disallows one or more of the crawlers that fetch pages *at answer time*: `OAI-SearchBot` (ChatGPT search), `PerplexityBot`, `Claude-SearchBot`, `Applebot-Extended`, `meta-externalagent`. An assistant cannot cite a page it is not allowed to fetch.

**Why it happens.** Usually copied from a blog post about "blocking AI scrapers", written when the only concern was training data. The same block also removed the site from the answers that send traffic.

**The fix.** Edit `robots.txt` and remove the `Disallow` entries that hit the retrieval crawlers above, whether they are named directly or inherited from a `User-agent: *` group. The evidence line in the finding tells you which rule matched. Re-run the audit to confirm the block is gone.

**Say this out loud to the owner:** blocking retrieval crawlers and blocking training crawlers are different decisions with different consequences. They may well want the second and not the first.

### `google_extended_blocked`, WARNING

**What it means.** The site is opted out of `Google-Extended`, which governs AI Overviews and Gemini grounding. Ordinary Google Search ranking is untouched, so this is invisible in Search Console while removing the site from the largest AI answer surface there is.

**The fix.** Remove the `Google-Extended` disallow in `robots.txt`. If the owner opted out deliberately, leave it and note the trade-off rather than overriding their decision.

### `ai_training_crawler_blocked`, INFO

**What it means.** `GPTBot`, `CCBot` or `anthropic-ai` are blocked. These collect data for training future models. They do not fetch pages to answer today's questions.

**The fix.** None needed. This is reported only so it does not get confused with `ai_search_crawler_blocked`. Blocking training crawlers is a legitimate choice and it costs nothing in AI visibility today.

### `no_sitemap`, WARNING

**What it means.** No `sitemap.xml` was found at the site root. It is the list a search or AI crawler reads to know which URLs exist and when they changed. Without it, discovery falls back to following links, and deep or newly published pages are found late or not at all.

**The fix.** Publish a `sitemap.xml` (or a sitemap index pointing at several) and reference it from `robots.txt` with a `Sitemap:` line. Most CMSs generate one automatically; if the site is hand-built, a static sitemap listing the canonical URLs with `lastmod` dates is enough.

### `no_llms_txt`, OPPORTUNITY

**What it means.** No `/llms.txt`. It is a young convention and no assistant is known to require it.

**The fix.** Cheap, so worth doing, but do not sell it as a cure. Serve a plain-text file at `/llms.txt`: what the site is about, who it is for, the two or three things it does differently, and links to the pages that matter most. Plain text, under a hundred lines.

---

## Whether there is anything to read

### `noindex`, CRITICAL

**What it means.** The page carries a `noindex` directive, so it is kept out of the search indexes that AI answers are retrieved from. Nothing else on the page matters until this is removed.

**Check before reporting it as a problem.** Some pages are noindexed deliberately and correctly: thank-you pages, filtered or paginated duplicates, staging paths, internal search results. Open the URL from the evidence field. If it is one of those, say so and move on. If it is a page the site actually wants found, this is the single most urgent finding in the report.

**The fix.** Find where the `<meta name="robots" content="noindex">` tag (or the `X-Robots-Tag` header) is emitted and scope it to only the pages that should carry it. It is often a leftover from a launch, a staging setup, or a plugin that added it for a subset of pages and never removed it.

### `content_js_only`, CRITICAL

**What it means.** The page returns very little readable text in its server HTML; the body appears only after JavaScript runs. Crawlers that do not execute scripts see a page with nothing to quote.

**The fix.** Render the main content server side: server-side rendering, static generation, or pre-rendering for crawlers. This is usually caused by a single-page-application front end or a client-hydrated template. It is a real engineering task, not a settings change, and it is worth being straight with the owner about that.

**Verify before escalating.** Fetch the page with JavaScript disabled and look for the main text yourself. This finding is high stakes and worth two minutes of confirmation.

### `thin_content`, WARNING

**What it means.** The page carries very little readable text. Answer engines quote specific sentences; a page that states little has little that can be lifted into an answer.

**Check first.** A navigation hub, a gallery or a link-list page can be thin by design and it does not matter. This counts on pages that are meant to answer something.

**The fix.** Write what the page is actually about: the question it answers, who it is for, the specifics. Attributes and concrete facts beat adjectives, every time, because they are what a narrow question matches on.

---

## Structured data

### `no_structured_data`, WARNING

**What it means.** No JSON-LD structured data of any kind. Structured data is the machine-readable version of the page: what it is, who wrote it, when, what it is about. Without it an assistant has to infer everything from prose, and it tends to prefer a source that did not make it infer.

**The fix.** Add a JSON-LD block in the page `<head>` with the `schema.org` type that fits the page: `Article` or `BlogPosting` for content, `Product` for a product, `Organization` and `WebSite` on the home page, `FAQPage` for a Q&A, `BreadcrumbList` for navigation. Include the fields that type expects, and validate with Google's Rich Results Test and the Schema.org validator.

### `invalid_jsonld`, CRITICAL

**What it means.** A JSON-LD block is present but cannot be parsed even after cleaning stray control characters. Everything inside it is invisible to every consumer of structured data.

**Usually caused by** an unescaped quote, newline or apostrophe injected from a title or description into the template that builds the JSON.

**The fix.** Build the JSON-LD with a real JSON serialiser rather than string concatenation, so every value is escaped correctly. Then validate the page with Google's Rich Results Test.

---

## Page basics

### `no_title`, WARNING

No non-empty `<title>`. The title is the first label every index and every assistant uses to decide what the page is about. Give every page a unique, descriptive title.

### `no_canonical`, WARNING

No canonical URL, so tracking, filter and variant URLs compete with each other and the authority that should make one page citable is split across several. Add a `<link rel="canonical">` pointing at the preferred URL of the page.

### `no_h1`, WARNING

No `H1` heading. The `H1` is the plainest statement of what the page answers; without it, the structure gives an assistant no single topic to anchor on. Give each page exactly one `H1` that states its subject.

### `meta_desc_missing`, INFO

No meta description. It is often the snippet a retrieval system quotes when it summarises the page in a list of sources. Set a per-page meta description that states what the page answers.

---

## Answer shape

These fire only on pages that read like content, so a thin landing or category page is not scolded for lacking them.

### `no_qa_structure`, OPPORTUNITY

**What it means.** A content page exposes no question-and-answer structure: no `FAQPage` schema and no question-shaped headings. Answer engines lift answers most readily from a clear "question, then a direct answer" block.

**The fix.** Where the page genuinely answers questions, phrase some headings as the question the reader would ask and put the direct answer in the first sentence beneath it. Add `FAQPage` JSON-LD for a real FAQ. Do not invent questions to game this: a forced FAQ reads as filler to a human and to a model.

### `no_dates`, OPPORTUNITY

**What it means.** No published or modified date is exposed, in the schema, a `<time>` element or a meta tag. Assistants favour content they can tell is current, and drop what they cannot date.

**The fix.** Expose `datePublished` and `dateModified` in the page's `Article` schema, and show a visible date. Keep `dateModified` honest: bumping it without changing anything is noticed and discounted.

### `no_author`, OPPORTUNITY

**What it means.** A content page exposes no author. Named authorship is one of the signals assistants and search systems use to judge whether a source is trustworthy enough to cite.

**The fix.** Add an `author` to the `Article` schema and a visible byline linking to a real author page. Anonymous content is harder for a model to trust and cite than the same content with a named, credentialed author behind it.
