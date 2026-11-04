<script setup lang="ts">
// A source that stands in for a search service, for `npm run check:browser`.
// The check steers it through `window.quireStandIn`: `fail` makes it throw,
// `bare` makes it answer a plain list the way a source without counts would,
// and `calls` records what it was asked and whether it was cancelled. A query
// starting "slow" answers late with a result nothing else has, and takes no
// notice of the signal, so quire itself has to drop it once it is superseded.
import Search from '@d0ssant0s/quire/vue/Search.vue';
import type { SearchSource } from '@d0ssant0s/quire/search';

interface Call { query: string; filter?: string; aborted: boolean }
const state = { fail: false, bare: false, calls: [] as Call[] };
if (typeof window !== 'undefined') (window as unknown as { quireStandIn: typeof state }).quireStandIn = state;

const documents = [
  { title: 'Home', url: '/', excerpt: 'The example page', category: 'Pages' },
  { title: 'Reading styles', url: '/guide/', excerpt: 'Lists, code and tables on a page', category: 'Reading' },
  { title: 'Tables', url: '/guide/#tables', excerpt: 'Tables scroll in their frame', category: 'Reading' },
  { title: 'Short note', url: '/note/', excerpt: 'A page without headings', category: 'Pages' },
];
// Answers that quire must leave out: no address, no title, and an address that is not on the web.
const malformed = [{ title: 'No address' }, { url: '/untitled/' }, { title: 'Script', url: 'javascript:void(0)' }];

const source: SearchSource = async (query, { signal, filter }) => {
  const call: Call = { query, filter, aborted: false };
  signal.addEventListener('abort', () => (call.aborted = true));
  state.calls.push(call);
  if (query.startsWith('slow')) {
    await new Promise((done) => setTimeout(done, 600));
    return [{ title: 'Stale', url: '/stale/' }];
  }
  await new Promise((done) => setTimeout(done, 20));
  if (state.fail) throw new Error('the stand-in is down');
  const found = documents.filter((entry) => `${entry.title} ${entry.excerpt}`.toLowerCase().includes(query.toLowerCase()));
  if (state.bare) return [...found, ...malformed];
  const filters = [...Object.entries(Object.groupBy(found, (entry) => entry.category))].map(([name, entries]) => ({ name, count: entries!.length }));
  return { results: [...found.filter((entry) => !filter || entry.category === filter), ...malformed], filters };
};
</script>

<template>
  <Search :source="source" />
</template>
