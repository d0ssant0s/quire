// Check the built example: every colour token is written once as light-dark(),
// every token Tailwind maps exists, and the utilities the example uses compiled.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const tokens = readFileSync(join(root, 'packages/quire/styles/tokens.css'), 'utf8');
const theme = readFileSync(join(root, 'packages/quire/styles/theme.css'), 'utf8');
const problems = [];

const declared = new Map();
for (const [, name, value] of tokens.matchAll(/(--quire-[a-z-]+):\s*([^;]+);/g)) {
  if (declared.has(name)) problems.push(`${name} is declared twice in tokens.css`);
  declared.set(name, value.trim());
}
const colours = [...declared].filter(([name]) => !/font|text-|header|measure|radius/.test(name));
for (const [name, value] of colours) {
  if (!value.startsWith('light-dark(')) problems.push(`${name} is not written as light-dark()`);
}
for (const [, name] of theme.matchAll(/var\((--quire-[a-z-]+)\)/g)) {
  if (!declared.has(name)) problems.push(`theme.css reads ${name}, which tokens.css does not declare`);
}

const assets = join(root, 'examples/basic/dist/_astro');
const css = readdirSync(assets)
  .filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(join(assets, file), 'utf8'))
  .join('\n');
if (!css.includes('light-dark(')) problems.push('the built CSS carries no light-dark() tokens');
for (const utility of ['bg-bg', 'text-muted', 'border-line', 'bg-danger-soft', 'text-accent']) {
  const selector = `.${utility}`;
  if (!css.includes(selector)) problems.push(`the built CSS has no ${selector} utility`);
}
// The example uses only some utilities; one it never names must not be generated,
// or class detection is scanning more than the site and the shell.
if (css.includes('.bg-info{')) problems.push('the built CSS carries .bg-info, which nothing uses');

if (problems.length) {
  for (const problem of problems) console.error(`check-tokens: ${problem}`);
  process.exit(1);
}
console.log(`check-tokens: ${declared.size} tokens, ${colours.length} colours, built CSS ok`);
