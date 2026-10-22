# Changelog

Each release is a tag in this repository; sites install one as described in
the README. Before 1.0, a minor version marks a breaking change.

`npm run release` writes each version's section from the conventional commits
since the previous release, grouped as Breaking changes, Features, Changed,
Fixed and Security; `npm run changelog` shows the next one. The release page
on GitHub carries the same section.

## 0.2.2 (2026-10-22)

### Features

- **vue:** install Vue with quire and turn it on with quire({ vue: true }) (#29)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.2.1...v0.2.2)

## 0.2.1 (2026-10-22)

### Features

- **sidebar:** navigation items and the `Sidebar` label take a site-supplied
  SVG icon. A group's marker is a chevron that turns when it opens, groups the
  reader opens or closes stay so for the browser session, and the current page
  is scrolled into the sidebar's view. `Sidebar` takes the `storage` prefix
  (#22, #24)
- **contents:** `Contents` takes `tree`: headings nest in collapsible branches
  that open as the reader reaches them, and the label collapses the panel
  (#23, #24)

### Fixed

- **page:** `Page` adds a sidebar or rail column only when its slot renders
  something, so a slot filled conditionally no longer leaves an empty column
  (#24)
- **header:** the header's buttons are 32 pixels square, and the sidebar and
  contents rows use the body's line height (#24)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.2.0...v0.2.1)

## 0.2.0 (2026-10-22)

### Features

- **vue:** interactive components as Vue components on Reka UI, with `vue` and
  `reka-ui` as optional peer dependencies. The first is `Search`, which queries
  a live endpoint; `SearchResult` describes its answers (#3, #21)
- **release:** each release tag that passes the checks gets a GitHub release
  page whose notes are its section of this changelog (#18, #20)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.1.0...v0.2.0)

## 0.1.0 (2026-10-21)

### Features

- **shell:** the page shell as Astro components: `ThemeScript`, `Header`,
  `ThemeSwitch`, `Page`, `Sidebar` and `Contents` (#2, #17)
- **shell:** components and the shell are styled with Tailwind utilities;
  quire requires Tailwind. Rendered Markdown keeps its `quire-` reading classes
  (#16, #17)
- **tokens:** design tokens written once as `light-dark()`, the Tailwind theme
  over them, and the reading styles for rendered Markdown
- **integration:** an Astro integration that adds Tailwind and dual-theme code
  highlighting
- **release:** sites install a release from this repository with a `#semver:`
  range; releases are tags cut with `npm run release` (#19)
