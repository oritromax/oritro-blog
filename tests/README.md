# Tests

Three layers, each answering a different question.

| Layer | Question | Runner | Needs a build? |
|---|---|---|---|
| `tests/unit` | Is the logic right? | Vitest | no |
| `tests/build` | Did the build emit the right files? | Vitest | yes |
| `tests/e2e` | Does it work in a real browser? | Playwright | yes |

## Commands

```bash
npm test            # unit + build (this is the one to run before committing)
npm run test:unit   # fast — pure logic, plugins, components. No build.
npm run test:watch  # unit tests, watching
npm run test:build  # builds the site, then asserts over dist/
npm run test:e2e    # Playwright, desktop + mobile, against a production build
npm run test:all    # everything, reusing one build
npm run typecheck   # astro check + tsc over the test project
npm run report      # open the last Playwright HTML report
```

`test:e2e` builds and serves the site itself. To iterate against a build you
already have, set `PW_SKIP_BUILD=1`.

## What each layer covers

**`tests/unit`** — no I/O beyond reading files off disk.

- `category.test.ts` — the slug/href/colour rules, including the trailing-space,
  case, and NFC/NFD hazards that have caused 404s before.
- `remark-aside.test.ts` / `rehype-code.test.ts` — the two custom markdown
  plugins, driven through a real unified pipeline in the same order as
  `astro.config.mjs`.
- `shiki-theme.test.ts` — pins the syntax colours to the tokens in
  `tokens.css`, so the code surface can't drift from the design system.
- `content.test.ts` — validates every post against the *actual* schema
  (`src/lib/content-schema.ts`, the one `src/content/config.ts` uses).
- `readme-sync.test.ts` — enforces AGENTS.md rule 3: every post listed in the
  README, under the right year, newest first.
- `components/` — `Pagination`, `PostRow`, and `Sidebar` rendered through
  Astro's Container API and asserted against a real DOM.

**`tests/build`** — runs against `dist/`.

- `routes.test.ts` — one page per post, per category, per tag; no orphans;
  NFC-normalized directories; sitemap coverage.
- `links.test.ts` — crawls every built page and resolves every internal
  `href`/`src` the way a static host would. This is the 404 net.
- `post-page.test.ts` — hero, TOC, code frames, asides, related posts.
- `seo.test.ts` — title, description, canonical, OG/Twitter tags, one `h1`,
  listing page sizes, and the `/blog/` redirect stub.

**`tests/e2e`** — Playwright, `desktop` (Chrome) and `mobile` (Pixel 5).

- `home.spec.ts` — listing, pagination, navigation.
- `post.spec.ts` — hero, TOC scroll-spy, progress bar, copy-to-clipboard,
  share, taxonomy navigation, Bengali slugs.
- `theme.spec.ts` — toggle, persistence, OS preference, contrast in both themes.
- `a11y.spec.ts` — landmarks, keyboard reachability, accessible names.
- `visual.spec.ts` — screenshots of every key route in both themes, attached to
  the HTML report (AGENTS.md rule 1), plus layout-overflow assertions.

Third-party scripts (Google Analytics, the stats endpoint, Giscus) are blocked
in `fixtures.ts` so the suite is hermetic; the console-error assertions ignore
those blocked requests and nothing else.

## Adding a post

`npm test` will tell you if you missed something: the schema check, the README
listing, and — after `npm run test:build` — the route, links, and SEO tags.
