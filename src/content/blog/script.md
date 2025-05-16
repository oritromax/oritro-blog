---
title: You got ~ in your ubuntu folder name?
date: 2024-06-14 14:43:11
tags:
    - plex
    - ubuntu
    - python
    - selfhosting
categories: 
    - homelab 
    - ubuntu
    - selfhost
---

# Tilde ( ~ ) in ubuntu folder name and solution

> Word of caution, this is a extreme edge case that i personally found. It might not be the same case for you, so be careful before using this script. 

[ If you wanna skip reading and go to the code ](https://github.com/oritromax/tilde-solver)

I have a homelab setup with Radarr, Sonarr, Qbittorrent and a few other goodies. It works perfectly 99.9% of the time, until there is a powercut. I did have UPS back up for my systems, but somehow i failed to notice its backup range going down, probably due to the battery failing. 

Anyhow, a couple of months ago, one of my 8TB drive failed and then a 10TB drive failed. I should've taken precautions by then, but being lazy, i didn't pay much attention to it and that created a monster of a problem. The ~ problem. 

## ***Context***

When the drives started to fail, i used _rsync_ to copy the files to another drive. And power failed during that transfer. Me being overly relying on _rysnc_ didn't paid much attention to it and later down the round, i found out, there is an issue. 

Now i have folders like this, 

```
Movie name ( 2010 )

And 

Movie Name ( 201~)
```

Now thats a concern for itself. But in further inspection, i found the `~` sign all over the place in folder name. 

```
Movie Name (~20)
Movie Name (2010)~0
Movie Name (2~)
Movie Name (201~)
Movie Name (2010~
```

I was baffled for a min. But the bigger problem was yet to arrive. When i looked into the folders with `~`, they do contain the movie file. But due to the other `*arr` things that are trying to find those movies, they created their own folders. Now i have two movie folders for some movies,

```
Movie Name (2010)~0 < or any other format mentioned above 

And 

Movie Name (2010) < the one created by arr services
```

Even though the movie is there, it won't be able to find it cause it doesn't have any context for the `~` in the name. _Maybe we need some AI here?_

Now here is the final situation,

- I have the movies in the folder with the `~`
- The system doesn't know that and downloading the same file again

So what do you do? 

## Solution

***Python***

I started writing a python script, trying to solve this issue. In my mind, a simple regex here and there, rest will be easy. Little did i know, i was in for a wild ride. 

My first attempt to search the folders with `~` in name 

```python
folders_with_tilde = [f for f in os.listdir(root_dir) if os.path.isdir(os.path.join(root_dir, f)) and '~' in f]
```

Now i got the folders fine. But how do i know if there is a corresponding folder without the `~` in name? 

*First Attempt*
```python
def extract_base_name(folder_name):
    match = re.search(r'\(20[0-9]{2}~?\)', folder_name)
    if match:
        base_name = folder_name[:match.start()]
        return base_name
    return None
```
*Second Attempt*
```
def extract_base_name(folder_name):
    match = re.search(r'\(?(20[0-9]{2})~?\)?', folder_name)
    if match:
        base_name = folder_name[:match.start()]
        return base_name
    return None
```

Now _regex_ is considered magic in a lot of circle /s. Anyway, moving forward, I matched with the following condition(s).


- See if there is a folder with `~` in name 
- Extract the movie name from it 
- See if there is a corresponding folder without `~` in name
- Find out if there is a movie file in the corresponding folder 
- If yes, delete the `~` folder.
- If no, check if the `~` folder has a movie file in it. 
- If yes, move the movie file from the `~` folder to the non `~` folder. 
- Delete the `~` folder. 
- Now check, if both the `~` folder and the non `~` folder both has movies in it. 
- If yes, remove the `~` folder. 

Hence, i created a python script that does exactly that, until, 

```
Movie Name (1989)
Movie Name (2022)
```
Same movie, one is sequal and one is prequal. Since my script doesn't account for the year in the movie name ( How can i? some `~` removed the year ), it got screwed in a couple of cases. Thats something i will be working on. 

For now, this is my script. If you faced a similar situation ( which i highly doubt cause mine happened because of my stupidity ), use the script. 

> Just make sure you understand what its doing, there is a simple Yes no confirmation before deletion. Make sure you don't delete files you need. 

[The Code](https://github.com/oritromax/tilde-solver)