---
title: The Rusted Future
date: 2026-11-19 22:00:00
tags:
    - rust
    - go
    - ai
    - code-review
    - security
    - open-source
    - llm
categories:
    - ai
    - llm
description: AI made Rust cheap to write, but not cheap to read - review, cost and security in a future everyone is rewriting in Rust.
featured_image: https://img.sglab.ioritro.com/image/5276fd16-1432-4d56-b2b9-15853b06d7e3.webp
---

## TL;DR

AI made Rust easy to write, so everything is getting rewritten in it. But nobody can review that much code, and letting the same model review its own work misses the same mistakes. Every fix, skills, behaviour maps, caveman, ponytail, superpowers, either eats your context or your budget. Meanwhile AI is finding critical memory bugs in C and C++ foundations like nginx, Java and PHP, and nothing stops a bad actor from doing the same quietly. So companies run to Rust out of fear, other languages lose momentum, the human drops out of the loop, and whoever can't afford the tooling gets left out. What i can do is refocus on understanding the product, because once you know where things can go wrong, the language matters less. Pick a language whose compiler carries the primitives, review only the logic, and let specs, fuzzing and formal verification check the rest. Rust where you can't have a GC, Go for most everything else.

Everything is being rewritten in Rust right now, and almost none of it is being written by humans.

That is not a complaint about Rust. Rust is an amazing language. But the reason it's suddenly everywhere is not the reason it got popular in the first place, and that changes a lot of things down the line. Some of them are about cost, some of them are about security, and some of them are about who gets to keep working in this industry. So let's go through it in order.

## Rust was loved, but it was niche

Rust was popular way before the AI boom. People loved it, and for good reason. But it had a steep learning curve. The borrow checker, lifetimes, ownership, the primitives and the syntax, all of it took time to get comfortable with. Those exact things are what made Rust a solid language, and they are also what made it a difficult one for a team to manage. You can't just hand a Rust codebase to a new hire and expect them to ship on day two.

So Rust lived in a certain kind of niche. Systems and infra, built by teams that could afford the learning curve:

