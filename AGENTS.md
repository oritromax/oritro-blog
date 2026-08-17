# AGENTS.md — Oritro's Blog (ioritro.com)

Personal blog built with **Astro 5** + **Tailwind CSS 4**. Static site, content in Markdown via Content Collections. Live at https://ioritro.com.

## Hard Rules

1. **Visual verification is mandatory.** On ANY change — new post, design change, component edit, config tweak — run the project (`npm run dev`), open the affected pages in a browser, and visually confirm the post and the site render correctly before the task is considered done. Screenshots or a rendered preview count; "the build passed" does not.

2. **Design-affecting changes get tests.** If you add new functionality or change anything that affects the site's design/layout:
   - **Unit test** — cover the new logic (components, utilities, plugins).
   - **Smoke test** — `npm run build` must pass cleanly, then `npm run preview` and verify the key routes load: homepage, a blog post page, and any page touched by the change.
   - If no test framework is installed, the minimum floor is a clean production build + preview + visual check of every affected route. Installing a framework (vitest, playwright) is preferred for anything non-trivial.

3. **Every new post must be listed in the README.** When adding a blog post, add it to the "Blog Posts" section (grouped by year, newest first). If you find posts in `src/content/blog/` that are missing from the README, add them too — fix the whole gap, not just the new one.

## Astro-Specific Rules

- **Content schema is the contract.** `src/content/config.ts` defines the zod schema for posts. If a build fails on a frontmatter field, fix the post — do NOT loosen the schema to make the build pass.
- **Custom markdown plugins are loaded in `astro.config.mjs`**: `remark-aside` (callout blocks), `rehype-code` (code-block rendering), custom shiki theme. When writing a post, use `:::` aside directives and code fences normally — they're transformed at build time. If you modify these plugins, run the full unit + smoke test path from Rule 2.
- **Don't commit `dist/` or `node_modules/`** — they're build artifacts (check `.gitignore` before staging anything).
- **`site: 'https://ioritro.com'` is set in `astro.config.mjs`** — the sitemap integration depends on it. Don't change it to a localhost/dev URL, even temporarily, without reverting before commit.
- **Tailwind 4 is wired through `@tailwindcss/vite`** — theme tokens live in CSS, not a `tailwind.config` file. Style changes belong in the stylesheets.
- **The `cli/` directory is Go** (`cli/blogpost`). It's independent of the Astro build — changes there are rebuildable with `go build -o blogpost` and don't affect the site build.
- **Keep commits atomic and message-worthy** — a new post is one commit; a design change is one commit; never mix the two.
- **`npm run dev` and `npm run build` are the two commands that matter.** Everything else in the repo follows Astro conventions.
