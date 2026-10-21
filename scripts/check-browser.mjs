// Check the built example in a real browser: both themes and the system scheme,
// highlighted code, the page shell at desktop and phone widths, a table that
// scrolls in its frame, a targeted source line and reduced motion.
//
// CHROMIUM names a Chromium binary to use; without it Playwright uses its own,
// which `npx playwright install chromium` downloads.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const site = new URL('../examples/basic/dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = createServer((request, response) => {
  let path = join(site, decodeURIComponent(new URL(request.url, 'http://x').pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!path.startsWith(site) || !existsSync(path)) return response.writeHead(404).end();
  response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(response);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const problems = [];
const expect = (what, actual, wanted) => {
  if (actual !== wanted) problems.push(`${what}: got ${JSON.stringify(actual)}, want ${JSON.stringify(wanted)}`);
};

async function open({ width = 1280, scheme = 'light', theme, motion = 'no-preference', hash = '' }) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: motion });
  await page.goto(`${base}/guide/${hash}`);
  if (theme) await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
  return page;
}
const style = (page, selector, property, pseudo = null) =>
  page.$eval(selector, (element, [name, part]) => getComputedStyle(element, part).getPropertyValue(name), [property, pseudo]);

// Themes: a pinned theme wins over the system scheme; without one the system decides.
for (const [label, options, background] of [
  ['light theme on a dark system', { scheme: 'dark', theme: 'light' }, 'rgb(252, 252, 252)'],
  ['dark theme on a light system', { scheme: 'light', theme: 'dark' }, 'rgb(10, 10, 10)'],
  ['no theme on a dark system', { scheme: 'dark' }, 'rgb(10, 10, 10)'],
  ['no theme on a light system', { scheme: 'light' }, 'rgb(252, 252, 252)'],
]) {
  const page = await open(options);
  expect(`${label}: page background`, await style(page, 'html', 'background-color'), background);
  await page.close();
}

// Highlighted code follows the scheme, whether pinned or from the system.
const codeColour = async (options) => {
  const page = await open(options);
  // A token whose two themes differ; a comment, for one, is grey in both.
  const colour = await page.$$eval('.quire-prose pre.astro-code span[style]', (spans) => {
    const value = (span, name) => span.getAttribute('style').match(new RegExp(`(?:^|;)${name}:([^;]+)`))?.[1].toLowerCase();
    const token = spans.find((span) => value(span, '--shiki-dark') && value(span, 'color') !== value(span, '--shiki-dark'));
    return token ? getComputedStyle(token).color : null;
  });
  if (colour === null) problems.push('the example has no code token whose themes differ');
  await page.close();
  return colour;
};
const lightCode = await codeColour({ theme: 'light' });
if (lightCode === (await codeColour({ theme: 'dark' }))) problems.push('code keeps its light colours in the dark theme');
if (lightCode === (await codeColour({ scheme: 'dark' }))) problems.push('code keeps its light colours on a dark system');

// The shell: sidebar and rail in the grid on a desktop, off the page on a phone.
const desktop = await open({ width: 1280 });
expect('desktop sidebar position', await style(desktop, '.quire-sidebar', 'position'), 'sticky');
expect('desktop rail display', await style(desktop, '.quire-rail', 'display'), 'block');
await desktop.close();

const phone = await open({ width: 375 });
const sidebar = await phone.$eval('.quire-sidebar', (element) => element.getBoundingClientRect().right);
if (sidebar > 0) problems.push(`phone sidebar is on the page (right edge ${sidebar}px)`);
expect('phone rail display', await style(phone, '.quire-rail', 'display'), 'none');
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (overflow > 0) problems.push(`the phone page is ${overflow}px wider than the screen`);
expect('table scrolls in its frame', await style(phone, '.quire-prose table', 'overflow-x'), 'auto');
await phone.evaluate(() => document.documentElement.setAttribute('data-sidebar-open', ''));
// The sidebar slides in; measure once the slide has finished.
await phone.waitForFunction(() => document.querySelector('.quire-sidebar').getAnimations().length === 0);
const opened = await phone.$eval('.quire-sidebar', (element) => element.getBoundingClientRect().left);
expect('phone sidebar opens at the left edge', opened, 0);
expect('phone scrim shows behind the open sidebar', await style(phone, '.quire-scrim', 'display'), 'block');
await phone.close();

// A linked source line is highlighted and numbered.
const source = await open({ theme: 'light', hash: '#L2' });
expect('targeted source line', await style(source, '#L2', 'background-color'), 'rgb(238, 242, 255)');
expect('source line number', await style(source, '#L2', 'content', '::before'), 'counter(line)');
await source.close();

const still = await open({ width: 375, motion: 'reduce' });
expect('sidebar under reduced motion', await style(still, '.quire-sidebar', 'transition-duration'), '0s');
await still.close();

await browser.close();
server.close();
if (problems.length) {
  for (const problem of problems) console.error(`check-browser: ${problem}`);
  process.exit(1);
}
console.log('check-browser: themes, code, shell, tables and source lines ok');
