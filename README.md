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
import NarrowContents from '@d0ssant0s/quire/components/NarrowContents.astro';
import Page from '@d0ssant0s/quire/components/Page.astro';
import Sidebar from '@d0ssant0s/quire/components/Sidebar.astro';
import ThemeScript from '@d0ssant0s/quire/components/ThemeScript.astro';
---
<html lang="en">
  <head>
    <ThemeScript />
  </head>
  <body>
    <Page>
      <Header slot="header" menu><a href="/" data-quire-brand>My docs</a></Header>
      <a slot="brand" href="/">My docs</a>
      <Sidebar slot="sidebar" items={sections} current={Astro.url.pathname} />
      <NarrowContents headings={headings} />
      <article class="quire-prose"><slot /></article>
      <Contents slot="rail" headings={headings} />
    </Page>
  </body>
</html>
```

| Component | What it does |
| --- | --- |
| `ThemeScript` | Restores the reader's theme and collapsed sidebar before first paint; put it in `<head>` |
| `Header` | The sticky header: a menu button when `menu` is set, the default slot for the site's name and links, an `end` slot for controls such as search, and the theme switch. It starts with a skip link to `<main>`, the first stop for a keyboard (`skip` sets its text, `false` drops it; `skipTo` names the target id, default `quire-main`) |
| `SkipLink` | The skip link on its own (`text`, `target`), for a site without `Header`; put it first in `<body>` |
| `ThemeSwitch` | Steps through the system scheme, light and dark, and remembers a pinned choice; the header includes it |
| `Page` | The grid: a `sidebar` slot, the article, and a `rail` slot that appears once there is room; `wide` gives the article the whole width. `main` passes attributes to `<main>`, whose id defaults to `quire-main`. A `Header` in the `header` slot is framed, and a `brand` slot heads the sidebar; see below |
| `Sidebar` | Section navigation from a tree of `NavItem` links and groups, marking the current page and scrolling it into view; groups the reader opens or closes stay so for the browser session |
| `Contents` | The page's headings, from Astro's Markdown headings, marking the one being read; `tree` nests them in branches that open as the reader reaches them, for long pages |
| `NarrowContents` | The same headings in a compact disclosure for the top of the article, shown only below the width where the rail appears; a choice or Escape closes it. Give it the rail's `minDepth` and `maxDepth` |
| `ArticleControls` | Copy buttons on the articles a site selects: a heading's address and a code block's exact text, announced through a polite status region |

A group `NavItem`, and the `Sidebar` label through its `icon` prop, can carry
an icon: the markup of one `<svg>` element, drawn before the label in the
text's colour. Page links draw no icon; they start where the group labels'
text starts. quire ships no icon set, and the markup is inserted as written, so
it must come from the site's build.

The sidebar and the contents rail share one row style: one line of 14px text
in a 32 px row. A title too long for its row ends in an ellipsis and stays
whole in the link's `title` and accessible name. The rail's contents sit in a
card.

A `Header` in `Page`'s `header` slot is framed. On a desktop the sidebar
fills the window's height on its own surface (`--quire-sidebar`) with an edge
on its right, and the header starts at that edge, so the page reads as two
panes. The `brand` slot, usually the site's name, heads the sidebar there; the
header's element marked `data-quire-brand` steps aside while the sidebar shows
the name. Collapsing the sidebar gives the header its full width and its name
back. On a phone the header spans the window and the sidebar slides in beneath
it. A `Header` placed before `Page` instead spans the window above the shell.
The header draws no bottom edge in either case: the page beneath it has the
same background.

`ThemeScript`, `Header`, `ThemeSwitch` and `Sidebar` take a `storage` prefix
for their browser storage keys, `<storage>-theme`, `<storage>-sidebar` and
`<storage>-nav-groups`; the default is `quire`. The menu button, the theme
switch and the navigation's scripts are small scripts in their components and
need no framework.

On a narrow screen the closed sidebar is hidden, so its links are out of the
tab order. Opening it moves focus to the current page's link. Closing it with
Escape, the scrim or the menu button returns focus to the menu button.

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
| `Search` | A search dialog opened from the header, with Ctrl+K or ⌘K, or by the site's own code. Its answers come from an `endpoint` or a `source` function |

### Search

| Prop | |
| --- | --- |
| `endpoint` | A URL. quire asks `<endpoint>?q=<query>`, adding `&filter=<name>` when a filter is chosen, and the endpoint answers `{ "results": SearchResult[], "filters"?: SearchFilter[] }` |
| `source` | A function `(query, { signal, filter }) => Promise<SearchAnswer>`, used instead of `endpoint`. See below |
| `label`, `placeholder` | The button's and the field's text; the label also names the field for screen readers |
| `minLength` | Characters a query needs before it is asked. Default 2 |
| `delay` | Milliseconds of quiet typing before a query is asked. Default 150 |
| `shortcuts` | The keys that open the dialog, a list of `'mod+k'` (Ctrl or ⌘ with K) and `'/'`. Default `['mod+k']`. `[]` has none, and the first one is shown on the button |
| `trigger` | Whether to show the built-in button. Default `true` |
| `v-model:open` | Whether the dialog is open. Default `false` |
| `v-model:query` | The text in the field. Default `''` |

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
when one is chosen, and an empty answer. A source that returns fewer results
than its counts say it holds, because it caps them, is announced with both:
"30 of 69 results", matching the count on the filter. A failure is an alert with a Retry
button, and the field is `aria-busy` while a query is out.

**Driving it from the site.** A site's own buttons, links and keys can open
the dialog and fill it, because `open` and `query` are models (`defineModel`).
Both work without `v-model` too. Setting `query` runs the search at once, with
no typing pause, through the same cancellation: a slow answer to an earlier
query is dropped, and setting `''` clears the results and cancels the request.
Typing still waits `delay`, and the model follows what the reader types. Set
`open` and `query` together to open the dialog with a query already searched. A
query set while the dialog is closed is asked when it opens.

`shortcuts` adds the `/` key. It is ignored while the reader is typing in an
`input`, `textarea`, `select` or contenteditable element, with Ctrl, ⌘ or Alt
held, and while the dialog is open. To use your own button instead of the
built-in one, set `:trigger="false"`, or put it in the `trigger` slot, where
it becomes the dialog's trigger (give it one element, such as a `button`).
Focus returns to the element that had it when the dialog opened, or to the
trigger.

A page in Astro hydrates one wrapper, which listens for the buttons outside the
island (here marked `data-search-open`) and for a deep link, since a URL
parameter is the site's business:

```vue
<!-- src/components/DrivenSearch.vue -->
<script setup lang="ts">
import Search from '@d0ssant0s/quire/vue/Search.vue';
import { pagefindSource } from '@d0ssant0s/quire/search';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const source = pagefindSource('/pagefind/');
const open = ref(false);
const query = ref('');

