// What a site's own Vue code imports to feed `Search`. This module is separate
// from the package's main entry on purpose: that entry is the Astro
// integration, which a browser bundle must never pull in.
import type { SearchAnswer, SearchSource } from './types';

export type { SearchAnswer, SearchFilter, SearchResult, SearchSource } from './types';

export interface PagefindSourceOptions {
  /**
   * The name of the Pagefind filter whose values are the results' categories
   * (`data-pagefind-filter="<name>"` in the pages). Without it the source
   * offers no filters.
   */
  filter?: string;
  /** Results to load for a query. Defaults to 20. */
  limit?: number;
  /** Given to `pagefind.options()` once, such as `{ excerptLength: 22, ranking: { termSimilarity: 10 } }`. */
  options?: Record<string, unknown>;
}

interface PagefindData {
  url: string;
  excerpt?: string;
  meta?: Record<string, string | undefined>;
  filters?: Record<string, string[] | undefined>;
}
interface Pagefind {
  options(options: Record<string, unknown>): Promise<void>;
  filters(): Promise<unknown>;
  search(
    query: string,
    options?: { filters?: Record<string, string> },
  ): Promise<{ results: { data(): Promise<PagefindData> }[]; totalFilters?: Record<string, Record<string, number> | undefined> }>;
}

/** Pagefind marks matches up in its excerpts; `Search` shows text only. */
function plain(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';
}

/**
 * A `SearchSource` over the Pagefind index at `base`, the directory the
 * Pagefind CLI wrote (`/pagefind/` by default). Pagefind's script is loaded
 * from the site when the first query runs, so quire has no Pagefind
 * dependency and a page that never searches never fetches it. A load that
 * failed is tried again on the next call, which is what a retry is.
 *
 * Results carry Pagefind's title and `meta.section`, and the excerpt as text.
 * With `filter` the values of that Pagefind filter are the categories, counted
 * across the whole query whichever one is chosen, and the chosen one narrows
 * the search itself.
 */
export function pagefindSource(base = '/pagefind/', { filter, limit = 20, options }: PagefindSourceOptions = {}): SearchSource {
  let loading: Promise<Pagefind> | undefined;
  const load = () => {
    loading ??= (async () => {
      const url = new URL(`${base.replace(/\/*$/, '/')}pagefind.js`, location.href).href;
      const pagefind = (await import(/* @vite-ignore */ url)) as Pagefind;
      if (options) await pagefind.options(options);
      // Filter counts stay empty until the filter index has loaded once.
      if (filter) await pagefind.filters();
      return pagefind;
    })();
    loading.catch(() => (loading = undefined));
    return loading;
  };
  return async (query, { signal, filter: chosen }): Promise<SearchAnswer> => {
    const pagefind = await load();
    signal.throwIfAborted();
    const found = await pagefind.search(query, filter && chosen ? { filters: { [filter]: chosen } } : {});
    signal.throwIfAborted();
    const loaded = await Promise.all(found.results.slice(0, limit).map((result) => result.data()));
    signal.throwIfAborted();
    const results = loaded.map((data) => ({
      title: data.meta?.title || data.url,
      url: data.url,
      section: data.meta?.section || undefined,
      excerpt: data.excerpt ? plain(data.excerpt) : undefined,
      category: filter ? data.filters?.[filter]?.[0] : undefined,
    }));
    const totals = filter ? found.totalFilters?.[filter] : undefined;
    if (!totals) return results;
    return { results, filters: Object.entries(totals).map(([name, count]) => ({ name, count })) };
  };
}
