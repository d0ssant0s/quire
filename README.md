# quire

The look and feel and the components for technical-documentation sites built
with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).
quire knows nothing about the project it presents. A site supplies its own
content, pages and data, and quire supplies the theme, the reading styles, the
page shell and its components.

quire is an independent project, not affiliated with or endorsed by Astro.

## Status

Early. The package holds the design tokens, the reading styles for rendered
Markdown, the Tailwind theme over them, the page shell as Astro components, and
an integration that wires Tailwind and dual-theme code highlighting into the
build. Interactive components such as search follow; #3 decides how they are
built.

## Use

A site installs a released version straight from this repository. Each
release is a tag, listed in [CHANGELOG.md](CHANGELOG.md); before 1.0, a minor
version marks a breaking change, so a range such as `^0.1.0` takes fixes and
additions but no breaking release:

```json
{
  "dependencies": {
    "@d0ssant0s/quire": "git+https://github.com/d0ssant0s/quire.git#semver:^0.1.0"
  }
}
```

The site's lockfile records the exact commit, and `npm update
@d0ssant0s/quire` moves it to the newest release in the range. To work on
quire and a site together, `npm link` the site to a local clone; link nothing a
site releases.

Registry publication is prohibited unless the maintainer explicitly lifts this
restriction. The package sets `private: true` to make npm refuse publication.
Do not add registry publishing workflows or credentials; a tag in this
repository is not a registry release.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import quire from '@d0ssant0s/quire';

export default defineConfig({ integrations: [quire()] });
```

```css
/* the site's stylesheet */
@import 'tailwindcss';
@import '@d0ssant0s/quire/theme.css';
```

Utilities such as `bg-surface`, `text-muted`, `border-line` and the status
tones `ok`, `warn`, `danger`, `info` and `neutral`, each with a `-soft`
background, then follow the tokens. quire requires Tailwind: its components are
styled with utilities, and `theme.css` names their sources for class detection.

## Components

```astro
---
import Contents from '@d0ssant0s/quire/components/Contents.astro';
import Header from '@d0ssant0s/quire/components/Header.astro';
import Page from '@d0ssant0s/quire/components/Page.astro';
import Sidebar from '@d0ssant0s/quire/components/Sidebar.astro';
import ThemeScript from '@d0ssant0s/quire/components/ThemeScript.astro';
---
<html lang="en">
  <head>
    <ThemeScript />
  </head>
  <body>
    <Header menu><a href="/">My docs</a></Header>
    <Page>
      <Sidebar slot="sidebar" items={sections} current={Astro.url.pathname} />
      <article class="quire-prose"><slot /></article>
      <Contents slot="rail" headings={headings} />
    </Page>
  </body>
</html>
```

| Component | What it does |
| --- | --- |
| `ThemeScript` | Restores the reader's theme and collapsed sidebar before first paint; put it in `<head>` |
| `Header` | The sticky header: a menu button when `menu` is set, the default slot for the site's name and links, an `end` slot for controls such as search, and the theme switch |
| `ThemeSwitch` | Steps through the system scheme, light and dark, and remembers a pinned choice; the header includes it |
| `Page` | The grid: a `sidebar` slot, the article, and a `rail` slot that appears once there is room; `wide` gives the article the whole width |
| `Sidebar` | Section navigation from a tree of `NavItem` links and groups, marking the current page |
| `Contents` | The page's headings, from Astro's Markdown headings, marking the one being read |

`ThemeScript`, `Header` and `ThemeSwitch` take a `storage` prefix for their
`localStorage` keys, `<storage>-theme` and `<storage>-sidebar`; the default is
`quire`. The menu button and the theme switch are small scripts in their
components and need no framework.

On the root element, `data-theme` pins the scheme, `data-sidebar-open` shows
the sidebar on a phone and `data-sidebar-collapsed` hides it on a desktop. The
variants `sidebar-open:`, `sidebar-collapsed:`, `theme-system:`, `theme-light:`
and `theme-dark:` style a site's own elements by those states.

## Reading classes

Rendered Markdown has no element to put a utility on, so its styles are classes
in `prose.css`. Each starts with `quire-`, so it can't collide with a site's
own classes or another library's, such as Tailwind's `prose`.

| Class | Put it on |
| --- | --- |
| `quire-prose` | The element holding rendered Markdown |
| `quire-doc-meta`, `quire-doc-status` | A document's facts line and its status |
| `quire-page-origin` | A note naming the page's source |
| `quire-source-view`, `quire-source-line` | A file shown verbatim, one element per line, linkable as `#L<n>` |
| `quire-source-text` | Free text kept as written, in a `<pre>` |
| `quire-accordion` | A `<details>` whose summary is a heading |
| `quire-figure` | A diagram the browser draws |

## Theming

`styles/tokens.css` is the only place colours, fonts and layout sizes are
defined. Every colour is written once as `light-dark(light, dark)`:

- a page that sets `data-theme="light"` or `data-theme="dark"` on `<html>` pins
  that scheme;
- a page without it follows the reader's system setting.

A page without a theme switch therefore needs no second dark palette. To
re-theme a site, override the `--quire-*` properties; don't restyle the rules
or utilities that use them. A component also takes a `class` for adjustments
of its own.

## Develop

The package is the repository root, and `examples/basic` is a workspace site
that consumes it.

```sh
mise install
mise exec -- npm install
mise exec -- npm run setup:hooks
mise exec -- npm run check
```

`check` builds the example and verifies that every colour token is defined
once as `light-dark()`, that the theme reads only declared tokens, and that
Tailwind generates the utilities the example uses and no others. It also
refuses a reading class without the `quire-` prefix and a component colour
that bypasses the tokens, packs the package and verifies that it ships `LICENSE`
and `THIRD-PARTY-NOTICES.md` and none of the repository's tooling.
It checks public files for private tracker references. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the commit hook and optional external
deny-list.

`check:browser` opens the example in Chromium and checks both themes and the
system scheme, highlighted code, the shell at desktop and phone widths, the
menu button on both, the theme switch and what it remembers, the current-page
mark and the contents rail, tables scrolling in their frame, a linked source
line and reduced motion:

```sh
mise exec -- npx playwright install chromium   # once; or set CHROMIUM=/path/to/chromium
mise exec -- npm run check:browser
```

CI runs both checks on every push to `main`, every pull request and every
release tag, and refuses a tag that does not match the package version.

## Release

Add the changes under `## Unreleased` in CHANGELOG.md as they merge. To cut a
release from a clean, current `main`:

```sh
mise exec -- npm run release -- 0.2.0
git push origin main v0.2.0
```

The script runs the checks, sets the version, dates the changelog entries,
commits and tags. Pushing is the separate step that makes the release
available.

## License

MIT, copyright d0ssant0s; see [LICENSE](LICENSE). The colour palette is
adapted from [t3code](https://github.com/pingdotgg/t3code) (MIT, T3 Tools
Inc.); [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) reproduces its notice.
The package ships both files, which `check` verifies.
