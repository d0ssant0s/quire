# Changelog

Each release is a tag in this repository; sites install one as described in
the README. Before 1.0, a minor version marks a breaking change.

`npm run release` writes each version's section from the conventional commits
since the previous release, grouped as Breaking changes, Features, Changed,
Fixed and Security; `npm run changelog` shows the next one. The release page
on GitHub carries the same section.

## 0.9.3 (2026-11-05)

### Fixed

- **scrollbars:** make vertical scrollbars thin and unobtrusive (#55)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.9.2...v0.9.3)

## 0.9.2 (2026-11-05)

### Fixed

- **page:** keep the sidebar and rail still when the article ends (#51) (#53)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.9.1...v0.9.2)

## 0.9.1 (2026-11-05)

### Fixed

- **page:** keep sidebar and rail scrolling from moving the article (#51) (#52)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.9.0...v0.9.1)

## 0.9.0 (2026-11-05)

### Features

- **sidebar:** leave the label to screen readers with heading={false} (#50)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.8.0...v0.9.0)

## 0.8.0 (2026-11-05)

### Features

- **page:** resize the sidebar and toggle it with a panel icon or Ctrl+B (#49)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.7.1...v0.8.0)

## 0.7.1 (2026-11-05)

### Fixed

- **page:** hide the header's name beside the sidebar whatever its display (#48)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.7.0...v0.7.1)

## 0.7.0 (2026-11-05)

### Features

- **page:** frame a header beside a full-height sidebar (#47)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.6.0...v0.7.0)

## 0.6.0 (2026-11-05)

### Breaking changes

- **header:** Page no longer takes `skip`. Set `skip` (text or `false`) on Header instead, and `skipTo` when <main> has an id other than `quire-main`.

[All commits](https://github.com/d0ssant0s/quire/compare/v0.5.0...v0.6.0)

## 0.5.0 (2026-11-05)

### Features

- **sidebar:** share one row style between the sidebar and the contents rail (#42)
- **page:** add narrow-screen contents, a skip link and sidebar focus handling (#44)
- **glossary:** add a glossary filter and a definition dialog (#40)
- **components:** add ArticleControls for heading links and code copy (#41)

### Fixed

- **search:** announce the total when a source caps its results (#38)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.4.0...v0.5.0)

## 0.4.0 (2026-11-04)

### Features

- **search:** let a site open it, preset a query and read its state (#34)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.3.0...v0.4.0)

## 0.3.0 (2026-11-04)

### Features

- **search:** take a source function, offer result filters, add pagefindSource (#32)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.2.3...v0.3.0)

## 0.2.3 (2026-11-04)

### Fixed

- **vue:** import @astrojs/vue statically so quire({ vue: true }) builds from node_modules (#31)

[All commits](https://github.com/d0ssant0s/quire/compare/v0.2.2...v0.2.3)

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
