<script setup lang="ts">
// The controls for a glossary page: a filter over term names and definitions,
// a count, a way back from no matches, and expand all and collapse all. The
// article is the site's static rendering of the glossary. This component never
// renders into it and never owns its nodes: it hands the article to
// glossary-page.ts, which folds it into native details elements and shows or
// hides terms. Nothing appears without script, and the page reads and is
// indexed in full without it.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { attachGlossaryPage, type GlossaryPage } from '../glossary-page';

const props = withDefaults(
  defineProps<{
    /** CSS selector of the article holding the glossary: h2 sections, each with h3 terms. */
    article?: string;
    label?: string;
    placeholder?: string;
  }>(),
  { article: '[data-quire-glossary]', label: 'Filter terms', placeholder: 'Search names and definitions' },
);

const button = 'cursor-pointer rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:text-faint';

const ready = ref(false);
const query = ref('');
const total = ref(0);
const shown = ref(0);
const field = ref<HTMLInputElement | null>(null);
let page: GlossaryPage | undefined;

const filtering = computed(() => query.value.trim() !== '');
const empty = computed(() => ready.value && shown.value === 0);
const count = computed(() => {
  if (!filtering.value) return `${total.value} terms`;
  if (empty.value) return `No terms match “${query.value.trim()}”`;
  return `${shown.value} of ${total.value} terms match`;
});

function clear() {
  query.value = '';
  field.value?.focus();
}

watch(query, (value) => {
  if (page) shown.value = page.filter(value);
});

onMounted(() => {
  const element = document.querySelector<HTMLElement>(props.article);
  if (!element) return;
  page = attachGlossaryPage(element, {
    filterLifted() {
      query.value = '';
    },
  });
  total.value = page.total;
  shown.value = page.total;
  ready.value = true;
});

onBeforeUnmount(() => page?.destroy());
</script>

<template>
  <div v-if="ready" class="mb-5 max-w-(--quire-measure)" data-quire-glossary-tools data-pagefind-ignore role="search" aria-label="Glossary">
    <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
      <label class="basis-full text-sm text-muted" for="quire-glossary-filter">{{ label }}</label>
      <div class="flex min-w-0 flex-[1_1_16rem] gap-2">
        <input
          id="quire-glossary-filter"
          ref="field"
          v-model="query"
          class="min-w-0 flex-auto rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-search-cancel-button]:hidden"
          type="search"
          autocomplete="off"
          spellcheck="false"
          :placeholder="placeholder"
          @keydown.esc="clear"
        />
        <button v-if="filtering" type="button" data-quire-glossary-clear :class="button" @click="clear">Clear</button>
      </div>
      <div class="flex gap-2">
        <button type="button" :class="button" :disabled="empty" @click="page?.setDefinitions(true)">Expand all</button>
        <button type="button" :class="button" :disabled="empty" @click="page?.setDefinitions(false)">Collapse all</button>
      </div>
    </div>
    <p class="mt-2 text-sm text-muted" data-quire-glossary-count role="status">{{ count }}</p>
    <p v-if="empty" class="mt-2 text-sm text-muted" data-quire-glossary-empty>
      Try fewer words, or
      <button type="button" class="cursor-pointer text-accent underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" @click="clear">clear the filter</button>
      to see every term.
    </p>
  </div>
</template>
