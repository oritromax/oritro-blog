---
title: A hunt for a Youtube short
date: 2025-06-07 14:43:11
tags:
    - youtube
    - shorts
    - AI
categories: 
    - ai 
description: This so called hunt gave me a different perspective on how hyped up AI is and how data poisoning is obscuring the results

---

I am a big fan of everything mystry, dectective and crime drama. Been for a while and in my off time, i am always watching or looking for the next one. 

I have watched hundreds of trailers of shows in that genre and obviously youtube have a pretty good idea what i like and don't like.

### Where it started 

So i was just browsing through youtube shorts while taking a coffee break and came across a youtube short, a clip from a movie or tv show.

![Preview of the short](/static/2025/06/short-preview.jpeg)

If you look at the image, you can see a few things that indicates this is a view farming account, where the uploader themselves have zero idea what this show or movie this is from. They probably found is in other youtube short or tiktok and uploaded it on youtube with AI voiceoever and annoying middle screen subtitle for that voiceover. 

### Story 

> A soldier comes home to find his house has been occupied by some party people and they claim the soldier isn't the owner of the house, a women from the party claims it belongs to her boyfriend. Finally police is called and they confirm the house is legally owned by the soldier. While searching, they find the deadbody of the so called _Boyfriend_ in the basement. The dead boyfriend had a fake identity and claimed this house belonged to him. 

Thats it, where where the shorts end. Now being a fan of murder mystry, i was intrigued. Wanted to see where the story ends. But as you can see on the short, there is no mention of where its from. The comments were disabled so that didn't help. 

### The hunt

In this day of overwhelming connectivity, AI and massive data collection, how hard could it be to find one series? 

Boy i was wrong. So here was my initial approach, i took a screenshot and went to google image search, the same image you can see up there. Thinking, google image definately at least can tell me who the actor in the image is. 

***It Couldn't***

![Google Search Result](https://img.shost.vip/i/625d7e43-41e2-43b4-b79c-f068b6114f92.png)

It found the same short upload by a few other people, and all those had the same issue, comment disabled, annoying AI subtitle and no clue where this episode came from. 

**Gemini**

Surely, Gemini could help, it has the knowledge base of the entire google search engine ( _or so i thought_ ). 

First i tried to give Gemini the exact context i saw in the short, written description of the video. 

![Gemini with written story description](https://img.shost.vip/i/cd55ed6e-5d99-47f5-a69b-e49eabc49d54.png)

I intentionally kept it vague, trying to see if gemini could pick it up. 

**Warrior?**

It picked a movie called warrior, and that was hillarious. I am a big fan of tom hardy and watched everything he ever have been. I saw the Warrior movie and it has absolutely nothing to do with it. 

But i admit, my prompt was definately Vague. So i tried again. 

![Gemini with broader text description of the story](https://img.shost.vip/i/84e147b5-2aef-4984-9d8a-c1f2a043efb3.png)

_this was a voice prompt, so a few words got mangled_

It failed misrably again, the answer it came up with, again, completely wrong. 

**ChatGPT**

So lets try the OG. ChatGPT. 

![ChatGPT with story description as prompt](https://img.shost.vip/i/01443060-e8a8-4eba-87fa-681a8249954b.png)

Again i first went with the description of the story and something interesting happened. In the screenshot above you can see it mentioned two links. 

In a very wrong way, its correct, those are the clip where this story unfolds. The youtube link is the exact clip i saw which drove me in this rabbithole.

But it failed to reference which movie or tv show this clip is from. Not good. 

> But keep this ChatGPT answer in mind, it will be important later. 

---
At this point, after the AI failure, i wanted to do some manual investigation. 

### The Manual Hunt

In the clip, i noticed an actor i have seen before in many places. He played the father of __Sarah Walker__ in __Chuck__. 

> Don't care about what anyone says, chuck is one of the best series i have ever seen from a comedic perspective with a slight hint of thriller and spy-esc. <https://en.wikipedia.org/wiki/Chuck_(TV_series)>

After jumping into IMDB, i found the actors name is __Gary Cole__. 

Looking into his IMDB list of Credits, i immediately noticed NCIS. 

Few things clicked in my mind. 

- Military Man
- Murder Investigation 
- People Dressed in Blue windbreaker in the video

Anyone who have ever watches a good procedural investigation fiction show, knows NCIS. 

So i tried a second time with Gemini, this time i had a more restricted query for __Gemini__. 

![Second attempt with Gemini, with restricted prompt](https://img.shost.vip/i/2105678b-96db-4b53-b60d-4f8f9b8e0bc6.png)

It immediately finds the episode of the show. Two things to note here, 

- The AI narrator of the short mistakenly said the name of the fake owner is harry, its HAL
- My prompt was very narrow, but it worked because of the restrictive nature of it

### AI knowledge poisoning

I mentioned the word AI poisoning, some might wonder why. Its not exactly the right term. And it should be LLM knowledge poisoning, but i digress. 

What happened here, especially with ChatGPT, is what commonly known in the internet as Circle Jerk. I am asking it to find information about something, while its referencing the same clip where i got the question from. Because of the number of times this clip has been uploaded without referencing the actual show, it somewhat have a heavier weight when it comes to search and it became the defacto source of truth. Instead of looking for a movie or show with a similar story line, it kept going back to the same group of videos cause it had the right caption mentioning the exact same scenario. 

__What happened with Gemini__: I have no idea, why it kept showing me movies that sometimes have zero soldiers in it or stories have no resemblences with it. 

And this comes the end of my saga. Is this important? Nope. I just had to document this for the sake of history, how reuploading the same video with same shitty caption generation and AI subtitle could potentially give it a higher weight in search result, obscuring the actual result. NCIS is a popular enough show that it shouldv'e been the first result, even if i gave it the wrong name of the person. It didn't. Something to think about, isn't it? 