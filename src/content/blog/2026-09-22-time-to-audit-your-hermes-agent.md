---
title: Time to audit your hermes agent
date: 2026-09-22 23:40:00
tags:
    - hermes
    - agents
    - context
    - prompt-engineering
categories:
    - ai
    - llm
description: My agent felt like it was losing its memory. It wasn't forgetting — it was reading two hundred files, and a handful of them were lying to it.
---

Hermes runs a good chunk of my day. It lives on a box in my lab, it holds my notes, my homelab inventory, my personal context, and a couple hundred skills that describe how i want specific jobs done. Ask it something i've done before and it should already know.

Somewhere over the last few months that stopped being true. It felt like it was losing its memory. Things we'd already settled came back unsettled. It would hand me an old version of a fact, confidently, and i'd only catch it because i happened to know better. Or it would pick up a procedure that was almost the right one and run with it. Nothing crashed. Nothing errored. It just got less trustworthy in a way that's hard to point at, and i ended up hovering over it — which defeats the entire point of having it.

You can't fix that by asking it to try harder. You have to look at what it reads before it answers.

## What it actually reads

Three blocks go into every single turn, before i type anything:

- an identity file — how it talks, what it's for, what it should push back on
- a memory file and a profile file — the durable facts about me and my setup
- an index of every skill it has — one line each, a name plus a trigger description

That index is the one that matters. The agent doesn't load all your skills. It reads a list of one-line descriptions and decides which skill to pull in for the job in front of it. So a skill's description is not documentation — it's a routing rule. If two skills describe themselves in a way that could both fit the same request, the agent is guessing, and you never see the guess happen.

The bodies load after the pick. Everything else sits on disk and costs nothing until it's chosen.

So the problems you're looking for are specific. Duplicate skills whose triggers overlap. Facts that were true the day someone wrote them and aren't now. The same instruction repeated in three files with small differences. Links to reference files that don't exist. A single skill body so large that loading it eats most of your context.

i had all of those. Several had been sitting in there for months, and one of them had been actively costing me — three separate skills were telling the agent not to read a file that had been clean for months, based on a problem that was fixed and forgotten.

## The prompt i used, and the prompt i should have used

My first version asked it to review its own operating files for friction, accuracy and bloat, and hand me a rewritten version. That was reasonable, and it got me a decent pass on the instruction files. That part held up.

Mine opened with the same line the prompt below opens with — act as a critical auditor of your own operating files — and then asked for four things: friction, accuracy, bloat, and a clean rewrite for review. What it never asked for was whether the files agreed with each other, or whether any of them were still true.

It could not see the real problem, because i'd asked it whether the words were good, not whether the library was consistent. And when i pointed it at the skills, i made a worse mistake — i let it run unsupervised. It started spawning its own subagents, ran for seven minutes and spend a few million tokens, and came back with a report telling me it had archived 48 skills. Nothing had been archived. i checked the file timestamps myself; not one had been touched that day. It had invented the entire result set, in the calm voice a good report has.

That's the part worth telling you about. A model reviewing your files will not say "i didn't check". It will write the report you'd expect from something that did.

So the prompt i'd give you is built to make that impossible. Hand this to your agent, on the same box it runs on, with read access to its own config directory, and nothing else:

```text
Act as a critical auditor of your own operating files and runtime context.

You are auditing the files that define how you think and work: your instructions
(identity/SOUL), your persistent memory and user profile, and your skill library —
each skill's trigger, body, and references. Find what is actively hurting you, and
prove it.

RULES OF EVIDENCE — non-negotiable
1. Every finding cites its source: file:line, or the exact command and its output.
   No claim without a citation.
2. Verify against the running system, not just the text. If a file asserts something
   about the world (a path, a service, a state, a version), check the live system
   before calling it true or stale. A file being confident is not evidence it is correct.
3. Two passes, in order. Pass 1 — inventory, no judgement: every file, its size, its
   stated purpose, its trigger. Pass 2 — judgement: verdicts, with evidence.
4. Report only. Do not write, edit, move or delete any file. Do not spawn subagents.
   Do not run anything that changes state. If a tool call would modify something,
   stop and report instead.
5. If you cannot verify something, say "unverified" — never fill the gap with a
   plausible guess. An invented finding is worse than a missing one.

WHAT TO HUNT FOR
- Trigger collisions: two or more skills a reasonable reader could pick for the same
  request. Name the request, the candidates, which should survive and why.
- Contradictions: two files giving different answers to the same question — different
  paths, limits, procedures, facts. Name both, say which you'd trust.
- Stale facts: statements that were true once and are now false — especially ones that
  actively block correct behaviour ("never read X" when X is fine).
- Bloat that is actually loaded: separate what is injected into EVERY turn from what is
  read on demand. Size only costs where it is always present. Report chars and tokens.
- Bodies that should be references: sections that are lookup material (command tables,
  provider lists, platform quirks, troubleshooting index) rather than procedure. Say
  which sections move and what the body must keep.
- Dead references: links to files that do not exist, and named conventions (AGENTS.md
  and similar) that the runtime may treat as instructions.
- Unfalsifiable instructions: rules with no observable consequence, duplicated
  directives, and anything that makes you slower or more verbose without making you
  more correct.

DELIVERABLE
1. The inventory (pass 1), as a table.
2. Findings, most damaging first. For each: what's wrong → evidence → the smallest fix
   that resolves it → what it costs you to be wrong.
3. A ranked action list, cheapest-high-impact first, with keep / merge / archive /
   rewrite per item.
4. What you checked and found CLEAN — so this reads as a survey, not a complaint list.

Do not rewrite the files. Present the plan for review; the author merges.
```

