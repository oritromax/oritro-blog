---
title: Urban Terror No Sound in MacOS Sierra ( 10.12 ) Fix
author: Oritro Ahmed
type: post
date: 2016-09-24T09:32:00+00:00
url: /679/urban-terror-no-sound-in-macos-sierra-10-12/

categories:
  - codebox
  - Urban Terror
tags:
  - MacOS Sierra
  - Urban Terror

---
After i upgrade to MacOS Sierra ( 10.12 ), there was a problem with the sound in Urban Terror. The game works fine, except no sound :@. I have been trying to fix this for a few hours and saw a few post popping up in URT forum and other gaming forums. After doing a bit research, i found a possible fix.

**I can&#8217;t stretch the important of this statement enough, this is not an official fix. This may or may not Work. This won&#8217;t corrupt your game or permanently damage it, so you can revert back to current state at any point. **

Okey, before jumping into the fix, here is a bit more details about the error. This important because, if this isn&#8217;t the reason behind no sound in urban terror, this fix won&#8217;t work, obviously.

>     SDL audio driver is "coreaudio".
>     SDL_OpenAudio() failed: Failed to start CoreAudio: AudioSetUnitsProperty
>     (kAudioUnitProperty_SetInputCallback)

This is the console error popping up in Urban Terror. Here is a view from the OS Console,

>     ------ Initializing Sound ------
>     Initializing SDL audio driver...
>     SDL audio driver is "coreaudio".
>     SDL_OpenAudio() failed: Failed to start CoreAudio: AudioUnitSetProperty (kAudioUnitProperty_SetInputCallback)
>     Sound initialization failed.
>     --------------------------------

The fix is easy. But you have to be extremely careful. Follow the instruction point to point,

The problem is with LibSDL. The current version inside the game isn&#8217;t compatible with MacOS Sierra, for some reason. So here is a alternative version,

# <a href="https://raw.githubusercontent.com/jacius/rubygame-mac-pack/master/lib/libSDL-1.2.0.dylib" target="_blank">https://raw.githubusercontent.com/jacius/rubygame-mac-pack/master/lib/libSDL-1.2.0.dylib</a>

Download it, keep it somewhere easily accessible ( Probably in the desktop? ).

Next, go to the directory you URT installation is in. I keep Urban Terror inside the application folder.

<img class="aligncenter wp-post-679 wp-image-680 size-full" src="https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_11_07_PM.png" alt="urban Terror" width="1392" height="968" srcset="https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_11_07_PM.png 1392w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_11_07_PM-300x209.png 300w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_11_07_PM-768x534.png 768w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_11_07_PM-1024x712.png 1024w" sizes="(max-width: 1392px) 100vw, 1392px" /> 

Next stop, inside the URT folder, there should be an app Called Quake3-Urt.app. This is where we need to be. Right-click on it, select &#8220;Show Package Contents&#8221;.

<img class="aligncenter size-full wp-post-679 wp-image-681" src="https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_18_20_PM.png" alt="urban terror" width="1282" height="857" srcset="https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_18_20_PM.png 1282w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_18_20_PM-300x201.png 300w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_18_20_PM-768x513.png 768w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_18_20_PM-1024x685.png 1024w" sizes="(max-width: 1282px) 100vw, 1282px" /> 

Okey, inside the app, you will see a folder called &#8220;Contents&#8221;. Move to &#8220;Contents>MacOS>&#8221;. You will find a libSDL-1.2.0.dylib file here. We need to change that one. First Rename that file using Get Info and copy paste the file we downloaded previously, in here.

<img class="aligncenter size-full wp-post-679 wp-image-682" src="https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_22_44_PM.png" alt="Urban Terror" width="1392" height="968" srcset="https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_22_44_PM.png 1392w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_22_44_PM-300x209.png 300w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_22_44_PM-768x534.png 768w, https://ioritro.com/static/2016/09/Screen_Shot_2016-09-24_at_3_22_44_PM-1024x712.png 1024w" sizes="(max-width: 1392px) 100vw, 1392px" /> 

Now, Important things here, The name of file must be the same as it was before. So please check what it was named before and used the same name on the copy pasted file. You shouldn&#8217;t delete the original file, you may need it in future.

**Note: The downloaded file already have the same name, so after changing the name of the already existing file, you should be just fine with copy paste.**

Try running the game now, It should work just fine. In case this downloaded file doesn&#8217;t work, here is a alternative,

# <a href="https://raw.githubusercontent.com/yusuketomoto/ofxUrgDevice/master/libs/SDL/1.2.15/lib/libSDL-1.2.0.dylib" target="_blank">https://raw.githubusercontent.com/yusuketomoto/ofxUrgDevice/master/libs/SDL/1.2.15/lib/libSDL-1.2.0.dylib</a>

Also, keep a track of the official issue about this on Urban Terror&#8217;s Github repo, here

# <a href="https://github.com/FrozenSand/UrbanTerror4/issues/295" target="_blank">https://github.com/FrozenSand/UrbanTerror4/issues/295</a>