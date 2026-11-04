<script setup lang="ts">
// Search in a dialog opened from the header, with a shortcut, or by the site's
// own code through `v-model:open` and `v-model:query`. Each
// keystroke after a short pause asks for answers, either from a `source`
// function that the site's own Vue component passes, or from
// `<endpoint>?q=<query>`, which answers `{ results: SearchResult[] }`. A newer
// query cancels the one before it and drops its answer if it still arrives, so
// a slow answer never replaces a faster, later one, nor brings results back
// after the query is cleared. A query the site sets is asked at once, not after
// the pause. Reka's dialog and listbox supply focus handling
// and keyboard selection; the styles follow shadcn-vue's command dialog.
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger, ListboxContent, ListboxFilter, ListboxItem, ListboxRoot } from 'reka-ui';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { SearchAnswer, SearchFilter, SearchResult, SearchSource } from '../types';

const props = withDefaults(
  defineProps<{
    /** Where answers come from when no `source` is given: `<endpoint>?q=<query>`. */
    endpoint?: string;
    /**
     * Answers queries in place of `endpoint`. A function cannot cross an Astro
     * island boundary, so pass it from the site's own Vue component.
     */
    source?: SearchSource;
    label?: string;
    placeholder?: string;
    /** Characters a query needs before it is asked. */
    minLength?: number;
    /** Milliseconds of quiet typing before a query is asked. */
    delay?: number;
    /** Keys that open the dialog: Ctrl or ⌘ with K, and `/` outside text fields. */
    shortcuts?: Shortcut[];
    /** Whether to show the built-in button; a site with its own buttons hides it. */
    trigger?: boolean;
  }>(),
  { label: 'Search', placeholder: 'Search the documentation', minLength: 2, delay: 150, shortcuts: () => ['mod+k'], trigger: true },
);

type Shortcut = 'mod+k' | '/';
const hints: Record<Shortcut, string> = { 'mod+k': 'Ctrl K', '/': '/' };

type State = 'idle' | 'loading' | 'results' | 'empty' | 'error';
const open = defineModel<boolean>('open', { default: false });
const query = defineModel<string>('query', { default: '' });
const filter = ref('');
const state = ref<State>('idle');
// What the source answered, before the chosen filter hides any of it.
const answered = ref<SearchResult[]>([]);
const filters = ref<SearchFilter[]>([]);
const total = ref(0);
const input = ref<{ $el: HTMLElement }>();
// The request whose answer may still be used; cancelling clears it.
let pending: AbortController | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
// What the reader last typed, to tell their keystrokes from a query the site set.
let typed: string | undefined;

const results = computed(() => (filter.value ? answered.value.filter((result) => result.category === filter.value) : answered.value));
// The chosen filter stays listed when a query has none of it, so it can be left.
const choices = computed(() => (filter.value && !filters.value.some((entry) => entry.name === filter.value) ? [...filters.value, { name: filter.value, count: 0 }] : filters.value));
const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
// Choosing a result navigates to it, so only web addresses qualify.
function web(url: string) {
  try {
    return /^https?:$/.test(new URL(url, location.href).protocol);
  } catch {
    return false;
  }
}

async function endpointAnswer(text: string, { signal, filter: chosen }: { signal: AbortSignal; filter?: string }): Promise<SearchAnswer> {
  const url = new URL(props.endpoint ?? '', location.href);
  url.searchParams.set('q', text);
  if (chosen) url.searchParams.set('filter', chosen);
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`search answered ${response.status}`);
  return (await response.json()) as SearchAnswer;
}

function ask(text: string, chosen: string | undefined, signal: AbortSignal): Promise<SearchAnswer> {
  if (props.source) return props.source(text, { signal, filter: chosen });
  if (props.endpoint) return endpointAnswer(text, { signal, filter: chosen });
  return Promise.reject(new Error('Search needs a source or an endpoint'));
}

/** Keep the results that can be shown and the filters that make sense; anything else in an answer is dropped. */
function read(answer: unknown): { results: SearchResult[]; filters: SearchFilter[]; total: number } {
  const body = Array.isArray(answer) ? { results: answer, filters: undefined } : (answer as { results?: unknown; filters?: unknown } | null);
  if (!body || !Array.isArray(body.results)) throw new Error('the search answer has no results list');
  const results: SearchResult[] = [];
  for (const entry of body.results as Partial<Record<keyof SearchResult, unknown>>[]) {
    const title = text(entry?.title);
    const url = text(entry?.url);
    if (!title || !url || !web(url)) continue;
    results.push({ title, url, section: text(entry.section), excerpt: text(entry.excerpt), category: text(entry.category) });
  }
  if (Array.isArray(body.filters)) {
    const given = (body.filters as Partial<SearchFilter>[]).flatMap((entry) => {
      const name = text(entry?.name);
      return name && typeof entry.count === 'number' && entry.count >= 0 ? [{ name, count: Math.floor(entry.count) }] : [];
    });
    return { results, filters: given, total: given.reduce((sum, entry) => sum + entry.count, 0) };
  }
  const counts = new Map<string, number>();
  for (const result of results) if (result.category) counts.set(result.category, (counts.get(result.category) ?? 0) + 1);
  return { results, filters: [...counts].map(([name, count]) => ({ name, count })), total: results.length };
}

