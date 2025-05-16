---
title: W3 Total Cache – Proper Configuration
author: Oritro Ahmed
type: post
date: 2014-04-03T11:20:03+00:00
url: /429/w3-total-cache-proper-configuration/
categories:
  - codebox
tags:
  - cache
  - Optimization
  - w3 total cache

---
Well, Everyday in everywhere, There is a Question, How to Configure W3 Total Cache? And I thought, Lets spend some time to write about it, So won&#8217;t have to answer the Same Question Again and Again.

<span style="font-size: large;">Its Not Rocket Science</span>

W3 Total Cache isn&#8217;t Rocket Science. Its just a Plugin, A very Very Useful Plugin. And If you know how to configure it, It will boost up your site loading speed quite a bit.

## What we need?

A working wordpress Installation, And Some Proper Attention, Until this Article Ends. So buckle up, We are going to have a Ride inside W3 Total Cache.

<img class="alignnone wp-post-429 wp-image-432" title="W3 Total Cache - ioritro" src="http://res.cloudinary.com/clrshq/image/upload/e_shadow:40/v1396524143/Snap_Selection_104_ovmyjw.jpg" alt="W3 Total Cache - ioritro" width="1177" height="501" /> 

## Phase 1

As you have a Working WordPress Installation, I assume you have the knowledge to run and maintain wordpress. So Lets Just install W3 Total Cache. How to install a Plugin isn&#8217;t pretty much the area of this article, so You have to do / Figure out it by your own. I will start Right after you install and Activate W3 Total Cache. For the Sake of Writing, i will refer W3 Total Cache as W3TC now on.

### Compatibility Check

First, Go to W3 Total Cache Dashboard. You can Find it from Performance -> Dashboard. You will see there is a Compatibility check Button on the upper side of the Page. Why are we doing this? W3TC have Support for a Lots of Module, Cache Method and Service. So First We need to know, Which of those are present / available / Usable in my Installation. So click on the Button, You will have a list in a while.

There are Basically three section on Compatibility check. The First one( Server Modules & Resources ) is the Most important. So you will know, What you have and what you don&#8217;t. Now lets Get to Work. First Chapter, General Settings.

## General Settings

&nbsp;

General Settings Basically have a short configuration of the whole W3TC plugin. This is the Basics, For the Brief configuration, You have to go through each configuration page separately. But we will get there, Eventually, Right now, Lets focus on General Settings.

There is One thing, You should know Before starting to Configure W3TC. If you are using a Shared hosting, and if its a good one, You will probably have most of the Service / module pre installed. But if not, Your options are probably limited there. In case of VPS and Dedicated Sever, You have your kingdom, Arrange it as you like Sir. I will Show you A Configuration that should work( Hopefully ) on every server.

First Comes the general Section. Which Can toggle All options on and off at once, and we don&#8217;t need it Right now. So moving on, Next one is Page Cache.

Enable Page Cache. It will Cache You page into Static Page and Server them Directly in case one of them are Requested to the Server. For Shared Hosting, Set the method to **Disk: Enhanced. **If you own a VPS, You can Try **Opcache : Alternative PHP Cache**.

Next is, Minify. Minify is a Very interesting thing, and Very Effective. But you need to careful with your minify settings. Mis-configuration Might lead your site to a Broken Styleless &#8211; Scriptless site. Enable Minify, Set the Mode to **Auto**. Then Minify Cache Method, Set it to **Disk, **In shared hosting, That might be your only choice. Now there are three Options there. For HTML, CSS and JS. Set the Configuration as Follow,

HTML minifier: **HTML tidy** ( if not available, Use Default )

JS minifier: **JS min** ( its default and Safe choice )

CSS minifier: **Default** ( Safe and Quite good )

Next is, **Database Cache**. Its a Very Important Part. W3TC will cache your DB Query and Results and in Further use, It will direct Server the Results from the Cache. It will reduce a Lots of pressure from your Database, While, It has a demerit, Some ads management plugin can&#8217;t work properly if the Query is Cached. But, That number is very small. 90% time, this Database cache will work just fine. Enable it and Set it to **Disk**.

Now, **Object Cache**. There are a lots of task wordpress performs every single page load. Getting thousands of Data From DB, Setting them into classes, objects, Options. Now thats a good amount of load for both PHP and Database. Object Cache have a bit similarity with Database Cache, but it works on a Different Level. But thats not important Right now, May be We will Discuss about Object Cache in future. Enable it, and Set it to **Disk**.

Then, **browser Cache**, We Will Discuss it later. Just enable it.

**CDN**, is a Very lovely topic, At least for me. But For now, I am assuming you didn&#8217;t purchased a CDN, So we will leave it alone and in peace.

**Reverse Proxy**, The Mighty Varnish. But As I am writing this for New Users, So leave it alone for now.

Then, **Cloudflare, Network and Security**. If you use cloudflare, Feel Free to fill up the form. Otherwise, Leave it alone.

Moving on, Next One is **New Relic**. Awesome monitoring tool. But not now.

**Licensing**, Which apply only if you purchased a W3TC license. Which probably most of us don&#8217;t have. So, next.

At last, **Miscellaneous**, You can enable Google Page Speed API if you know What you are doing. But there isn&#8217;t much scope in this article to Cover it. So nothing to do. Now Save All Settings At once.

Now Sir, You have A  Basic Installation of W3TC. There are Basically a Lots of Options on W3 Total Cache. And That will comes in part by part. So this is For now. If you have Questions Related to W3 Total Cache, Please Mention them in the Comment Section, If its under my capability, I will try to Answer.

&nbsp;

Next Part: W3 Total Cache &#8211; Page Cache Configuration

&nbsp;

&nbsp;