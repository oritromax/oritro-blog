---
title: The Saga of Brother DCP-T530DW Printer on Linux
date: 2026-09-24 00:00:00
tags:
    - brother
    - printer
    - scanner
    - sane
    - linux
    - homelab
categories:
    - homelab
description: Getting a wifi-only Brother ink tank printer to scan straight to my NAS on Linux, and everything that broke on the way there.
---

So i bought a Brother DCP-T530DW. Cheap ink tank printer, does print/copy/scan, and i wanted it off my main desk because i'd run out of space there. The only way to make that work was wifi — this thing doesn't even have an ethernet port, it's wifi or USB, pick one. Fine, i thought, wifi is easy, printers have been doing wifi for a decade.

Printing over wifi was in fact easy. Scanning was not. Scanning is the reason this post exists.

## The Problem

i run a mix of Mac and Linux day to day, but my actual infrastructure — the NAS, the servers, everything that stores my files — is all Linux. What i wanted was dead simple: press the scan button on the printer, file lands in a folder on the NAS, done. No PC needs to be on, no app needs to be open, nobody needs to babysit anything.

Brother's own answer to that is a feature called scan-to-network-folder, where the printer talks SMB or FTP directly to a folder on your network. Except the DCP-T530DW doesn't have it. Turns out that feature only starts one tier above mine — the T730/T830 and the MFC ink tanks. My model's scan destinations are PC (via Brother's iPrint&Scan app), Web Services scan, USB flash drive, or email. That's the whole list.

And iPrint&Scan, the app that's supposed to be the "scan to PC" half of this, is Windows and Mac only. No Linux version, not even a half-hearted one. So the printer's own advertised workflow for getting a scan off the glass just isn't available on the machines that actually needed it.

## What We Tried And Failed

The Linux equivalent of iPrint&Scan is two separate pieces from Brother — `brscan5`, the SANE driver that lets `scanimage` talk to the printer, and `brscan-skey`, a little daemon that listens for the scan button being pressed on the machine and runs a script when it happens. Two debs, install them, register the printer, done. In theory. You already know where this is going.

### Finding the Actual Files

Brother's download page for the model is [support.brother.com/g/b/downloadtop.aspx](https://support.brother.com/g/b/downloadtop.aspx?c=us&lang=en&prod=dcpt530dw_us_eu_as), and the direct file links behind it aren't guessable at all — every package sits behind a random-looking ID, `download.brother.com/welcome/dlfXXXXXX/...`, that has nothing to do with the filename or version. You have to click through their OS picker for the actual model, then follow through to a "how to download" page just to see the real filename before you trust it. Annoying, but manageable. This was the easy part.

### The Deb That Lied

Installed the debs. `dpkg -i` said success, exit code 0, everybody go home. Except `brscan-skey`'s actual binary needs `libusb-0.1.so` at runtime and it dlopens it — so it's not a normal linked dependency, `ldd` shows nothing missing, and the package doesn't declare it either. Three different places that should've told me, and none of them did. So the deb straight up lies to you about whether it's gonna work. Had to go hunt down `libusb-0.1-4` separately, after the daemon sat there quietly doing nothing for longer than i wanna admit.

### The Daemon That Wasn't Running

Systemd unit says active, but nothing's actually listening. Turns out `brscan-skey` is a shell wrapper that backgrounds its own binary by default — unless you pass `-f` to keep it in the foreground, the wrapper process exits immediately, systemd sees a clean exit and calls it a day, and you get a unit that reads "inactive (dead)" with zero errors anywhere. No crash, no log line, nothing. Just silently not running, which is somehow worse than crashing.

### The Vanishing Scan

Even once i had that sorted, i was using Brother's own stock script for handling the button press (`scantoimage.sh`) — and it deletes the scanned file two seconds after creating it, if there's no GUI image viewer installed to open it. On a headless NAS there obviously isn't one. So every single scan was working perfectly — scanner whirs, file appears, everything you'd want — and then the file was gone before i could `ls` it. Took me a minute to even believe that's what was happening, and a bit longer to accept that someone shipped it on purpose. Who writes a scan script whose default failure mode is deleting the scan?

## Finally, The Solution

Once i understood what was actually breaking, the fix was straightforward — replace every piece Brother assumed would exist with something that fits a headless box.

