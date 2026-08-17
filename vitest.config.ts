import { getViteConfig } from 'astro/config';
import type { ViteUserConfig } from 'vitest/config';

/**
 * `getViteConfig` gives Vitest the same Vite pipeline Astro builds with, so
 * `.astro` components compile and can be rendered through the Container API.
 *
 * Two suites live here:
 *   tests/unit  — pure logic, markdown plugins, component rendering. No build.
 *   tests/build — assertions over `dist/`. Requires `astro build` first
 *                 (`npm run test:build` does the build for you).
 *
 * Playwright owns tests/e2e; it is excluded here so `vitest` never tries to
 * run a `.spec.ts` it cannot understand.
 */
const test: ViteUserConfig['test'] = {
  include: ['tests/{unit,build}/**/*.test.ts'],
  exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
  environment: 'node',
  globals: false,
  testTimeout: 20_000,
  coverage: {
    provider: 'v8',
    reportsDirectory: 'coverage',
    include: ['src/lib/**', 'src/components/**', 'src/pages/**'],
    reporter: ['text', 'html'],
  },
};

/* The cast bridges two things TypeScript keeps apart: Vitest's `test` key,
   which Astro's Vite config type has never heard of, and the two Vite copies
   in the tree (astro pins 6.x, @tailwindcss/vite pulls 7.x). Both are
   structurally fine at runtime — the build and the suite prove it. */
export default getViteConfig({ test } as Parameters<typeof getViteConfig>[0]);
