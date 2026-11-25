---
title: I built an AI harness that i will never release
date: 2026-11-26 00:00:00
tags:
    - ai
    - agents
    - go
    - security
categories:
    - ai
description: What i learned building a coding-agent harness in Go over two weekends, why the permission layer is most of the work, and why it stays private.
featured_image: https://img.sglab.ioritro.com/image/65810b29-2e9f-4e31-b3a0-d5c71a88f78a.webp
---

## TL;DR

i teach agentic AI, and i can explain the loop in extreme detail. So i built one over two weekends, in Go, to see if i could build what i preach. The model turned out to be the small part. The big part is deciding what the model is allowed to do, and that part is never finished. It works, i built real projects with it, and it stays private. This post is what i learned.

## Why i started

i teach people how agentic AI works. The loop is easy to explain: the model asks for a tool, the harness runs it, the result goes back to the model. It's five boxes on a slide, and everyone nods.

i can explain that loop in as much detail as anyone wants. But i wanted to see what it takes when you have to write it yourself. On the slide, the harness is one box that says "executes tool". In a real tool that box is where all the decisions are: allowed or not, asks me or doesn't, what happens when the path is a symlink, what happens when the process dies halfway.

Now you might ask, why not just read an open source harness? i could have. But every project carries the opinions of whoever built it, and mine does too. Reading someone else's code tells me what they decided. Building my own tells me what the problem forces you to decide. So the question was simple: can i fully build something i preach?

