// Check the built example in a real browser: both themes and the system scheme,
// highlighted code, the page shell at desktop and phone widths, the sidebar and
// contents tree, a table that scrolls in its frame, a targeted source line and
// reduced motion.
//
// CHROMIUM names a Chromium binary to use; without it Playwright uses its own,
// which `npx playwright install chromium` downloads.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const site = new URL('../examples/basic/dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
// A stand-in search endpoint: "fail" answers 500, a query starting "slow"
// answers late, and anything else matches titles and excerpts.
const documents = [
  { title: 'Home', url: '/', excerpt: 'The example site' },
  { title: 'Reading styles', url: '/guide/', section: 'Guide', excerpt: 'Lists, code and tables' },
  { title: 'Tables', url: '/guide/#tables', section: 'Guide', excerpt: 'Tables scroll in their frame' },
];
function search(request, response) {
  const query = new URL(request.url, 'http://x').searchParams.get('q') ?? '';
  if (query === 'fail') return response.writeHead(500).end();
  const slow = query.startsWith('slow');
  const answer = () => {
    const results = slow
      ? [{ title: 'Stale', url: '/stale/' }]
      : documents.filter((entry) => `${entry.title} ${entry.excerpt}`.toLowerCase().includes(query.toLowerCase()));
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ results }));
  };
  if (slow) setTimeout(answer, 600);
  else answer();
}
const server = createServer((request, response) => {
  if (request.url.startsWith('/api/search')) return search(request, response);
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

// A rail slot filled only when the page has headings: without them the shell
// has no rail column, so the article is not squeezed beside an empty one.
const note = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await note.goto(`${base}/note/`);
expect('a page without contents has no rail', await note.$$eval('[data-quire-rail]', (rails) => rails.length), 0);
expect('a page without contents has two columns', await note.$eval('[data-quire-shell]', (shell) => getComputedStyle(shell).gridTemplateColumns.split(' ').length), 2);
await note.close();

// Sidebar: site icons; the current page is scrolled into the
// sidebar's view without scrolling the page; groups the reader closes stay
// closed on the next page, but never the group holding the current page.
const navigation = await open({ width: 1280 });
expect('a link carries its icon', await navigation.$$eval('[data-quire-nav] a[href="/"] svg', (icons) => icons.length), 1);
expect('a group carries its icon', await navigation.$$eval('[data-quire-nav] summary svg', (icons) => icons.length >= 2), true);
const placement = await navigation.evaluate(() => {
  const box = document.querySelector('[data-quire-sidebar]').getBoundingClientRect();
  const link = document.querySelector('[data-quire-nav] [aria-current=page]').getBoundingClientRect();
  return { inside: link.top >= box.top && link.bottom <= box.bottom, page: scrollY };
});
expect('the current page is in the sidebar view', placement.inside, true);
expect('the page itself does not scroll', placement.page, 0);
const groupOpen = (page, label) => page.$eval(`[data-quire-group="/${label}"]`, (group) => group.open);
expect('an uncollapsed group starts open', await groupOpen(navigation, 'Reference'), true);
await navigation.click('[data-quire-group="/Reference"] > summary');
await navigation.click('[data-quire-group="/Reading"] > summary');
await navigation.reload();
expect('a closed group stays closed on the next page', await groupOpen(navigation, 'Reference'), false);
expect('the group holding the current page opens anyway', await groupOpen(navigation, 'Reading'), true);
await navigation.close();

// Contents tree: branches start closed except the one being read, toggle by
// mouse and keyboard, and the label collapses the panel.
const outline = await open({ width: 1440 });
const toggles = '[data-quire-contents] [data-quire-branch] > div > button';
const states = () => outline.$$eval(toggles, (buttons) => buttons.map((button) => button.getAttribute('aria-expanded')).join());
expect('branches start closed but the one being read', await states(), 'true,false');
const second = outline.locator(toggles).nth(1);
const secondList = outline.locator('[data-quire-contents] [data-quire-branch]').nth(1).locator(':scope > ul');
await second.click();
expect('a click opens a branch', await secondList.isVisible(), true);
await second.click();
expect('a second click closes it', await secondList.isVisible(), false);
await second.focus();
await outline.keyboard.press('Enter');
expect('Enter opens a branch', await second.getAttribute('aria-expanded'), 'true');
await outline.click('[data-quire-contents-panel]');
expect('the label collapses the panel', await outline.isVisible('#quire-contents'), false);
expect('the collapsed panel says so', await outline.getAttribute('[data-quire-contents-panel]', 'aria-expanded'), 'false');
await outline.close();

// Search: Ctrl+K opens the dialog with the input focused; results come from the
// endpoint and the keyboard opens one; a later query replaces a slower one;
// an empty answer and a failing endpoint say so; Escape returns focus.
const finder = await open({ width: 1280 });
await finder.waitForFunction(() => document.querySelector('[data-quire-search]') && !document.querySelector('astro-island[ssr]'));
await finder.keyboard.press('Control+K');
await finder.waitForSelector('[role=dialog]');
expect('Ctrl+K focuses the search input', await finder.evaluate(() => document.activeElement?.tagName), 'INPUT');
const options = () => finder.$$eval('[role=dialog] [role=option]', (items) => items.map((item) => item.textContent.trim()));
await finder.keyboard.type('scrol');
await finder.waitForSelector('[role=dialog] [role=option]');
expect('search lists the endpoint results', (await options()).join('|'), 'TablesGuide · Tables scroll in their frame');
// Each query replaces the last in one step, as a paste does, so no shorter
// query in between cancels the slow request first.
await finder.fill('[role=dialog] input', 'slowx');
await finder.waitForTimeout(250);
await finder.fill('[role=dialog] input', 'home');
await finder.waitForTimeout(900);
expect('a later query replaces a slower earlier one', (await options()).join('|'), 'HomeThe example site');
await finder.keyboard.press('Control+A');
await finder.keyboard.type('zzz');
await finder.waitForSelector('[role=dialog] [role=status]');
expect('an empty answer says so', await finder.textContent('[role=dialog] [role=status]'), 'No results for “zzz”.');
await finder.keyboard.press('Control+A');
await finder.keyboard.type('fail');
await finder.waitForSelector('[role=dialog] [role=alert]');
expect('a failing endpoint offers a retry', await finder.$eval('[role=dialog] [role=alert] button', (button) => button.textContent), 'Retry');
await finder.keyboard.press('Escape');
await finder.waitForSelector('[role=dialog]', { state: 'detached' });
expect('Escape returns focus to the search button', await finder.evaluate(() => document.activeElement?.hasAttribute('data-quire-search')), true);
await finder.keyboard.press('Control+K');
await finder.keyboard.type('home');
await finder.waitForSelector('[role=dialog] [role=option]');
await finder.keyboard.press('ArrowDown');
await Promise.all([finder.waitForURL(`${base}/`), finder.keyboard.press('Enter')]);
expect('Enter opens the chosen result', new URL(finder.url()).pathname, '/');
await finder.close();

// What a reader downloads: the page's scripts, compressed, before and after
// the search is first used. The budget catches a framework or kit grown by
// accident; the figures are printed for comparison.
const { gzipSync } = await import('node:zlib');
const weigh = async (use) => {
  const page = await browser.newPage();
  const sizes = new Map();
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return;
    sizes.set(response.url(), gzipSync(await response.body()).length);
  });
  await page.goto(`${base}/guide/`);
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  if (use) {
    await page.keyboard.press('Control+K');
    await page.keyboard.type('tables');
    await page.waitForSelector('[role=dialog] [role=option]');
  }
  await page.waitForLoadState('networkidle');
  await page.close();
  return [...sizes.values()].reduce((sum, size) => sum + size, 0);
};
const [loaded, used] = [await weigh(false), await weigh(true)];
console.log(`check-browser: scripts ${(loaded / 1024).toFixed(1)} kB gzip on load, ${(used / 1024).toFixed(1)} kB after a search`);
if (used > 80 * 1024) problems.push(`the page downloads ${(used / 1024).toFixed(1)} kB of compressed scripts, over the 80 kB budget`);

await browser.close();
server.close();
if (problems.length) {
  for (const problem of problems) console.error(`check-browser: ${problem}`);
  process.exit(1);
}
console.log('check-browser: themes, code, shell, menu, theme switch, sidebar, contents tree, search, tables and source lines ok');
