import tailwindcss from '@tailwindcss/vite';
import type { AstroIntegration } from 'astro';

export interface QuireOptions {
  /**
   * Compile quire's Vue components, and the site's own, with the Vue and Reka
   * UI versions quire is tested with. Off by default: a site without Vue
   * components has no Vue in its build.
   */
  vue?: boolean;
}

/**
 * The quire documentation shell. It wires Tailwind into the site's build and
 * highlights code in both themes; a site imports `@d0ssant0s/quire/theme.css`
 * from its own stylesheet to use the tokens and the reading styles.
 */
export default function quire(options: QuireOptions = {}): AstroIntegration {
  return {
    name: '@d0ssant0s/quire',
    hooks: {
      'astro:config:setup': async ({ updateConfig }) => {
        // Loaded only when asked for, so a site without Vue never loads it.
        const integrations = options.vue ? [(await import('@astrojs/vue')).default()] : [];
        updateConfig({
          integrations,
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
