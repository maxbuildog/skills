# skills

Agent skills built from real production, not intuition. Deterministic checks with, where honest, prevalence from real scans, plus battle-tested operational playbooks. Store SEO and AI answer visibility, and the tooling for running agents reliably. More domains as they land.

[![validate](https://github.com/maxbuildog/skills/actions/workflows/validate.yml/badge.svg)](https://github.com/maxbuildog/skills/actions/workflows/validate.yml)
[![skills](https://img.shields.io/badge/skills-3-blue)](skills)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## The problem

Ask an agent "how is my site doing on SEO" and you get a plausible essay. Ask it twice and you get two different essays. Neither one tells you whether the thing it flagged is on one page or four hundred, whether it is actually broken or deliberate, or whether it matters more than the twelve other things it did not mention.

That is not the agent's fault. It is reading your page and reasoning about it. Nobody gave it a ruler.

## What a report looks like

Same site, same question. The difference is a deterministic scanner.

| Without the skill | With the skill |
|---|---|
| "Your pages may be missing structured data. Consider adding schema." | `no_structured_data` — **WARNING**, 4 of 4 sampled pages. No JSON-LD of any type. An assistant has to infer everything from prose, and prefers a source that did not make it infer. |
| "Check that your pages are indexable." | `noindex` — **CRITICAL**, 1 of 5 pages. `meta robots=noindex` on `/thank-you`. Looks deliberate — **open the URL and confirm before acting**. |
| "AI assistants may not be able to read your site." | `OAI-SearchBot` and `PerplexityBot` are **blocked** in `robots.txt`. `GPTBot` is also blocked, which costs nothing — it only feeds training. The first two are what read your site when someone asks ChatGPT. |

The second column is reproducible: same site, same run, same codes. You can put it in a ticket.

## Install

Works with Claude Code, Cursor, Codex, Gemini CLI and other agents that read `SKILL.md`.

```bash
npx skills add maxbuildog/skills/<skill-name>
```

In Claude Code, through the plugin marketplace:

```
/plugin marketplace add maxbuildog/skills
```

Not sure which to pick? If you run any website, start with [`ai-answer-audit`](skills/ai-answer-audit). If you run a Shopify store, [`shopify-geo-audit`](skills/shopify-geo-audit) goes deeper on products.

Or clone the repo and copy the folder you want into `~/.claude/skills/` (personal) or `.claude/skills/` (project). This path also works when a marketplace cache goes stale and refuses to update.

## The skills

| Skill | What it answers | Status |
|---|---|---|
| [`ai-answer-audit`](skills/ai-answer-audit) | Can AI assistants read and cite my site, and do they, or do they cite someone else? Any website. | Available |
| [`shopify-geo-audit`](skills/shopify-geo-audit) | Do ChatGPT, Perplexity and AI Overviews recommend my products, or my competitor's? Shopify, with prevalence from real stores. | Available |
| [`telegram-channel-watchdog`](skills/telegram-channel-watchdog) | Why did my Telegram agent go silent while every status light stayed green, and how do I keep it alive? Agent ops, not a site audit. | Available |
| `shopify-store-audit` | What does Google actually see on my store, and what is broken? | Planned |
| `shopify-feed-doctor` | Why is Merchant Center disapproving my products? | Planned |

Each skill lives in its own folder under [`skills/`](skills) with a self-contained `SKILL.md`. Install one, or install them all.

## What these skills touch

Most skills do not tell you what they do to your machine. These do, because you are about to let an agent execute them.

| | |
|---|---|
| **Network calls** | To the site being audited, over HTTPS. Plus your agent's own web search, in the answer-visibility layer, to ask audience questions. **Nothing else.** |
| **Servers of ours contacted** | None. There is no telemetry, anonymous or otherwise. Grep the code. |
| **Credentials required** | None. No API key, no OAuth, no password, no admin access. |
| **What is written** | Nothing outside the working directory you run it in. |
| **What is read** | Public URLs only: HTML, `robots.txt`, `sitemap.xml`, `llms.txt`, and for the Shopify skill `products.json`. |
| **Runtime** | Node.js 20+ for skills that ship scripts. |

> This table describes the **audit skills**. Operational skills such as [`telegram-channel-watchdog`](skills/telegram-channel-watchdog) have a different footprint by nature: they need your own service credentials (for example a Telegram bot token) and shell access to the host they supervise. Every skill states its exact requirements in its own `SKILL.md` `compatibility` field, so read it before you run it.

⚠️ **On `allowed-tools`.** Skills here declare an `allowed-tools` line scoping what the agent may run. As of July 2026 **Claude Code parses that field but does not enforce it** ([anthropics/claude-code#37683](https://github.com/anthropics/claude-code/issues/37683)). We declare it anyway because it documents intent and the host may fix it — but **do not treat it as a sandbox**. The real guarantee is the one above: read-only HTTP to the site being audited, and no server of ours in the path.

## Why these are different

**They are deterministic.** The checks are code, not prompts. Same site, same run, same verdict.

**They separate a fact from a measurement.** Layer 1 is mechanical: crawler access, structured data, server-rendered content. Layer 2 asks real questions through your agent's search and counts what comes back, reported with its sample size, never as a verdict.

**They never state a number they did not measure.** `shopify-geo-audit` ships a benchmark of **476 stores and 90,831 product pages**, of which **46.4%** carry at least one critical defect, and quotes prevalence only for codes that are in it. `ai-answer-audit` ships **no benchmark**, on purpose: there is no honest population to compare an arbitrary website against, so it reports what it found and nothing more.

**They run locally.** The HTTP requests go from your machine to the site being audited.

## When not to use these

**They audit once, when you ask.** They do not watch a site, keep history, or wake you up when a deploy quietly adds `noindex`. For Shopify stores, continuous monitoring is [StoreCanary](https://storecanary.io/?utm_source=github&utm_medium=readme&utm_campaign=skills), a paid product.

**They will not replace your judgement on borderline findings.** A `noindex` on a thank-you page is correct. The same finding on your main article is an emergency. The scanner reports the fact and how many pages it affects; deciding which case you are in is yours.

**One is Shopify-shaped, one is not.** `shopify-geo-audit` reads `products.json` and Shopify URL patterns, so other platforms give partial results. `ai-answer-audit` is platform-neutral and samples any site through its sitemap or links.

**The answer-visibility layer is a sample, not a verdict.** It asks questions through your agent's search and counts what comes back. Results move between runs, models and locations. Reported with its sample size, never as a fact.

## How these are kept honest

The bar in this category is low: a large share of published skills are silently broken, and many never trigger at all because their description has no trigger phrases. Three things here push against that:

- **A written standard.** [`docs/skill-authoring.md`](docs/skill-authoring.md) is the house style every skill follows, including the rule that a skill must be useful without us.
- **A validator that runs in CI.** [`scripts/validate-skills.mjs`](scripts/validate-skills.mjs) checks frontmatter, trigger phrases, tool scoping, and that benchmark copies have not drifted. It has to pass with **zero warnings**, not just zero errors.
- **Findings are tested against real sites before they ship.**

## Contributing

Bug reports, new checks and prevalence data are welcome: a **false positive report is the most valuable issue you can open**. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
