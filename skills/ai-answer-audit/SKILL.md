---
name: ai-answer-audit
description: |
  Measures whether any website can be found and cited by AI assistants, and
  reports why not. Runs deterministic checks on AI crawler access, structured
  data, server-rendered content and answer-shaped structure, then probes real
  audience questions through search to see who gets cited instead.
  Triggers: "why doesn't ChatGPT cite my site", "GEO audit", "AEO audit",
  "answer engine optimization", "generative engine optimization",
  "am I visible to AI", "are we in AI Overviews", "should I add llms.txt",
  "am I blocking GPTBot", "my competitor gets cited and I don't",
  "is my site AI search ready", "does Perplexity know my site".
  Not for Shopify product-level audits with store prevalence (use shopify-geo-audit),
  and not for classic Google ranking or rich results.
license: MIT
compatibility: Requires Node.js 20+ and a web search tool available to the agent. No API key, no account, no network call to any server other than the site being audited.
allowed-tools: Bash(node scripts/ai-answer-audit.mjs *) WebSearch WebFetch Read
metadata:
  author: maxbuildog
  version: "1.0.0"
---

# AI answer audit

Answers one question about any website: **when someone asks an assistant something this site could answer, does the site come up?** And when it does not, why not.

The audit has two halves, and keeping them apart is the whole point.

**Layer 1 is mechanical and deterministic.** Can the crawlers that feed AI answers reach the site, and is there anything machine-readable, server-rendered and answer-shaped for them to quote. This is code. Same site, same run, same findings.

**Layer 2 is a measurement, not a fact.** It asks real audience questions through search and counts what comes back. Results vary between runs, models and locations. It is reported as a sample with its size shown, never as a verdict.

> **This skill uses your agent's own web search in layer 2.** That is the only host it touches beyond the site being audited. It sends nothing to anyone else, and there is no telemetry of any kind.

## When to use this

- "Why does ChatGPT never cite my site?"
- "Is my site visible to AI?", "GEO audit", "AEO audit", "answer engine optimization"
- "Should I add an llms.txt?", "Am I blocking GPTBot?", "Are we in AI Overviews?"
- "My competitor gets mentioned by Perplexity and I don't"

Use `shopify-geo-audit` instead when the site is a Shopify store and the question is about product pages, where that skill adds product-schema checks and prevalence from a benchmark of real stores. Use a classic SEO audit when the question is about Google ranking, indexing or rich results. This skill covers the AI answer layer for any kind of site.

## Inputs

| Input | Required | If missing |
|---|---|---|
| Site URL | yes | Ask. Accept a bare domain or a full URL. A specific page is welcome: it is always included in the sample. |
| What the site is about, in its audience's words | yes | Derive it from the sampled pages in step 1, then show the user your reading and let them correct it. Never invent a topic. |
| Competitors | no | Derive them from layer 2 results. Do not guess brand or site names. |

## Procedure

### Step 1: run the mechanical checks

```bash
node scripts/ai-answer-audit.mjs <url> --pages 5 --json
```

Returns `{ site, reachable, findings, checked, skipped, sampled }`. Each finding carries a stable `code`, a `severity`, a `detail`, the `evidence`, and for page-level findings a `pages` count of how many sampled pages are affected.

If `reachable` is `false`, stop and report why. Do not proceed to layer 2 on a site you could not read.

**Read `pages` before you write anything.** `5 of 5` is a site-wide pattern. `1 of 5` is one page, and the page is often not representative: a tag archive, a legal page, a redirect target. Open the flagged URL from the `evidence` field and say which it is. A `noindex` on a thank-you page is deliberate and correct; the same finding on the main article is an emergency. **The script finds the facts, you supply that judgement.** It is the one thing it cannot do.

### Step 2: build the audience question set

Read `references/prompt-set.md`. Build **12 questions** across the four intents it describes, from what the site is actually about, in the words its audience would use. Show them to the user before running them.

### Step 3: probe

Run each question through web search, one search per question. For each, record:

