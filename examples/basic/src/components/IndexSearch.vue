<script setup lang="ts">
// A site's own wrapper around quire's Search: a function cannot cross an Astro
// island boundary, so the page hydrates this component and it passes the
// source. Here the source reads the Pagefind index that `npm run build` writes
// beside the pages.
import Search from '@d0ssant0s/quire/vue/Search.vue';
import { pagefindSource } from '@d0ssant0s/quire/search';

const source = pagefindSource('/pagefind/', { filter: 'kind' });
</script>

<template>
  <Search :source="source" />
</template>
