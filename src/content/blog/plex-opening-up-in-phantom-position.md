---
title: Plex Opening in Ghost / Hidden Window
date: 2023-05-15 02:36:03
tags:
  - plex
  - homelab
  - selfhosted
categories: 
  - homelab
  - plex
  - selfhost
type: post
url: /2001/plex-opening-in-wrong-ghost-phantom-window
---

# Plex Opening in the Hidden / Phantom Window

I have been a Plex user for close to 10 years now. Recently I moved my desktop to a new home office and installed my dual monitor setup in a different arrangement. My Primary monitor used to sit in the center and the secondary used to sit on the right side. 

On the new setup, i decided to move the secondary to the left side of the primary monitor. And after a couple of hours i noticed, when i opened the plex windows desktop app ( not the home theater one ), it opened to the right side of my primary monitor and in a place where the secondary monitor used to be. 

Regardless of what i did, it won't open or move to any of the monitors. It took me a while, but it turns out that plex saves it last opened position in a `ini` file. Since the last time i opened Plex and it was in the position where the secondary monitor used to be, it calculated its position using a `X` `Y` pixel count from what the Operating system was reporting as the center of the screen. 

### The Solution

Open your file explorer, navigate to `C:\Users\<username>\AppData\Local\Plex\plex.ini` . The `username` here is your windows Username. 
**Note** - The `AppData` is a hidden folder. Make sure to set your hidden file view on. 

Open the file with a text editor, preferably something more modern than Notepad, but Notepad will still work. 

Use `CTRL + F` or find to find this exact line `windowX`. Usually, this will be near the bottom of the file. 

Change the value of the following lines to what you see here. 

```
windowX=1 
windowY=1  
windowWidth=1000  
windowHeight=900  
windowStates=0
```
In here, `windowX` and `windowY` is the most important one, which determines where plex will open up. Once thats done, save the file. 

**Note** - Your plex app must be closed during this. 

Open plex, now it should open up in your main screen. You might need to fiddle with resizing the plex window a couple of time to get the top action bar back. 

> Happy Plexing