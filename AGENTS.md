<!-- se-managed:start -->
## Working here

Understand the requested behavior, build the smallest working slice, run the relevant checks, and report the result.
Plan, write an ADR, track an issue, or ask for independent review only when the change gives a concrete reason.

- Run the example: `mise exec -- npm --workspace examples/basic run dev`.
- Check references, build, styles, and package licensing: `mise exec -- npm run check`.
- Check browser behavior: `mise exec -- npm run check:browser`; set `CHROMIUM=/usr/bin/chromium` to use the installed system browser if Playwright's browser is absent.
- The package is the repository root: `src/` owns the Astro integration and the page-shell components, `styles/` the CSS tokens, Tailwind theme and reading styles. Releases are tags cut with `npm run release`; see README.md.
- Registry publication is prohibited. Keep the package private; sites install tagged releases from Git, as `README.md` describes.
- `examples/basic/` owns the consuming Astro site and demonstration pages.
- `scripts/` owns reference, style, package-license, and browser checks, and hook setup.
- `README.md` describes current behavior and identifies planned features; no domain glossary, design notes, or ADR directory exists yet.
- Small changes go straight to implementation. For coordination, dependencies, or a durable queue, use the [issue tracker](docs/agents/issue-tracker.md).
- Standards: `se-standards` profile `shared`; no language profile applies to TypeScript, JavaScript, Astro, or CSS.
<!-- se-managed:end -->