Five things in there are doing the work, and each one exists because of a specific way the first attempt failed.

Every finding carries a citation — a file and line, or a command and its output. No receipts, no finding. Verify against the running system, because a file saying a service works one way is not evidence the service works that way. Inventory first, judgement second, so it can't grade things before it knows what's in the library. Report only, no writes and no subagents, so it plans and i merge — which is also what stops it from spending a few million tokens to lie to me. And it has to say "unverified" rather than fill a gap, and hand me the list of files it checked and found clean, so a clean result doesn't look the same as a skipped one.

## How i checked its answers

i didn't run it on the whole library again. i split the library into six bundles and ran each one separately, with the writes and the subagents disallowed, which brought the whole thing down to a fraction of that and no invented numbers.

Then i had claude look at the findings independently, with the same framing — that these are files of a running agent, and a file can be wrong. Where it agreed with the audit, the finding stood. Where it disagreed or added something, i went and looked at the machine myself.

Which is the actual step: nothing was accepted because a model said it. i checked the timestamps, i read the files, i ran the commands against the live box. Anything that didn't hold up got thrown out, including things that sounded good. The injected-file warning above was one of those — three skills had been carrying a note that a file was hostile, written when that was true, never updated after it was cleaned.

## What came back

Not a dramatic number, and you should see both halves of that.

| | before | after |
|---|---|---|
| skills in the library | 221 | 208 |
| the always-injected index | 21,685 chars (~5,421 tok) | 20,085 chars (~5,021 tok) — down 7% |
| category blurbs | 3,858 chars | 3,226 chars — down 16% |
| biggest skill body, loaded on use | 46.7 KB | 7.4 KB — down 84% |

The split is the part that's reproducible for anyone: the largest skill was 47 KB of command tables, provider lists, platform notes and a troubleshooting section, all loaded the moment the skill was picked, most of it for questions that never came up. That's now a 7 KB body holding the orientation and the rules, plus eleven reference files the agent reads only when it needs them. Same content, none of it deleted. 477 reference files across the library sit on that second tier now.

The token number is honest and it's small. Seven percent of the index, roughly 400 tokens a turn. If you audit your library to save money, you're going to be disappointed. What you get for the afternoon is that your agent stops doing the wrong thing with total confidence, and you stop having to catch it.

The other thing i got was the list of contradictions. Two skills describing the same job with different steps. A documented preference that had been reversed months ago in practice and never in the file. An instruction to run something on a machine where it wasn't installed. Those were the ones causing the hovering.

## What i'd tell you to do

Back up before you touch anything, and keep the backup until the new state has survived a week of real use.

Plan before you merge. The audit should hand you a plan you approve, item by item, not a rewritten library.

And the rule that mattered most: **port before you archive.** Before a duplicate skill is retired, diff it against the one you're keeping and move anything real into the keeper first — a script, an exact path, a flag, an edge case. A merge that silently drops a fact is more expensive than the duplicate ever was. Two similar skills cost you a coin flip. A merge with a missing script costs you an hour in the middle of the night.

Keep the retired ones on disk, though. Archiving isn't deleting, and i've gone back into archived files twice now to pull something out.

## The short version

Your agent's skill list is a routing table, and every overlapping trigger in it is a coin flip you don't see. Once in a while, spend an afternoon looking at what it reads before it answers you — and make it prove what it finds, because left alone it will happily hand you a clean report about work it never did.
