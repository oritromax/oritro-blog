import { describe, it, expect } from 'vitest';
import { blogPostingJsonLd, serializeJsonLd } from '../../src/lib/jsonld';

const input = {
  title: 'Building a Homelab',
  description: 'How the rack came together.',
  url: 'https://ioritro.com/blog/my-homelab-part-1/',
  date: new Date('2025-04-01T14:43:11Z'),
};

describe('blogPostingJsonLd', () => {
  it('describes the post as a schema.org BlogPosting', () => {
    expect(blogPostingJsonLd(input)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Building a Homelab',
      description: 'How the rack came together.',
      url: 'https://ioritro.com/blog/my-homelab-part-1/',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://ioritro.com/blog/my-homelab-part-1/',
      },
      datePublished: '2025-04-01T14:43:11.000Z',
      dateModified: '2025-04-01T14:43:11.000Z',
      author: {
        '@type': 'Person',
        name: 'Nidal Siddique Oritro',
        url: 'https://ioritro.com/',
      },
    });
  });

  it('omits image when the post has no featured image', () => {
    expect('image' in blogPostingJsonLd(input)).toBe(false);
    expect('image' in blogPostingJsonLd({ ...input, image: '' })).toBe(false);
  });

  it('resolves a site-relative featured image against the production origin', () => {
    expect(blogPostingJsonLd({ ...input, image: '/static/2025/04/rack.jpg' }).image).toBe(
      'https://ioritro.com/static/2025/04/rack.jpg'
    );
  });

  it('leaves an absolute featured image untouched', () => {
    const image = 'https://cdn.example.com/rack.jpg';
    expect(blogPostingJsonLd({ ...input, image }).image).toBe(image);
  });
});

describe('serializeJsonLd', () => {
  it('round-trips through JSON.parse', () => {
    const data = blogPostingJsonLd({ ...input, image: '/a.jpg' });
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it('escapes "<" so a title can never close the script element', () => {
    const data = blogPostingJsonLd({
      ...input,
      title: 'Why </script><script>alert(1)</script> is not a title',
      description: 'An <!-- unterminated comment and a <b>tag</b>',
    });
    const json = serializeJsonLd(data);
    expect(json).not.toContain('<');
    expect(json).toContain('\\u003c/script>');
    expect(JSON.parse(json).headline).toBe(data.headline);
    expect(JSON.parse(json).description).toBe(data.description);
  });

  it('keeps non-ASCII text readable rather than escaping it', () => {
    const json = serializeJsonLd(blogPostingJsonLd({ ...input, title: 'বগা লেক' }));
    expect(json).toContain('বগা লেক');
  });
});
