import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { postHref } from '../lib/category';

const RECENT_POSTS = 15;

export const GET: APIRoute = async ({ site }) => {
  const origin = (site?.href ?? 'https://ioritro.com/').replace(/\/$/, '');
  const abs = (path: string) => encodeURI(`${origin}${path}`);

  const posts = (await getCollection('blog'))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, RECENT_POSTS);

  /* one post per line — a stray newline in a description would break the list */
  const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

  const lines = [
    '# Oritro Ahmed',
    '',
    '> Blog of Nidal Siddique Oritro — Software Engineer and Engineering Manager, writing about software, homelab, self-hosting, teams, and AI.',
    '',
    '## Posts',
    '',
    ...posts.map((post) => {
      const link = `- [${oneLine(post.data.title)}](${abs(`${postHref(post.slug)}/`)})`;
      return post.data.description ? `${link}: ${oneLine(post.data.description)}` : link;
    }),
    '',
    '## Pages',
    '',
    `- [Home](${abs('/')}): Latest posts`,
    `- [Contact](${abs('/contact/')}): How to get in touch`,
    `- [Consultation](${abs('/consultation/')}): Consulting and mentorship`,
    `- [Categories](${abs('/categories/')}): All posts grouped by category`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