- `brscan5` (SANE driver, registered via `brsaneconfig5` against the printer's static IP — `brother5:net1;dev0`)
- `brscan-skey` running as a normal user unit, `-f` flag mandatory, not the root init.d service the deb installs
- my own script instead of the stock one, writing into a dated folder on the NAS by timestamp, no viewer, no delete

Here's the actual script, minus my real paths, so you've got something to start from instead of reinventing this from scratch:

```bash
#!/bin/bash
# brscan-skey action script — scan to NAS, organized by date.
# Layout: <BASE>/YYYY/MM/DD/scan-<timestamp>[-N].png
# The daemon passes the device name as $1, fall back to your SANE device.
DEV="${1:-brother5:net1;dev0}"
BASE="/path/to/your/nas/Scans"
LOG="$HOME/scans/scan.log"
TS="$(date +%Y%m%d-%H%M%S)"
DIR="$BASE/$(date +%Y)/$(date +%m)/$(date +%d)"
mkdir -p "$DIR"
FILE="$DIR/scan-$TS.png"
N=2
while [ -e "$FILE" ]; do
  FILE="$DIR/scan-$TS-$N.png"
  N=$((N+1))
done

if ! scanimage -d "$DEV" --resolution 300 --format=png > "$FILE" 2>>"$LOG"; then
  rm -f "$FILE"
  echo "[$(date '+%F %T')] SCAN FAILED (dev=$DEV)" >> "$LOG"
  exit 1
fi
echo "[$(date '+%F %T')] wrote $FILE" >> "$LOG"
```

Wire it to the button via `/opt/brother/scanner/brscan-skey/brscan-skey.config` — set the `IMAGE=` and `FILE=` lines to point at this script — then restart the daemon.

That got scans landing on the NAS reliably. For a while.

## The Final Boss — Restart

There was one more landmine, and it's the one that actually cost me the most sleep. The printer's registration with `brscan-skey` — which PC it should send button-press events to — lives entirely in the daemon's memory. Every restart, reboot, crash, manual restart, anything, wipes it clean. The daemon forgets the printer exists, and nobody tells the printer.

And when that happens the printer's LCD just hangs on "connecting to PC" when you press scan, with absolutely nothing logged anywhere, because the button event never even reaches the daemon in the first place. No error, no hint, just a printer politely waiting for a PC that has forgotten it exists. You can stand there as long as you want. It's not gonna connect.

Fixed it two ways — an `ExecStartPost` that re-registers a couple seconds after the daemon starts, and a cron job every 30 minutes that checks whether the daemon's UDP socket (port 54925) is actually up, and re-fires the registration if it isn't. Cheap insurance, and it means the printer heals itself within half an hour of waking up from sleep instead of me finding out it's broken next time i'm standing in front of it holding a document.

The systemd unit, `-f` flag included because you will forget it otherwise:

```ini
[Unit]
Description=Brother scan-key daemon (brscan-skey)
After=network-online.target

[Service]
# CRITICAL: the -f flag. The wrapper backgrounds the exe by default, so
# systemd sees the parent exit 0 and kills the cgroup -> daemon never runs.
ExecStart=/opt/brother/scanner/brscan-skey/brscan-skey -f
ExecStartPost=/bin/bash -c 'sleep 2; /opt/brother/scanner/brscan-skey/brscan-skey -a <name> <printer-ip>'
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

And the cron self-heal, in case the daemon dies quietly some other way between restarts:

```cron
*/30 * * * * ss -uln | grep -q 54925 && /opt/brother/scanner/brscan-skey/brscan-skey -a <name> <printer-ip> >/dev/null 2>&1 # brscan-skey re-register
```

Swap in your own registration name and the printer's IP, and this is the whole safety net.

It's been running since mid-August. 78 scans in the last 30 days, zero manual intervention. i'm not touching it.

## Extra — Keeping Track of Ink

Since the printer has no web dashboard i can actually see (the T530DW's status page is login-walled, https + password, so a naive scraper just gets a login page back with a 200 status and cheerfully reports "ready" for everything), i went looking for another way to read ink levels.

SNMP was a bust — every cartridge reports `-3`, which is Brother's sentinel for "some remaining, not quantifiable." Thanks. Very helpful.

IPP, on the other hand, just works. `ipptool` speaks Get-Printer-Attributes to the printer unauthenticated, and `marker-levels` comes back as real percentages — `99,99,99,99` for magenta, cyan, yellow, black. No login, no scraping, no sentinel values that mean nothing.

Here's the whole thing, command plus the `.test` file it needs (keep your own copy of this instead of relying on whatever ships with `cups-ipp-utils` — the packaged ones dump way more than you want):

```bash
ipptool -tv ipp://<printer-ip>/ipp/print printer-attrs.test
```

```
{
  OPERATION Get-Printer-Attributes
  GROUP operation-attributes-tag
  ATTR charset attributes-charset utf-8
  ATTR language attributes-natural-language en
  ATTR uri printer-uri $uri
  ATTR keyword requested-attributes printer-state,printer-state-reasons,printer-state-message,printer-alert,printer-alert-description,marker-names,marker-levels,marker-low-levels,marker-high-levels,marker-colors,marker-types,printer-supply,printer-supply-description,printer-device-id,queued-job-count
  DISPLAY printer-state
}
```

`marker-levels` lines up positionally with `marker-names`, so `marker-names = M,C,Y,BK` and `marker-levels = 99,99,99,99` pair off in order. That's now polled every 10 minutes by a small collector script, written to a JSON file, and shown on my Glance dashboard alongside my laser printer's toner level (which, funnily enough, only gives real numbers over SNMP and garbage over IPP — every device is its own adventure).

For the record, this whole thing was done on Ubuntu 22.04.5, `brscan5` 1.7.0-0, `brscan-skey` 0.3.5-0, printer model Brother DCP-T530DW. If your model or your Ubuntu version differs, expect at least one of the above to bite you differently. Probably a new one i haven't met yet.
