# Changelog

Each release is a tag in this repository; sites install one as described in
the README. Before 1.0, a minor version marks a breaking change.

## Unreleased

- Navigation items and the `Sidebar` label take a site-supplied SVG icon. A
  group's marker is a chevron that turns when it opens, groups the reader opens
  or closes stay so for the browser session, and the current page is scrolled
  into the sidebar's view. `Sidebar` takes the `storage` prefix.
- `Contents` takes `tree`: headings nest in collapsible branches that open as
  the reader reaches them, and the label collapses the panel.
- Fixed: `Page` adds a sidebar or rail column only when its slot renders
  something, so a slot filled conditionally no longer leaves an empty column.
- Fixed: the header's buttons are 32 pixels square, and the sidebar and
  contents rows use the body's line height.

## 0.2.0 (2026-10-22)

- Interactive components as Vue components on Reka UI, with `vue` and
  `reka-ui` as optional peer dependencies. The first is `Search`, which queries
  a live endpoint; `SearchResult` describes its answers.
- Each release tag that passes the checks gets a GitHub release page whose
  notes are its section of this changelog.

## 0.1.0 (2026-10-21)

- The page shell as Astro components: `ThemeScript`, `Header`, `ThemeSwitch`,
  `Page`, `Sidebar` and `Contents`.
- Components and the shell are styled with Tailwind utilities; quire requires
  Tailwind. Rendered Markdown keeps its `quire-` reading classes.
- Design tokens written once as `light-dark()`, the Tailwind theme over them,
  and the reading styles for rendered Markdown.
- An Astro integration that adds Tailwind and dual-theme code highlighting.
- Sites install a release from this repository with a `#semver:` range;
  releases are tags cut with `npm run release`.
