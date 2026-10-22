import tailwindcss from '@tailwindcss/vite';
import type { AstroIntegration } from 'astro';

/**
 * The quire documentation shell. It wires Tailwind into the site's build and
 * highlights code in both themes; a site imports `@d0ssant0s/quire/theme.css`
 * from its own stylesheet to use the tokens and the reading styles.
 */
export default function quire(): AstroIntegration {
  return {
    name: '@d0ssant0s/quire',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: { plugins: [tailwindcss()] },
          // Shiki writes both themes into every block; prose.css picks the dark
          // one when the page's scheme is dark.
          markdown: {
            shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
          },
        });
      },
    },
  };
}

export type { NavItem, SearchResult } from './types';
