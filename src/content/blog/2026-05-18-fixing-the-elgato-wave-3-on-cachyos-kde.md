---
title: Fixing the Elgato Wave 3 on CachyOS + KDE
date: 2026-05-18 20:42:57
tags:
    - linux
    - cachyos
    - arch
    - discord
    - elgato
categories:
    - linux
description: Switching over to CachyOS wasn't as pretty as i thought it would. All i wanted to do is Gaming. I ended up fixing one issue after another. Some of it has to do with the weird setup i have going on. 

---
I plugged my Elgato Wave 3 into a fresh CachyOS install and ran into two separate audio problems that turned out to be related but needed different fixes. This is the full troubleshooting walkthrough — the dead ends, the diagnostics, and the one-line workaround that actually solved it.
 
## Setup
 
- **OS:** CachyOS (Arch-based)
- **DE:** KDE Plasma (Wayland)
- **Audio stack:** PipeWire 1.6.4 + WirePlumber
- **Hardware:** Elgato Wave 3 over USB hub, headphones plugged into the Wave 3's 3.5mm headphone output (not the motherboard)
The Wave 3 is a USB Audio Class device, so it works without proprietary drivers — but "works" is doing some heavy lifting.
 
## The Symptoms
 
**Problem 1 — boot-time mic drop:**
Every cold boot, headphone output through the Wave 3 worked fine, but the mic didn't get picked up. To get it working I had to open KDE's audio settings and toggle the Wave 3's input profile a few times until the mic finally appeared.
 
**Problem 2 — Discord silence:**
After fixing problem 1, the mic worked on websites (live mic-test sites picked me up fine). But the moment I joined a Discord voice call, the meter was flat. Switching Discord's microphone setting to "System Default" and back to "Elgato Wave 3 Mono" would wake it up — but I had to do this every call.

These are the two problems i am attempting to fix.
 
## Problem 1: The Profile Mismatch
 
Running `pactl list cards` on a fresh boot found a couple of interesting things,
 
```
Active Profile: output:iec958-stereo+input:mono-fallback
```
 
But `wpctl status` showed the saved default sink as `analog-stereo`:
 
```
Default Configured Devices:
  0. Audio/Sink    alsa_output.usb-Elgato_Systems_Elgato_Wave_3_...analog-stereo
```
 
So WirePlumber was booting the card into the **digital S/PDIF profile** while simultaneously trying to route audio to a sink that belongs to the **analog profile**. Different profile, different sink names, and the mic input attached to the iec958 profile wasn't reliably activating.
 
The Wave 3 actually exposes seven profiles:
 
```
output:analog-stereo+input:mono-fallback   (priority 6501)
output:analog-stereo                       (priority 6500)
output:iec958-stereo+input:mono-fallback   (priority 5501)
output:iec958-stereo                       (priority 5500)
pro-audio                                  (priority 1)
input:mono-fallback                        (priority 1)
off                                        (priority 0)
```
 
The one I actually wanted was `output:analog-stereo+input:mono-fallback` — highest priority, includes both directions, matches the saved sink.
 
### Fix
 
```bash
pactl set-card-profile alsa_card.usb-Elgato_Systems_Elgato_Wave_3_BS52J1A07585-00 \
    output:analog-stereo+input:mono-fallback
```
 
After this, `wpctl status` was clean — sink and source both showed `Elgato Wave 3 Analog Stereo` / `Elgato Wave 3 Mono`, both marked as defaults, no mismatch. Survived reboots without needing a config file to pin it.
 
## Problem 2: Discord Can't Hear Me
 
With profiles fixed, the mic worked in browser-based tests but not Discord. This required some head scratching.
 
