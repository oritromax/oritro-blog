---
title: "Hermes Database Corruption: The phantom row"
date: 2026-09-12 21:00:00
tags:
    - sqlite
    - hermes
    - postmortem
    - debugging
    - self-hosted
categories:
    - ai
    - selfhost
    - homelab
description: My Hermes session database corrupted twice in one week. This is my mind-bending investigation into a problem that doesn't really clear up.
---

Just like every other homelab obsessed engineer who also focused heavily on AI, i have a few agentic things running here and there. Hermes being one of the primary ones that serves as a gateway for me to do a lot of things, including, checking up on all my devices and hundreds of containers.

`Environment: Ubuntu 24.04 · Hermes v0.21.1 · SQLite 3.53.1`

For those who don't know what hermes is, its probably the best **Personalized AI Agent** that exists in the space. By default, hermes keeps every session, messages, stats, tool call and history in a `SQLite` database in its root folder, for me thats `~/.hermes/state.db`.

## The Problem

The problem started a while before i actually noticed it. I got a cron failure alert, where the cron actually worked but the message hermes sent me broke down. I was in the middle of something, so didn't pay much attention at the moment.

Then when i sent a message to hermes, it came back with an fatal error.

```
No reply: the turn was stopped because session storage could not be written
(the transcript would have been lost on restart). Check the state database
health (hermes doctor), then send your message again.
```

So it wasn't the model. The agent was refusing to finish a turn it couldn't save. So i tried,

- Reset
- Clear
- Renew

None of them actually worked. For all intents and purposes, Hermes was down.

## Step One: Understand what the storage actually is

Since the problem was storage, the first thing i needed was an honest picture of how hermes handles storage and what happens on every request vs response. So the chain starts with the database and everything else that is touching it.

- The database itself: `~/.hermes/state.db`, WAL mode. Sessions, messages, the FTS index over them, routing, usage accounting.
- `hermes-gateway.service` and `hermes-dashboard.service`, both under `systemd --user`. The gateway carries Telegram, the API server and the cron scheduler.
- A bare `hermes` TUI in a login shell, which i leave open most of the day.
- The desktop app, which spawns its own `hermes serve --isolated` over SSH per session. That one daemonises to PPID 1.
- Cron jobs. Mine run inside the gateway process, on a schedule, and they write to the same database as everything else.
- Logs in `~/.hermes/logs/` — `agent.log`, `errors.log`, `gateway.log`. They all read the profile from `HERMES_HOME`.

One detail matters more than the rest. When the database is unusable, the gateway falls back to JSONL instead of dying. Messages keep flowing, they just stop landing in the searchable store. So nothing looks broken from the outside while the file is quietly degrading. That is why this went unnoticed for a day.

One thing to note, this JSONL behaviour works differently based on the corruption level. The TUI sometimes actually would respond, while the external messaging gateway was fully locked out.

## Step Two: Analyze the Log

```
2026-09-07 17:05:28 WARNING gateway.session:
  state.db routing save failed: database disk image is malformed

2026-09-07 21:03:05 ERROR gateway.run:
  Supervised task hosted_room_worker died:
  DatabaseError('database disk image is malformed')
```

And in `errors.log`, repeating, thrown from the FTS probe the schema layer runs on every connect:

```
File "hermes_state_schema.py", line 390, in _fts_table_probe
sqlite3.OperationalError: disk I/O error
```

There was no disk I/O error. `dmesg` was clean — no NVMe resets, no filesystem errors, nothing. No OOM kills. 341 GB free on the disk, 10 GiB+ of RAM available, 83 days of uptime. The error message even suggested the cause for me: `state.db may be on NFS/SMB/FUSE/ZFS`. It's on local NVMe. I spent a few minutes on that before letting it go. The most obvious answers as to why the database was failing, didn't make sense from what i know as a software engineer with 15+ years of experience.

The earliest of these lines is also not Sep 7. The first one is Sep 6 at 10:00, on a read path in the dashboard, a day before the gateway noticed anything. So by the time it was visible, the file had already been bad for a while. This was the issue i mentioned earlier that i failed to take notice of.

At this point, my understanding is, the DB itself is not fully corrupt, part of it might be the problem. Which part and which writer, thats yet to be determined.

## Attempt One: Hermes Doctor

Hermes has its own internal `doctor` script, that helps to fix issues that are generally obvious or programmatically determinable.

`hermes doctor` named the fault straight away — **state.db FTS write corruption** — and pointed at the built-in repair. Running it produced this instead:

```
ERROR hermes_state: state.db repair skipped: a live writer still holds
state.db; skipped schema surgery to avoid tearing b-tree pages under a
concurrent writer. Stop the gateway (hermes gateway stop) and retry.
```

That is a good refusal. Rebuilding an FTS index rewrites b-tree pages in place, and doing it while another process is mid-write is how you turn one bad index into a bad database.

