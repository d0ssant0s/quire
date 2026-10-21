/** One entry in a site's section navigation: a link, or a group of entries. */
export type NavItem =
  | { label: string; href: string; items?: undefined }
  | {
      label: string;
      items: NavItem[];
      /** The group starts closed unless it holds the current page. */
      collapsed?: boolean;
    };
