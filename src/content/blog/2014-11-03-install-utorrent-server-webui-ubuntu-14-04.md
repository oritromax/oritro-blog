---
title: Install utorrent server (WebUI) in Ubuntu 14.04
author: Oritro Ahmed
type: post
date: 2014-11-02T23:52:15+00:00
url: /479/install-utorrent-server-webui-ubuntu-14-04/
categories:
  - selfhost
  - homelab
tags:
  - 32bit
  - linux
  - server
  - ubuntu 14.04
  - utorrent
  - utorrent on ubuntu
  - webui

---
Well, there is no shame to admit that i love downloading tons of movies and tv series. And i was a &#8220;From Windows to Linux&#8221; user. So i used to download movies with utorrent in Windows. After i shifted to linux, I was a bit shocked to know that there isn&#8217;t a proper torrent utorrent client for Linux. They have a server and a webui, which you can call a work around.

I am not a big fan of WebUI, so i tried software like <a href="http://www.vuze.com/" target="_blank">vuze</a> or <a href="http://deluge-torrent.org/" target="_blank">Deluge </a>or <a href="http://www.transmissionbt.com/" target="_blank">Transmission</a> or <a href="http://www.qbittorrent.org/" target="_blank">qBittorrent</a>. And frankly speaking, i never had the feel of utorrent in any of them. Some people may argue that utorrent has ads all over it and other money based things, but i love it, what to do?

Then i tired to figure out, how to install this thing? its a server and a webui to control the server. So i searched with the help of mighty google. Found a lots of answers. But to a part, most of them were too geeky or less human friendly. So i thought, what the hell? lets write one by myself.

&nbsp;

# Step 1

Download the utorrent server from here: <a href="https://www.utorrent.com/downloads/linux" target="_blank">www.utorrent.com/downloads/linux</a> . They haven&#8217;t released a official version for 14.04, but 13.04 version works here. So download it, don&#8217;t forget to choose between 32bit or 64bit, whichever you have.

It will download a zip file. As i am writing this for humans, so put that zip in **Downloads** folders of your **Home** directory. For the rest of the article, i will follow that directory.

&nbsp;

# Step 2

Open terminal. If you don&#8217;t know how to open terminal, just press `<em><strong>Ctrl+Alt+T</strong></em>.` And it will open the Terminal. Type and enter

<pre>cd Downloads</pre>

Don&#8217;t worry if you are freaking out about how to do it, i will add a screenshot at the end of step. By this command, we moved into Downloads Directory. Now we need to extract the downloaded utorrent compressed file. We will extract it into `/opt/` directory.

<pre>sudo tar xvzf utserver.tar.gz -C /opt/</pre>

Some people may argue opt folder isn&#8217;t the best choice for it, but what the hell ! When you press enter after this, Terminal will ask for your Ubuntu password. Remember, when you type ubuntu password in terminal, it won&#8217;t show the letters, will be blank. Don&#8217;t think it as your password isn&#8217;t typed.

Now, the elements of that compressed folders are extracted into our operational location. Lets move on.<figure style="width: 644px" class="wp-caption alignnone">

<img class="" src="http://i.imgur.com/HQpF9mz.png" alt="" width="644" height="308" /> <figcaption class="wp-caption-text">Command output</figcaption></figure> 

# Step 3

Now we need to change the permission of the extracted folder. put in this command and enter.

<pre>sudo chmod -R 777 /opt/utorrent-server-alpha-v3_3/</pre>

Now the folder permission is set. Now we have to symlink it to make it executable with a command. Put in this command,

<pre>sudo ln -s /opt/utorrent-server-alpha-v3_3/utserver /usr/bin/utserver</pre>

Now, the utorrent executable file from the extracted folder has a executable command. We are almost done.

<pre>sudo utserver -settingspath /opt/utorrent-server-alpha-v3_3/</pre>

Use this command to start the utorrent server. This command has no output and will stop there. Leave it as it is.<figure style="width: 735px" class="wp-caption alignnone">

<img class="" src="http://i.imgur.com/Q7840gq.png" alt="" width="735" height="191" /> <figcaption class="wp-caption-text">Command output</figcaption></figure> 

In the screenshot, there is en error, i did a mistake on while working, so ignore that. If you follow my instruction properly, there shouldn&#8217;t be any problem.

But if it shows any error like, libssl.so package missing, try this command. it will install the missing package. Then try the previous command again.

<pre>sudo apt-get install libssl0.9.8:i386
</pre>

Now it should work nice and fine.

# Step 4

We install the server, lets take a look at the WebUI. Try this url in your browser.

<pre>http://localhost:8080/gui/</pre>

It will ask for username and password. The default username is **admin** and blank password. Put admin and enter. Then you should see a user interface like this,<figure style="width: 1362px" class="wp-caption alignnone">

<img class="" src="http://i.imgur.com/ypjwzZS.png" alt="" width="1362" height="739" /> <figcaption class="wp-caption-text">Utorrent server WebUI</figcaption></figure> 

Well, i am using _epiphany_&#8211;_browser, _Which comes with ubuntu 14.04 by default. I use this browser just for webUI like this one.

This webUI is extremely easy to use as its similar with the Windows version. If you faced any problem in the run, please put it in the comment below.