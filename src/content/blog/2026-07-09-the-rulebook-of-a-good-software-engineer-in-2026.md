---
title: The rulebook of a good software engineer in 2026
date: 2026-07-09 12:57:25
tags:
    - ai
    - software
    - development
    - engineering
categories:
    - lifelesson

description: A rulebook to make your life easier as a software engineer, not a complete list, but something to start with.
---

After nearly 15 years in this industry — writing code, leading teams, hiring engineers, watching projects succeed and fail — i've noticed something. The best engineers i've worked with don't all share the same technical stack or the same university degree. But they share a certain mindset. A set of unwritten rules that guide how they approach problems, people, and code.

I've been collecting these rules for a while. Some i learned the hard way. Some i picked up from mentors who were generous enough to share. Some i saw in engineers who made me think, "i want to work like that." I have seen first handed how not following them had led me down in rabbitholes that i rather not revisit, anytime soon. These are the rules i have been trying to adhere to my day to day as a Software Engineer ( and now an Engineering Manager), hope this helps you too. 

This is that collection. 16 rules. No particular order, though the first one is probably the most important.



## Rule #1: You Will Never Know — So Get Used to It

Applies to life in general, not just engineering. The moment you think you know something completely, that's the moment it's already leaving you behind.

You will never, in your life, know anything completely. That's not a failure — that's the whole point. The gap between what you know and what there is to know, is your chance. As a human, that's how you improve. You don't need to know everything. But you can't stop learning. The engineers who stall out aren't the ones who know the least — they're the ones who decided they know enough.



## Rule #2: Read the Spec. Then Read It Again.

Never read a requirement or spec only once. Read it when it's handed to you. Absorb the shape of it. Then — take a few hours, maybe a day — read it again.

Remarkably, you will find things you missed on the first run. Every single time. If its a critical spec, do it once more. The third pass is where the assumptions die and the real architecture starts.



## Rule #3: Your First Version Doesn't Need to Be Perfect

Not all code needs optimization. Not all code needs to be picture-perfect on the first attempt.

Premature optimization is the root of engineering failure. I didn't make that up — it's been true for decades. Don't obsess over optimization from day one. Focus on the code doing what it was supposed to do.

Premature optimization doesn't just waste time — it makes your code messy and unreadable, which makes it even harder to optimize later when you actually know what needs fixing. You end up with 200 lines of "fast" spaghetti when 50 lines of honest code would've done the job.

The order matters:

1. Write working code.
2. Then optimize — based on real-world performance data, not gut feeling.
3. Then make it pretty, if it still needs it.

Most of the time, you won't even make it to step 2. And that's fine.



## Rule #4: There Is No Best Solution — Only Trade-offs

Whatever you do, there is no best solution. There is only trade-off. Pick one thing, and something else gets impacted somewhere. In 90% of the cases, that's fine — as long as it doesn't break functionality.

Don't chase perfection. There is none. Every decision in engineering is a compromise, so make sure you're making the right one. The engineers who freeze aren't the ones who can't decide — they're the ones who won't accept that every decision comes with a cost. Pick the cost you can live with, and move on.



## Rule #5: Nobody Loves Someone Else's Code

Let's be honest — nobody loves someone else's code. If it wasn't written by you, your internal bias will always look down on it. You will find "mistakes" in it, and they will feel obvious.

Don't get into that mindset. It's extremely hard to get out of personal bias, but you have to try.

Instead of thinking about someone else's mistake, think about why they made that choice. There is always a reason. Maybe they had a deadline. Maybe the requirements were different then. Maybe they knew something you don't.

Going into someone else's code, your first impulse should be: touch only the things that don't work. If it works, leave it alone. The code you think is ugly today might be exactly what saves someone else's weekend next month.



## Rule #6: Documentation Is King

Don't be trendy and think your code is documentation enough. One year down the line, that code is as good as Egyptian hieroglyphics.

Yes, out in the wild, there are perfectly written, well-organized, clean codebases that are easier to understand. But let's be honest — that's a high bar, and you and I aren't getting there. So if it's a README file or a comment in the code, feel free to document your code and the decisions behind it.

Ask any senior engineer who worked before the AI-revolution — these comments have saved jobs and companies. Just because you have powerful AI that can read code and understand it, doesn't mean your obligation to properly explain your code has gone away. The AI doesn't know why you chose one approach over another. Only you do. Write it down.


## Rule #7: Dependencies Kill

Dependencies kill projects. This was true back when dependencies were first introduced in programming, and it's even more true now that supply chain attacks are everywhere.

If you can write 10 more lines to solve something, do it. Don't go around adding packages to your code that may not be maintained down the line — or worse, become an attack vector. The xz/liblzma backdoor should still be fresh in everyone's mind.

A function you wrote is something you control. A dependency is a promise from someone else that you're trusting with your project. Make sure that trust is earned.



## Rule #8: Establish a Coding Standard and Stick to It

Working alone? Working with a team? Working with a large company? Same rule for everyone.

