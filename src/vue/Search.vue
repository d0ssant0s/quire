<script setup lang="ts">
// Search against a live endpoint, in a dialog opened from the header or with
// Ctrl+K or ⌘K. Each keystroke after a short pause asks
// `<endpoint>?q=<query>`, which answers `{ results: SearchResult[] }`; a newer
// query cancels the request before it, so a slow answer never replaces a
// faster, later one. Reka's dialog and listbox supply focus handling and
// keyboard selection; the styles follow shadcn-vue's command dialog.
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger, ListboxContent, ListboxFilter, ListboxItem, ListboxRoot } from 'reka-ui';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { SearchResult } from '../types';

const props = withDefaults(
  defineProps<{
    endpoint: string;
    label?: string;
    placeholder?: string;
    /** Characters a query needs before it is sent. */
    minLength?: number;
    /** Milliseconds of quiet typing before a request. */
    delay?: number;
  }>(),
  { label: 'Search', placeholder: 'Search the documentation', minLength: 2, delay: 150 },
);

type State = 'idle' | 'loading' | 'results' | 'empty' | 'error';
const open = ref(false);
const query = ref('');
const state = ref<State>('idle');
const results = ref<SearchResult[]>([]);
let pending: AbortController | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

async function search(text: string) {
  pending?.abort();
  const request = new AbortController();
  pending = request;
  state.value = 'loading';
  try {
    const url = new URL(props.endpoint, location.href);
    url.searchParams.set('q', text);
    const response = await fetch(url, { signal: request.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`search answered ${response.status}`);
    const body = (await response.json()) as { results?: SearchResult[] };
    results.value = Array.isArray(body.results) ? body.results.filter((result) => result.title && result.url) : [];
    state.value = results.value.length ? 'results' : 'empty';
  } catch {
    if (request.signal.aborted) return;
    results.value = [];
    state.value = 'error';
  }
}

watch(query, (text) => {
  clearTimeout(timer);
  const trimmed = text.trim();
  if (trimmed.length < props.minLength) {
    pending?.abort();
    results.value = [];
    state.value = 'idle';
    return;
  }
  timer = setTimeout(() => search(trimmed), props.delay);
});

watch(open, (isOpen) => {
  if (isOpen) return;
  clearTimeout(timer);
  pending?.abort();
});

function go(url: unknown) {
  if (typeof url === 'string' && url) location.assign(url);
}

function shortcut(event: KeyboardEvent) {
  if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    open.value = true;
  }
}
onMounted(() => addEventListener('keydown', shortcut));
onBeforeUnmount(() => {
  removeEventListener('keydown', shortcut);
  clearTimeout(timer);
  pending?.abort();
});
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger
      data-quire-search
      class="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-faint hover:border-line-strong"
    >
      <svg class="size-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
      <span class="hidden sm:inline">{{ label }}</span>
      <kbd class="hidden rounded-[5px] border border-line bg-subtle px-1.5 font-mono text-[11px] text-muted sm:inline">Ctrl K</kbd>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/40" />
      <DialogContent
        class="fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-card border border-line-strong bg-surface text-fg shadow-xl"
      >
        <DialogTitle class="sr-only">{{ label }}</DialogTitle>
        <DialogDescription class="sr-only">Type to search; use the arrow keys to choose a result and Enter to open it.</DialogDescription>
        <ListboxRoot highlight-on-hover @update:model-value="go">
          <div class="flex h-11 items-center gap-2 border-b border-line px-3">
            <svg class="size-4 shrink-0 text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
            <ListboxFilter
              v-model="query"
              auto-focus
              :placeholder="placeholder"
              :aria-busy="state === 'loading'"
              class="h-full w-full bg-transparent text-sm outline-hidden placeholder:text-faint"
            />
          </div>
          <ListboxContent class="max-h-[min(360px,60vh)] scroll-py-1 overflow-y-auto p-1">
            <ListboxItem
              v-for="result in results"
              :key="result.url"
              :value="result.url"
              class="flex cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-sm outline-hidden select-none data-highlighted:bg-subtle"
            >
              <span class="font-medium">{{ result.title }}</span>
              <span v-if="result.section || result.excerpt" class="text-xs text-muted">
                <template v-if="result.section">{{ result.section }}</template>
                <template v-if="result.section && result.excerpt"> · </template>
                <template v-if="result.excerpt">{{ result.excerpt }}</template>
              </span>
            </ListboxItem>
          </ListboxContent>
        </ListboxRoot>
        <p v-if="state === 'idle'" class="px-4 py-6 text-center text-sm text-muted">Type at least {{ minLength }} characters.</p>
        <p v-else-if="state === 'loading' && !results.length" class="px-4 py-6 text-center text-sm text-muted" role="status">Searching…</p>
        <p v-else-if="state === 'empty'" class="px-4 py-6 text-center text-sm text-muted" role="status">No results for “{{ query.trim() }}”.</p>
        <div v-else-if="state === 'error'" class="flex items-center justify-center gap-3 px-4 py-6 text-sm" role="alert">
          <span class="text-danger">Search is unavailable.</span>
          <button type="button" class="cursor-pointer rounded-md border border-line px-2 py-0.5 hover:bg-subtle" @click="search(query.trim())">Retry</button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