- PipeWire suspends nodes that aren't actively being read
- Most apps wake the node correctly when opening a stream
- Discord opens its stream against the still-suspended node and reads nothing
- Switching input device forces a re-route, which wakes the node
This matches [a writeup by Mark Visser](https://markvisser.dev/posts/fixing-elgato-wave3-discord-linux/) describing the exact same Wave 3 + Discord interaction.
 
### The Fix That Didn't Work
 
My first approach: tell WirePlumber not to suspend the Wave 3 nodes. I dropped this into `~/.config/wireplumber/wireplumber.conf.d/51-wave3-nosuspend.conf`:
 
```
monitor.alsa.rules = [
  {
    matches = [
      { node.name = "~alsa_input.*Wave.*" }
      { node.name = "~alsa_output.*Wave.*" }
    ]
    actions = {
      update-props = {
        session.suspend-timeout-seconds = 0
      }
    }
  }
]
```
 
```bash
systemctl --user restart wireplumber
```
 
Tested — and the mic stopped working *everywhere*. Not just Discord, but the browser test too. The stream in `wpctl status` showed `[active]`, so PipeWire thought audio was flowing, but every test came back silent.
 
To prove it was the config, I ran a raw capture and measured it with ffmpeg:
 
```bash
pw-record --target 53 /tmp/mictest.wav   # speak for ~5 seconds, Ctrl+C
ffmpeg -i /tmp/mictest.wav -af volumedetect -f null - 2>&1 | tail -10
```
 
```
mean_volume: -91.0 dB
max_volume:  -91.0 dB
```
 
That's digital silence — the file was full-size (1.3 MB for 5 seconds, correct for 48 kHz stereo), but every sample was zero. PipeWire was reading from the device and getting nothing.
 
Removed the config file, restarted WirePlumber, captured again:
 
```
mean_volume: -15.7 dB
max_volume:   -0.0 dB
```
 
Mic was back. Conclusively the config rule was breaking capture.
 
I'm not entirely sure of the root cause — possibly the `~alsa_input.*Wave.*` matcher hit during a suspend transition and left the node in a half-initialized state on WirePlumber 1.6.4. Either way, the rule that "should" have fixed things was actively making it worse.
 
### The Fix That Actually Worked
 
Different approach: instead of telling PipeWire not to suspend the node, just keep something reading from it so it never goes idle. A tiny systemd user service that runs `pw-record` to `/dev/null` in the background:
 
```bash
mkdir -p ~/.config/systemd/user
 
cat > ~/.config/systemd/user/wave3-keepalive.service <<'EOF'
[Unit]
Description=Keep Elgato Wave 3 mic awake for Discord
After=pipewire.service
 
[Service]
ExecStart=/usr/bin/pw-record --target alsa_input.usb-Elgato_Systems_Elgato_Wave_3_BS52J1A07585-00.mono-fallback /dev/null
Restart=always
RestartSec=3
 
[Install]
WantedBy=default.target
EOF
 
systemctl --user daemon-reload
systemctl --user enable --now wave3-keepalive.service
```
 
This pulls a constant stream of audio from the Wave 3 mic into `/dev/null`. PipeWire sees the node as actively in use, never marks it idle, never suspends it. Discord opens its stream against a live node and works immediately. No config rules, no risk of breaking the node, surgical scope (only affects this one device).
 
CPU cost is negligible — `pw-record` to `/dev/null` is essentially free. If it ever causes problems, one command disables it:
 
```bash
systemctl --user disable --now wave3-keepalive.service
```
This isn't the most elegant solution. Keeping the stream open just for sake of getting microphone input defys every logic of a software engineer but i couldn't figure anything else out at this moment. 
 
## What I Learned
 
- **`wpctl status` and `pactl list cards` disagreeing about profile vs sink is a red flag.** That mismatch was the entire boot-time bug, and it surfaces clearly in a side-by-side diff.
- **WirePlumber config rules can fail silently in non-obvious ways.** A rule that "looks right" and produces no parse errors in `journalctl` can still leave a node in a state where it streams zeros. Always verify with a real capture (`pw-record` + `ffmpeg volumedetect`) rather than trusting `wpctl status` alone — an `[active]` stream doesn't mean audio is actually flowing.
- **App-level workarounds beat stack-level config when the stack-level config misbehaves.** A 10-line systemd service that holds the device open is more robust than a WirePlumber rule that fights with the node's state machine. Less elegant, but the elegant thing didn't work.
- **The Wave 3 is fine on Linux**, just opinionated about how it wants to be handled. Once the profile is pinned and the node is kept warm, it's been rock solid.
## TL;DR
 
If your Elgato Wave 3 on PipeWire works in browsers but not Discord:
 
1. Make sure the card is on `output:analog-stereo+input:mono-fallback`, not the iec958 profile
2. Don't bother with WirePlumber `session.suspend-timeout-seconds` rules — at least not on 1.6.4, they broke capture entirely for me
3. Run a `pw-record /dev/null` keepalive as a systemd user service. It's the dumb solution that works.
Verify with:
 
```bash
pw-record --target <wave-source-id> /tmp/test.wav   # speak for 5s, Ctrl+C
ffmpeg -i /tmp/test.wav -af volumedetect -f null - 2>&1 | grep volume
```
 
If `max_volume` is anywhere near `-91 dB`, you're capturing silence — keep digging. If it's in the `-20 to 0 dB` range, you're done.