const opener = (event: MouseEvent) => {
  if (event.target instanceof Element && event.target.closest('[data-search-open]')) open.value = true;
};
onMounted(() => {
  document.addEventListener('click', opener);
  const term = new URLSearchParams(location.search).get('search');
  if (term) {
    query.value = term;
    open.value = true;
  }
});
onBeforeUnmount(() => document.removeEventListener('click', opener));
</script>

<template>
  <Search v-model:open="open" v-model:query="query" :source="source" :shortcuts="['mod+k', '/']" :trigger="false" />
</template>
```

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

### Glossary

Two components for a site with a glossary page. Both are Vue islands; the term
marking, the glossary data and loading the dialog on demand stay with the site.

**`GlossaryFilter`** (`@d0ssant0s/quire/vue/GlossaryFilter.vue`) adds controls
to a glossary article the site renders statically: `h2` sections, each holding
`h3` terms, each followed by its definition. Without script the article is
plain and fully indexed. With it, sections and terms fold into native
`<details>` (styled by `quire-accordion`), and the controls appear: a field
that keeps the terms containing every typed word in their name, definition or
avoid list, a count, a no-match message with a way back, Clear (or Escape), and
expand all and collapse all for the terms showing. A link to a hidden term, on
load or later, lifts the filter, opens what holds the term and scrolls to it.
Printing opens and shows every term, and restores the reader's view after.

```astro
<GlossaryFilter client:load />
<article class="quire-prose" data-quire-glossary><Content /></article>
```

| Prop | |
| --- | --- |
| `article` | CSS selector of the article. Default `[data-quire-glossary]` |
| `label`, `placeholder` | The field's label and placeholder |

**`GlossaryDefinition`** (`@d0ssant0s/quire/vue/GlossaryDefinition.vue`) shows
a `GlossaryEntry` (`term`, `anchor`, `definition` and optional `avoid`, both
rendered HTML that the site has made safe) in a modal dialog, with a link to
`<url>#<anchor>` in the full glossary, in a new tab if that is another origin.
The title and Close stay above the definition, which scrolls. Focus goes to
Close on opening and returns afterwards to what had it, or to `trigger`.

| Prop | |
| --- | --- |
| `entry` | The `GlossaryEntry` to show; `null` keeps the dialog closed |
| `url` | Where the full glossary is, without a fragment |
| `trigger` | Optional element to focus on closing, when it is not the one that had focus on opening |

It emits `close` on Close, Escape or a click outside; the site then sets
`entry` to `null`.

```vue
<GlossaryDefinition :entry="entry" url="/glossary/" @close="entry = null" />
```

## Article controls

`ArticleControls` adds a button to each heading that has an `id`, copying that
heading's address, and one to each highlighted code block, copying its text as
written. The site chooses where: put the component on the pages that should
have the controls, once per page, and name the articles with `selector`
(default `article.quire-prose`). A page that leaves it out, such as an
accordion or a portable export, is untouched.

```astro
<ArticleControls selector="article.quire-prose:not([data-accordion])" />
```

The buttons are added by a small script, so the served HTML, the search index
and a reader without scripting see the article as built. Hovering or focusing
a heading or block shows its button, and touch screens always show it. Every
outcome is announced through a polite status region (`Link to section Setup
copied.`, `Code copied.`) and shown on the button for a moment. Where the async
clipboard is absent, as on plain HTTP, the text is copied by selection. When
the browser refuses, the announcement says what is left to do and leaves it in
place: the heading's address in the address bar, or the code selected. Labels
come from the heading's and the language's text and are set as text. Headings
inside a `<details>`, and anything inside an island or an element with
`data-quire-no-controls`, get no control.

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
mark and the contents rail, the copy controls, tables scrolling in their frame, a linked source
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
