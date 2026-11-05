// Folding and filtering for a glossary article a site renders statically.
// Without script the article is plain headings and definitions, all readable
// and all indexed. With it, each section heading (h2) becomes the summary of a
// native details element holding its terms, and each term heading (h3) the
// summary of one holding its definition. The Vue controller beside the article
// (vue/GlossaryFilter.vue) drives this module; the article's nodes are never
// Vue-owned.

interface Section {
  box: HTMLDetailsElement;
  terms: Term[];
}

interface Term {
  box: HTMLDetailsElement;
  /** Term name, definition and avoid list, lower case, for matching. */
  text: string;
}

export interface GlossaryPage {
  /** How many terms the glossary holds. */
  readonly total: number;
  /** Show only the terms that contain every word of `query`; returns how many show. */
  filter(query: string): number;
  /** Open or close the definitions that currently show; opening also opens their sections. */
  setDefinitions(open: boolean): void;
  /** Bring the term the address names into view, opening what holds it and lifting a filter that hides it. */
  reveal(): void;
  /** Put the article back as the page rendered it. */
  destroy(): void;
}

export interface GlossaryPageHooks {
  /** The page lifted the filter so a linked term shows; the control should show an empty query. */
  filterLifted(): void;
}

interface SavedBox {
  box: HTMLDetailsElement;
  open: boolean;
  hidden: boolean;
}

/**
 * Wrap a heading, and the siblings after it up to the next element matching
 * `stop`, in a native details element whose summary is the heading itself.
 */
function wrap(heading: Element, stop: string): HTMLDetailsElement {
  const box = document.createElement('details');
  box.className = 'quire-accordion';
  const summary = document.createElement('summary');
  heading.before(box);
  summary.append(heading);
  box.append(summary);
  let node = box.nextSibling;
  while (node && !(node instanceof Element && node.matches(stop))) {
    const following = node.nextSibling;
    box.append(node);
    node = following;
  }
  return box;
}

/** Undo `wrap`: the heading and everything after it return to the box's place. */
function unwrap(box: HTMLDetailsElement) {
  const summary = box.firstElementChild;
  const rest = [...box.childNodes].filter((node) => node !== summary);
  box.before(...(summary?.childNodes ?? []), ...rest);
  box.remove();
}

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function foldSections(article: HTMLElement): Section[] {
  return [...article.querySelectorAll(':scope > h2')].map((heading) => {
    const box = wrap(heading, 'h2');
    box.open = true;
    const terms = [...box.querySelectorAll(':scope > h3')].map((term) => {
      const termBox = wrap(term, 'h2, h3');
      return { box: termBox, text: normalize(termBox.textContent ?? '') };
    });
    return { box, terms };
  });
}

export function attachGlossaryPage(article: HTMLElement, hooks: GlossaryPageHooks): GlossaryPage {
  const sections = foldSections(article);
  const terms = sections.flatMap((section) => section.terms);

  function visibleTerms() {
    return terms.filter((term) => !term.box.hidden);
  }

  function filter(query: string): number {
    const words = normalize(query).split(' ').filter(Boolean);
    for (const term of terms) {
      term.box.hidden = !words.every((word) => term.text.includes(word));
    }
    for (const section of sections) {
      section.box.hidden = section.terms.every((term) => term.box.hidden);
    }
    return visibleTerms().length;
  }

  function setDefinitions(open: boolean) {
    for (const term of visibleTerms()) {
      term.box.open = open;
      if (open && term.box.parentElement instanceof HTMLDetailsElement) term.box.parentElement.open = true;
    }
  }

  function reveal() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target || !article.contains(target)) return;
    if (target.closest('[hidden]')) {
      filter('');
      hooks.filterLifted();
    }
    for (let box = target.closest('details'); box; box = box.parentElement?.closest('details') ?? null) {
      box.open = true;
    }
    target.scrollIntoView();
  }

  // Printing shows and opens every definition, then restores the reader's
  // choices; a second beforeprint before the first afterprint saves nothing new.
  let saved: SavedBox[] | null = null;
  const allBoxes = () => [...article.querySelectorAll<HTMLDetailsElement>('details.quire-accordion')];

  function beforePrint() {
    if (saved) return;
    saved = allBoxes().map((box) => ({ box, open: box.open, hidden: box.hidden }));
    for (const { box } of saved) {
      box.open = true;
      box.hidden = false;
    }
  }

  function afterPrint() {
    for (const { box, open, hidden } of saved ?? []) {
      box.open = open;
      box.hidden = hidden;
    }
    saved = null;
  }

  window.addEventListener('hashchange', reveal);
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);

  function destroy() {
    window.removeEventListener('hashchange', reveal);
    window.removeEventListener('beforeprint', beforePrint);
    window.removeEventListener('afterprint', afterPrint);
    // Inner boxes first, so each outer box still holds its terms when it is undone.
    for (const section of sections) {
      for (const term of section.terms) unwrap(term.box);
    }
    for (const section of sections) unwrap(section.box);
  }

  reveal();
  return { total: terms.length, filter, setDefinitions, reveal, destroy };
}
