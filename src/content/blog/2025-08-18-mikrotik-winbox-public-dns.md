---
title: Mikrotik - Disable Remote Request on your DNS
date: 2025-08-18 14:43:11
tags:
    - mikrotik
    - dns
categories:
    - homelab

---
So the other day, i was looking at my adguard home logs, and something caught my eye.

![DNS Requests](/static/2025/06/SCR-20250725-jorl.png)

A bunch of DNS request i have no idea where its coming from. Which puzzled me for a while.

Looking through the log, i found that they were coming from my mikrotik router. Which was strange because i had disabled remote request on my dns server.

Somehow, during a latest backup restore, the backup file was modified locally ( by me ) and i accidentally enabled Remote Request on DNS on my router.

Someone took advantage of that and was running a DNS amplification attack using my router.

So promptly disabled it.

The whole point of this post it to keep a record of my stupidity and hope it helps you avoid such a problem.
