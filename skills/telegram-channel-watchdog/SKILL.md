---
name: telegram-channel-watchdog
description: |
  Keeps a Claude Code (or Codex) agent running on a Telegram channel alive in
  production, and diagnoses the three ways it goes silent while every status
  light stays green. Covers the real three-stage process tree, a systemd
  watchdog with two probes, conversation-preserving restarts, and the orphan
  poller that makes an agent "answer every other message".
  Triggers: "my telegram bot went silent", "claude agent stopped answering on telegram",
  "telegram bot answers every other message", "keep my agent alive on telegram",
  "systemctl says active but my telegram agent is dead", "my agent reads but never replies",
  "telegram channel watchdog", "claude code telegram not responding", "agent went quiet on telegram".
  Not for building the Telegram bridge itself (any bridge does that); this is the
  reliability layer the bridges do not give you.
license: MIT
compatibility: |
  Requires a Linux host with systemd, shell access, and a Claude Code (or Codex)
  session bound to a Telegram channel plugin (the poller runs on Node/Bun). You
  need your own Telegram bot token. No other account, no API key, no callback to
  any third party.
allowed-tools: Bash(systemctl *) Bash(pgrep *) Bash(pkill *) Bash(ps *) Bash(curl *) Read
metadata:
  author: maxbuildog
  version: "1.0.0"
---

# Telegram channel watchdog

Keep an agent that talks to you on Telegram alive, and know which of the three
silences you are looking at when it goes quiet. Written from two production
channels that ran for months, and two real outages.

**Trust the probes below, not the service status.** `systemctl` reporting
`active` is the single most misleading signal here, for the reason in section 1.
When a probe and your intuition disagree, the probe wins.

## When to use this

- "My Telegram bot went silent" and you cannot tell if it crashed or just has nothing to say.
- "It answers every other message."
- "`systemctl status` says `active (running)`, but nothing reaches me."
- You are about to wire a new bot onto an agent and want it to survive the first week.
- The agent clearly received a message, understood it, and still said nothing.

Do not use this to build the bridge itself. Pick any Telegram bridge for that.
This is what you add so the bridge does not quietly die on you.

## 1. The founding fact: the process tree has three stages

A Telegram channel is not one process, it is three, stacked:

```
claude --channels plugin:telegram@...        <- the session that reasons
  └── <bun|node> run --cwd .../telegram start  <- the plugin launcher
        └── <bun|node> server.ts               <- THE POLLER. it runs getUpdates.
```

Confirm it on your own host: `ps -u <account> -o pid,ppid,cmd`.

**The work is done by the grandchild.** The two stages above it can outlive its
death, and they do. Any supervision that does not reach down to `server.ts` is
measuring something other than the function of the channel.

The failure mode to know by heart:

| What you look at | What it tells you | What it is worth |
|---|---|---|
| `systemctl status` | `active (running)`, 0 restarts | **Nothing.** The main process is the session, not the poller. |
| `Restart=on-failure` | never fired | **Nothing.** There was no failure, there was an amputation. |
| the service log | frozen | **Ambiguous.** A frozen log is indistinguishable from an idle agent, and silence is the normal state. |
| `pending_update_count` | 3 | **Everything.** Three messages that were never read. |

A channel with no watchdog is not a fragile channel, it is a channel that will
end up mute. This is the one system whose failure looks exactly like normal
operation, because silence is the expected state.

## 2. The rule that makes this skill necessary

**A Telegram channel ships with its watchdog, in the same sitting.** Not
"later", not "if it becomes a problem". Without it the failure happens and no
one sees it.

## 3. Setup checklist, in this order

1. **One dedicated bot per agent.** Never share a token between two agents. Two
   sessions polling the same token collide on `getUpdates` (409) and messages go
   alternately to one or the other: the symptom is "it answers every other
   message". Verify before concluding: compare the public part of the two
   tokens (the numeric id before the colon).
2. **Token in a `.env` at mode `600`**, never on a command line (visible in
   `ps`). Variable `TELEGRAM_BOT_TOKEN`.
3. **The allowlist.** Without one, anyone who finds the bot talks to your agent.
   ```json
   { "dmPolicy": "allowlist", "allowFrom": ["<YOUR_CHAT_ID>"] }
   ```
4. **A PTY.** Without a terminal, `claude` falls back to `--print` mode and the
   channel never starts. Run it under `script(1)`:
   ```ini
   [Service]
   Type=simple
   User=<account>
   Environment=TERM=xterm-256color
   ExecStart=/usr/bin/script -qefc "/usr/local/bin/<agent>-channel-start.sh" /home/<account>/<agent>.log
   ExecStartPre=-/usr/local/bin/<agent>-reap-pollers.sh
   Restart=always
   RestartSec=10
   ```
   Use `Restart=always`, not `on-failure`: a session that exits cleanly (exit 0)
   must restart, otherwise the channel stays dead until the watchdog next runs.

   ⚠️ **`ExecStartPre` runs as `User=<account>`, not root.** A script owned
   `700 root:root` fails with `Permission denied`, and the leading `-` makes that
   failure **silent**: the service starts normally, the guard never ran. Put
   `ExecStartPre` scripts at `755 root:root`, and always re-read the startup log
   after adding one.
