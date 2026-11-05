<script setup lang="ts">
// A site's wrapper around quire's GlossaryDefinition, for `npm run
// check:browser`. A button for each entry stands in for a term marked in
// prose. The first names itself as the element to return focus to; the second
// leaves that to the dialog, which returns focus to what had it. The second
// entry's definition is far longer than the dialog.
import GlossaryDefinition from '@d0ssant0s/quire/vue/GlossaryDefinition.vue';
import type { GlossaryEntry } from '@d0ssant0s/quire';
import { ref, shallowRef } from 'vue';

const entries: GlossaryEntry[] = [
  { term: 'Alpha', anchor: 'term-alpha', definition: 'The <em>first</em> term, with <code>code</code>.', avoid: 'first letter' },
  { term: 'Delta', anchor: 'term-delta', definition: Array.from({ length: 40 }, (_, index) => `<p>Paragraph ${index + 1} of a definition that outgrows the dialog.</p>`).join('') },
];

const entry = shallowRef<GlossaryEntry | null>(null);
const trigger = ref<HTMLElement | null>(null);

function show(chosen: GlossaryEntry, event: MouseEvent) {
  trigger.value = chosen.anchor === 'term-alpha' ? (event.currentTarget as HTMLElement) : null;
  entry.value = chosen;
}
</script>

<template>
  <p class="mt-4 flex gap-2">
    <button v-for="item in entries" :key="item.anchor" type="button" class="cursor-pointer underline" :data-define="item.anchor" @click="show(item, $event)">{{ item.term }}</button>
  </p>
  <GlossaryDefinition :entry="entry" url="/glossary/" :trigger="trigger" @close="entry = null" />
</template>
