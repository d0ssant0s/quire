# Changelog

Each release is a tag in this repository; sites install one as described in
the README. Before 1.0, a minor version marks a breaking change.

## Unreleased

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