function cancel() {
  clearTimeout(timer);
  pending?.abort();
  pending = undefined;
}

async function search() {
  cancel();
  const request = new AbortController();
  pending = request;
  state.value = 'loading';
  try {
    const answer = read(await ask(query.value.trim(), filter.value || undefined, request.signal));
    // A newer query, a cleared one or a closed dialog has replaced this one,
    // whether or not the source took notice of the signal.
    if (pending !== request) return;
    answered.value = answer.results;
    filters.value = answer.filters;
    total.value = answer.total;
    state.value = results.value.length ? 'results' : 'empty';
  } catch {
    if (pending !== request) return;
    answered.value = [];
    state.value = 'error';
  }
}

const ready = () => query.value.trim().length >= props.minLength;

function type(value: string | number | undefined) {
  typed = query.value = String(value ?? '');
}

watch(query, (value) => {
  const keystroke = value === typed;
  typed = undefined;
  cancel();
  // A closed dialog asks when it opens.
  if (!ready() || !open.value) {
    answered.value = [];
    filters.value = [];
    state.value = 'idle';
  } else if (keystroke) timer = setTimeout(search, props.delay);
  else search();
});

function choose(name: string, event: MouseEvent) {
  filter.value = name;
  if (ready()) search();
  // A pointer click leaves the field; a key press on the button stays put.
  if (event.detail) input.value?.$el.focus();
}

watch(open, (isOpen) => {
  if (!isOpen) {
    cancel();
    // Nothing is in flight now; the next opening asks again.
    if (state.value === 'loading') state.value = 'idle';
  } else if (ready() && state.value === 'idle') search();
});

function go(url: unknown) {
  if (typeof url === 'string' && url) location.assign(url);
}

const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

function shortcut(event: KeyboardEvent) {
  const modified = event.ctrlKey || event.metaKey;
  const wanted =
    event.key.toLowerCase() === 'k' && modified
      ? props.shortcuts.includes('mod+k')
      : event.key === '/' && !modified && !event.altKey && !event.isComposing && !event.defaultPrevented && !open.value && !typing(event.target) && props.shortcuts.includes('/');
  if (!wanted) return;
  event.preventDefault();
  open.value = true;
}
onMounted(() => addEventListener('keydown', shortcut));
onBeforeUnmount(() => {
  removeEventListener('keydown', shortcut);
  cancel();
});

/** What a screen reader hears about the results; it is the visible text when there are none. */
const summary = computed(() => {
  const count = results.value.length;
  const where = filter.value ? ` in ${filter.value}` : '';
  if (state.value === 'idle') return `Type at least ${props.minLength} characters.`;
  if (state.value === 'loading') return 'Searching…';
  if (state.value === 'empty') return `No results for “${query.value.trim()}”${where}.`;
  if (state.value === 'results') return `${count} ${count === 1 ? 'result' : 'results'}${where}.`;
  return '';
});
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="trigger" as-child>
      <slot name="trigger">
        <button
          type="button"
          data-quire-search
          class="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-faint hover:border-line-strong"
        >
          <svg class="size-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
          <span class="hidden sm:inline">{{ label }}</span>
          <kbd v-if="shortcuts.length" class="hidden rounded-[5px] border border-line bg-subtle px-1.5 font-mono text-[11px] text-muted sm:inline">{{ hints[shortcuts[0]] }}</kbd>
        </button>
      </slot>
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
              ref="input"
              :model-value="query"
              auto-focus
              :aria-label="label"
              :placeholder="placeholder"
              :aria-busy="state === 'loading'"
              class="h-full w-full bg-transparent text-sm outline-hidden placeholder:text-faint"
              @update:model-value="type"
            />
          </div>
          <div v-if="choices.length > 1 || filter" role="group" aria-label="Filter results" data-quire-search-filters class="flex flex-wrap gap-1.5 border-b border-line px-3 py-2">
            <button
              v-for="entry in [{ name: '', count: total }, ...choices]"
              :key="entry.name"
              type="button"
              :aria-pressed="filter === entry.name"
              class="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs hover:bg-subtle aria-pressed:border-accent aria-pressed:bg-accent-soft"
              @click="choose(entry.name, $event)"
            >
              {{ entry.name || 'All' }}
              <span class="text-muted tabular-nums">{{ entry.count }}</span>
            </button>
          </div>
          <ListboxContent :aria-label="`${label} results`" class="max-h-[min(360px,60vh)] scroll-py-1 overflow-y-auto p-1" :class="{ 'opacity-60': state === 'loading' }">
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
        <!-- Always present, so a screen reader hears each change of it. -->
        <div role="status" data-quire-search-status>
          <p v-if="state === 'results'" class="sr-only">{{ summary }}</p>
          <p v-else-if="state !== 'error'" class="px-4 py-6 text-center text-sm text-muted">{{ summary }}</p>
        </div>
        <div v-if="state === 'error'" class="flex items-center justify-center gap-3 px-4 py-6 text-sm" role="alert">
          <span class="text-danger">Search is unavailable.</span>
          <button type="button" class="cursor-pointer rounded-md border border-line px-2 py-0.5 hover:bg-subtle" @click="search">Retry</button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