> This is where i made the mistake of not fully paying attention. I was doing this from the TUI, while forgetting that i have a desktop session, telegram session, another session from another laptop connected to the same hermes backend. I got frustrated as to why the session i am controlling keeps saying there is a live writer. I am the writer !

Took me a while to figure out the problem. So i tried `systemctl stop` on the two services ( gateway and dashboard), but still didn't solve the problem. It wasn't obviously the whole list, so i went through `/proc/*/fd` and found four processes holding it:

- `hermes-gateway.service` — 11 open descriptors
- `hermes-dashboard.service` — 1
- a bare `hermes` TUI — 9
- `hermes serve --isolated`, the desktop-spawned one — 17

The heaviest service is the one i completely forgot about, the isolated desktop session running over **SSH**. Gotta take that down.

## All done: For a day

So at this point, after stopping the desktop session, `hermes doctor` seemed to have fixed the issue. Less than 24 hours later, it came back.

## Step Three Or One: A flawed investigation

This was the second time in a row, so before running any fix i wanted to see how bad it was.

```
$ sqlite3 "file:state.db?mode=ro" "PRAGMA quick_check;"
*** in database main ***
Tree 53 page 66495 cell 250: 2nd reference to page 4967
Tree 53 page 17004 cell 95: 2nd reference to page 8631
Tree 53 page 3207 cell 13: Rowid 755914244464 out of order
Tree 53 page 53 cell 50: invalid page number 67242
...
```

Tree 53 resolves, against `sqlite_schema`, to `messages_fts_trigram_data`. So: the search index is damaged, the base tables are fine, a rebuild will be lossless. That was my conclusion, and it was wrong.

`PRAGMA quick_check` stops after 100 errors. That is the whole story. Same command, same file, with a cap:

```
$ sqlite3 "file:state.db?mode=ro" "PRAGMA quick_check(2000000);" > out.txt
$ grep -oE "^Tree [0-9]+" out.txt | sort | uniq -c | sort -rn
   1230 Tree 53      <- messages_fts_trigram_data
    228 Tree 48      <- messages_fts_data      (never shown by the default cap)
      2 Tree 54      <- messages_fts_trigram_idx
      1 Tree 5       <- sessions
      1 Tree 32      <- idx_messages_session_id
      1 Tree 3       <- system_prompts
```

101 lines becomes 2,409, and the search index is not the only casualty. `sessions` is in there too. On the file from the earlier corruption, 44 of the errors are in Tree 7, which is `messages` itself.

The check wasn't lying, it just didn't give me the full picture. It stops at 100 by default and the first 100 were all in the same tree. If you take one thing from this post: pass a number to the check.

## Attempt Two: A bigger mess

After stopping every writer, `hermes sessions repair` started repairing, unsuccessfully. It made a backup of the database file, found more damages, and triggered an offline path. Its execution path follows:

- Read the quarantined copy
- Rebuild canonical data into a brand new database
- Don't touch the original

The initial inspection was promising, this is recoverable. Then shit went sideways,

Then the rebuild ran, and the table that matters most didn't move at all:

```
/copy/sessions/error: UNIQUE constraint failed: sessions.title
verification errors:
  "sessions count is 0, expected 636"
```

Zero of 636 sessions. Everything downstream cascaded from there. The constraint is an ordinary one:

```sql
CREATE UNIQUE INDEX idx_sessions_title_unique
  ON sessions(title) WHERE title IS NOT NULL;
```

So i went looking for the duplicate title. There wasn't one:

```sql
SELECT count(*) FROM (
    SELECT title FROM sessions WHERE title IS NOT NULL
    GROUP BY title HAVING count(*) > 1);
-- 0
```

Zero duplicate titles, in a database that had just refused to copy a row because of a duplicate title. One of those two statements was wrong, and it was my query — that query is exactly what `idx_sessions_title_unique` answers, so SQLite reads it from the index and never touches the table. The index was one of the broken things. I was asking the broken part whether it was broken.

Put `NOT INDEXED` on it and force a table scan:

```sql
SELECT (SELECT count(*) FROM sessions),
       (SELECT count(*) FROM sessions NOT INDEXED),
       (SELECT count(DISTINCT id) FROM sessions NOT INDEXED);
-- 636|637|636
```

637 physical rows, 636 distinct ids. The offending row is the same session twice, same rowid both times:

```sql
SELECT rowid, id, source FROM sessions NOT INDEXED
 WHERE id = 'cron_d0aa05fd7f4a_20260909_090008';
-- 629|cron_d0aa05fd7f4a_20260909_090008|cron
-- 629|cron_d0aa05fd7f4a_20260909_090008|cron
```

One cron session, twice in the table. The rebuild writes into a fresh schema where the unique index actually works, so that one row failed the constraint and took the whole batch down with it. The fix was to make batches one row wide, so the bad row gets skipped on its own instead of destroying the rest of the rows:

