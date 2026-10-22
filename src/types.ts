/**
 * One entry in a site's section navigation: a link, or a group of entries.
 *
 * `icon` is the markup of one `<svg>` element, drawn before the label at the
 * size of the text and in its colour. quire ships no icon set, so the site
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

/** One answer from a search endpoint. `url` is where choosing it leads. */
export interface SearchResult {
  title: string;
  url: string;
  /** The part of the site it belongs to, shown before the excerpt. */
  section?: string;
  /** Plain text; it is shown as text, never as HTML. */
  excerpt?: string;
}
