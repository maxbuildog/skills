# Contributing

Thanks for looking. This repo moves slowly on purpose: a skill that gives a wrong answer is worse than no skill, because the person reading it has no way to tell.

## What is most useful

1. **False positives.** A check flagged something that is actually fine. This is the single most valuable report. Include the store URL (or a minimal reproduction) and what you expected.
2. **False negatives.** You know a store has a defect and the skill missed it.
3. **New checks.** A defect that costs merchants money, that can be detected from the public storefront, without an app or admin access.
4. **Prevalence data.** If you run an audit over a set of stores, the anonymised aggregate is welcome. See [data/README.md](data/README.md) for the format.

## What will be declined

- Checks that need admin access, an API key, or a paid third party.
- Checks that phone home. No skill here calls a server we control, for any reason, telemetry included. Skills reach the store being audited, and nothing else except the agent's own search tool where the measurement requires it. This is not negotiable, it is the reason people trust running them.
- Advice-only skills with no measurement behind them. There are plenty of those already.
- Anything that turns a report into an ad. One link, at the end, is the ceiling.
- **Anything that tells the user or the agent to install a prerequisite from a link.** That exact pattern is how the most-downloaded malicious skill of the year worked: the instructions pointed at a page that got the agent to run a command. Prerequisites are named (`Node.js 20+`), never linked to an installer, and never fetched.
- Shell invocations that interpolate anything a scanned site controls, and anything resembling `shell=True`. A third of published skills carry a known vulnerability and one in ten ships a hardcoded secret. We are not adding to that pile.

## Ground rules for a check

A check earns its place when it is:

- **Deterministic.** Same input, same output. No "it depends on the model's mood".
- **Conservative.** When in doubt, stay silent. A merchant who finds one false positive stops trusting the other forty findings.
- **Actionable.** Every finding says what to do about it, specific to the platform.
- **Explained.** Every finding says why it matters, and links to the vendor documentation that backs it.

## Workflow

1. Open an issue first for anything larger than a typo, so we can agree on the shape before you write it.
2. Fork, branch, commit.
3. Run `node scripts/validate-skills.mjs` before pushing. CI runs it too.
4. Open a pull request against `main` and fill in the template.

## Skill structure

Read [docs/skill-authoring.md](docs/skill-authoring.md). Every skill in this repo follows the same layout and the same tone, and the validator enforces the parts that can be checked automatically.

## Code style

- Node.js 20+, ES modules, no build step.
- Dependencies are a cost. The default answer is the standard library. If a dependency is genuinely required, say why in the pull request.
- Comments explain why, not what.
