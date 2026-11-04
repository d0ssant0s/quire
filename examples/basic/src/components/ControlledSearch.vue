<script setup lang="ts">
// A site's wrapper that drives quire's Search from outside, for `npm run
// check:browser`. Buttons marked `data-search-open`, `data-search-preset` and
// `data-search-clear` sit in the page, outside this island; the wrapper turns
// their clicks into `v-model:open` and `v-model:query`, reads `?search=<term>`
// the way a deep link would, and prints the models it holds. With `trigger`
// "slot" it replaces the built-in button with its own, and `shortcuts` is
// passed on. A query starting "slow" answers late, and `window.quireControlled`
// records the queries asked and when.
import Search from '@d0ssant0s/quire/vue/Search.vue';
import type { SearchSource } from '@d0ssant0s/quire/search';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(defineProps<{ trigger?: 'hidden' | 'slot'; shortcuts?: ('mod+k' | '/')[] }>(), { trigger: 'hidden', shortcuts: () => ['mod+k', '/'] });

const open = ref(false);
const query = ref('');
const calls: { query: string; at: number }[] = [];
if (typeof window !== 'undefined') (window as unknown as { quireControlled: unknown }).quireControlled = { calls };

const documents = [
  { title: 'Home', url: '/' },
  { title: 'Reading styles', url: '/guide/' },
];
const source: SearchSource = async (text) => {
  calls.push({ query: text, at: performance.now() });
  if (text.startsWith('slow')) {
    await new Promise((done) => setTimeout(done, 600));
    return [{ title: 'Stale', url: '/stale/' }];
  }
  await new Promise((done) => setTimeout(done, 20));
  return documents.filter((entry) => entry.title.toLowerCase().includes(text.toLowerCase()));
};

function click(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null;
  const preset = target?.closest<HTMLElement>('[data-search-preset]');
  if (preset) {
    query.value = preset.dataset.searchPreset ?? '';
    open.value = true;
  } else if (target?.closest('[data-search-open]')) open.value = true;
  else if (target?.closest('[data-search-clear]')) query.value = '';
}

onMounted(() => {
  document.addEventListener('click', click);
  const term = new URLSearchParams(location.search).get('search');
  if (term) {
    query.value = term;
    open.value = true;
  }
});
onBeforeUnmount(() => document.removeEventListener('click', click));
</script>

<template>
  <div class="contents">
    <Search v-model:open="open" v-model:query="query" :source="source" :shortcuts="shortcuts" :trigger="trigger === 'slot'">
      <template v-if="trigger === 'slot'" #trigger>
        <button type="button" data-custom-trigger class="rounded-lg border border-line px-2.5">Find</button>
      </template>
    </Search>
    <output data-search-state class="sr-only">open={{ open }} query={{ query }}</output>
  </div>
</template>
