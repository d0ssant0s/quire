import tailwindcss from '@tailwindcss/vite';
import type { AstroIntegration } from 'astro';

/**
 * The quire documentation shell. It wires Tailwind into the site's build; a site
 * imports `@d0ssant0s/quire/theme.css` from its own stylesheet to use the tokens.
 */
export default function quire(): AstroIntegration {
  return {
    name: '@d0ssant0s/quire',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({ vite: { plugins: [tailwindcss()] } });
      },
    },
  };
}
