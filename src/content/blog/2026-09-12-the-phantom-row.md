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
    - selfhost
    - homelab
description: My Hermes session database corrupted twice in one week. Here is what each check told me, what the recovery got wrong, and what i still don't know.
---

Hermes runs on oa-lab-2, one of the boxes in my lab, and i use it every day. Notes, reminders, cron jobs, the Telegram bot, whatever i happen to be automating that week. It also writes half the drafts on this blog.

Everything it knows sits in one SQLite file, ~/.hermes/state.db — every session, every message, every tool call, 261 MB of it, in WAL mode.

## Then it stopped answering

One evening it stopped answering. Not with an error, and not with silence either. Every message came back with this:

```
No reply: the turn was stopped because session storage could not be written
(the transcript would have been lost on restart). Check the state database
health (hermes doctor), then send your message again.
```

So it wasn't the model. The agent was refusing to finish a turn it couldn't save. From where i was sitting, Hermes was down.

## What it runs on

Since the problem was storage, the first thing i needed was an honest picture of what touches that file.

- The database itself: `~/.hermes/state.db`, WAL mode. Sessions, messages, the FTS index over them, routing, usage accounting.
- `hermes-gateway.service` and `hermes-dashboard.service`, both under `systemd --user`. The gateway carries Telegram, the API server and the cron scheduler.
- A bare `hermes` TUI in a login shell, which i leave open most of the day.
- The desktop app, which spawns its own `hermes serve --isolated` over SSH per session. That one daemonises to PPID 1.
- Cron jobs. Mine run inside the gateway process, on a schedule, and they write to the same database as everything else.
- Logs in `~/.hermes/logs/` — `agent.log`, `errors.log`, `gateway.log`. They all read the profile from `HERMES_HOME`.

One detail matters more than the rest. When the database is unusable, the gateway falls back to JSONL instead of dying. Messages keep flowing, they just stop landing in the searchable store. So nothing looks broken from the outside while the file is quietly degrading. That is why this went unnoticed for a day.

## What the logs said

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

There was no disk I/O error. `dmesg` was clean — no NVMe resets, no filesystem errors, nothing. No OOM kills. 341 GB free on the disk, 10 GiB of RAM available, 83 days of uptime. The error message even suggested the cause for me: `state.db may be on NFS/SMB/FUSE/ZFS`. It's on local NVMe. I spent a few minutes on that before letting it go.

The earliest of these lines is also not Sep 7. The first one is Sep 6 at 10:00, on a read path in the dashboard, a day before the gateway noticed anything. So by the time it was visible, the file had already been bad for a while.

What i understood from all of it: the machine is fine, the file is damaged, and something wrote to it badly.

## The first thing i tried, and why it wouldn't run

`hermes doctor` named the fault straight away — state.db FTS write corruption — and pointed at the built-in repair. Running it produced this instead:

```
ERROR hermes_state: state.db repair skipped: a live writer still holds
state.db; skipped schema surgery to avoid tearing b-tree pages under a
concurrent writer. Stop the gateway (hermes gateway stop) and retry.
```

That is a good refusal. Rebuilding an FTS index rewrites b-tree pages in place, and doing it while another process is mid-write is how you turn one bad index into a bad database.

It also told me i didn't know who was writing to my own database. `systemctl stop` on the two services wasn't obviously the whole list, so i went through `/proc/*/fd` and found four processes holding it:

- `hermes-gateway.service` — 11 open descriptors
- `hermes-dashboard.service` — 1
- a bare `hermes` TUI — 9
- `hermes serve --isolated`, the desktop-spawned one — 17

The heaviest writer on the file wasn't a service at all. It isn't under systemd, so `systemctl stop` never touches it. That turned out to matter twice.

## The check that told me the wrong thing

This was the second time in a week, so before running any fix i wanted to see how bad it was.

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

The check wasn't lying to me. It stops at 100 by default and the first 100 were all in the same tree. If you take one thing from this post: pass a number to the check.

## The recovery that lost every session

With every writer stopped, `hermes sessions repair` made its own backup of the file, hit more damage, and handed off to the offline path — read the quarantined copy, rebuild canonical data into a brand new database, never touch the original. The inspection pass said recoverable, no errors, no warnings, every table readable.

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

