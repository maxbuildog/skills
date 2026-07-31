# skills

Agent skills that **measure** an e-commerce store instead of having an opinion about it.

[![validate](https://github.com/maxbuildog/skills/actions/workflows/validate.yml/badge.svg)](https://github.com/maxbuildog/skills/actions/workflows/validate.yml)
[![skills](https://img.shields.io/badge/skills-1-blue)](skills)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## The problem

Ask an agent "how is my Shopify store doing on SEO" and you get a plausible essay. Ask it twice and you get two different essays. Neither one tells you whether the thing it flagged is on one page or four hundred, whether it is actually broken or deliberate, or whether it matters more than the twelve other things it did not mention.

That is not the agent's fault. It is reading your page and reasoning about it. Nobody gave it a ruler.

## What a report looks like

Same store, same question. The difference is a deterministic scanner and a benchmark built from 90,831 product pages.

| Without the skill | With the skill |
|---|---|
| "Your product pages may be missing structured data. Consider adding Product schema." | `no_product_schema` — **WARNING**, 3 of 4 sampled pages. Markup exists but is injected client-side. **20.4%** of the 476 stores in the benchmark have this code; only 19 of them have nothing detectable at all. |
| "Check that your pages are indexable." | `noindex_pdp` — **CRITICAL**, 1 of 4 pages. `meta robots=noindex` on `/products/gift-card`. Handle looks like a secondary SKU — **open the URL and confirm before acting**, this is usually deliberate. |
| "AI assistants may not be able to read your site." | `OAI-SearchBot` and `PerplexityBot` are **blocked** in `robots.txt`. `GPTBot` is also blocked, which costs nothing — it only feeds training. The first two are what read your site when someone asks ChatGPT for a product. |

The second column is reproducible: same store, same run, same codes. You can put it in a ticket.

## Install

Works with Claude Code, Cursor, Codex, Gemini CLI and other agents that read `SKILL.md`.

```bash
npx skills add maxbuildog/skills/<skill-name>
```

In Claude Code, through the plugin marketplace:

```
/plugin marketplace add maxbuildog/skills
```

Not sure which to pick? Start with [`shopify-geo-audit`](skills/shopify-geo-audit) — it answers the question most people actually have.

Or clone the repo and copy the folder you want into `~/.claude/skills/` (personal) or `.claude/skills/` (project). This path also works when a marketplace cache goes stale and refuses to update.

## The skills

| Skill | What it answers | Status |
|---|---|---|
| [`shopify-geo-audit`](skills/shopify-geo-audit) | Do ChatGPT, Perplexity and AI Overviews recommend my products, or my competitor's? | Available |
| `shopify-store-audit` | What does Google actually see on my store, and what is broken? | Planned |
| `shopify-feed-doctor` | Why is Merchant Center disapproving my products? | Planned |
| `shopify-price-check` | Where do my prices sit against a competitor's, product by product? | Planned |

Each skill lives in its own folder under [`skills/`](skills) with a self-contained `SKILL.md`. Install one, or install them all.

## What these skills touch

Most skills do not tell you what they do to your machine. This one does, because you are about to let an agent execute it.

| | |
|---|---|
| **Network calls** | To the store being audited, over HTTPS. Plus your agent's own web search, in `shopify-geo-audit` only, to ask buyer questions. **Nothing else.** |
| **Servers of ours contacted** | None. There is no telemetry, anonymous or otherwise. Grep the code. |
| **Credentials required** | None. No API key, no OAuth, no store password, no admin access. |
| **What is written** | Nothing outside the working directory you run it in. |
| **What is read** | Public storefront URLs only: HTML, `products.json`, `robots.txt`, `sitemap.xml`. |
| **Runtime** | Node.js 20+ for skills that ship scripts. Pure-reasoning skills need nothing. |

⚠️ **On `allowed-tools`.** Skills here declare an `allowed-tools` line scoping what the agent may run. As of July 2026 **Claude Code parses that field but does not enforce it** ([anthropics/claude-code#37683](https://github.com/anthropics/claude-code/issues/37683)). We declare it anyway because it documents intent and the host may fix it — but **do not treat it as a sandbox**. The real guarantee is the one above: read-only HTTP to your own storefront, and no server of ours in the path.

## Why these are different

**They are deterministic.** The checks are code, not prompts. Same store, same run, same verdict.

**They come with a benchmark.** Every finding is reported next to how common it is in the wild:

| Sample | |
|---|---|
| Stores scanned | 476 |
| Product pages inspected | 90,831 |
| Distinct defect types found | 43 |
| Stores with at least one critical defect | 46.4% |

**The whole catalogue, not three pages.** Most storefront audits, including the first version of this one, sample a handful of product pages and generalise. On this dataset that is measurably wrong. Replaying the same scans against only the first three pages of each store finds 63 stores with a critical defect. Reading every page finds 221. **Sampling three pages misses 71% of the stores that are actually broken**, because most defects live in the part of a catalogue nobody checks: the discontinued colourway, the page a bulk edit touched, the variant that lost its price.

That is the whole reason this benchmark exists, and it is why the critical rate here is 46.4% where the earlier three-page version reported 22%. The stores had not changed. The ruler had.

Severity is reported **per instance, not per code**, because the same defect is not equally bad everywhere: of the 20.4% of stores missing server-side product markup, only 19 have nothing detectable at all. Quoting the whole 20.4% as critical would overstate the severe case fivefold. The dataset says so out loud, in [`data/`](data).

**They run locally.** The HTTP requests go from your machine to your own storefront.

## When not to use these

**They audit once, when you ask.** They do not watch your store, keep history, tell you what changed since last week, or wake you up when a deploy quietly adds `noindex` to your product template. That is [StoreCanary](https://storecanary.io/?utm_source=github&utm_medium=readme&utm_campaign=skills), and it is a paid product.

**They will not replace your judgement on borderline findings.** A `noindex` on a gift card is correct. The same finding on your flagship product is an emergency. The scanner reports the fact and how many pages it affects; deciding which case you are in is yours.

**They are Shopify-shaped.** The checks read `products.json` and Shopify URL patterns. Other platforms will produce partial or empty results.

**The AI-visibility layer is a sample, not a verdict.** `shopify-geo-audit` asks buyer questions through your agent's search and counts what comes back. Results move between runs, models and locations. It is reported with its sample size, never as a fact.

## How these are kept honest

The bar in this category is low — a large share of published skills are silently broken, and many never trigger at all because their description has no trigger phrases. Three things here push against that:

- **A written standard.** [`docs/skill-authoring.md`](docs/skill-authoring.md) is the house style every skill follows, including the rule that a skill must be useful without us.
- **A validator that runs in CI.** [`scripts/validate-skills.mjs`](scripts/validate-skills.mjs) checks frontmatter, trigger phrases, tool scoping, and that the benchmark copies have not drifted. It has to pass with **zero warnings**, not just zero errors.
- **Findings are tested against real stores before they ship.** Three false positives were caught this way and fixed: French comma price formats, free add-on products, and one page being reported as a store-wide policy. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

Bug reports, new checks and prevalence data are welcome — a **false positive report is the most valuable issue you can open**. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