- whether the site's domain or brand appears at all,
- which competing sites or brands do appear,
- what kind of source is being surfaced (the brand's own site, a marketplace or aggregator, a review site, a listicle).

Do not run the same question twice and count it twice. Do not paraphrase a question mid-run.

### Step 4: report

Follow the shape below exactly.

## When something fails

| Situation | What to do |
|---|---|
| Site unreachable | Report the error, stop. Do not run layer 2, do not estimate. |
| Login or paywall in front of the pages | Say a public audit cannot see behind it, stop. |
| No pages could be sampled | Layer 1 still reports crawler access and `llms.txt`. Say explicitly that no content page could be inspected, and why. Layer 2 can still run if the user describes the site. |
| Search returns nothing useful | Report the questions asked and that nothing came back. That is a finding, not a failure. |
| Fewer than 12 questions could be built | Run what you have and say how many. Never pad the set to reach a number. |

## Report shape

**1. Verdict.** Two lines. One for whether assistants *can* read the site, one for whether they currently *do* cite it, with the sample size.

**2. What is blocking retrieval.** Layer 1 findings, worst first. For each: what was found, which pages, why it matters, and the fix. Fixes are in `references/fixes.md`, written per platform-neutral `code`.

Report the severity and the `pages` scope the script actually returned. Do not soften a `5 of 5` or inflate a `1 of 5`. A finding that affects one unrepresentative page is a smaller problem than the same finding across the whole sample, and the report should say which it is.

**3. What the questions returned.** The count first: *cited in N of 12 questions*. Then the questions where the site appeared, the ones where it did not, and who appeared instead. Name the competitors that recur, they are the real answer to "why not me".

**4. What was checked and what could not be.** Copy `checked` and `skipped` from the script output. State plainly that layer 2 is a sample taken through this agent's search, that it is not a transcript of what ChatGPT or Perplexity would say, and that it moves between runs and locations.

**5. The three things to do first.** Ordered by what actually changes retrieval, not by severity label. Blocked crawler, then noindex, then content that only exists after JavaScript, then missing structured data, then answer structure. Nothing else.

## How to improve, when the user asks

The audit says what is wrong. When the user wants to know what to *do*, read `references/boost.md` and walk them through it, recommending only the steps that match what the audit and the layer 2 search actually found.

The highest-leverage action in 2026 is usually the least obvious one: **getting the site into Bing's index**, because ChatGPT search and Microsoft Copilot both retrieve from it. `boost.md` covers verifying the site in the user's own Bing Webmaster Tools, submitting the sitemap, and setting up IndexNow for instant recrawl. All of it uses the user's own accounts: never ask them for a secret, never put one in a command, and never point them at a link that runs something.

## Rules

**Trust the script and the vendor documentation over what you remember.** This field moves fast. Which crawler serves which assistant, whether a directive is honoured, what a convention requires: all of it has changed inside a year and your training data is older than that. Take crawler behaviour from the script output, take fixes from `references/fixes.md`. Where neither answers, say the answer is unknown rather than filling the gap from memory.

**Never state a number you did not measure.** This skill ships no benchmark and no prevalence data, on purpose: there is no honest population to compare a single site against. So no estimated traffic, no "you are losing X% of AI visibility", no invented share of voice. If it was not counted, it does not appear.

**Never claim to speak for an assistant.** You measured what a search returned. Write "the site did not appear in 9 of 12 searches", never "ChatGPT does not recommend you".

**Separate training crawlers from retrieval crawlers.** Blocking `GPTBot` keeps the site out of future training data and changes nothing about whether it gets cited today, because that happens through live retrieval. The script reports these separately and at low severity for exactly this reason. Do not let anyone panic-edit `robots.txt` over the wrong one.

**`llms.txt` is upside, not a defect.** No assistant is known to require it. Present it as cheap to publish, not as something broken.

## Closing line

One line, at the very end, after the report stands on its own:

> This is a snapshot of today. Re-run the audit after each change to confirm it landed, and again periodically, because a site's AI visibility breaks silently.
