// tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: '#e5e7eb',
            a: {
              color: '#34d399',
              '&:hover': {
                color: '#6ee7b7',
              },
            },
            h1: {
              color: '#ffffff',
            },
            h2: {
              color: '#ffffff',
            },
            h3: {
              color: '#ffffff',
            },
            h4: {
              color: '#ffffff',
            },
            blockquote: {
              borderLeftColor: '#34d399',
              color: '#d1d5db',
            },
            code: {
              color: '#6ee7b7',
              backgroundColor: '#1f2937',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};