One cron session, twice in the table. The rebuild writes into a fresh schema where the unique index actually works, so that one row failed the constraint and took the whole batch down with it. The fix was to make batches one row wide, so the bad row gets skipped on its own instead of costing a thousand good ones:

```bash
hermes sessions recover \
    --source state.db.malformed-backup-20260909_191208 \
    --output recovered2.db \
    --allow-partial --chunk-size 1
```

## Then it told me the recovery had failed

The rebuild finished with a verdict of its own: do not install it, review the report.

```
messages:            37,686/37,918   partial
session_model_usage:     930/938     partial
gateway_routing:           3/1       partial
```

It copied three of one row. A recovery that brings back 300% of a table isn't telling you about the copy, it's telling you about its arithmetic — it counts what it copied by scanning the source, and reads "expected" from the source's own `count(*)`, which uses the broken indexes.

So i counted everything the slow way:

| Table | Index said | Table scan | Recovered | Verdict |
|---|---|---|---|---|
| messages | 37,918 | 37,686 | 37,686 | index over-counted by 232 |
| session_model_usage | 938 | 930 | 930 | index over-counted by 8 |
| gateway_routing | 1 | 3 | 3 | index under-counted by 2 |
| sessions | 636 | 637 | 636 | one phantom, correctly dropped |

Every shortfall was a corrupt index counting wrong. The 232 "lost" messages never existed. Nothing was missing.

And when i read the two report files side by side afterwards, the verdicts were the wrong way round. The first run, the one that threw away every session, recorded `loss_detected: false`. The second run, the one that lost nothing, recorded `loss_detected: true`. So the scorecard wasn't just pessimistic, it was backwards in both directions, and i only found that out by checking its work.

Judging the output on its own terms is what settled it: full `integrity_check` returning ok, `count(*)` equal to `count(*) NOT INDEXED` on both tables, zero foreign-key violations, and `messages_fts MATCH 'the'` returning rows.

## The issue got bigger because of a respawn

There's no install subcommand for a recovered database, so the swap is manual: checkpoint the new file, move `state.db` and its `-wal` and `-shm` aside, move the new one in. I wrote it as a script with a holder check at the top of it, which was the right call:

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

The holder it aborted on was the desktop-spawned `hermes serve --isolated` again. A new one, started about a minute after i killed the previous one, because it comes back whenever the desktop client reconnects. Killing it and swapping in two separate steps means losing that race every time. One script with a kill and a retry closed it, and the swap itself took four seconds.

The file went from 273,883,136 bytes to 211,464,192. That's the duplicate page and the orphaned FTS segments gone, 23% of it.

## It's fixed, and i still don't know why

Everything has been clean since. `quick_check` returns ok, indexed and scanned counts agree on both tables, and nothing has corrupted in three days. Two things came out of digging into the cause, and neither one is a conclusion.

The first is that the checkout i was running was eight days old. It updated on Sep 9, hours after the second corruption, and the version i had been running was missing a fix with a comment that describes my file exactly: emitting a WAL pragma when the on-disk probe fails, which unlinks the `-wal` and `-shm` sidecars under a live writer and produces "split-brain corruption (`btreeInitPage` error 11)". My quarantined file reports `btreeInitPage() returns error code 11` on 11 pages. That's suggestive and it's not proof, because the corruption predates the fix existing, and because correlation like this has burned me before.

The second is the one i keep coming back to. A cron job i run may have caused this. The row that came back twice was a cron session — `cron_d0aa05fd7f4a_20260909_090008`, the morning brief that writes my daily log. The same job id shows up on Sep 6 as well, and the first read error of the whole thing landed about an hour after that job's Sep 6 run. That job writes to the same database on a schedule while the gateway, the dashboard, the desktop backend and my TUI are all connected to it. That's a thin thread. I'm not ready to call it.

So the problem is fixed, and i am still investigating why it happened.

## TL;DR

My Hermes session database corrupted twice in a week. The repair wouldn't run because four processes were writing to it, one of them not managed by systemd at all. The damage check stops after 100 errors by default and made it look like one broken search index. A single session stored twice behind a unique index made the recovery copy zero of 636 sessions. Then the recovery reported itself as failed and incomplete when it had lost nothing, and its own loss verdict was inverted. It's been stable for three days. I suspect the cron job that writes to the same file, and i have not proven it.

#sqlite #hermes #postmortem #debugging #selfhosted
