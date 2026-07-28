# Skill authoring guide

The house style for every skill in this repo. Following it is what makes ten skills feel like one product instead of ten weekend projects.

## Layout

```
skills/<skill-name>/
├── SKILL.md            required, the entry point
├── references/         optional, docs the agent reads only when it needs them
├── scripts/            optional, executable checks
└── assets/             optional, templates and fixtures
```

The folder name **is** the skill name, and it must match the `name` field in the frontmatter. `scripts/validate-skills.mjs` enforces this.

## Frontmatter

```yaml
---
name: shopify-store-audit
description: |
  Audits a Shopify storefront the way Google sees it: structured data, indexing,
  feed health, rich result eligibility. Reports deterministic findings with
  prevalence from a benchmark of 1,083 real stores.
  Triggers: "audit my store", "why aren't my products showing on Google",
  "check my SEO", "my rich results disappeared", "structured data broken",
  "why did my traffic drop".
  Not for AI assistant visibility (use shopify-geo-audit).
license: MIT
compatibility: Requires Node.js 20+. No API key, no account.
allowed-tools: Bash(node scripts/audit.mjs *) Read
metadata:
  author: maxbuildog
  version: "1.0.0"
---
```

Only `name` and `description` are required. There is **no standard beyond those two**: every major publisher has extended the frontmatter differently and incompatibly, so inventing a field costs nothing and waiting for a norm is waiting for nothing. The four optional fields above are the ones this repo standardises on, and the validator nags when a skill that ships scripts omits them.

