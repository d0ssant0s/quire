// Check the stylesheets and the built example: every colour token is written
// once as light-dark(), every token a stylesheet reads exists, every class the
// library styles carries its prefix, and the built site carries the styles.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const styles = join(root, 'packages/quire/styles');
const read = (file) => readFileSync(join(styles, file), 'utf8');
// Rules only: comments and the paths in @import and @source are not selectors.
const uncommented = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^@(import|source)\s[^;]*;/gm, '');
const problems = [];

const declared = new Map();
for (const [, name, value] of read('tokens.css').matchAll(/(--quire-[a-z-]+):\s*([^;]+);/g)) {
  if (declared.has(name)) problems.push(`${name} is declared twice in tokens.css`);
  declared.set(name, value.trim());
}
const colours = [...declared].filter(([name]) => !/font|text-|header|measure|radius/.test(name));
for (const [name, value] of colours) {
  if (!value.startsWith('light-dark(')) problems.push(`${name} is not written as light-dark()`);
}

// Shell states on the shell element, and the class Astro's highlighter writes.
const unprefixed = new Set(['has-sidebar', 'no-sidebar', 'has-rail', 'no-rail', 'is-wide', 'astro-code']);
for (const file of readdirSync(styles).filter((name) => name.endsWith('.css'))) {
  const css = uncommented(read(file));
  for (const [, name] of css.matchAll(/var\((--quire-[a-z-]+)\)/g)) {
    if (!declared.has(name)) problems.push(`${file} reads ${name}, which tokens.css does not declare`);
  }
  for (const [, name] of css.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
    if (!name.startsWith('quire-') && !unprefixed.has(name)) {
      problems.push(`${file} styles .${name}, which lacks the quire- prefix`);
    }
  }
}

const assets = join(root, 'examples/basic/dist/_astro');
const css = readdirSync(assets)
  .filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(join(assets, file), 'utf8'))
  .join('\n');
if (!css.includes('light-dark(')) problems.push('the built CSS carries no light-dark() tokens');
for (const selector of ['.bg-bg', '.text-muted', '.border-line', '.bg-danger-soft', '.text-accent', '.quire-prose', '.quire-shell', '.quire-source-line']) {
  if (!css.includes(selector)) problems.push(`the built CSS has no ${selector} rule`);
}
// The example uses only some utilities; one it never names must not be generated,
// or class detection is scanning more than the site and the shell.
if (css.includes('.bg-info{')) problems.push('the built CSS carries .bg-info, which nothing uses');

if (problems.length) {
  for (const problem of problems) console.error(`check-styles: ${problem}`);
  process.exit(1);
}
console.log(`check-styles: ${declared.size} tokens, ${colours.length} colours, built CSS ok`);