```bash
hermes sessions recover \
    --source state.db.malformed-backup-20260909_191208 \
    --output recovered2.db \
    --allow-partial --chunk-size 1
```

## Attempt Two(b): Saga Continues

The rebuild was done, it didn't set up the database itself, awaiting review.

```
messages:            37,686/37,918   partial
session_model_usage:     930/938     partial
gateway_routing:           3/1       partial
```
What it gave me to review is practically meaningless, its arithmetic. It doesn't tell me what was actually recovered. The math shows 300% of a table, then 3 rows out of 1, makes absolutely no sense.

So i counted everything the slow way:

| Table | Index said | Table scan | Recovered | Verdict |
|---|---|---|---|---|
| messages | 37,918 | 37,686 | 37,686 | index over-counted by 232 |
| session_model_usage | 938 | 930 | 930 | index over-counted by 8 |
| gateway_routing | 1 | 3 | 3 | index under-counted by 2 |
| sessions | 636 | 637 | 636 | one phantom, correctly dropped |

The calculations were wrong because of the corrupt index. The 232 messages that seemed lost, they never existed.

Even worse, when i read the two report files side by side, the wrong thing was backward. On the first attempt, where it lost everything, it recorded `loss_detected: true` and the second run, where it didn't lose anything, recorded `loss_detected: false`. When the logs, which are supposed to be deterministic, give you incorrect facts, it becomes infuriating.

Judging the output on its own terms is the only thing that made sense: full `integrity_check` returning ok, `count(*)` equal to `count(*) NOT INDEXED` on both tables, zero foreign-key violations, and `messages_fts MATCH 'the'` returning rows.

## The WTF Moment: the Respawns

There's no install subcommand for a recovered database, so the swap is manual: checkpoint the new file, move `state.db` and its `-wal` and `-shm` aside, move the new one in. I wrote it as a script with a holder check at the top of it, i didn't wanna do this manually:

```
=== swap start 2026-09-09T19:16:56+06:00 ===
ABORT: live holders: 432918

=== swap start 2026-09-09T19:17:20+06:00 ===
checkpointed recovered2.db
killing holders: 432918
no live holders — swapping now
moved state.db
moved state.db-wal
moved state.db-shm
installed recovered2 as state.db (211464192 bytes)
=== swap done 2026-09-09T19:17:24+06:00 ===
```
The holder aborted the attempt. Now i have claude open, htop opened, two watch commands with grep `hermes`, trying to understand why it failed.

And it was the desktop session that came back to bite me in the ( You know where ). It spawned a
`hermes serve --isolated` again, a new one, started a minute after i killed the previous one. I assumed if i disconnect the desktop client, that will handle it. I needed to close the desktop app completely, which was my mistake entirely.

I was fighting a time race, where i was fighting a desktop process from the same machine i am trying to fix the hermes issue via a SSH session.

One script with a kill and a retry closed it, and the swap itself took four seconds.

The file went from 273,883,136 bytes to 211,464,192. That's the duplicate page and the orphaned FTS segments gone, 23% of it.

## It's fixed, and i still don't know why

Everything has been clean since. `quick_check` returns ok, indexed and scanned counts agree on both tables, and nothing has corrupted in three days. Two things came out of digging into the cause, and neither one is a conclusion.

The first is that the checkout i was running was eight days old. It updated on Sep 9, hours after the second corruption, and the version i had been running was missing a fix with a comment that describes my file exactly: emitting a WAL pragma when the on-disk probe fails, which unlinks the `-wal` and `-shm` sidecars under a live writer and produces "split-brain corruption (`btreeInitPage` error 11)". My quarantined file reports `btreeInitPage() returns error code 11` on 11 pages. That's suggestive and it's not proof, because the corruption predates the fix existing, and because correlation like this has burned me before.

The second is the one i keep coming back to. A cron job i run may have caused this. The row that came back twice was a cron session — `cron_d0aa05fd7f4a_20260909_090008`, Its a morning brief that tells me about everything i have scheduled for the day or need to pay attention to. The same job id shows up on Sep 6 as well, and the first read error of the whole thing landed about an hour after that job's Sep 6 run. That job writes to the same database on a schedule while the gateway, the dashboard, the desktop backend and my TUI are all connected to it. That's a thin thread. I'm not ready to call it.

So the problem is fixed, and i am still investigating why it happened.

## TL;DR

My Hermes session database corrupted twice in a week. The repair wouldn't run because four processes were writing to it, one of them not managed by systemd at all. The damage check stops after 100 errors by default and made it look like one broken search index. A single session stored twice behind a unique index made the recovery copy zero of 636 sessions. Then the recovery reported itself as failed and incomplete when it had lost nothing, and its own loss verdict was inverted. It's been stable for three days. I suspect the cron job that writes to the same file, and i have not proven it.

#sqlite #hermes #postmortem #debugging #selfhosted
