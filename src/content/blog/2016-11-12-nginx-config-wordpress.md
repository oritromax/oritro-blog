---
title: Nginx Config for WordPress – The Whole Nine Yards
author: Oritro Ahmed
type: post
date: 2016-11-12T16:46:07+00:00
url: /694/nginx-config-wordpress/
featured_image: /wp-content/uploads/2016/11/iMeZKzw.png
categories:
  - Codebox
  - Wordpress
tags:
  - cache
  - Config
  - Nginx
  - wordpress

---
I haven&#8217;t written anything in a while. A friend of mine shared his Nginx Config for WordPress. I thought, why not share mine. WordPress is very advanced in its own way. But you can achieve some remarkable things with Nginx config without even touching WordPress. And we are going to dive in deep to look at some of the cool things you can do with Nginx config that can supercharge your WordPress Site without sweating much. I am gonna go with a step by step guide with a complete config in the end. It might get boring at some point, but stay with me nonetheless. Might help you some day.

## Basic WordPress Nginx Config

This is where we start. Just by this basic config, your WordPress site will be up and running. I will explain the config with commented lines.

&nbsp;



Now, this is very basic. It can definitely run your WordPress site. But some major improvement needs to be done for a much more swift performance.

## Let&#8217;s Handle a Few Errors

In the start, your site may not have a few elements for s standard site. You will probably add them later. But for the time being, we can&#8217;t have those missing things clogging our error log. So,

<pre class="theme:github lang:default decode:true ">location = /favicon.ico {
	log_not_found off;
	access_log off;
}

location = /robots.txt {
	allow all;
	log_not_found off;
	access_log off;
}</pre>

This is going to turn error log off for favicon and robots file. Some Developers tends to put them later on. And some browser/crawler often miss them.

## Put A Few Security Wall

Let&#8217;s look at a few common WordPress problems. There are a lot of Script Kiddie Aka Noob hackers out there, who has a few scripts that tries to put or access executable file from your sites root directory. It&#8217;s sort of stupid, but effective nonetheless.

<pre class="theme:github lang:default decode:true">location ~ /\. {
	deny all;
}

location ~* ^/wp-content/uploads/.*\.php$ {
	deny all;
}

location ~* ^/wp-content/uploads/.*\.(html|htm|shtml|js|swf)$ {
         deny all;
}

location ~* wp-config.php {
         deny all;
}

if ($request_method !~ ^(GET|POST|HEAD)$ ) {
         return 444;
}</pre>

**First**, This is going to stop the user/whoever from accessing any file that starts with a ., for example **.htaccess**, **.htpasswd**, .**DS_Store** etc.

**Second**, It will stop anyone from accessing / executing any PHP file within WordPress upload Directory. If you are using WordPress for a while, you should know by now that there shouldn&#8217;t be any PHP file inside WordPress upload directory.

**Third**, we could&#8217;ve done this on the second step, but i like to keep things clean. This will stop anyone from accessing any Html, JS or Flash ( SWF ) file from Upload directory. Again, none of these should be there.

**Forth**, Even if you want to access the wp-config.php file via browser, it will show a blank page, since it&#8217;s a PHP file without anything to print. But we shouldn&#8217;t keep it open. You can always change the permission of the file or move it a directory up, but this rule should be in your Nginx config, just to the sake of redundancy.

**Fifth**, We are gonna make sure that we only serve these three types of request. **GET, POST, HEAD**.

&nbsp;

You can also add a few more security steps like which IP should be allowed to see certain section of the site and what not. But i prefer to manage them dynamically. Use a Good WordPress Security Plugin for these cases.

## Some Cache For The Server

Since WordPress has some really good cache plugin like W3 Total Cache or WP Super Cache, you can rely on them for caching your content and serving them to the user. But what if you are working on something complex and you don&#8217;t wanna use any of these? That case, here are a few things you can do

<pre class="theme:github lang:default decode:true"># Caching of media: images, icons, video, audio, HTC
location ~* \.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff|woff2|ttf|otf|eot)$ {
        expires 2M;
        add_header Cache-Control "public";
}

# CSS and Javascript
location ~* \.(?:css|js)$ {
        expires 1d;
        add_header Cache-Control "public";
}</pre>

These are some basic cache for the visitors browser. We are telling the browser to cache Media files for 2 Months and CSS and JS files for one month. This is Extremely simple stuff in the wilderness of Cache.

I always recommend you use a Cache Plugin like W3 Total Cache or WP Super Cache and Let them handle the hard stuff.

## Final Thoughts,

This is the final configuration file. All Comment removed for swift copy paste experience 😉 .  


In Addition, you can also Cache WordPress Using FastCGI Cache, which is a bit more complex, but a lot fun to work with. Maybe some other day. In Conclusion, Enjoy WordPress.

Resources

# <https://codex.wordpress.org/Nginx>

# <https://www.nginx.com/resources/wiki/start/topics/recipes/wordpress>/