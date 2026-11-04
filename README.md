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
build, and the first interactive component, a live search.

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
| `Sidebar` | Section navigation from a tree of `NavItem` links and groups, marking the current page and scrolling it into view; groups the reader opens or closes stay so for the browser session |
| `Contents` | The page's headings, from Astro's Markdown headings, marking the one being read; `tree` nests them in branches that open as the reader reaches them, for long pages |

A `NavItem`, and the `Sidebar` label through its `icon` prop, can carry an
icon: the markup of one `<svg>` element, drawn before the label in the text's
colour. quire ships no icon set, and the markup is inserted as written, so it
must come from the site's build.

`ThemeScript`, `Header`, `ThemeSwitch` and `Sidebar` take a `storage` prefix
for their browser storage keys, `<storage>-theme`, `<storage>-sidebar` and
`<storage>-nav-groups`; the default is `quire`. The menu button, the theme
switch and the navigation's scripts are small scripts in their components and
need no framework.

On the root element, `data-theme` pins the scheme, `data-sidebar-open` shows
the sidebar on a phone and `data-sidebar-collapsed` hides it on a desktop. The
variants `sidebar-open:`, `sidebar-collapsed:`, `theme-system:`, `theme-light:`
and `theme-dark:` style a site's own elements by those states.

## Interactive components

Interactive components are Vue single-file components under `src/vue/`, built
on [Reka UI](https://reka-ui.com) and styled from the tokens. quire ships them
as source, which the site's build compiles, so every island on a page shares
one Vue runtime and the site's Tailwind sees their classes. quire installs
`vue`, `reka-ui` and `@astrojs/vue` at the versions its release is tested with;
a site doesn't pin them itself. A site that uses a component turns on Vue with
the integration's option:

```js
// astro.config.mjs
export default defineConfig({ integrations: [quire({ vue: true })] });
```

and hydrates the component with a `client:` directive:

```astro
---
import Search from '@d0ssant0s/quire/vue/Search.vue';
---
<Header menu>
  <a href="/">Site</a>
  <Search slot="end" client:idle endpoint="/api/search" />
</Header>
```

quire imports `@astrojs/vue` either way, but adds the integration only when
the option is set. Without it, a site has no Vue in its build and its pages
ship none.

A component that reads live data takes an endpoint URL, or, from the site's own
Vue code, a source function, and shows waiting, empty and failed states. An
Astro page can pass a hydrated component only serialisable props, so a function
never crosses that boundary: the page hydrates a small Vue component of the
site's, which passes the function to quire's.

| Component | What it does |
| --- | --- |
| `Search` | A search dialog opened from the header or with Ctrl+K or ⌘K. Its answers come from an `endpoint` or a `source` function |

### Search

| Prop | |
| --- | --- |
| `endpoint` | A URL. quire asks `<endpoint>?q=<query>`, adding `&filter=<name>` when a filter is chosen, and the endpoint answers `{ "results": SearchResult[], "filters"?: SearchFilter[] }` |
| `source` | A function `(query, { signal, filter }) => Promise<SearchAnswer>`, used instead of `endpoint`. See below |
| `label`, `placeholder` | The button's and the field's text; the label also names the field for screen readers |
| `minLength` | Characters a query needs before it is asked. Default 2 |
| `delay` | Milliseconds of quiet typing before a query is asked. Default 150 |

A newer query, a cleared one or a closed dialog cancels the request in flight:
the `signal` is aborted, and quire drops the answer itself if it arrives
anyway, so a slow answer never replaces a later query's results or brings
results back after the query is cleared. quire also leaves out results that
lack a title or an `http` or `https` address, and treats an error, or a
malformed answer, as the failed state. A retry asks again with the same query
and the same filter.

`SearchResult`, `SearchFilter`, `SearchAnswer` and `SearchSource` are exported
as types. A result has a `title` and `url`, an optional `section`, a plain-text
`excerpt` and an optional `category`.

**Filters.** Results of a categorised index can be narrowed. An answer is either a
list of results, in which case quire offers one filter for each `category` the
results carry, counted from them and applied by hiding the other categories;
or `{ results, filters }`, where `filters` are `{ name, count }` for the whole
query whichever filter is chosen, and the source narrows the results itself
using the `filter` it is given. The chosen filter stays listed even when the
next query has none of it, and survives a retry.

**Screen readers.** The field is named by `label` and names the highlighted result
with `aria-activedescendant`. The results are a labelled listbox; the filters are
a labelled group of toggle buttons, each pressed or not, with its count. A status
region announces waiting (`Searching…`), the number of results, with the filter
when one is chosen, and an empty answer. A failure is an alert with a Retry
button, and the field is `aria-busy` while a query is out.

```vue
<!-- src/components/SiteSearch.vue -->
<script setup lang="ts">
import Search from '@d0ssant0s/quire/vue/Search.vue';
import { pagefindSource } from '@d0ssant0s/quire/search';

const source = pagefindSource('/pagefind/', { filter: 'type' });
</script>

<template>
  <Search :source="source" />
</template>
```

```astro
<SiteSearch slot="end" client:idle />
```

**`pagefindSource(base?, options?)`**, imported from `@d0ssant0s/quire/search`
(not from the package root, which is the Astro integration), adapts the
[Pagefind](https://pagefind.app) index in the directory `base`, `/pagefind/` by
default. quire does not depend on Pagefind: the helper loads `pagefind.js` from
your site when the first query runs, and tries again on a retry if that load
failed. A result's title and `section` come from the page's Pagefind
metadata, its excerpt as text with Pagefind's highlighting removed. Options:

| Option | |
| --- | --- |
| `filter` | The name of a Pagefind filter (`data-pagefind-filter="type"`). Its values become the results' categories and the filters, counted across the whole query as Pagefind counts them, and the chosen one narrows the search itself. Without it there are no filters |
| `limit` | Results loaded per query. Default 20 |
| `options` | Passed once to `pagefind.options()`, for `excerptLength`, `ranking` and the like |

A site that ranks results its own way, or promotes an exact match, writes its
own `SearchSource` and can call `pagefindSource` inside it.

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

The changelog is written from commit subjects, which follow
[Conventional Commits](https://www.conventionalcommits.org/):
`type(scope)!: summary`. CONTRIBUTING.md lists the types and the group each
lands in. `mise exec -- npm run changelog` shows the section the next release
would get. To cut a release from a clean, current `main`:

```sh
mise exec -- npm run release -- 0.3.0
git push origin main v0.3.0
```

The script refuses a commit since the previous release that isn't a
conventional commit, a release with nothing for the changelog, and a version
that doesn't mark a breaking change (a minor version before 1.0, a major one
after). It runs the checks, sets the version, writes the version's changelog
section, commits and tags. Pushing is the separate step that makes the release
available. Once the tag passes its checks in CI, CI creates the GitHub release
page, with the version's changelog section as its notes.

## License

MIT, copyright d0ssant0s; see [LICENSE](LICENSE). The colour palette is
adapted from [t3code](https://github.com/pingdotgg/t3code) (MIT, T3 Tools
Inc.); [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) reproduces its notice.
The package ships both files, which `check` verifies.
