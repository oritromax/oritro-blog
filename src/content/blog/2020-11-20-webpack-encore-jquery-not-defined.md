---
title: Webpack Encore jQuery not defined
author: Oritro Ahmed
type: post
date: 2020-11-20T08:04:06+00:00
url: /873/webpack-encore-jquery-not-defined/
cloudinary_transformations_terms:
  - 'a:4:{i:0;s:11:"category:69";i:1;s:12:"post_tag:204";i:2;s:12:"post_tag:205";i:3;s:12:"post_tag:206";}'
categories:
  - Code Twist
tags:
  - encore
  - jquery
  - webpack

---
Yeap, jQuery is still relevant in some cases and within WebPack, it causes a bit of an issue when being imported. The reason, in most cases, is jQuery being defined as `$` and not as `jQuery`. Depending on how your jQuery specific code was written, it could render it not working. Let&#8217;s look at it progressively,

<pre class="lang:default decode:true ">const $ = require('jquery');</pre>

This is probably how you included jQuery in your app.js file. The only problem is, this however doesn&#8217;t declare jquery as a global `$` or `jQuery`. And you end up with something like the following,

<pre class="lang:default decode:true ">Uncaught ReferenceError: $ is not defined at [...]
Uncaught ReferenceError: jQuery is not defined at [...]
</pre>

The solutions also depend on the use case,

### Expecting jQuery to be Global

If you are using a plugin that expects jQuery to be global via $ or jQuery, your best bet is to add \`autoProvidejQuery()\` to your encore webpack.config.js file.

<pre class="lang:default decode:true ">Encore
    // ...
    .autoProvidejQuery()
;</pre>

Be advised, don&#8217;t use `.autoProvideVariables()`, they are the same. \`autoProvidejQuery()\` is working on top of it, just for jQuery.

### What about Embedded Scripts?

Your page might have a few Embedded scripts that require jQuery. In cases like that, one simple line should fix your issue, Go Global.

<pre class="lang:default decode:true ">global.$ = global.jQuery = $;</pre>

On your `app.js` file, add this after you have included your jquery.

&nbsp;

That&#8217;s it!

If you are using Symfony ( you should ), take a look here # [https://symfony.com/doc/current/frontend/encore/legacy-applications.html ][1]

&nbsp;

 [1]: https://symfony.com/doc/current/frontend/encore/legacy-applications.html