- Discord moved their Read States service from Go to Rust back in 2020 ( [Discord blog](https://discord.com/blog/why-discord-is-switching-from-go-to-rust) )
- fish shell 4.0 shipped in February 2025, fully ported from C++ to Rust ( [fish blog](https://fishshell.com/blog/new-in-40/) )
- sudo-rs became the default sudo in Ubuntu 25.10 ( [Ubuntu Discourse](https://discourse.ubuntu.com/t/adopting-sudo-rs-by-default-in-ubuntu-25-10/60583) )
- In December 2025, the Linux kernel finally dropped the "experimental" tag on Rust ( [LWN](https://lwn.net/Articles/1049831/) )

Every one of those was written by humans, people who sat down and learned the language properly.

## Then humans stopped writing the code

![Robot arms typing code on typewriters beside an empty chair](https://img.sglab.ioritro.com/image/78503800-9c1f-47c2-b306-2d38cf78d99e.webp)

Now look at what happened in 2026.

- **Bun** got rewritten from Zig to Rust in July. Jarred Sumner wrote openly that he used a pre-release Claude model for much of the rewrite ( [Bun blog](https://bun.com/blog/bun-in-rust) ).
- **GitHub Copilot's runtime** got rewritten from TypeScript to Rust in September. 832,378 lines of production Rust, 128 pull requests, and in their own words, AI agents wrote most of the code ( [GitHub blog](https://github.blog/ai-and-ml/generative-ai/migrating-the-github-copilot-runtime-to-rust-using-copilot/) ).

The learning curve stopped mattering because the one climbing it isn't a human anymore. The model doesn't care that lifetimes are annoying. The barrier that kept Rust in its niche is just gone.

## The compiler does half the work

There is a second reason Rust works so well with agents, and honestly it's the bigger one. The Rust compiler is strict. If you get the memory or the lifetimes wrong, it doesn't compile, and it tells you exactly why.

For a human, that's frustrating. For an agent, that's a gift. It's an extra data point to go after when something breaks. Write the code, compile, read the error, fix it, compile again. The agent can loop on that all day without anyone watching.

But that only covers syntax, memory and lifetime bugs. The compiler has no idea what your code is supposed to do. It can't tell you the discount got applied twice, or that the refund goes to the wrong account, or that the retry loop hammers a service that's already down. The logic, the actual flow of the thing, the compiler doesn't touch any of that.

And those are exactly the bugs that are left for someone to review.

## You can't review all of it

![A tiny engineer with a magnifying glass before a mountain of paper](https://img.sglab.ioritro.com/image/4d017895-68c1-4dcb-af81-639a16b7c030.webp)

832,378 lines over 128 PRs is about 6,500 lines per PR. I'm not going to make any claim about how carefully each one was read, i don't know. But i know what 6,500 lines of review looks like for a human, and i know nobody is doing that 128 times and keeping up.

That's the first problem. If you're someone who wants to actually look at the code, you are doomed. The amount of code being produced is way past what a person can read, let alone understand.

## So you let AI review it

![A blindfolded robot reviewing its blindfolded reflection](https://img.sglab.ioritro.com/image/6b5c9663-0b20-4f03-8eaa-867a1a62a22f.webp)

The obvious move is to let AI review the code. And this is where the dilemma starts.

If the model that wrote the code made a mistake, it made that mistake for a reason. That's a blindspot for that model, something it doesn't see as wrong. Now if you use the same model for the review, there is a good chance it misses the same issue for the same reason. It's not that it will always miss it, a fresh context does catch some things. But the errors are correlated. The thing it got wrong when writing is exactly the thing it's most likely to wave through when reviewing.

## Then you add skills, and they eat your context

The workaround is to add skills, specific instructions, guardrails. Language specific things, project specific things, "always check this, never do that".

Now you have a different problem. Models only have so much context, and your skills, instructions and guardrails take up a piece of it. And people will say, models have a million tokens of context now, just send everything. But it's not about capacity. The more data you throw at a model, the less precise it gets on the specifics, because now it has a mountain to work with instead of a mound. And when the conversation runs long, compaction kicks in and summarizes things, and that takes it one level further. More dilution, more lost specifics.

So the model has to choose. Either it gets an overview of the whole project through a narrow lens, or it gets a deep inspection of the specific code without the whole project perspective. For a small enough project that's usually not a problem. For a large codebase, it is.

## So you build a behaviour map

The next fix is a behaviour map of the project. A document that describes how things fit together, so your review agent can read from it and understand where this specific piece of code sits in the bigger picture, without inspecting all the other code. You can even generate it on demand.

But a behaviour map is a cache of your codebase, and caches go stale. Your codebase is changing at AI speed, a hundred PRs a day. So who regenerates the map? The same model. And now the blindspot is back in through the side door, because the map itself was written by the thing you were trying to double check.

## And then the bill shows up

Tokens are cheap, as long as you are chatting. As soon as you send a whole codebase, the conversation costs dollars instead of cents per turn.

Someone will say, prompt caching fixes this. If there is one person doing the review on one codebase, caching does help, a lot. But if you have a large application with 300 different moving parts being worked on at the same time, the context keeps changing and you won't be able to make much use of the cache. The real cost is context per review, times PRs per day, times the number of teams. That number gets ugly fast.

## caveman, ponytail and superpowers

So people started reaching for tools. Three of them come up the most, and they do three very different things.

### caveman cuts the reply

caveman and tools like it make the model talk less. No pleasantries, no explaining, just the answer. Less text, fewer tokens, less money. On paper it makes sense.

But look at which side of the conversation the money is on. A review is not a chat. You send the model the diff, the files around it, your skills, your guardrails, the behaviour map, and you get back a few paragraphs. Ponytail's README actually has a screenshot of a real task: $23.80, 56.7 million tokens, and 168 thousand of those were output. Output was 0.3% of the tokens. caveman goes after that 0.3%. The other 99.7% doesn't move.

And it can make things worse. When a model explains its reasoning, that explanation is often where it notices the problem. "this function takes the lock, then calls X, which... wait." Cut the explanation and sometimes you cut the part where the model would have caught the bug. If you're using a reasoning model, those thinking tokens are billed as output too, so either caveman doesn't save what people think it saves, or it saves money by cutting the thinking, which is the last thing you want in a review.

So you saved half a cent and shipped the bug, and now a human spends three hours finding it. That's not a saving.

### ponytail cuts the code

[ponytail](https://github.com/DietrichGebert/ponytail) is not a compression tool, and people lump it in with caveman a lot. It's a ruleset that makes the agent write less code. Before writing anything it checks, does this need to exist, is it already in the codebase, does the standard library do it, and only then writes the minimum.

This one kinda helps. They report 53% less code in their benchmark, and less code means less to review. Their own numbers also prove the caveman point for me: output tokens dropped to 55% of the baseline, but cost only dropped to 74%. Cutting output almost in half moved the bill by a quarter, because input is where the money goes.

But it's still the same model writing and reviewing ( their `/ponytail-review` runs on whatever model you're using ). And it's a prompt that rides along on every turn, so it's exactly the context tax i talked about, just a well made one.

### superpowers cuts the problem

[superpowers](https://github.com/obra/superpowers) is a whole workflow. Brainstorm, write a spec, break it into a plan of 2-5 minute tasks, then a fresh subagent works each task with a review after each one, and red/green TDD the whole way.

This is the most serious attempt of the three, and it touches almost every problem in this post. Small tasks mean each subagent gets a small, deep slice instead of a mountain. Fresh subagents mean a fresh context for every review.

But a fresh context is not a fresh model. The reviewer is the same model with the same blindspots, it just hasn't seen the code yet. The plan is the only whole-project view each subagent gets, which makes it a behaviour map written up front, and it goes stale the moment the implementation drifts. TDD is the strongest part, because tests are deterministic. But the same model wrote the test and the code. If it misunderstood the logic, the test has the same misunderstanding baked in, and it passes.

And it's expensive. Every subagent re-reads its context. Their own README calls the subagent mode "most thorough" and the inline mode "cheapest". There's even a skill for diagnosing sessions that burn more tokens than you expected.

So: caveman doesn't help. ponytail kinda helps. superpowers helps the most and costs the most, and it still can't get out of the blindspot, because every reviewer in the pipeline is the same model.

## Not everybody has an unlimited AI budget

![A receipt cascading down a staircase over a cash register](https://img.sglab.ioritro.com/image/fe78c588-099d-48d7-a020-99cfd2fe238b.webp)

Which brings us to the part every "AI is the future bro" doesn't get. Not every company has an unlimited AI budget.

Uber burned through its entire 2026 AI budget by April. GitHub paused Copilot sign-ups. ServiceNow ran through its allocation early ( [ownrig](https://ownrig.com/guides/ai-budget-burnout) ). And these are companies with real money.

Most of us are working with one subscription, and it comes with some kind of limit. 5 hourly, weekly, monthly, some variety of it. So now you have to choose between price and work. Where do you optimize? How do you optimize?

Your codebase is still lines of code, nothing can change that. Those lines have to be sent to a model for it to make sense of them, nothing can change that either. So the bigger the codebase, the bigger the cost. That's just simple mathematics.

## Now the scary part

So far we've only talked about cost, and people trying different things to solve it. There's another side of this picture, and it's a very scary one.

In the last few months, the number of critical vulnerabilities in long standing, apparently stable pieces of core software, the stuff holding up the internet and everything on it, has gone up by a massive number. Just to give you an example, i'm writing this on 19th November, 2026. In the last one week:

- **nginx** — "nginx2root", five memory corruption bugs, unauthenticated remote code execution through HTTP/2 and HTTP/3, disclosed 18 November ( [CERT-EU](https://cert.europa.eu/publications/security-advisories/2026-022/) )
- **Java** — "Java4Shell", CVE-2026-114938, memory corruption in the HotSpot Base64 decoder, pre-auth RCE on JDK 17, 21 and 25, disclosed 17 November ( [Qualys](https://blog.qualys.com/vulnerabilities-threat-research/2026/11/17/how-to-find-mitigate-and-patch-the-critical-java4shell-flaw-cve-2026-114938-now) )
- **PHP** — a critical security release across every supported branch, today ( [The Hacker News](https://thehackernews.com/2026/11/php-warns-of-critical-security-flaws.html) ), and that's after "php2shell" in October

Three of the most popular pieces of foundational technology, one week.

Well, that's good, isn't it? We are finding problems, we are solving them, we are making the world a safer place ( !!! ). That is the maximum optimistic way of looking at it.

Let me take away your good night's sleep. These were found by good hearted people, who found a problem, reported it to the proper authority, who fixed it first, and then it got published the proper way. Now imagine how many are out there, just by sheer statistical probability, that haven't been reported. Found by a bad actor who kept quiet and used it for personal, political or financial gain.

You know what makes this possible? The same thing that writes your code today.

php2shell is on the disclosure list of OpenAI's [Patch the Planet](https://patchtheplanet.org/), a program where AI agents find critical bugs in open source. So the good guys are already using AI to find these, at scale, and it works. Nothing stops anyone else from running the exact same loop and staying quiet about what they find.

## Back when i was doing security stuff

![A hooded many-armed figure picking padlocks on server cabinets at night](https://img.sglab.ioritro.com/image/ed5cb5c2-e2d6-43aa-836e-c0447e703172.webp)

Back in the day ( yes, back when i was doing some security stuff, 2012-13 ish ), trying to find a gap in a system meant you probe something, write a script, probe something else, rinse and repeat. It took days or months before you had something workable, something probable. Handrolled code took time. Every iteration took time.

Today, i can do all of that in a matter of hours, if not minutes. I can automate the whole test platform, keep it running, and have it iterate on itself while i'm sleeping.

If you don't understand how scary that is, let me break it down further.

## Open source can't gatekeep anymore

![A lone gatekeeper facing a tidal wave of envelopes](https://img.sglab.ioritro.com/image/024f46e2-cbd6-498d-ae28-66082c61cf13.webp)

The amazing and frankly award worthy open source tech that has been running the whole internet was always open. But it was very difficult to sneak something by, because the engineers guarding it could spot a CVE from a mile away. Now we have two problems.

The first one is the sheer amount of contributions. Because of AI, people want to add something to a project they admire, and i believe most of them do it from the goodness of their heart. But it's nearly impossible to gatekeep and verify all of those commits without drowning in madness. Almost all of the people who built and maintained these projects over the years are volunteers. They can't keep up with the number of PRs being sent to their repos. It got bad enough that in September GitHub added repo level controls to let maintainers turn off pull requests entirely, or cap how many an outside contributor can have open ( [Crypto Briefing](https://cryptobriefing.com/github-restricts-pull-requests-ai-slop/) ). Mitchell Hashimoto limited AI generated contributions to Ghostty to pre-approved issues back in January, and his reasoning is the cleanest version of this problem. Agentic coding removed the effort based backpressure that used to filter out bad submissions. Writing a PR used to cost effort, and that cost was the filter.

The second one is worse. Remember xz utils in 2024. An attacker spent about two years earning the trust of one tired maintainer, and then slipped a backdoor in. The bottleneck of that attack was human patience. Two years of being a helpful contributor. AI makes that patience cheap. Not one fake contributor, but many, each with a plausible commit history, running in parallel. That's the same "probe, script, repeat" from 2012, applied to people instead of servers.

## This is where Rust comes back in

Look at those three CVEs again. nginx is written in C. HotSpot is C++. PHP is C. And all three are memory corruption. That's exactly the class of bug Rust's compiler shuts out.

I'm not saying Rust would have prevented these specific bugs, i haven't read the root causes. I'm saying this is the class of bug Rust is built to stop. And that's why people are going to Rust. Even if you can't review all the code, Rust lets you trust some part of it without reading it, because the compiler handles that part.

It's not perfect. The first CVE in Rust code in the Linux kernel ( CVE-2025-68260, December 2025 ) was a race condition inside an `unsafe` block in the Rust Binder driver ( [Phoronix](https://www.phoronix.com/news/First-Linux-Rust-CVE) ). But that actually tells you something useful. Trust what the compiler checks, and spend your human review on the `unsafe` blocks.

## Why i called it the Rusted Future

So here's where it goes. Rust is helping with a lot of the memory related issues, so it's becoming the default for a lot of companies. They don't want to deal with the pile of issues that will eventually show up when more powerful models are available to more people. This is the eventuality, and nothing can stop it.

Some frontier companies are trying to gatekeep the more capable models, the ones better at finding exactly this kind of vulnerability. OpenAI has [Trusted Access for Cyber](https://openai.com/index/trusted-access-for-cyber/). Anthropic keeps Claude Mythos Preview restricted to its [Project Glasswing](https://www.anthropic.com/glasswing) partners. There are verified cybersecurity programs to make sure the right people, actual security researchers, are the ones getting access. But it's not a foolproof plan. Even a cheap model with enough instructions and enough leeway can do a lot of damage when there aren't enough safeguards, and there aren't.

So we are looking at a future where every company that holds a lot of sensitive data, or runs a system millions of people use, moves to Rust. It's not a question of if, it's a question of when.

And that's the first reason i called this post the Rusted Future. This kills the momentum for a lot of languages. A lot of languages had interesting promises, interesting features that could have made a lot of sense, and they will get less and less focus and less and less development, because people are scared to try something new. Everything we thought was safe two years ago turned out to be full of holes. Bun leaving Zig for Rust is the perfect example. Zig is exactly the kind of language with real promise, and it just lost one of its flagship projects.

The second reason is the human in the loop. I am a big proponent of human in the loop solutions, but it's getting harder and harder to keep the human in the loop, because the amount of code being produced versus what an engineer can review is astronomically high. We used to get one, two, three PRs a day. Now we're getting maybe a hundred, and nobody can review them properly. So we lean on automation. We lean on languages like Rust that save us from reviewing the primitives of our code. We lean on "let something else review it". And that brings back the cost problem, and the cost spirals out of control.

And that's the third reason. The game is rusted. Whoever can afford these tools keeps working, and the people who don't have access to them in a cheap, cost effective way are being left out. Add the layoffs on top of that. Companies are laying off thousands of senior engineers, and those engineers need a job. So they apply for the mid level and junior roles. They have more experience, and if a company can get that experience for a cheaper price, they're definitely going to hire them. From what i'm seeing, that's crushing the junior to mid level market right now. Entry level roles were already getting scarce, even while overall postings went up ( [stackchief](https://stackchief.com/blog/Software%20Engineer%20Job%20Market%202026%3A%20What%20the%20Data%20Shows%20Right%20Now) ). And there is nothing anybody can do about it.

## What i can actually do

I can't fix the job problem. I can't fix what's happening to the older languages. I can't fix the amount of code that keeps coming in. What i can do is help you navigate this in a more thoughtful way. Things i have tried, and things i have understood that made more sense.

I have been an engineer for the last half of my adult life. I have always thought of myself as somebody who likes to write code, who loves to write code. But i'm not writing code anymore. And i'm not designing the products that code goes into anymore either. So i was stuck in a limbo.

Rather than staying stuck in limbo, i am refocusing. On what actually matters. The understanding of the product, the design of the product. And i don't mean UI/UX design. I mean the architecture, the system design, the behind the scenes, the logic, how a product should work.

Even a mid level model can write everything you want it to. What matters is understanding that process, and being able to explain it. Because if you don't understand the product, you are chasing something that can never be done properly, regardless of what tools you use, what language you use, or how many skills you put in there to make sure nothing goes wrong. Things will go wrong. That is inevitable. What you have to understand, and what you have to plan for, is where things can go wrong and how you stop it there. That's where your USP is. That's where your USP should be.

Once you understand how to design a product from an engineer's perspective, now you have a solution. Then the language matters less. Now you get to do the things you want, with a proper understanding behind them. Because the risk surface, the attack surface, they come from the places where things could potentially go wrong. And that's where having a clear understanding of the product helps you the most.

## It doesn't have to be all bleak

So the future is not all bleak. Once you know the product, there is a smarter way of doing the rest.

If you're going for a language that's memory safe, Rust is not the only option. You have Go, you have Java, you have C#. They are memory safe too. The unsafe parts are the things bolted onto them, or other parts of their ecosystem. Remember Java4Shell, that bug lived in the JVM's C++, not in Java code. So not every language is "memory unsafe".

Rust won because you get memory safety without a garbage collector, and AI removed the learning curve that used to be the price for it. That's a real advantage where you can't have a GC. Kernels, nginx-tier infrastructure, runtimes. There, Rust is the eventuality. But for most product services, you don't need that, and you're paying for it in something else.

### Part one: let the compiler carry the primitives

Use a language that gives you a lot of safety in its own compiler. I particularly like Go. I'm a big Go fan, i write a lot of things in Go, so my go-to choice is Go, because i get the memory safety there.

To be fair to the Rust people, Go is not perfect either. A data race in Go can break its memory safety, and the race detector ( `-race` ) catches it at runtime, not at compile time. Rust's compiler stops data races in safe code. That's Go's version of Rust's `unsafe` caveat, so know where it is and review it.

Once the compiler handles that class of issues, you don't need to worry about them in review anymore. The agent is iterating, going through the code, the compiler sends it an error, it fixes it itself. That loop is handled.

### Part two: review the logic, only the logic

Now your focus shifts to the logic. So make the review process shorter and more focused. Set it up so somebody who understands the logic of your product reviews that part only. They don't have to look at the whole codebase. They look at the part that connects to your business, or to whatever this particular code was supposed to do.

That gives them a narrow focus, while everything else that used to be an integral part of their job is being handled by the language, the compiler, and the agent itself. The part the agent might screw up, the logical part, that's yours to review.

### Better tools for the logic part

There are better technologies being developed for this. Some of them are mature enough, some of them are not, but it's a start.

- **What ships with Go.** Native fuzzing ( `go test -fuzz` ) has been built in since 1.18. The race detector, `go vet`, `govulncheck`. You don't install anything, it's just there.
- **Spec driven development.** A human writes the spec and the acceptance criteria, the agent builds against it, and the review checks the code against the spec instead of against the whole codebase. Full disclosure, i built an open source tool for this, [Lyceum](https://github.com/oritromax/lyceum). It puts approval gates in the workflow so you only see the ones that need a human. The line from its README is the whole point of this post in one sentence: "The agent can say it's done. Only the CLI can record that it is."
- **Formal verification.** TLA+ for designs and distributed logic, Gobra for Go, Kani for Rust. This is the least mature of the three and the most expensive to set up, so keep it for the critical paths. But when it says something holds, it holds.

All three have one thing in common. The human writes the spec or the property, and the machine checks the code against it. The model can't quietly agree with itself on something it didn't write. That's the way out of the blindspot from the start of this post.

## The future could be GOATed as well

![A mountain goat and a small crab watching the sunrise](https://img.sglab.ioritro.com/image/79388e30-9f7f-4a43-ae1f-c0e1f5b0e4a2.webp)

One of the reasons i came out to write this post is, Rust is not the only option. You have other languages. If you put some thought into them, if you look through what they can do, you have options available.

Rust removed its barrier to entry with AI. It got cheap to write. It never got cheaper to read, and reading is the bottleneck this whole post has been about. Go is actually friendly to a human eye. It's easy to read, it gives you almost all the safety, and most of the things people used to complain about got fixed over the incremental updates, generics in 1.18, range-over-func iterators in 1.23.

So you have options. Rust where you can't have a GC, Go for most of everything else. It's not like you have to go with Rust.

The future could be GOATed as well.

## Sources

- Why Discord is switching from Go to Rust — https://discord.com/blog/why-discord-is-switching-from-go-to-rust
- What's new in fish 4.0 — https://fishshell.com/blog/new-in-40/
- Adopting sudo-rs by default in Ubuntu 25.10 — https://discourse.ubuntu.com/t/adopting-sudo-rs-by-default-in-ubuntu-25-10/60583
- Maintainers vs AI pull requests (Ghostty policy) — https://pickuma.com/for-dev/open-source-maintainers-rejecting-ai-pull-requests/
- Rust in the kernel no longer experimental — https://lwn.net/Articles/1049831/
- Rewriting Bun in Rust — https://bun.com/blog/bun-in-rust
- Migrating the GitHub Copilot runtime to Rust — https://github.blog/ai-and-ml/generative-ai/migrating-the-github-copilot-runtime-to-rust-using-copilot/
- ponytail — https://github.com/DietrichGebert/ponytail
- superpowers — https://github.com/obra/superpowers
- AI budget burnout (Uber, GitHub, ServiceNow) — https://ownrig.com/guides/ai-budget-burnout
- nginx2root — https://cert.europa.eu/publications/security-advisories/2026-022/
- Java4Shell — https://blog.qualys.com/vulnerabilities-threat-research/2026/11/17/how-to-find-mitigate-and-patch-the-critical-java4shell-flaw-cve-2026-114938-now
- PHP critical release — https://thehackernews.com/2026/11/php-warns-of-critical-security-flaws.html
- Patch the Planet — https://patchtheplanet.org/
- GitHub PR controls — https://cryptobriefing.com/github-restricts-pull-requests-ai-slop/
- First Rust CVE in the Linux kernel — https://www.phoronix.com/news/First-Linux-Rust-CVE
- OpenAI Trusted Access for Cyber — https://openai.com/index/trusted-access-for-cyber/
- Anthropic Project Glasswing — https://www.anthropic.com/glasswing
- Software engineer job market 2026 — https://stackchief.com/blog/Software%20Engineer%20Job%20Market%202026%3A%20What%20the%20Data%20Shows%20Right%20Now
- Lyceum — https://github.com/oritromax/lyceum
