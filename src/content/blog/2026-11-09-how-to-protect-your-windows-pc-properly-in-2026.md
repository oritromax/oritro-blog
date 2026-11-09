---
title: How to Protect Your Windows PC - Properly In 2026
date: 2026-11-09 21:00:00
tags:
    - windows
    - security
    - defender
    - malware
    - guide
categories:
    - lifelesson
description: Windows still gets infected in 2026 because the protection is there and switched off. The basics anyone can do in 15 minutes, and the Defender settings that actually stop malware.
---

It's 2026. We have AI writing code and cars driving themselves, and i still have to write a post about how to stop Windows from getting infected. But here we are. People are getting their life savings stolen by hackers and scammers. Private information and passwords are getting stolen because people forgets the basics. 

Most of the infected PCs i see could have been saved by settings that were already sitting inside Windows, turned off. Windows Defender ships with a lot more protection than people think. It just doesn't switch most of it on by default, because Microsoft would rather you not call them about a false alarm.

I used to hate Windows Defender with extreme devotion at one point of my life. But in a world where rest of the anti-virus products are acting more like a virus itself, defender is the light at the end of the tunnel, ironically.

This guide is about prevention, not cleanup. If you're already infected, or think you might be, stop here and read rifteyy's [ultimate guide to infostealers](https://rifteyy.org/report/the-ultimate-guide-to-infostealers) first. It covers recovery and securing your accounts properly. 

It's split in two parts:

- **The basics** — clicks only, no commands. Anyone can do this in 15 minutes, and it's most of the benefit.
- **The advanced part** — a few copy-paste PowerShell commands that turn on Defender's stronger protection. Still safe, but it will occasionally block something you actually wanted, and i'll show you how to deal with that.

Do the basics even if you skip everything else. But before any of it, there's one rule.

## Rule number one: don't download things when you don't know who made them

This is the first rule, and it comes before every setting in this post. If you don't know who made it and where it came from, don't download it, and definitely don't run it.

- Cracked games and software, "free" versions of paid apps, and game mods or cheats from random Discord servers and YouTube descriptions are how most people get infected. That "free" Photoshop is not free, you pay for it with your passwords.
- Download from the developer's own website or an official store ( Microsoft Store, Steam, the official Chrome/Firefox/Edge add-on stores ). Not from the first ad on Google that says "Download".
- If someone sends you a file or a link you weren't expecting, even a friend, ask them first. Their account might be the one that got hacked.
- If a website tells you to copy a command and paste it into Run or PowerShell to "verify you're human" or "fix an error", close the website. That is malware, every single time.

Everything else in this guide is there to catch you when this rule fails. It catches a lot, it doesn't catch everything.

## Before you start: is Defender even running?

If you installed another antivirus ( Avast, Norton, McAfee, the one that came with your laptop, etc. ), Defender goes to sleep and **nothing in this guide does anything**. Check it first.

`( Start -> Windows Security -> Virus & threat protection )`

If it says "Microsoft Defender Antivirus" is on, you're good. If it shows another product, you either keep that product and ignore the Defender part of this guide, or uninstall it and let Defender take over. For most people at home, Defender with the settings below is enough.

## Part 1: The basics

### Step 1: Install a proper ad blocker

Ads are not just annoying. Fake "Download" buttons, fake "your PC is infected" pop-ups and malicious ads are one of the most common ways people end up running something they shouldn't. A good blocker removes most of them before you ever see them.

- **Firefox:** [uBlock Origin](https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/).
- **Chrome and Edge:** uBlock Origin Lite ( [Chrome Web Store](https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh), [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/ublock-origin-lite/cimighlppcgcoapaliogpjjdehbnofhn) ). The full uBlock Origin doesn't work on Chrome anymore — Google switched it off in 2025 and removed it from the store in August 2026, and Edge is doing the same by the end of 2026. Lite is the version that still works there.
- **Optional extra layer:** [Malwarebytes Browser Guard](https://www.malwarebytes.com/browserguard), or [Bitdefender Web Sage](https://www.bitdefender.com/en-us/consumer/web-sage) ( it used to be called TrafficLight ). These focus on scam and phishing sites rather than ads.

Only install extensions from the official store ( Chrome Web Store, Edge Add-ons, Firefox Add-ons ). Fake copies of popular ad blockers exist, and they are malware.

### Step 2: Switch to a safer DNS

Every time you visit a website, your computer first asks a "DNS server" where that website lives. Some DNS services refuse to answer for known malware and phishing sites, so even if you click a bad link, the page never loads.

Free options:

| Service | Addresses | What it blocks |
|---|---|---|
| Quad9 | 9.9.9.9 and 149.112.112.112 | Known malicious domains |
| Cloudflare for Families | 1.1.1.2 and 1.0.0.2 | Malware and phishing |
| NextDNS | from your account page | Malware, ads, trackers — you choose |

Careful with Cloudflare: the famous 1.1.1.1 is the fast one, it **does not block anything**. You want 1.1.1.2.

The easiest way to set it up is inside your browser.

- Chrome: `( Settings -> Privacy and security -> Security -> Use secure DNS )`, pick a provider or type in a custom one.
- Edge: `( Settings -> Privacy, search, and services -> Security -> Use secure DNS )`.

If you want it for the whole computer instead: `( Settings -> Network & internet -> Wi-Fi or Ethernet -> Hardware properties -> DNS server assignment -> Edit )`, switch to Manual, and enter the two addresses.

### Step 3: Show file extensions

Windows still hides the end of file names by default. Even In 2026. That's exactly what scammers count on. A file called `Invoice.pdf.exe` shows up as `Invoice.pdf`, with a PDF-looking icon, and it's actually a program that is about to ruin your life. 

`( File Explorer -> View -> Show -> File name extensions )`

On Windows 10 it's `( File Explorer -> View tab -> tick "File name extensions" )`.

From now on, if something that's supposed to be a document, photo or video ends in `.exe`, `.scr`, `.bat`, `.cmd`, `.js`, `.vbs` or `.msi`, don't open it. Delete it.

### Step 4: Turn on the Windows Security switches

Open ( Start -> Windows Security ) and go through these:

| Setting | Where | Set to |
|---|---|---|
| Tamper Protection | Virus & threat protection -> Manage settings | On. This stops malware from switching Defender off. |
| Cloud-delivered protection | Virus & threat protection -> Manage settings | On ( usually already on, check anyway ) |
| Check apps and files ( SmartScreen ) | App & browser control -> Reputation-based protection settings | On |
| Potentially unwanted app blocking | same page | On, with both "Block apps" and "Block downloads" ticked |
| SmartScreen for Microsoft Edge | same page | On |
| Local Security Authority protection | Device security -> Core isolation details | On ( may already be on; needs a restart ) |

"Potentially unwanted apps" are the junk installers that bundle toolbars, fake cleaners and crypto miners. Not technically a virus, but you don't want any of them.

Local Security Authority protection guards the part of Windows that holds your login credentials in memory, so malware can't just read them out. On a few older PCs an old driver or program might complain after you turn it on. If that happens, turn it back off on the same page and restart.

### Step 5: Turn off AutoPlay

AutoPlay runs stuff automatically when you plug in a USB drive or memory card. Plug in the wrong USB once and you'll know why this is a bad idea.

`( Settings -> Bluetooth & devices -> AutoPlay -> "Use AutoPlay for all media and devices" -> Off )`

### Step 6: Keep Windows and Office updating on their own

Most malware doesn't use some genius new trick, it uses a hole that was already fixed months ago on computers that never installed the fix.

`( Settings -> Windows Update -> Advanced options -> "Receive updates for other Microsoft products" -> On )`

And don't pause updates for weeks because the restart is annoying. Restart. I know everyone hates it, i hate it as well, but what can you do? 

### Step 7: Turn off Remote Desktop if you don't use it

`( Settings -> System -> Remote Desktop -> Off )`

If you don't know what it is, you don't use it. Turn it off. ( On Windows Home it isn't available anyway, so you can skip this one. )

### Step 8: Remove programming tools you don't use

`( Settings -> Apps -> Installed apps )`

Look for **Python**, **Java**, and **Node.js**. If you're not a programmer and don't know why they're there, uninstall them. Malicious game mods, cracked software and fake downloads often use these to run their payload. If something stops working after you remove one, you can always reinstall it.

( One exception: some games, like Minecraft Java Edition, bring their own Java. That's fine, they don't need the separate one. )

### Step 9: Stop saving passwords in your browser

This one isn't a Defender setting, but it's the single most important line in this whole guide. The malware going around right now ( "infostealers" ) is built to do one thing: copy everything saved in your browser — passwords, cookies, card details — and send it out within seconds. No Windows setting fully stops a program you ran yourself from reading your own files.

- Use a password manager ( Bitwarden is free and good and personally recommended ) instead of the browser's built-in one.
- Turn on two-factor login, or better, passkeys, for your email, bank, and anything with money in it. Your email first, everything resets through your email.
- Keep a backup of the files you care about on an external drive or a cloud service. If ransomware does get you, the backup is what saves you, not antivirus.

## Part 2: Advanced — stronger Defender protection with PowerShell

These settings exist in Windows Home too. There's just no button for them, so we use PowerShell. You copy a line, paste it, press Enter. That's it.

**How to open PowerShell as administrator:** right click the Start button -> Terminal (Admin) ( on Windows 10 it says "Windows PowerShell (Admin)" ). Click Yes on the prompt.

To paste in the terminal, right click inside the window or press Ctrl+V. If nothing comes back after you press Enter, that means it worked. PowerShell only talks when something goes wrong.

### Step 1: Make the cloud check stricter

When Defender sees a file it isn't sure about, it asks Microsoft's cloud. By default it only blocks when the cloud is quite confident. This raises the bar to "block anything that looks suspicious".

```powershell
Set-MpPreference -CloudBlockLevel High
```

There are two stricter levels above this ( HighPlus and ZeroTolerance ). They catch more but also block more legit, less-known software. High is the sweet spot for home use. ( [Microsoft: cloud protection levels](https://learn.microsoft.com/en-us/defender-endpoint/cloud-protection-configure) )

### Step 2: Turn on the three most useful "Attack Surface Reduction" rules

ASR rules block specific tricks that malware uses, rather than specific viruses. We're turning on three of them:

| Rule | What it does |
|---|---|
| Block executables unless they meet a prevalence, age, or trusted list criterion | Blocks programs that are brand new or that almost nobody else in the world runs. Most fresh malware is exactly that. |
| Block execution of potentially obfuscated scripts | Blocks scripts ( PowerShell, JavaScript, VBScript ) that are deliberately scrambled to hide what they do. |
| Block JavaScript or VBScript from launching downloaded executable content | Stops a small script from downloading and running the real malware. |

Paste these three lines, one at a time:

```powershell
Add-MpPreference -AttackSurfaceReductionRules_Ids 01443614-cd74-433a-b99e-2ecdc07bfc25 -AttackSurfaceReductionRules_Actions Enabled
Add-MpPreference -AttackSurfaceReductionRules_Ids 5beb7efe-fd9a-4556-801d-275e5ffc04cc -AttackSurfaceReductionRules_Actions Enabled
Add-MpPreference -AttackSurfaceReductionRules_Ids d3e037e1-3eb8-44c8-a917-57927947596d -AttackSurfaceReductionRules_Actions Enabled
```

Microsoft's [ASR rules reference](https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference) has the full list of rules and what each one does.

Use `Add-MpPreference` exactly like above, not `Set-MpPreference`. `Set` **replaces** the whole list every time, so only the last rule would end up on.

The first rule is the one most likely to block something you wanted, like a small indie game or a tool from a niche developer. If you'd rather get a warning you can click through instead of a hard block, use `Warn` instead of `Enabled` at the end of that line.

### Step 3: Turn on Network Protection

This extends the protection from Step 2 of the basics to every program on your computer, not just your browser. If any program tries to connect to a known malware server or phishing site, Windows blocks the connection.

```powershell
Set-MpPreference -EnableNetworkProtection Enabled
```

### Step 4: Controlled Folder Access ( ransomware protection )

Controlled Folder Access stops unknown programs from **changing or deleting** files in your protected folders — Documents, Pictures, Desktop and so on. That's what ransomware does, it encrypts your files and asks for money.

```powershell
Set-MpPreference -EnableControlledFolderAccess Enabled
```

You can turn this on from the GUI as well `( Windows Security -> Virus & threat protection -> Ransomware protection -> Manage ransomware protection )`.

Controlled Folder Access blocks **writing**, not **reading**, and a password stealer only needs to read. So adding your Chrome or Discord folders to the list does nothing against stealers, it just makes Chrome and Discord trip over the block. What actually protects your passwords is Step 9 of the basics.

If you use a desktop crypto wallet, it's still worth protecting its folder so nothing can tamper with it:

```powershell
Add-MpPreference -ControlledFolderAccessProtectedFolders "$env:APPDATA\Exodus"
Add-MpPreference -ControlledFolderAccessProtectedFolders "$env:APPDATA\atomic"
```

( Exodus and Atomic Wallet. Skip these if you don't use them. )

### Step 5: Check that it all took

```powershell
Get-MpPreference | Select-Object CloudBlockLevel, EnableNetworkProtection, EnableControlledFolderAccess, AttackSurfaceReductionRules_Ids, AttackSurfaceReductionRules_Actions
```

You should see CloudBlockLevel `2` ( that's High ), network protection and folder access `1`, three rule IDs, and three `1`s ( or a `6` if you chose Warn for the first rule ).

## When something you trust gets blocked

It will happen, mostly in the first week. Once your everyday programs have been allowed, it goes quiet.

- **Blocked by Controlled Folder Access** — go to `( Windows Security -> Virus & threat protection -> Protection history )`, find the block, and click Allow.
- **Blocked by an ASR rule** — Protection history shows these too, but the reliable fix is to exclude that program. Find where it's installed and run:

```powershell
Add-MpPreference -AttackSurfaceReductionOnlyExclusions "C:\Path\To\TheProgram.exe"
```

Only allow things you actually trust and know where they came from. If a "free" game you got from a random site gets blocked, that block is probably the guide doing its job.

## How to undo all of it

Run these in the same admin PowerShell to put Defender back the way it was:

```powershell
Set-MpPreference -CloudBlockLevel Default
Remove-MpPreference -AttackSurfaceReductionRules_Ids 01443614-cd74-433a-b99e-2ecdc07bfc25,5beb7efe-fd9a-4556-801d-275e5ffc04cc,d3e037e1-3eb8-44c8-a917-57927947596d
Set-MpPreference -EnableNetworkProtection Disabled
Set-MpPreference -EnableControlledFolderAccess Disabled
```

The basics are all regular switches, flip them back on the same pages.

## The short version

You can't make a computer bulletproof. What you can do is stack enough layers that when one misses, the next one catches it. The ad blocker stops the fake download button, the DNS stops the bad site, SmartScreen stops the unknown file, the ASR rules stop the script, and the password manager means that even if all of that fails, there's nothing in your browser worth stealing.

Don't download things when you don't know where they came from. Do the basics today. Do the advanced part when you have 10 minutes. And stop saving passwords in your browser.

And if you're still pissed off about how often Windows gets hacked or infected, there is always Linux.

## Sources

Every PowerShell command in this post is from Microsoft's own documentation:

- [Set-MpPreference](https://learn.microsoft.com/en-us/powershell/module/defender/set-mppreference) — the command behind most of the advanced part
- [Configure cloud protection](https://learn.microsoft.com/en-us/defender-endpoint/cloud-protection-configure) — cloud block levels
- [Attack surface reduction rules reference](https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference) — what each ASR rule blocks
- [Configure ASR rules and exclusions](https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-configure) — why `Add` instead of `Set`, and how exclusions work
- [Turn on network protection](https://learn.microsoft.com/en-us/defender-endpoint/enable-network-protection)
- [Configure controlled folder access](https://learn.microsoft.com/en-us/defender-endpoint/controlled-folder-access-configure)

:::aside{label="Disclaimer"}
This post is up to date as of the day it was written ( November 9, 2026 ). Things might have changed if you are reading this long in the future — settings move, extensions get renamed, commands change. Please verify before applying.
:::
