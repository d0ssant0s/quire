/**
 * One entry in a site's section navigation: a link, or a group of entries.
 *
 * A group's `icon` is the markup of one `<svg>` element, drawn before the
 * label at the size of the text and in its colour. A link's icon is not drawn:
 * page rows carry none, so they line up under the group labels. quire ships no icon set, so the site
 * supplies the markup; it is inserted as written, so it must come from the
 * site's own build, never from a reader.
 */
export type NavItem =
  | {
      label: string;
      href: string;
      icon?: string;
      items?: undefined;
    }
  | {
      label: string;
      items: NavItem[];
      icon?: string;
      /** The group starts closed unless it holds the current page. */
      collapsed?: boolean;
    };

/** One answer from a search source or endpoint. `url` is where choosing it leads. */
export interface SearchResult {
  title: string;
  url: string;
  /** The part of the site it belongs to, shown before the excerpt. */
  section?: string;
  /** Plain text; it is shown as text, never as HTML. */
  excerpt?: string;
  /** The filter it belongs to, such as a kind of page. */
  category?: string;
}

/** One filter a reader can narrow the results to, and how many results it holds. */
export interface SearchFilter {
  name: string;
  count: number;
}

/**
 * What a source answers. A bare list of results is enough: quire then offers
 * one filter for each `category` the results carry, counted from them. A source
 * that filters on its own, as a search service does, answers an object with
 * `filters`, the counts it holds for the whole query whichever filter is chosen.
 */
export type SearchAnswer = SearchResult[] | { results: SearchResult[]; filters?: SearchFilter[] };

/**
 * Where `Search` gets its answers, from a site's own Vue component. It is not
 * called for a query below the minimum length. `filter` names the chosen
 * filter, if any; a source that cannot filter may ignore it, because quire also
 * hides results of another category. Abort `signal` to stop work a newer query
 * has made pointless; a thrown error is the failed state, and a retry calls the
 * source again with the same query and filter.
 */
export type SearchSource = (query: string, options: { signal: AbortSignal; filter?: string }) => Promise<SearchAnswer>;
