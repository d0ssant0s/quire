import vueIntegration from '@astrojs/vue';
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
      'astro:config:setup': ({ updateConfig }) => {
        // @astrojs/vue is imported with this module, never from inside the hook:
        // quire is TypeScript source, so from node_modules Astro loads it
        // through a Vite module runner that is closed by the time this hook
        // runs, and a dynamic import here fails. Importing the module costs a
        // site without Vue nothing in its pages; the integration, which adds
        // Vue to the build, is added only when the option is set.
        const integrations = options.vue ? [vueIntegration()] : [];
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

export type { NavItem, SearchAnswer, SearchFilter, SearchResult, SearchSource } from './types';
