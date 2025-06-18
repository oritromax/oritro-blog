---
title: Youtube restricted mode - Adguard Home
date: 2025-06-18 14:43:11
tags:
    - youtube
    - adguard
    - dns
categories: 
    - homelab

---

So a very weird thing was happening to me. I suddenly noticed, whatever youtube video i am watching, the comments were disabled. Initially, i was watching a kid friendly channel and i assumed the channel owner disabled the comment. Yes, my fault for not reading the message properly. Then I kept seeing it everywhere. So i decided to look at the message properly for the first time, 

![Youtube comment disabled](https://img.shost.vip/i/887a57ad-038f-4885-bc5f-7c260867a6d0.png) 

__Now What the hell is restricted mode?__

I honestly didn't know youtube has a restricted mode. I was aware of parental control, but being an adult, didn't dig deep, ever. 

So i looked through the settings and i noticed there is a big setting right on the desktop dropdown list, 

![Restricted Mode Settings](https://img.shost.vip/i/29404865-7856-466c-bbd2-d9b2775f5657.png)

__Problem is, its activated and i can't change it__

The message ___Turned on by your network administrator to help hide potentially mature videos___ also made me very confused to the fact that, i am the network administrator of my network. I use [Adguard Home](https://adguard.com/en/adguard-home/overview.html) for my DNS and Filtering with Google DNS and Cloudflare DNS for upstream. 

> For anyone who wants to know, these are the upstream address for Google and Cloudflare DNS, with TLS 

```
tls://security.cloudflare-dns.com
tls://dns.google
```

I know they are not filtering anything cause it literally says in their documentation that they are unfiltered. 

So i was looking through Adguard home's Settings and noticed this. 

![Adguard Safe Search Settings](https://img.shost.vip/i/ae979aee-b58a-4f88-aa70-babec33e041f.png)

Somehow, my __Use Safe Search__ settings were on, after the latest update, which i personally unchecked when i installed Adguard Home on a dedicated __Orange Pi__. 

Why that happened, i have zero idea, but this has been bugging me for a while. I have seen people trying different solution on reddit and different forums, but if its set from your origin point of network (AKA your Router), there is nothing you can do from anywhere else. 

> So if you are facing a restricted mode issue on youtube or Your google search is somehow automatically fixed to safe search, you need to disable it from your router or DNS handler ( if you have one ).