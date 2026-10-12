import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { postHref } from '../lib/category';

export async function GET(context) {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'Oritro Ahmed',
    description:
      'Blog of Nidal Siddique Oritro — Software Engineer, Engineering Manager. Writing about software, homelab, teams, and AI.',
    site: context.site,
    // same href the post page uses for its canonical URL, trailing slash included
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: postHref(post.slug),
    })),
  });
}
