# quire

A documentation-agnostic shell for reading Markdown sites built with
[Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).
quire knows nothing about the project it presents. A site supplies its own
content and pages, and quire supplies the theme, the integration and, later,
the layouts and reading components.

quire is an independent project, not affiliated with or endorsed by Astro.

## Status

Early. The package holds the design tokens, the Tailwind theme that reads them
and an integration that wires Tailwind into the build. Layouts, navigation,
search and the reading components follow.

## Use

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
background, then follow the tokens.

## Theming

`styles/tokens.css` is the only place colours, fonts and layout sizes are
defined. Every colour is written once as `light-dark(light, dark)`:

- a page that sets `data-theme="light"` or `data-theme="dark"` on `<html>` pins
  that scheme;
- a page without it follows the reader's system setting.

A self-contained export therefore needs no second dark palette. To re-theme a
site, override the `--quire-*` properties; don't restyle the rules that use
them. A stylesheet that can't run Tailwind, such as one embedded in an offline
export, can import `@d0ssant0s/quire/tokens.css` alone.

## Develop

The repository is an npm workspace: `packages/quire` is the published package
and `examples/basic` is a site that consumes it.

```sh
mise install
mise exec -- npm install
mise exec -- npm run check
```

`check` builds the example and verifies that every colour token is defined
once as `light-dark()`, that the theme reads only declared tokens, and that
Tailwind generates the utilities the example uses and no others. It also packs
the package and verifies that it ships `LICENSE` and `THIRD-PARTY-NOTICES.md`.

## License

MIT, copyright d0ssant0s; see [LICENSE](LICENSE). The colour palette is
adapted from [t3code](https://github.com/pingdotgg/t3code) (MIT, T3 Tools
Inc.); [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) reproduces its notice.
The package ships both files, and `packages/quire` holds the copies npm
publishes, which `check` keeps identical to the ones here.
