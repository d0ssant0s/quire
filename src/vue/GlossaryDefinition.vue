<script setup lang="ts">
// A glossary entry in a modal dialog: the term, its definition, what to avoid
// saying, and a link to the full glossary. The site decides when to show an
// entry by passing it; passing null closes the dialog, and so does Close,
// Escape or a click outside, each of which also emits `close`. Reka's dialog
// supplies the focus trap and returns focus to what had it when the dialog
// opened, or to `trigger` when the site names the element that asked. The
// title and Close sit above the definition, which scrolls on its own, so a long
// definition never pushes Close out of reach.
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { computed, ref } from 'vue';
import type { GlossaryEntry } from '../types';

const props = defineProps<{
  /** The entry to show; null keeps the dialog closed. */
  entry: GlossaryEntry | null;
  /** Where the full glossary is, without a fragment; the link adds the entry's anchor. */
  url: string;
  /** The element to focus when the dialog closes, if it is not the one that had focus when it opened. */
  trigger?: HTMLElement | null;
}>();

const emit = defineEmits<{ close: [] }>();

const closeButton = ref<HTMLButtonElement | null>(null);

const href = computed(() => `${props.url.split('#')[0]}#${props.entry?.anchor ?? ''}`);
// A glossary on another site opens beside the page the reader is on.
const external = computed(() => new URL(href.value, location.href).origin !== location.origin);

function opened(event: Event) {
  event.preventDefault();
  closeButton.value?.focus();
}

function closed(event: Event) {
  if (!props.trigger) return;
  event.preventDefault();
  props.trigger.focus();
}

function update(open: boolean) {
  if (!open) emit('close');
}
</script>

<template>
  <DialogRoot :open="entry !== null" @update:open="update">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/45" />
      <DialogContent
        v-if="entry"
        data-quire-glossary-dialog
        data-pagefind-ignore
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[min(80vh,40rem)] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card border border-line bg-surface leading-relaxed text-fg shadow-xl"
        @open-auto-focus="opened"
        @close-auto-focus="closed"
      >
        <header class="flex flex-none items-start justify-between gap-4 border-b border-line px-5 pt-4 pb-3">
          <div>
            <p class="m-0 text-xs tracking-wide text-muted uppercase">Glossary</p>
            <DialogTitle class="mt-1 text-xl leading-snug font-semibold [overflow-wrap:anywhere]" data-quire-glossary-term>{{ entry.term }}</DialogTitle>
          </div>
          <button
            ref="closeButton"
            type="button"
            aria-label="Close definition"
            class="flex-none cursor-pointer rounded-md border border-line bg-subtle px-2.5 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            @click="emit('close')"
          >
            Close
          </button>
        </header>
        <div class="min-h-0 flex-auto overflow-auto px-5 pt-3.5 pb-4" data-quire-glossary-body>
          <DialogDescription as="div" class="mb-3 [overflow-wrap:anywhere] [&_code]:font-mono [&_code]:text-[0.9em]" data-quire-glossary-definition v-html="entry.definition" />
          <p v-if="entry.avoid" class="mb-3 text-sm text-muted [overflow-wrap:anywhere]" data-quire-glossary-avoid>
            <span class="font-semibold">Avoid:</span> <span v-html="entry.avoid" />
          </p>
          <p class="m-0 text-sm">
            <a
              class="text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              data-quire-glossary-link
              :href="href"
              :target="external ? '_blank' : undefined"
              :rel="external ? 'noopener noreferrer' : undefined"
            >
              Read the full glossary
            </a>
          </p>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
