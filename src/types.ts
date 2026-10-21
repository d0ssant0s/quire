/** One entry in a site's section navigation: a link, or a group of entries. */
export type NavItem =
  | { label: string; href: string; items?: undefined }
  | {
      label: string;
      items: NavItem[];
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
