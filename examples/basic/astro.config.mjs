// @ts-check
import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';
import quire from '@d0ssant0s/quire';

export default defineConfig({
  integrations: [quire(), vue()],
});
