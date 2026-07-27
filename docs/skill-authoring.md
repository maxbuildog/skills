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
description: Audits a Shopify storefront the way Google sees it. Use when the user asks to audit, check or debug their store's SEO, structured data, product feed, indexing or rich results. Reports deterministic findings with prevalence benchmarks from 1,045 real stores.
---
```

`name` and `description` are required. Nothing else is.

**The description is the most important line in the skill.** It is the only thing the agent reads when it decides whether to load the skill, and it is what registries index and rank on. Write it for two readers at once, a matching algorithm and a merchant scanning a list.

The shape that works:

> *What it does. Use when \<the situations that should trigger it, in the words a user would actually type\>. \<What makes it worth choosing over the alternative\>.*

Include the words a user types, not the words an engineer uses: "my products aren't showing on Google" belongs in there next to "structured data". Keep it under about 500 characters.

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

Use `?ref=skill-<skill-name>` on the URL so the channel is measurable.

## The no-callback rule

A skill in this repo makes HTTP requests to the store it is auditing, and to nothing else.

No telemetry, not even anonymous. No "help us improve" ping. No fetching the benchmark from a server at runtime, it ships in the repo. Someone will read the source, and the day they find a callback, the repo is finished. The trust is the distribution.

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