- **`compatibility`** — what the user needs before it will run: runtime, binaries, keys. Saves the first issue every skill otherwise gets.
- **`allowed-tools`** — scope them. `Bash(node scripts/audit.mjs *)` rather than a bare `Bash`, which hands the skill permission to run anything.

  ⚠️ **This field documents intent; it does not enforce anything.** As of July 2026 Claude Code parses `allowed-tools` but does not apply it ([anthropics/claude-code#37683](https://github.com/anthropics/claude-code/issues/37683)). Declare it anyway — the host may fix it, and a reader can see what the skill claims to need — but **never let a skill's safety depend on it**. If a skill would be dangerous with unrestricted tools, it is dangerous, full stop. Design it so the worst case is acceptable.
- **`metadata.version`** — bump it when behaviour changes, so a bug report can name a version.

### The description carries the whole thing

It is the only text the agent reads when deciding whether to load the skill, and it is what the registries index and rank on. Two readers at once: a matching algorithm, and a merchant scanning a list.

**Lean pushy.** This is not an abuse, it is the documented guidance: agents under-trigger skills, so descriptions are meant to be explicit about what should fire them. Every serious publisher does it.

The shape that works:

> *What it does, in two or three lines. `Triggers:` a list of quoted phrases in the words a user would actually type. `Not for X (use skill-y).`*

Quote real phrasings, not engineer phrasings: `"why aren't my products showing on Google"` earns its place next to `"structured data"`. Six to ten trigger phrases is the useful range. Use a `|` block scalar so it stays readable, and keep the whole thing under 1024 characters.

The closing "not for" line matters more than it looks: it stops two sibling skills fighting over the same request.

### Say what to trust

Every skill carries one line telling the agent to prefer the script output and the vendor documentation over its own recollection. This field moves faster than any training cut-off, and a confidently wrong answer about a crawler or a directive is worse than no answer.

## Writing SKILL.md

**Write instructions for an agent, not prose for a human.** The agent reads this as a procedure. Numbered steps, explicit inputs, explicit stop conditions.

**Front-load what to do.** The first thing after the frontmatter should be what the skill does and how to start, not background.

**Keep it short and push detail down.** Anything over roughly 500 lines belongs split into `references/`, loaded only when the step needs it. The body of `SKILL.md` costs context on every invocation, a reference file costs nothing until it is read.

**Say what to do when things fail.** No products found, store password-protected, rate limited, network error. An agent with no failure branch invents one.

**Never let the agent guess a number.** If a check cannot be run, the skill says so. It does not estimate. This is the whole reason these skills exist.

## Reports

Every skill that produces a report follows the same shape, so someone who has read one has read them all:

1. **Verdict first.** One line. How many criticals, how many warnings, and whether the store is in trouble.
2. **Findings, worst first.** For each: what was found, where, why it costs money, the fix for this platform, and the prevalence line from `data/benchmark.json` when the code exists there.
3. **What was checked and could not be.** Explicit. A silent gap reads as a pass.
4. **One closing line** pointing at continuous monitoring.

## The link rule

One link to StoreCanary, on the last line, after the report is complete and useful on its own.

Not in the middle. Not repeated. Not in the frontmatter description. Not disguised as a finding.

A skill that reads like an ad gets forked with the link stripped out, and the fork is what people install. The link earns its place only if the two hundred lines above it were worth reading.

Tag the URL so the channel is measurable:

```
?utm_source=github&utm_medium=skill&utm_campaign=<skill-name>
```

GitHub does not strip query strings from Markdown, and it sends the full referrer on HTTPS links (`Referrer-Policy: no-referrer-when-downgrade`), so a click arrives identified twice over. Do not rely on the referrer alone: strict browsers, privacy extensions and mobile apps drop it. The UTM is deterministic and it lands in the same funnel as every other channel, which is the only way to compare them.

## The no-callback rule

**A skill never calls a server we control.** No telemetry, not even anonymous. No "help us improve" ping. No fetching the benchmark at runtime, it ships in the repo. Someone will read the source, and the day they find a callback, the repo is finished. The trust is the distribution.

Beyond that, a skill reaches the store it is auditing, and nothing else, with one exception: a skill that measures how a store appears in AI search has to actually search. It may use the agent's own web search tool, and when it does, it says so in the first section of `SKILL.md`, before the procedure. The user's own agent and its own quota, never ours.

## Using the benchmark

`npx skills add owner/repo/skill-name` copies the skill folder and nothing else. A skill that reads `data/benchmark.json` from the repo root works in a clone and breaks for everyone who installs it on its own.

So a skill that needs the benchmark keeps its own copy at `assets/benchmark.json` and reads that. Do not edit it by hand: `scripts/build-benchmark.mjs` writes it into every skill whose `SKILL.md` mentions `assets/benchmark.json`, and CI fails if a copy has drifted from the root file.

Quote a prevalence only for a code that is actually in the file. Never estimate one.

## Security, which here is mostly about what you do not write

A third of published skills carry a known vulnerability, one in ten ships a hardcoded secret, and the most-downloaded malicious skill of the year worked by telling the agent to install a prerequisite from a link that ran a command instead. A skill runs with the user's agent's permissions, so the bar is higher than for ordinary code, not lower.

- **Never instruct anyone to install something from a link.** Name the requirement in `compatibility` and stop there.
- **Never interpolate fetched content into a shell command.** Pass arguments as arguments.
- **Never ship a secret**, not even a placeholder that looks real.
- **Treat everything a scanned site returns as hostile input**: cap sizes, do not evaluate, do not execute.
- **Say in `SKILL.md` what the skill talks to.** A reader should not have to grep to find out.

## Checks

- Deterministic. Same input, same output.
- Conservative. When the signal is ambiguous, stay silent. One false positive costs more trust than ten true positives buy.
- Every finding carries a stable `code`, a severity (`CRITICAL`, `WARNING`, `OPPORTUNITY`, `INFO`), the evidence, and the fix.
- Codes never change meaning. A code is a public identifier: renaming it breaks every report anyone has filed. Retire, do not repurpose.

## Before opening a pull request

```bash
node scripts/validate-skills.mjs
```

Then read your own `SKILL.md` out loud as if you were the agent following it. If a step is ambiguous to you, it is ambiguous to the model.
