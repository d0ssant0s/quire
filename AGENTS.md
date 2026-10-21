<!-- se-managed:start -->
## Working here

Understand the requested behavior, build the smallest working slice, run the relevant checks, and report the result.
Plan, write an ADR, track an issue, or ask for independent review only when the change gives a concrete reason.

- Run the example: `mise exec -- npm --workspace examples/basic run dev`.
- Check references, build, styles, and package licensing: `mise exec -- npm run check`.
- Check browser behavior: `mise exec -- npm run check:browser`; set `CHROMIUM=/usr/bin/chromium` to use the installed system browser if Playwright's browser is absent.
- `packages/quire/` owns the reusable Astro integration, the page-shell components, and the CSS tokens, Tailwind theme and reading styles.
- Registry publication is prohibited. Keep the package private and follow the restriction in `README.md`.
- `examples/basic/` owns the consuming Astro site and demonstration pages.
- `scripts/` owns reference, style, package-license, and browser checks, and hook setup.
- `README.md` describes current behavior and identifies planned features; no domain glossary, design notes, or ADR directory exists yet.
- Small changes go straight to implementation. For coordination, dependencies, or a durable queue, use the [issue tracker](docs/agents/issue-tracker.md).
- Standards: `se-standards` profile `shared`; no language profile applies to TypeScript, JavaScript, Astro, or CSS.
<!-- se-managed:end -->
