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
expect('desktop shell has three columns', await desktop.$eval('[data-quire-shell]', (shell) => getComputedStyle(shell).gridTemplateColumns.split(' ').length), 3);
expect('desktop sidebar position', await style(desktop, '[data-quire-sidebar]', 'position'), 'sticky');
expect('desktop rail display', await style(desktop, '[data-quire-rail]', 'display'), 'block');
await desktop.close();

const phone = await open({ width: 375 });
const sidebar = await phone.$eval('[data-quire-sidebar]', (element) => element.getBoundingClientRect().right);
if (sidebar > 0) problems.push(`phone sidebar is on the page (right edge ${sidebar}px)`);
expect('phone rail display', await style(phone, '[data-quire-rail]', 'display'), 'none');
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (overflow > 0) problems.push(`the phone page is ${overflow}px wider than the screen`);
expect('table scrolls in its frame', await style(phone, '.quire-prose table', 'overflow-x'), 'auto');
await phone.evaluate(() => document.documentElement.setAttribute('data-sidebar-open', ''));
// The sidebar slides in; measure once the slide has finished.
await phone.waitForFunction(() => document.querySelector('[data-quire-sidebar]').getAnimations().length === 0);
const opened = await phone.$eval('[data-quire-sidebar]', (element) => element.getBoundingClientRect().left);
expect('phone sidebar opens at the left edge', opened, 0);
expect('phone scrim shows behind the open sidebar', await style(phone, '[data-quire-scrim]', 'display'), 'block');
await phone.close();

// A linked source line is highlighted and numbered.
const source = await open({ theme: 'light', hash: '#L2' });
expect('targeted source line', await style(source, '#L2', 'background-color'), 'rgb(238, 242, 255)');
expect('source line number', await style(source, '#L2', 'content', '::before'), 'counter(line)');
await source.close();

const still = await open({ width: 375, motion: 'reduce' });
expect('sidebar under reduced motion', await style(still, '[data-quire-sidebar]', 'transition-duration'), '0s');
await still.close();

// The menu button collapses the sidebar on a desktop, and remembers it.
const menu = await open({ width: 1280 });
const attribute = (page, name) => page.evaluate((value) => document.documentElement.hasAttribute(value), name);
expect('desktop menu starts expanded', await menu.getAttribute('[data-quire-menu]', 'aria-expanded'), 'true');
await menu.click('[data-quire-menu]');
expect('desktop menu collapses the sidebar', await style(menu, '[data-quire-sidebar]', 'display'), 'none');
const columns = (page) => page.$eval('[data-quire-shell]', (shell) => getComputedStyle(shell).gridTemplateColumns.split(' ').length);
expect('collapsed shell keeps the article and the rail', await columns(menu), 2);
expect('collapsed menu is not expanded', await menu.getAttribute('[data-quire-menu]', 'aria-expanded'), 'false');
await menu.reload();
expect('collapsed sidebar is remembered', await attribute(menu, 'data-sidebar-collapsed'), true);
expect('remembered menu is not expanded', await menu.getAttribute('[data-quire-menu]', 'aria-expanded'), 'false');
await menu.click('[data-quire-menu]');
expect('desktop menu restores the sidebar', await style(menu, '[data-quire-sidebar]', 'display'), 'block');
await menu.close();

// On a phone it slides the sidebar over the page; Escape and the scrim close it.
const drawer = await open({ width: 375, motion: 'reduce' });
await drawer.click('[data-quire-menu]');
expect('phone menu opens the sidebar', await attribute(drawer, 'data-sidebar-open'), true);
expect('open menu is expanded', await drawer.getAttribute('[data-quire-menu]', 'aria-expanded'), 'true');
await drawer.keyboard.press('Escape');
expect('Escape closes the sidebar', await attribute(drawer, 'data-sidebar-open'), false);
expect('Escape returns focus to the menu', await drawer.evaluate(() => document.activeElement?.hasAttribute('data-quire-menu')), true);
await drawer.click('[data-quire-menu]');
await drawer.mouse.click(360, 400);
expect('the scrim closes the sidebar', await attribute(drawer, 'data-sidebar-open'), false);
await drawer.close();

// The theme switch steps through the system scheme, light and dark, and
// remembers a pinned choice.
const themed = await open({ scheme: 'dark' });
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme ?? null);
const icon = (page) => page.$$eval('[data-theme-icon]', (icons) => icons.filter((element) => getComputedStyle(element).display !== 'none').map((element) => element.dataset.themeIcon).join());
expect('theme starts from the system', await theme(themed), null);
expect('system theme icon', await icon(themed), 'system');
expect('system theme label', await themed.getAttribute('[data-quire-theme]', 'aria-label'), 'Theme: system. Switch to light');
await themed.click('[data-quire-theme]');
expect('switch pins light', await theme(themed), 'light');
expect('pinned light on a dark system', await style(themed, 'html', 'background-color'), 'rgb(252, 252, 252)');
expect('light theme icon', await icon(themed), 'light');
await themed.reload();
expect('pinned light is remembered', await theme(themed), 'light');
await themed.click('[data-quire-theme]');
expect('switch pins dark', await theme(themed), 'dark');
await themed.click('[data-quire-theme]');
expect('switch returns to the system', await theme(themed), null);
await themed.reload();
expect('the system choice is remembered', await theme(themed), null);
await themed.close();

// The sidebar marks the current page; the rail lists the page's headings and
// marks the one being read.
const reading = await open({ width: 1440 });
expect('current page link', await reading.$eval('[data-quire-nav] [aria-current=page]', (link) => link.getAttribute('href')), '/guide/');
expect('the group holding the current page is open', await reading.$eval('[data-quire-nav] [aria-current=page]', (link) => link.closest('details')?.open), true);
const listed = await reading.$$eval('[data-quire-contents] a', (links) => links.map((link) => link.hash.slice(1)));
const headings = await reading.$$eval('.quire-prose :is(h2, h3)[id]', (elements) => elements.map((element) => element.id));
expect('contents lists the headings', listed.join(), headings.join());
if (listed.length < 2) problems.push('the example needs two headings to check the contents marker');
else {
  await reading.evaluate((id) => {
    document.getElementById(id).scrollIntoView();
    dispatchEvent(new Event('scroll'));
  }, listed[1]);
  expect('contents marks the heading being read', await reading.$eval('[data-quire-contents] a[aria-current=true]', (link) => link.hash.slice(1)), listed[1]);
}
await reading.close();

await browser.close();
server.close();
if (problems.length) {
  for (const problem of problems) console.error(`check-browser: ${problem}`);
  process.exit(1);
}
console.log('check-browser: themes, code, shell, menu, theme switch, contents, tables and source lines ok');
