---
title: Share file between two ubuntu via Wifi
author: Oritro Ahmed
type: post
date: 2014-09-10T20:39:39+00:00
url: /468/share-file-two-ubuntu-via-wifi/
featured_image: /wp-content/uploads/http://res.cloudinary.com/clrshq/image/upload/v1410381332/Selection_079_urcxvr.png
categories:
  - Project Line
  - জাতীর উদ্দেশ্যে
tags:
  - sharing
  - Ubuntu
  - wifi

---
Well, I bought a new laptop today. As its a fresh copy, i needed to transfer some file from the desktop to it. I thought

> Hey, how hard it can be? its a simple thing.

And that is where i made my mistake. Well, its fairly simple. But i just didn&#8217;t know the easiest way. I have a wifi device connected to my desktop and i am sharing my internet connection using it. So i connected my laptop via wifi. Its connected to internet, but, I can&#8217;t find any way to get file from my Desktop. Before getting to the point, let me tell you, what i did so far.

  * Tried to share my whole hard-drive via apache server. So that i can access them from the laptop using the Internal IP. That didn&#8217;t worked out so far, just because both of my 500GB hdd was full top to bottom. Fixing permission on them took about an hour and them crushed because of some error. F**k.
  * Found a cross-over cable from my store room. That didn&#8217;t quite worked out because of a huge amount of permission thing.

I almost gave up. Fu*k Sharing. No more sharing. I would rather use a portable HDD to transfer the file then connecting these two via lan. Then, one last badass option left.

About a year ago, i was having trouble with a nginx configuration thing. My friend and Team mate Sarim khan accessed my pc via openssh and fixed the problem. Well, then i had a static IP. Now i don&#8217;t. ( If any bad ass mothe\* fu\***r getting some funny idea about it, don&#8217;t. Won&#8217;t gonna work. )

So i thought, what the hell, lets give it a try. So this is what i did. Install Open SSH on both of your computer. Simple in ubuntu. just run this,

&nbsp;

<pre>sudo apt-get install openssh-server</pre>

You gotta do that on both of your computer. Then, get to nautilus. Is you are wondering what the fu*k is that, its your file manager. Now stop wasting time and get there.

Now point is, which computer is your target for getting data? the Desktop or Laptop? If you are planning to get data from Desktop to Laptop, Open Nautilus and Click on the Top corner menu Called &#8220;File&#8221;.

You will find a submenu called &#8220;Connect to Server&#8221;. Click there. You will find a window like this one, Watch the data i put there, carefully.

<img class="alignnone wp-post-468 wp-image-469" src="http://res.cloudinary.com/clrshq/image/upload/v1410380563/ssh_connect_ii38kp.png" alt="" width="425" height="368" /> 

Now read this section carefully.

The **username** is the _username_ of your Ubuntu User. And in case of **oritro-lappy**, there should be the name of your computer. If you don&#8217;t know what is it, you are a fuc*ing retard and still i am gonna help you. Press **Ctrl+Alt+T**, the Terminal will open. The first text you should see there is something like **someone@something:-$ . **Here, the **someone** is your _username_ and the **something** is your _computer name_. Now put them as you found on the Terminal. You have to put your **username** twice as you can see.

If you are done doing that, click connect. You will have a warning like this one,

<img class="alignnone wp-post-468 wp-image-470" src="http://res.cloudinary.com/clrshq/image/upload/v1410381007/warning_077_s95qsb.png" alt="" width="643" height="226" /> 

have that? Now don&#8217;t freak out you hopeless moron. This will happen for the first time. Click &#8220;Log in Anyway&#8221;. Then another box will come up, asking for password,

<img class="alignnone wp-post-468 wp-image-471" src="http://res.cloudinary.com/clrshq/image/upload/v1410381178/password_078_fm3aqv.png" alt="" width="433" height="264" /> 

Put your password, and don&#8217;t ask he how you can find it. Once you do that, its gonna take a while, about a few sec based on a few things. Then you will have something like this on Nautilus, Again, your Fuc*ing File manage.

<img class="alignnone wp-post-468 wp-image-472" src="http://res.cloudinary.com/clrshq/image/upload/v1410381332/Selection_079_urcxvr.png" alt="" width="1362" height="741" /> 

Understood? You can access your whole harddrive via this. How? Why don&#8217;t you play around a bit and find out?

&nbsp;

Question? there is a comment box below.