5. **The watchdog (section 4). The channel is not shipped until it exists.**
6. **Real verification (section 6),** then you are done.

## 4. The watchdog

A systemd timer, every 2 to 5 minutes.

**Two probes, because neither covers the other:**

1. **Local, does the poller exist?** `pgrep -u <account> -f 'server\.ts'`. Match
   `server.ts`, **not** the launcher `... run ... start`: the launcher survives
   the death of the poller.
2. **Remote, is the queue draining?** `getWebhookInfo` -> `pending_update_count > 0`
   on N consecutive passes. This catches the live-poller-that-stopped-consuming
   case, which the local probe cannot see.

**Four guardrails, each for a lived reason:**

| Guardrail | Reference value | Why |
|---|---|---|
| **Warmup** | 90 to 120 s | The poller takes ~30 s to come up. Without this, the watchdog restarts a service that was starting fine. |
| **Cooldown** | 180 s | Never two restarts back to back. |
| **Flap detection** | 4 restarts / 20 min | This is the only condition worth alerting on. |
| **API unreachable = no verdict** | | A network outage must not cause a restart. |

**Alert doctrine: silence.** An isolated restart does not alert (or you get six
messages a morning and stop reading them). Alert in two cases only: a **flap**
(one alert per hour max), and a **restart that fails**, which is total failure
and must always surface.

**Self-match trap:** the watchdog runs as root and contains the pattern it
searches for. `pgrep -u <account>` excludes it by owner. Otherwise use a
non-contiguous pattern (`serve[r].ts`).

## 4bis. Keep the conversation across restarts

A watchdog that restarts several times a day is only worth it if the agent
**finds its conversation again**. Otherwise you traded an outage for amnesia.

**The mechanism:** `claude --continue` resumes the last conversation **of the
current working directory**. So `cd $HOME` in the start script, and point at the
project dir for that cwd. Verify the thread was resumed: the session id in the
transcript stays the same, and the file keeps growing after the restart.

**The trap that loses the thread for good.** The naive fallback is:

```bash
claude ... --continue && exit 0
exec claude ...            # WRONG: fresh session, the thread is lost
```

`--continue` can exit non-zero for two reasons this code conflates:

| Cause | What to do | Signature |
|---|---|---|
| Nothing to resume ("No conversation found to continue") | fresh session, correct | fails **immediately**, seconds |
| The session lived then died (crash, OOM, network cut, usage cap) | **retry `--continue`**, never start fresh | fails **late** |

**Tell them apart by process lifetime, not by the message:**

```bash
t0=$(date +%s)
claude ... --continue && exit 0
rc=$?; dt=$(( $(date +%s) - t0 ))
if [ "$dt" -ge 20 ]; then exit "$rc"; fi   # crash: let Restart=always retry --continue
# only here: genuinely fresh session
```

⚠️ **Reading trap:** a service log holds the messages of every past startup. The
"No conversation found to continue" from an install phase later reads like a
chronic fault. Do not conclude from the log, check current state: does the live
process carry `--continue`, and is the active transcript's session id older than
the last restart? If yes, the thread is preserved.

## 5. The four Telegram rules never to break

1. **One consumer per token.** `getUpdates` is destructive: each message is
   delivered once. Two pollers on a token, or a manual `getUpdates` while
   debugging, and messages are **stolen from the real poller**.
2. **To diagnose, use `getWebhookInfo`, never `getUpdates`.** It returns
   `pending_update_count` without consuming anything. It is the only probe that
   separates "the agent has nothing to say" from "the agent stopped reading".
3. **A restart eats the in-flight message, and no one sees it.** Between the
   poller consuming an update and injecting it into the session, the message
   exists nowhere: Telegram marked it delivered (`pending_update_count` back to
   0) and the session does not have it yet. Killing the poller in that window
   **loses the message for good**, and no probe detects it. So: **never restart
   a channel mid-conversation.** Warn first, or check the session is idle
   (transcript not growing, CPU at zero). The watchdog honours this through its
   cooldown; manual restarts do not.
4. **Never set a webhook on a bot used as a channel.** Setting a webhook stops
   the plugin's polling. Watch out when one bot carries two uses (outbound cron
   alerts and conversation): the health of the alerts then masks the failure of
   the conversation. Test the two separately.

## 5bis. The orphan poller reaper

A poller can **survive its service being stopped**:

```
<service>: Unit process 3495812 (bun) remains running after unit stopped.
```

