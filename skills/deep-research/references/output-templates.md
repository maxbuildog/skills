# Output templates: final write-up, register, query log

The mechanical checks in the skill's phase 5 rely on this structure. Mandatory sections are marked **(mandatory)**.

## Run folder

```
research/<slug>-<date>/
├── framing.md            question, decision, type, geography, horizon, hypotheses H1..Hn, exit criteria, local notes read, mode, budget, plan
├── data/                 raw: 00-vocabulary.md, one file per theme or source, negative-search.md, perspectives.md
├── reports/              researcher-<perspective>.md, verification.md, contradiction.md
├── source-register.md    (mandatory)
├── query-log.md          every query, tool, date, what it returned
└── REPORT.md             (mandatory) the deliverable
```

Quick mode keeps `REPORT.md` with the register at its end.

---

## REPORT.md

```markdown
# <Title: the question in one line>

_Research of <date> · mode <Quick | Standard | Deep> · <n> agents · <n> queries · <duration>_

> Warning. This is desk research on public sources as of <date>. <Framing assumptions made while unattended, if any.> <Tools that failed during the run, if any.> Probability scale: almost certain 86 to 99 percent, probable 56 to 85, roughly even about 50, unlikely 16 to 45, very unlikely 1 to 15. Confidence (low, medium, high) measures the strength of sources and reasoning, independently of probability.

## 1. BLUF (mandatory)

<2 to 4 sentences: the conclusion, its probability and confidence, the recommended action. A reader who stops here knows what to do.>

**Hypothesis retained**: H<n> "...", the least contradicted by the evidence (Deep mode only: the hypothesis matrix from the devil's advocate, in section 3; in Quick and Standard modes, name the hypothesis and omit the matrix reference). **Decision served**: ...

## 2. Evidence table (mandatory)

| # | Claim | Label | Sources | Indep. groups | Verification | Probability | Confidence |
|---|---|---|---|---|---|---|---|
| 1 | ... | [F] | S-001, S-004 | 2 | ✔ | almost certain | high |
| 2 | ... | [H] | S-009 | 1 (tier 4) | ≈ "exact sentence" | probable | low |

Labels: [F] sourced fact (tier 1 or 2, or two tier 3 groups) · [E] estimate with calculation · [H] hypothesis or signal · [I] unverifiable. Verification: ✔ confirmed at the source · ≈ partially supported · ✘ refuted (always followed by "relabeled:" and the correction) · ? inaccessible · self-checked (Quick mode).

**Independent verifier tally** (mandatory outside Quick mode): of <n> load-bearing claims, <n> ✔, <n> ≈, <n> ✘ relabeled, <n> ?. Literal accuracy before correction: <x> percent. Groups merged by the verifier: <list>. <What the errors had in common.>

<Then the discussion by theme, each claim carrying its label and [S-xxx]. For a comparison: the objects by fields matrix, with the source date in each cell.>

## 3. Contradictions (mandatory)

<What two credible sources say that conflicts, with both sources and their tiers. What the devil's advocate contested and the answer (Deep mode): maintain, revise, concede. Unresolved disagreements stay here, in the open.>

| Contestation | Source that weakens it | Answer | State |
|---|---|---|---|

## 4. What I did not find (mandatory)

| What I was looking for | Where and how | Result |
|---|---|---|

<A gap is declared, never filled with plausibility. A negative search is not a positive fact.>

## 5. Open questions

<What, if known, would change the conclusion, and how to learn it: which source, which test, which person to ask (a recommendation only).>

## 6. Next actions

<3 to 6 lines, ordered, with who and when. The first is the one that decides the most for the least cost.>

## 7. Exit criteria: met or not

| Criterion from the framing | State | Comment |
|---|---|---|

## 8. Alternative direction seen on the way

<A lead the question did not ask about, deduplicated from the researcher reports, or "none".>

## Source register
<paste or link source-register.md>

## Query log
<paste or link query-log.md>
```

---

## source-register.md (mandatory)

```markdown
# Source register

| ID | Direct URL | Title | Publisher | Published | Accessed | Tier | Issuer's interest | Indep. group | Direction | Confidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S-001 | https://... | ... | ... | YYYY-MM-DD | YYYY-MM-DD | 1 | none | G1 | favorable | high | ok |
| S-002 | https://... | ... | ... | YYYY-MM-DD | YYYY-MM-DD | 4 | sells the tool | G1 | favorable | low | excluded |

Tier: 1 official or primary · 2 empirical study · 3 practitioner with data · 4 opinion or social.
Independence group: same id when one cites the other, cites the same upstream study, or shares a publisher. **Confidence is counted in groups, never in rows.**
Status: ok · excluded (content farm, affiliate, sponsored; give the reason) · inaccessible.

## Negative search

| What I was looking for | Where | Result |
|---|---|---|
```

If researchers each keep their own source table, merge them into the register by hand (or with a small script). IDs are stable once cited: never renumber.

---

## query-log.md

```markdown
# Query log

| # | Time | Tool | Query | Result (sources added, "nothing", or "already seen") |
|---|---|---|---|---|
```

The log makes the research reproducible and stops the next run on the same topic from replaying dead ends.