![A tidy five-box slide next to the same box torn open, spilling gears and padlocks](https://img.sglab.ioritro.com/image/bf7b853e-f231-4079-8a61-cbdc64660a4a.webp)

## Where i started

i didn't start with code. i planned it like any other software project. Who is the user, what do i want to do as that user, and what are the acceptance criteria for it?

That habit stuck. Every milestone in the plan ends with a **gate**, a check written as an automated test, and the milestone is not done until the gate passes. "The sandbox works" is not a gate. "A prompt-injected instruction asking for `~/.ssh/id_rsa` and an outbound request both fail at the boundary, and the failure is recorded" is.

The first version was tiny. It was a loop, two tools and a model.

```
you ──► harness ──► model
            ▲          │
            │          ▼
            │     "i want to call read(main.go)"
            │          │
            └── runs it, sends the result back
```

The model only produces text. It can't open a file. The harness reads the model's text, spots a tool request, does the thing, and hands the result back. Getting that loop working took an afternoon, and everything after it took the rest of the project.

## How it progressed

It took two weekends. By the end it was 213 commits, roughly 43,000 lines of Go, and 79 tasks on a board i kept in the repo. i didn't follow a roadmap for the order, i just fixed whatever hurt next.

| Stage | What got added | Why |
|---|---|---|
| 1 | The loop, tools, storage | Make it work |
| 2 | Permission policy: allow, deny, ask | The model could do anything |
| 3 | Durable storage: commit before showing | A crash lost the whole turn |
| 4 | A sandbox (container) | My rules will have bugs |
| 5 | Shell command parsing | One-word checks got bypassed |
| 6 | A classifier for the grey area | Too many permission prompts |
| 7 | A terminal UI, model roles, MCP, sub-agents | Day to day use |
| 8 | Audits | Finding what i got wrong |

## The things i discovered

### The model is the smaller part

Calling an API and printing the answer is the easy part. Permissions, boundaries, and what happens when something goes wrong, that is where the time went. i read every AI tool differently now.

### Getting it to do things is easy, getting it to not do things is the work

Every tool call goes through a decision before it runs. This is the order nior checks, from its own docs:

```
tool call
   │
   ▼
hooks ─► plan mode ─► hard no's ─► describe the call ─► policy rules
                                                              │
                                                              ▼
                                            protected files (.env, keys)
                                                              │
                                    ┌─────────────────────────┴────────┐
                                    ▼                                  ▼
                           only the default says ask          a rule says ask / deny
                                    │                                  │
                  "don't ask again" / mode / classifier         no shortcut allowed
                                    │                                  │
                                    └───────────► you decide ◄─────────┘
                                                       │
                                            no answer in 10 minutes = denied
```

Two things in there matter more than the rest. The first is the last line. If nobody answers, the answer is no. It fails closed, always. The second is that shortcuts like "don't ask again" can only answer when the *default* was the reason to ask. They can never override a deny rule or a protected file.

The defaults matter more than the rules you write. The model will find every gap you leave.

### Anything the model reads can fight back

A web page, a README, a comment in a file in your own project, a skill you installed, any of it can contain text written to trick the model. So nior treats everything that comes in as untrusted, and the rules live outside the model's reach. The model can ask for anything. It can't change the rules, and an instruction it finds in a file has no effect on them.

### Paths lie

A relative path can climb out of the folder. A shortcut can point somewhere else. i had a test project with `notes.txt -> .env`. `read notes.txt` ran without asking and the secret reached the model. The fix is boring: resolve every path to where it really lands, and judge that one, not the name you were given.

It gets weirder. On macOS the disk ignores case, and it also folds some unicode characters. `read Secrets/prod.json` got past a rule that denied `secrets/**`. And `id_rſa`, with a long s, opened `id_rsa`. Each of these was found by an audit, not by me being clever.

## Attacking my own harness

i didn't wait for the problems to show up. i sat down and planned the attacks:

- prompt injection, from a file, from a web page
- bad commands, plain and disguised
- malicious code coming in through a skill

My first evals were bad. Things got through that i was sure the rules covered. But every time i fixed a gap the guardrails got more precise, and the next round of evals got harder to pass. That loop, attack, fail, tighten, attack again, is most of the work.

![A castle wall under siege by a poisoned scroll, a disguised figure and a tunnel, with an engineer ticking a checklist](https://img.sglab.ioritro.com/image/284b0be9-279f-413c-afaf-3d3f4d8fbe43.webp)

## Challenges i solved

### A check on the first word of a command is not a check

i spent the most time here. The model writes shell commands, and shell is a language. These are all things nior's parser had to learn:

- `/bin/rm` is `rm`. `git --no-pager push` is `git push`.
- `$'...'` and `$"..."` build words at run time, so you can't know what runs.
- `jq -f .env` reads a file you thought was protected.
- `rg --pre CMD` runs a program, while looking like a search.
- `sed -i` in a `for` loop changes files you never saw.

The rule i ended up with: if the harness can't see the whole command, it is not allowed to guess. It asks. "Unseen" is a real state in the code, and nothing can pre-approve it.

### Too many questions

A safe harness that asks every time is useless, you start clicking yes without reading. In one real session nior made 84 decisions and asked me 21 times, mostly for routine things like editing a file through a script.

So i added a second opinion: a classifier that scores how much a call needs a human. It can only turn an "ask" into an "allow", and only when the default was the reason to ask. It never touches a deny rule, a protected file, or a command nior couldn't fully see. A wrong answer can skip one prompt. It can't remove a boundary.

### Using two outside classifiers as eval partners

After that, i plugged in two external decision models, Jev from TypeSafe and Clef from Cloudflare. They gate prompts, but i also used them as eval partners. i ran the same set of commands through my own rules and through both of them, and compared. i looked at which commands my system and the models both called good, which ones we all called bad, and the interesting ones, where we disagreed.

On a set of 31 calls, Clef scored routine commands at 0.35 or below and harmful ones at 0.60 or above. Jev scored routine at 0.48 or below and harmful at 0.64 or above. Both separate cleanly at 0.5, so that became the threshold, up from my first guess of 0.25. A threshold set from obvious cases only is wrong.

### "Don't ask again" was too generous

i approved a loop with `$f` in it and picked "don't ask again". Because nior couldn't see inside the loop, the only thing it could offer was "allow all of bash". After that, 31 file changes ran without me seeing any of them. Now a command with an unseen part offers nothing but "approve once".

### A crash in the middle of a turn

Everything is committed to SQLite before it is shown. If the process dies mid-turn, reopening picks the work up. A tool call that was cut off by the crash is answered "interrupted" and never repeated automatically, because running `rm` twice is not the same as running it once.

## Issues that kept happening

Honestly, it was the same shape, over and over.

| Pattern | Example |
|---|---|
| A rule checks the name, the real thing is different | symlink to `.env`, case folding |
| The command looks read-only, it isn't | `rg --pre`, `file -C`, `tree -R` |
| A shortcut is wider than the thing approved | "don't ask again" on a loop |
| A process outlives the tool that started it | background shells, stuck language servers |
| The check passes, the intent was something else | a one-time approval reused |

Every audit i ran found more. One whole-repo audit found 20 defects, most reproduced with a small scratch program. That is not a sign it was badly built. It is what this kind of software is like.

## Things to watch out for

- Defaults over rules. Start from "deny" and open things up.
- Understand the whole command. If you can't parse it, ask.
- Resolve paths before trusting them.
- Treat everything the model reads as hostile input, skills included.
- Fail closed. Timeout means no.
- Log every decision with the rule that made it. i can run `nior ledger` and see why anything happened.
- A convenient shortcut is a new attack surface.

## Why i still run it in a sandbox

My rules will have bugs, i assume that. So the harness can run the work inside a container. In container mode there is no host home folder, no SSH agent, no network, and there are limits on CPU, memory and processes. The test for this is a prompt-injected instruction asking for `~/.ssh/id_rsa` and an outbound request. Both have to fail at the boundary, and the failure has to be recorded, not just refused by the model being polite.

The rules decide what should happen. The sandbox limits what can happen. You need both.

![A cracked inner box with a bug, held in by a riveted outer box](https://img.sglab.ioritro.com/image/59ed8938-14cf-4ba3-9444-664d2299dc90.webp)

## What i built, and what works

nior is a durable agent harness in Go. It's a single binary, several Go modules, and the core imports nothing else.

- **Core:** durable store, conversations, tool loop, policy, ledger of every decision and cost
- **Tools:** read, write, edit, search, shell (with background processes), repo map, language-server lookups, web fetch
- **Workspaces:** local, or a container sandbox
- **Models:** Anthropic and anything OpenAI-compatible, switch with a flag
- **Safety:** policy rules, protected files, a classifier for the grey area, approval modes, plan mode
- **Extras:** a terminal UI, MCP servers, skills, hooks, sub-agents, project instructions, a task board

## Why this is good practice

You learn the thing every agent tool is built on, and you learn it with real failures instead of blog posts. Nothing teaches you why the shell is dangerous like writing the parser and watching it get bypassed. If you want to try, do one read-only tool first, then a permission prompt before the first write. That is the whole start.

## Why i will probably never share it

Maintaining a harness is a lot of work when you have a full time job. Every one of those ifs and elses has to be maintained, and every new model and every new shell trick can break one. And i'm confident it is secure for me, because i know what i run and where. i am not confident it is secure for everybody. So it stays with me. i say "probably" because i don't promise things about next year.

## And it does work

i built a few small projects with it. One of them is public: [bangladesh-map](https://github.com/oritromax/bangladesh-map), an interactive map and open dataset of every administrative unit in Bangladesh. It is the only one i published, and it was made entirely by this harness.

It wrote real code, it asked when it should have asked, and when it got something wrong the ledger told me why.

That was the point. i didn't want to build a better tool than the ones that exist. i wanted to know i can build the thing i teach.