That survivor keeps polling the Telegram API **on the same token** as the new
one. Two consumers on one token, and messages go alternately to each: the agent
"does not answer every message". With a watchdog restarting several times a day,
this is not a risk, it is a matter of time.

So an `ExecStartPre` cleans up **before** each start, when the new poller does
not exist yet, so killing every poller of the account is safe:

```bash
pkill -9 -u <account> -f 'claude --channels'         2>/dev/null
pkill -9 -u <account> -f 'plugin.*telegram'          2>/dev/null
pkill -9 -u <account> -f 'server\.ts'                2>/dev/null
exit 0
```

⚠️ **Never match `claude -p`:** headless cron jobs on the same account run in
that form and would be killed.

**Test it for real,** without waiting for an orphan to appear: fake a poller and
check it disappears on restart.

```bash
runuser -u <account> -- bash -c 'nohup setsid bash -c "exec -a \"server.ts\" sleep 600" >/dev/null 2>&1 &'
pgrep -u <account> -f 'server\.ts' | wc -l   # 2
systemctl restart <service>
pgrep -u <account> -f 'server\.ts' | wc -l   # 1, the real one
```

## 6. When a bot goes silent, the diagnostic order

1. `getWebhookInfo` -> `pending_update_count`. **If it is > 0, the poller
   stopped reading, look no further.**
2. `ps -u <account>` -> are the three stages present? Compare with another
   healthy agent as a witness.
3. The session transcript, not the log: did the message reach the model?
4. **Did the model call the send tool?** Count the outbound reply tool calls in
   the transcript and look at the last timestamp. If it answered in plain text
   without calling the tool, see section 7. This is the test that separates the
   two silences, and it is one command.
5. Two agents on the same token? Compare the bots' public ids.
6. Was a webhook set? (`url` not empty in `getWebhookInfo`.)

Never conclude "the agent is dead" from a frozen log: silence is the normal
state of these agents.

## 7. The second silence: transport is green, the agent does not post

The channel **posts nothing on its own.** An agent's end-of-turn text prints to
the host terminal and stops there. The only thing that reaches the user is an
explicit call to the channel's reply tool. So an agent can receive, understand,
draft a correct answer, and speak to no one.

What the diagnostic showed, and why to distrust it:

| Probe | Verdict |
|---|---|
| The three stages | alive |
| `systemctl is-active` | active |
| Transport watchdog | passes, reports nothing |
| `getWebhookInfo` -> `pending_update_count` | 0 |
| Manual `sendMessage` | accepted |
| Reply-tool calls in the transcript | **none for 12 h** |

**Every existing probe was green, and rightly so:** what they measure was fine.
A transport watchdog cannot see this failure, and its green light makes it more
credible.

**Independent proof, when in doubt:** the chat's `message_id` is a counter shared
by both directions. If no id was consumed between two inbound messages, no reply
ever left. That settles it without trusting the agent's logs.

**Cause:** behavioural drift, not an infrastructure fault. It flips mid-session,
and it **self-reinforces**: each turn the model imitates its previous turns,
where answering meant writing text. It does not repair itself.

**Fix:** the agent's standing instructions must carry the rule in plain words,
with an end-of-turn check ("did I call the reply tool this turn?"). A convention
held only by example eventually breaks, because the example drifts.

**Probe to add** (application-level, not transport): last inbound message in the
transcript with no reply-tool call after it beyond N minutes. Require two
consecutive passes before concluding, to avoid mistaking a long turn for a
failure.

## 7bis. Verify for real, the only check that counts

An untested guardrail is not a guardrail. "The service started" proves nothing.

```bash
# 1. The three stages are there
ps -u <account> -o pid,ppid,etimes,cmd --no-headers

# 2. The queue is empty (consuming nothing)
T=$(grep -aoE 'TELEGRAM_BOT_TOKEN=.*' <envfile> | cut -d= -f2-)
curl -s "https://api.telegram.org/bot$T/getWebhookInfo"   # expect pending_update_count = 0, empty url

# 3. A round trip proves it: send a DM and confirm a reply leaves
#    (count the outbound reply tool calls in the session transcript)

# 4. The watchdog truly detects (dry run): copy the script, force the probe
#    pattern to a value that cannot match, replace `systemctl restart` with echo,
#    and confirm it decides to restart.
```

Step 3 is the only one that proves the function. The session transcript is the
best evidence: it shows what actually reached the model, where the raw terminal
log is an interleaved ANSI stream, often unreadable and sometimes misleading.

## Security

- This skill talks to the Telegram API and your own host, and to nothing else.
  No telemetry, no callback.
- Never put the bot token on a command line or in a log. `.env` at `600`, and
  redact `\d{6,}:[A-Za-z0-9_-]{30,}` before writing any log.
- Never set `dmPolicy` to anything but `allowlist` on an agent with shell access.
- The reaper uses `pkill -9` scoped by account and pattern. Read the patterns
  before you run it, and never match `claude -p`.
