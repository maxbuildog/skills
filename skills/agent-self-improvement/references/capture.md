# Capture, in detail

Capture that depends on the agent's goodwill at the end of a session does not hold.
The journal for a given agent is often created weeks after the first instruction it
should have recorded, and that gap is the cost of relying on memory.

## What to record

| Kind | Trigger | Record |
|---|---|---|
| Instruction | A person says something durable about how the agent should behave | Their words, verbatim, with date and session or task identifier |
| Failure | A run errors, is rejected, is reverted or has to be redone | The cause, not the symptom. Even if the task was abandoned |
| Near miss | The agent caught itself about to repeat a known mistake | A date in the `Applied` line of the existing entry, not a new entry |

Never summarize an instruction. A paraphrase loses the qualifier ("only for
production", "except on Fridays") that decides how general the rule is.

## Mechanical capture (recommended)

Use whatever hook or wrapper your agent host offers on user prompt submission, or a
small wrapper around a cron job. It should:

1. Lowercase the text, and normalize diacritics if your users write in several languages.
2. Test for marker phrases.
3. On a match, append one line to a raw file (`INBOX.md` or a daily log), with timestamp, source, and the verbatim text.
4. Exit silently, never block the prompt, never call a model.

Marker phrases that carry signal (extend only after you see what slips through):

```
from now on, going forward, next time, in future, stop doing, do not do that again,
never again, i already told you, how many times, remember that, always, never,
every time, rule:
```

Choose markers for signal, not coverage. Missing an instruction is cheaper than
drowning the triage in false positives.

Capture also on failed tasks. A host that skips hooks when the task fails loses the
most valuable instructions.

Two practical notes: some hosts only execute a hook after an explicit approval step
and ignore an unapproved or modified hook without any error, so test with a phrase
after every change to the hook. And declare a hook in one place only; two config
locations can each fire it.

## Headless and scheduled agents

No prompt exists, so no hook. Instead each run writes a dated run record, including
when it fails, with the cause. The periodic triage reads the run records of the
period in addition to any inbox.

## What not to capture

- Preferences of the moment ("make it shorter this time").
- Anything already stated in the instructions file (NOOP).
- Secrets, tokens, personal data. Describe the situation without the value.