Modern programming languages and linting utilities make it easier than ever to set a specific coding standard. Either follow what's been established or establish a new one — this will solve a lot of problems down the road. There are many commits that solely exist because someone had the wrong indentation setup on their IDE, and now 5000 lines are committed in a PR that are just indentation fixes. That's a very simplified example, but a practical one.

Set a standard, use it in linting and compilers, and that's your north star. When the linter passes, the code style conversation is over. Now go build something that matters.



## Rule #9: Spend Two Extra Minutes on Your Commit Message

Don't write "Added fix" as a commit description. That tells nobody nothing.

A commit description exists to explain what the code in that commit is about. This helps other people quickly get context before diving in. And it helps you down the road when you're reading back through git blame trying to figure out why something was changed.

You have access to modern AI — use it to help write a proper commit message if you need to. Same goes for PRs. Spend two extra minutes and write it properly. Future you will thank present you.



## Rule #10: Don't Fix the Symptom — Fix the Root Cause

This is a bad practice that stems from "we are on a deadline" situations. You wanna quickly solve the issue and move on to the next thing. I won't tell you that's wrong — i don't know your situation. But if possible, don't fix the symptom. Fix the root cause.

Go deep. Find the actual problem. Solve it. The symptom gets fixed anyway.

Fixing the symptom is always a band-aid solution. It will come back someday to haunt you — usually at 2 AM on a Friday, when the person who originally put the band-aid is on vacation.



## Rule #11: The Boy Scout Rule — Leave It Cleaner Than You Found It

If you find messy code, don't put it on the backburner as someone else's problem. Even if it's not your responsibility, take a gander at it. See if you can clean it up. Or notify someone who is responsible for it. But take action.

Whether you fix it or delegate it to someone else — do something about it. This is the golden rule of programming. Don't think it's someone else's mess. If you're working on the codebase, it's your mess now. Act on it.



## Rule #12: Nothing Is Ever Finished

Whatever you worked on or are working on — you can be absolutely sure it will be changed, evolved, merged, reduced, or inflated with more things. Never assume something is final. Software engineering is an ever-evolving paradigm and every piece of code you write will eventually need to be modified to do something else.

Mentally prepare for it. Don't fall in love with your code. Don't get stuck emotionally. The code that you're most proud of today is tomorrow's legacy code that someone will be complaining about in a pull request. That's not a failure — that's the lifecycle of software.



## Rule #13: Don't Brag. Be Conservative About Yourself, Liberal About Others.

Always be conservative about your own ability while being liberal about everyone else's. Even if you can write code in 10 different languages, that doesn't mean someone else on your team can't write better code than you in one language.

When someone asks for help: offer it, but don't take over. Let yourself be a guide while they drive. If you write the code for them, you've solved their immediate problem but robbed them of the learning.

And when you need help: ask for it. Directly. Don't frame it as anything else. "I need help with this" is not a weakness — it's how you get better. The engineers who pretend they have everything figured out are the ones who stall out fastest.



## Rule #14: Own Your Technical Debt — Even If You Didn't Create It

Technical debt can creep up fast over time. Don't wait for "someday" to fix it. People often put something together in a hurry and then forget about it later.

This might seem contradictory to Rule #3, but it's really not. Premature optimization is optimizing before you know what needs fixing. Technical debt is something you knowingly left out to do later — and with workload and new features, it never gets addressed. They're opposite problems.

Take some time during your work to address those lingering issues. A small refactor here. A TODO comment resolved there. Over a quarter, those small moments add up to significantly less pain. You will thank yourself later.



## Rule #15: Testing Isn't Optional

What your Quality Assurance team does is none of your business, and you can't depend on it for your code's reliability. Write unit tests, smoke tests, integration tests — whatever applies. But write tests wherever possible.

Use AI to write precise test cases for your code. Less for you to worry about, but a huge win for long-term reliability. A test suite is not a checkbox for your manager. It's the safety net that lets you ship changes without fear. If you don't have tests, you're not refactoring — you're gambling.



## Rule #16: Simplicity Wins Over Everything Else

If something can be done with a simple piece of code, don't overcomplicate it. Don't immediately think about what this could be in the future. What you have now is what you have — you can plan ahead, but don't get into the weeds.

Don't add extra arguments, parameters, or dependencies when you don't need them right now. Go with what you have. Maybe leave a 10% window for the future, but that's about it.

This rule applies to almost every aspect of software engineering — from code to architecture to documentation. The simplest solution that works today is almost always better than the elegant solution that might work next year.



That's the list. 16 rules that have held up across nearly 15 years of engineering.

None of these are new. None of them are secrets. You've probably heard versions of most of them before. But hearing them and internalizing them are two different things. The engineers who actually follow these rules — not just nod along when they read them — are the ones i've seen grow the most.

Print this. Bookmark it. Forget it and come back to it in six months. Whatever works. But pick one rule and actually apply it tomorrow. That's where it starts.