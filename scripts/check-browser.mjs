// Check the built example in a real browser: both themes and the system scheme,
// highlighted code, the page shell at desktop and phone widths, the sidebar and
// contents tree, a table that scrolls in its frame, a targeted source line,
// reduced motion and the search: against a stand-in endpoint, a stand-in source
// function and the example's own Pagefind index.
//
// CHROMIUM names a Chromium binary to use; without it Playwright uses its own,
// which `npx playwright install chromium` downloads.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const site = new URL('../examples/basic/dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
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
expect('a page row draws no icon', await navigation.$$eval('[data-quire-nav] a svg', (icons) => icons.length), 0);
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

// One navigation style: sidebar and rail rows share one computed row style
// and one current-row pill, labels are sentence case in rows of the same
// height, long titles keep to one line, and page rows start where the group
// labels' text does. The rail's contents are a card.
const styled = await open({ width: 1440, theme: 'light' });
const look = (selector) =>
  styled.$eval(selector, (element) => {
    const css = getComputedStyle(element);
    const keys = ['fontSize', 'lineHeight', 'fontWeight', 'padding', 'borderRadius', 'textTransform', 'letterSpacing'];
    return { ...Object.fromEntries(keys.map((key) => [key, css[key]])), height: element.getBoundingClientRect().height };
  });
const row = { fontSize: '14px', lineHeight: '20px', padding: '0px 8px', borderRadius: '6px', height: 32 };
const rows = {
  'sidebar page row': '[data-quire-nav] a[href="/"]',
  'sidebar group row': '[data-quire-nav] summary',
  'rail row': '[data-quire-contents] a[data-level="0"][aria-current=false]',
};
for (const [name, selector] of Object.entries(rows)) {
  const actual = await look(selector);
  for (const [key, wanted] of Object.entries(row)) expect(`${name} ${key}`, actual[key], wanted);
}
const pill = (selector) => styled.$eval(selector, (element) => getComputedStyle(element).backgroundColor);
expect('sidebar current row', await pill('[data-quire-nav] a[aria-current=page]'), 'rgb(238, 242, 255)');
expect('rail current row', await pill('[data-quire-contents] a[aria-current=true]'), 'rgb(238, 242, 255)');
const label = { fontSize: '12px', fontWeight: '500', textTransform: 'none', letterSpacing: 'normal', height: 32 };
for (const [name, selector] of [['sidebar label', '[data-quire-nav] p'], ['rail label', '[data-quire-contents] p']]) {
  const actual = await look(selector);
  for (const [key, wanted] of Object.entries(label)) expect(`${name} ${key}`, actual[key], wanted);
}
const longTitle = 'A short note whose title is far too long for one row';
const long = await styled.$eval('[data-quire-nav] a[href="/note/"]', (link) => {
  const text = link.querySelector('span:last-child');
  const css = getComputedStyle(text);
  return { title: link.title, height: link.getBoundingClientRect().height, cut: text.scrollWidth > text.clientWidth, ellipsis: `${css.whiteSpace} ${css.textOverflow}` };
});
expect('a long title keeps to one row', long.height, 32);
expect('a long title is cut', long.cut, true);
expect('a long title ends in an ellipsis', long.ellipsis, 'nowrap ellipsis');
expect('a long title is in the title attribute', long.title, longTitle);
expect('a long title is the accessible name', await styled.getByRole('link', { name: longTitle, exact: true }).count(), 1);
const edges = await styled.evaluate(() =>
  ['a[href="/"] span:last-child', 'summary span:not([aria-hidden])', 'a[aria-current=page] span']
    .map((selector) => Math.round(document.querySelector(`[data-quire-nav] ${selector}`).getBoundingClientRect().left))
    .join(),
);
expect('page rows and group labels share one left edge', new Set(edges.split(',')).size, 1);
expect('sidebar width', await styled.$eval('[data-quire-sidebar]', (element) => element.getBoundingClientRect().width), 256);
expect('sidebar right border', await style(styled, '[data-quire-nav]', 'border-right-width'), '1px');
expect('rail card radius', await style(styled, '[data-quire-contents]', 'border-radius'), '16px');
expect('rail card border', await style(styled, '[data-quire-contents]', 'border-top-width'), '1px');
const cardEdge = await style(styled, '[data-quire-contents]', 'border-top-color');
// Chromium writes a mixed colour as oklab(l a b / alpha); an opaque one has no alpha.
const alpha = Number(cardEdge.match(/\/ ([\d.]+)\)$/)?.[1] ?? 1);
if (!(alpha > 0 && alpha < 1)) problems.push(`rail card border is not translucent: ${cardEdge}`);
await styled.close();

// Narrow screens: the closed sidebar is out of the tab order, focus follows it
// as it opens and closes, a skip link leads to <main>, and a disclosure holds
// the contents the hidden rail would list.
const narrow = await open({ width: 375 });
// Names the focused element: a sidebar entry by its href, the menu button,
// or else its id or tag.
const focused = () => narrow.evaluate(() => {
  const element = document.activeElement;
  if (!element) return null;
  if (element.closest('[data-quire-sidebar]')) return `sidebar ${element.getAttribute('href') ?? element.tagName}`;
  if (element.hasAttribute('data-quire-menu')) return 'menu';
  return element.id || element.tagName;
});
const settled = (page) => page.waitForFunction(() => document.querySelector('[data-quire-sidebar]').getAnimations().length === 0);
expect('the closed sidebar is hidden', await style(narrow, '[data-quire-sidebar]', 'visibility'), 'hidden');
const stops = [];
for (let step = 0; step < 12; step += 1) {
  await narrow.keyboard.press('Tab');
  stops.push(await focused());
}
const intoSidebar = stops.filter((stop) => String(stop).startsWith('sidebar'));
expect('Tab skips the closed sidebar', intoSidebar.join(), '');
await narrow.click('[data-quire-menu]');
await settled(narrow);
expect('opening the sidebar moves focus to the current page', await focused(), 'sidebar /guide/');
await narrow.mouse.click(360, 400);
await settled(narrow);
expect('closing by the scrim returns focus to the menu', await focused(), 'menu');
expect('the sidebar hides again once closed', await style(narrow, '[data-quire-sidebar]', 'visibility'), 'hidden');
await narrow.click('[data-quire-menu]');
await settled(narrow);
await narrow.keyboard.press('Escape');
expect('closing by Escape returns focus to the menu', await focused(), 'menu');

// The skip link shows when focused and moves focus to <main>, which keeps
// the main prop's class beside quire's own.
expect('the page has a skip link', await narrow.locator('[data-quire-skip]').count(), 1);
if (await narrow.locator('[data-quire-skip]').count()) {
  await narrow.focus('[data-quire-skip]');
  const skipWidth = await narrow.$eval('[data-quire-skip]', (link) => link.getBoundingClientRect().width);
  if (skipWidth < 20) problems.push(`the focused skip link is not shown (${skipWidth}px wide)`);
  await narrow.keyboard.press('Enter');
  expect('the skip link focuses main', await focused(), 'quire-main');
}
expect('main draws no focus ring', await style(narrow, 'main', 'outline-style'), 'none');
const mainClasses = await narrow.$eval('main', (main) => ['example-main', 'w-full'].filter((name) => main.classList.contains(name)).join());
expect('main keeps the prop class and its own', mainClasses, 'example-main,w-full');

// The disclosure lists the rail's headings, closes after a choice, and closes
// on Escape with focus back on its summary. No id is used twice.
const disclosure = '[data-quire-narrow-contents]';
expect('narrow contents show on a phone', await style(narrow, disclosure, 'display'), 'block');
const narrowListed = await narrow.$$eval(`${disclosure} a`, (links) => links.map((link) => link.hash.slice(1)));
const railListed = await narrow.$$eval('[data-quire-contents] a', (links) => links.map((link) => link.hash.slice(1)));
expect('narrow contents list the rail headings', narrowListed.join(), railListed.join());
const duplicates = await narrow.$$eval('[id]', (elements) => {
  const ids = elements.map((element) => element.id);
  return ids.filter((id, index) => ids.indexOf(id) !== index).join();
});
expect('no id is used twice', duplicates, '');
const isOpen = () => narrow.$eval(disclosure, (details) => details.open);
await narrow.click(`${disclosure} summary`);
expect('the summary opens the contents', await isOpen(), true);
await narrow.click(`${disclosure} a[href="#${narrowListed[1]}"]`);
expect('a choice closes the contents', await isOpen(), false);
expect('a choice reaches its heading', new URL(narrow.url()).hash, `#${narrowListed[1]}`);
// The marked heading follows the scroll, open or not. (Clicking the summary
// would scroll back up to it first.)
await narrow.evaluate((id) => {
  document.getElementById(id).scrollIntoView();
  dispatchEvent(new Event('scroll'));
}, narrowListed[2]);
expect('the contents mark the heading being read', await narrow.$eval(`${disclosure} a[aria-current=true]`, (link) => link.hash.slice(1)), narrowListed[2]);
await narrow.click(`${disclosure} summary`);
await narrow.keyboard.press('Escape');
expect('Escape closes the contents', await isOpen(), false);
expect('Escape returns focus to the summary', await narrow.evaluate(() => document.activeElement?.tagName), 'SUMMARY');
await narrow.close();
const roomy = await open({ width: 1440 });
expect('narrow contents hide beside the rail', await style(roomy, '[data-quire-narrow-contents]', 'display'), 'none');
expect('the desktop sidebar is visible', await style(roomy, '[data-quire-sidebar]', 'visibility'), 'visible');
await roomy.close();

// Search against an endpoint: Ctrl+K opens the dialog with the input focused;
// results come from the endpoint and the keyboard opens one; a later query
// replaces a slower one; an empty answer and a failing endpoint say so; Escape
// returns focus.
const finder = await open({ width: 1280 });
await finder.waitForFunction(() => document.querySelector('[data-quire-search]') && !document.querySelector('astro-island[ssr]'));
await finder.keyboard.press('/');
await finder.waitForTimeout(200);
expect('the slash key does nothing unless asked for', await finder.locator('[role=dialog]').count(), 0);
await finder.keyboard.press('Control+K');
await finder.waitForSelector('[role=dialog]');
expect('Ctrl+K focuses the search input', await finder.evaluate(() => document.activeElement?.tagName), 'INPUT');
const options = (page) => page.$$eval('[role=dialog] [role=option]', (items) => items.map((item) => item.textContent.trim()));
const status = (page) => page.$eval('[role=dialog] [role=status]', (element) => element.textContent.trim());
const said = (page, text) => page.waitForFunction((wanted) => document.querySelector('[role=dialog] [role=status]')?.textContent.trim() === wanted, text);
await finder.keyboard.type('scrol');
await finder.waitForSelector('[role=dialog] [role=option]');
expect('search lists the endpoint results', (await options(finder)).join('|'), 'TablesGuide · Tables scroll in their frame');
// Each query replaces the last in one step, as a paste does, so no shorter
// query in between cancels the slow request first.
await finder.fill('[role=dialog] input', 'slowx');
await finder.waitForTimeout(250);
await finder.fill('[role=dialog] input', 'home');
await finder.waitForTimeout(900);
expect('a later query replaces a slower earlier one', (await options(finder)).join('|'), 'HomeThe example site');
await finder.keyboard.press('Control+A');
await finder.keyboard.type('zzz');
await said(finder, 'No results for “zzz”.');
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

// Search against a source function that stands in for a service. It counts
// results by category, can be slow, can throw, and can answer a plain list.
const standIn = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await standIn.goto(`${base}/standin/`);
await standIn.waitForFunction(() => document.querySelector('[data-quire-search]') && !document.querySelector('astro-island[ssr]'));
const asked = () => standIn.evaluate(() => window.quireStandIn.calls.map((call) => ({ ...call })));
const steer = (settings) => standIn.evaluate((values) => Object.assign(window.quireStandIn, values), settings);
const chips = () => standIn.$$eval('[role=dialog] [data-quire-search-filters] button', (buttons) => buttons.map((button) => `${button.textContent.replace(/\s+/g, ' ').trim()}${button.getAttribute('aria-pressed') === 'true' ? '*' : ''}`).join('|'));
const field = '[role=dialog] input';
await standIn.keyboard.press('Control+K');
await standIn.waitForSelector('[role=dialog]');
expect('the search input is named', await standIn.getAttribute(field, 'aria-label'), 'Search');
await said(standIn, 'Type at least 2 characters.');
await standIn.fill(field, 'page');
await standIn.waitForSelector('[role=dialog] [role=option]');
expect('a source lists its results, without the malformed ones', (await options(standIn)).join('|'), 'HomeThe example page|Reading stylesLists, code and tables on a page|Short noteA page without headings');
expect('the filters carry the counts the source gave', await chips(), 'All 3*|Pages 2|Reading 1');
expect('the results are announced', await status(standIn), '3 results.');
// Selection: the arrow keys move the highlight, and the field names it.
await standIn.keyboard.press('ArrowDown');
await standIn.keyboard.press('ArrowDown');
const highlighted = await standIn.evaluate(() => {
  const target = document.getElementById(document.querySelector('[role=dialog] input').getAttribute('aria-activedescendant') ?? '');
  return target ? `${target.getAttribute('role')}:${target.hasAttribute('data-highlighted')}:${target.textContent.trim()}` : null;
});
expect('the field names the highlighted result', highlighted, 'option:true:Reading stylesLists, code and tables on a page');
expect('the results are a named listbox', await standIn.getAttribute('[role=dialog] [role=listbox]', 'aria-label'), 'Search results');
// A filter narrows the search and keeps its counts.
await standIn.click('[role=dialog] [data-quire-search-filters] button:has-text("Reading")');
await said(standIn, '1 result in Reading.');
expect('the chosen filter narrows the results', (await options(standIn)).join('|'), 'Reading stylesLists, code and tables on a page');
expect('the chosen filter is pressed and counts stay', await chips(), 'All 3|Pages 2|Reading 1*');
expect('a click on a filter returns to the field', await standIn.evaluate(() => document.activeElement?.tagName), 'INPUT');
expect('the source was asked for the filter', (await asked()).at(-1).filter, 'Reading');
// A failure offers a retry that keeps the query and the filter.
await steer({ fail: true });
await standIn.fill(field, 'pag');
await standIn.waitForSelector('[role=dialog] [role=alert]');
expect('a thrown error is the failed state', await standIn.textContent('[role=dialog] [role=alert]'), 'Search is unavailable.Retry');
expect('the failed state leaves no results', (await options(standIn)).length, 0);
await steer({ fail: false });
const before = (await asked()).length;
await standIn.click('[role=dialog] [role=alert] button');
await standIn.waitForSelector('[role=dialog] [role=option]');
expect('the retry asks again', (await asked()).length, before + 1);
expect('the retry keeps the query', (await asked()).at(-1).query, 'pag');
expect('the retry keeps the filter', (await asked()).at(-1).filter, 'Reading');
expect('the field still holds the query', await standIn.inputValue(field), 'pag');
expect('the retry shows the filtered results', (await options(standIn)).join('|'), 'Reading stylesLists, code and tables on a page');
expect('the filter is still chosen after the retry', await chips(), 'All 3|Pages 2|Reading 1*');
// A filter chosen alone leaves "All" to clear it.
await standIn.click('[role=dialog] [data-quire-search-filters] button:has-text("All")');
await said(standIn, '3 results.');
// Waiting is announced and shown; a slow answer a newer query supersedes is
// cancelled, and dropped even though the source ignores the cancellation.
await standIn.fill(field, 'slowx');
await said(standIn, 'Searching…');
expect('waiting marks the field busy', await standIn.getAttribute(field, 'aria-busy'), 'true');
await standIn.waitForTimeout(250);
await standIn.fill(field, 'home');
await standIn.waitForSelector('[role=dialog] [role=option]');
await standIn.waitForTimeout(900);
expect('a later query replaces a slower earlier one, from a source', (await options(standIn)).join('|'), 'HomeThe example page');
expect('the superseded call was cancelled', (await asked()).find((call) => call.query === 'slowx').aborted, true);
// Clearing the query cancels what is in flight, and its answer never returns.
await standIn.fill(field, 'slowy');
await standIn.waitForTimeout(250);
await standIn.fill(field, '');
await standIn.waitForTimeout(900);
expect('a cleared query is not refilled by a late answer', (await options(standIn)).length, 0);
expect('a cleared query is idle', await status(standIn), 'Type at least 2 characters.');
expect('the cleared query cancelled its call', (await asked()).find((call) => call.query === 'slowy').aborted, true);
// A source that answers a plain list gets its filters counted by quire, which
// also hides the results of another category.
await steer({ bare: true });
await standIn.fill(field, 'page');
await standIn.waitForSelector('[role=dialog] [role=option]');
expect('filters are counted from a plain list', await chips(), 'All 3*|Pages 2|Reading 1');
await standIn.click('[role=dialog] [data-quire-search-filters] button:has-text("Pages")');
await said(standIn, '2 results in Pages.');
expect('quire hides the results of other categories', (await options(standIn)).join('|'), 'HomeThe example page|Short noteA page without headings');
// A source that returns fewer results than it holds: the status says both, so
// it agrees with the filter row; an uncapped answer keeps the single count.
await steer({ bare: false, cap: 2 });
await standIn.click('[role=dialog] [data-quire-search-filters] button:has-text("All")');
await said(standIn, '2 of 3 results.');
expect('a capped answer shows its filter counts', await chips(), 'All 3*|Pages 2|Reading 1');
await standIn.click('[role=dialog] [data-quire-search-filters] button:has-text("Reading")');
await said(standIn, '1 result in Reading.');
await steer({ cap: 1 });
await standIn.click('[role=dialog] [data-quire-search-filters] button:has-text("Pages")');
await said(standIn, '1 of 2 results in Pages.');
await steer({ cap: 0 });
await standIn.fill(field, 'pag');
await said(standIn, '2 results in Pages.');
await standIn.close();

// Search driven by the site: a wrapper component holds `v-model:open` and
// `v-model:query`, and buttons outside the island open it, fill it and clear it.
// The `/` key opens it unless the reader is typing, a query the site sets is
// asked at once, a slow earlier answer never overwrites it, and focus returns
// to the button that opened the dialog.
const driven = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await driven.goto(`${base}/controlled/`);
await driven.waitForFunction(() => document.querySelector('[data-search-state]') && !document.querySelector('astro-island[ssr]'));
const held = () => driven.$eval('[data-search-state]', (element) => element.textContent.trim());
const dialogs = () => driven.locator('[role=dialog]').count();
const pushed = (selector) => driven.evaluate((target) => document.querySelector(target).click(), selector);
const inField = '[role=dialog] input';
expect('the site can hide the built-in button', await driven.locator('[data-quire-search]').count(), 0);
expect('the site reads the models before use', await held(), 'open=false query=');
await driven.click('[data-search-open]');
await driven.waitForSelector('[role=dialog]');
expect('a button outside the island opens the dialog', await held(), 'open=true query=');
expect('an external open focuses the search input', await driven.evaluate(() => document.activeElement?.tagName), 'INPUT');
await driven.keyboard.press('Escape');
await driven.waitForSelector('[role=dialog]', { state: 'detached' });
expect('Escape returns focus to the external button', await driven.evaluate(() => document.activeElement?.hasAttribute('data-search-open')), true);
expect('the site reads the dialog closing', await held(), 'open=false query=');
// The slash key opens the dialog, and is not typed into it.
await driven.keyboard.press('/');
await driven.waitForSelector('[role=dialog]');
expect('the slash key opens the dialog', await held(), 'open=true query=');
expect('the slash key is not typed into the field', await driven.inputValue(inField), '');
await driven.keyboard.type('read');
await driven.waitForSelector('[role=dialog] [role=option]');
expect('the site reads what the reader types', await held(), 'open=true query=read');
expect('the typed query is searched', (await options(driven)).join('|'), 'Reading styles');
await driven.keyboard.press('Escape');
await driven.waitForSelector('[role=dialog]', { state: 'detached' });
// Typing a slash in a field, or with a modifier, opens nothing.
for (const selector of ['input[aria-label="Text field"]', 'textarea', 'select', '[contenteditable]']) {
  await driven.focus(selector);
  await driven.keyboard.press('/');
  await driven.waitForTimeout(150);
  expect(`the slash key does not open search from ${selector}`, await dialogs(), 0);
}
expect('a slash typed into a field stays in it', await driven.inputValue('input[aria-label="Text field"]'), '/');
await driven.evaluate(() => document.activeElement.blur());
await driven.keyboard.press('Control+/');
await driven.waitForTimeout(150);
expect('Ctrl+/ does not open search', await dialogs(), 0);
// A preset query opens the dialog and is asked before the typing pause.
await driven.evaluate(() => (window.quireControlled.calls.length = 0));
await driven.focus('[data-search-preset="home"]');
await driven.evaluate(() => {
  document.querySelector('[data-search-preset="home"]').click();
  window.quireControlled.pressed = performance.now();
});
await said(driven, '1 result.');
expect('a preset query opens the dialog with it', [await held(), await driven.inputValue(inField)].join(), 'open=true query=home,home');
expect('a preset query lists its results', (await options(driven)).join('|'), 'Home');
expect('a preset query is asked once', await driven.evaluate(() => window.quireControlled.calls.map((call) => call.query).join()), 'home');
expect('a preset query is asked before the typing pause', await driven.evaluate(() => window.quireControlled.calls[0].at - window.quireControlled.pressed < 100), true);
// A slow earlier answer that is still pending does not overwrite the preset.
await driven.fill(inField, 'slowy');
await driven.waitForTimeout(350);
await pushed('[data-search-preset="home"]');
await driven.waitForTimeout(900);
expect('a preset replaces a pending slow answer', (await options(driven)).join('|'), 'Home');
expect('the slow answer did not come back', (await options(driven)).includes('Stale'), false);
expect('the field shows the preset', await driven.inputValue(inField), 'home');
// So does one set while the dialog is closed.
await driven.keyboard.press('Escape');
await driven.waitForSelector('[role=dialog]', { state: 'detached' });
await driven.click('[data-search-preset="slowx"]');
await driven.waitForSelector('[role=dialog]');
await driven.waitForTimeout(250);
await pushed('[data-search-preset="home"]');
await driven.waitForTimeout(900);
expect('a preset set over a pending one wins', (await options(driven)).join('|'), 'Home');
// Clearing the query through the model empties the field and cancels what is pending.
await pushed('[data-search-clear]');
await said(driven, 'Type at least 2 characters.');
expect('clearing through the model empties the field', await driven.inputValue(inField), '');
expect('clearing through the model removes the results', (await options(driven)).length, 0);
expect('the site reads the cleared query', await held(), 'open=true query=');
await pushed('[data-search-preset="slowx"]');
await driven.waitForTimeout(250);
await pushed('[data-search-clear]');
await driven.waitForTimeout(900);
expect('a cleared query is not refilled by a late answer, through the model', (await options(driven)).length, 0);
await driven.keyboard.press('Escape');
await driven.waitForSelector('[role=dialog]', { state: 'detached' });
expect('Escape returns focus to the button that set the query', await driven.evaluate(() => document.activeElement?.getAttribute('data-search-preset')), 'slowx');
// A query set while the dialog is closed is asked when it opens.
await driven.evaluate(() => (window.quireControlled.calls.length = 0));
await driven.click('[data-search-clear]');
await driven.keyboard.press('/');
await driven.waitForSelector('[role=dialog]');
await driven.keyboard.press('Escape');
await driven.waitForSelector('[role=dialog]', { state: 'detached' });
expect('a query set while closed is not asked', await driven.evaluate(() => window.quireControlled.calls.length), 0);
await driven.close();

// A deep link: the wrapper reads ?search=<term> and sets the models.
const linked = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await linked.goto(`${base}/controlled/?search=home`);
await linked.waitForSelector('[role=dialog] [role=option]');
expect('a deep link opens search with its term', [await linked.inputValue(inField), (await options(linked)).join('|')].join(), 'home,Home');
await linked.close();

// A site's own trigger in the slot, and only the slash key as a shortcut.
const custom = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await custom.goto(`${base}/custom-trigger/`);
await custom.waitForFunction(() => document.querySelector('[data-custom-trigger]') && !document.querySelector('astro-island[ssr]'));
expect('the slot replaces the built-in button', await custom.locator('[data-quire-search]').count(), 0);
expect('the slotted button is the dialog trigger', await custom.getAttribute('[data-custom-trigger]', 'aria-haspopup'), 'dialog');
await custom.keyboard.press('Control+K');
await custom.waitForTimeout(150);
expect('Ctrl+K is inert when it is not a shortcut', await custom.locator('[role=dialog]').count(), 0);
await custom.click('[data-custom-trigger]');
await custom.waitForSelector('[role=dialog]');
await custom.keyboard.press('Escape');
await custom.waitForSelector('[role=dialog]', { state: 'detached' });
expect('Escape returns focus to the slotted button', await custom.evaluate(() => document.activeElement?.hasAttribute('data-custom-trigger')), true);
await custom.evaluate(() => document.activeElement.blur());
await custom.keyboard.press('/');
await custom.waitForSelector('[role=dialog]');
await custom.keyboard.press('Escape');
await custom.waitForSelector('[role=dialog]', { state: 'detached' });
expect('Escape after the slash key returns focus to the slotted button', await custom.evaluate(() => document.activeElement?.hasAttribute('data-custom-trigger')), true);
await custom.close();

// Search over the example's own Pagefind index, through pagefindSource: the
// script loads when the first query runs and not before, excerpts arrive as
// text, the category filter has Pagefind's counts, and a script that failed to
// load is fetched again by the retry.
const indexed = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const requested = [];
indexed.on('request', (request) => requested.push(new URL(request.url()).pathname));
await indexed.goto(`${base}/indexed/`);
await indexed.waitForFunction(() => document.querySelector('[data-quire-search]') && !document.querySelector('astro-island[ssr]'));
await indexed.keyboard.press('Control+K');
await indexed.waitForSelector('[role=dialog]');
expect('Pagefind is not fetched before a query', requested.some((path) => path.startsWith('/pagefind/')), false);
await indexed.route('**/pagefind/pagefind.js', (route) => route.abort());
await indexed.keyboard.type('page');
await indexed.waitForSelector('[role=dialog] [role=alert]');
expect('an index that does not load is the failed state', await indexed.textContent('[role=dialog] [role=alert]'), 'Search is unavailable.Retry');
await indexed.unroute('**/pagefind/pagefind.js');
await indexed.click('[role=dialog] [role=alert] button');
await indexed.waitForSelector('[role=dialog] [role=option]');
expect('Pagefind excerpts arrive as text, not markup', (await options(indexed)).some((text) => /[<>]/.test(text)), false);
const found = await indexed.$$eval('[role=dialog] [role=option]', (items) => items.map((item) => item.querySelector('span').textContent).sort().join('|'));
expect('Pagefind finds the pages with the word', found, 'Reading styles|Short note');
const filterRow = async () => indexed.$$eval('[role=dialog] [data-quire-search-filters] button', (buttons) => buttons.map((button) => `${button.textContent.replace(/\s+/g, ' ').trim()}${button.getAttribute('aria-pressed') === 'true' ? '*' : ''}`).join('|'));
expect('the Pagefind filter has its counts', await filterRow(), 'All 2*|Reading 1|Short pages 1');
await indexed.click('[role=dialog] [data-quire-search-filters] button:has-text("Short pages")');
await said(indexed, '1 result in Short pages.');
expect('the Pagefind filter narrows the search', (await options(indexed)).join('|').startsWith('Short note'), true);
expect('the Pagefind filter keeps every count', await filterRow(), 'All 2|Reading 1|Short pages 1*');
await indexed.keyboard.press('ArrowDown');
await Promise.all([indexed.waitForURL(`${base}/note/`), indexed.keyboard.press('Enter')]);
await indexed.close();

// What a reader downloads: the page's scripts, compressed, before and after
// the search is first used. The budget catches a framework or kit grown by
// accident; the figures are printed for comparison. The page that searches
// with Pagefind also loads Pagefind's own scripts when the first query runs.
// They belong to the site's search engine, not to quire, so they are counted
// apart, under a budget of their own that notices an engine that grows.
const { gzipSync } = await import('node:zlib');
const weigh = async (path, query) => {
  const page = await browser.newPage();
  const sizes = new Map();
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return;
    sizes.set(new URL(response.url()).pathname, gzipSync(await response.body()).length);
  });
  await page.goto(`${base}${path}`);
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
  await page.waitForLoadState('networkidle');
  const total = (own) => [...sizes].filter(([path]) => path.startsWith('/pagefind/') !== own).reduce((sum, [, size]) => sum + size, 0);
  const loaded = total(true);
  if (query) {
    await page.keyboard.press('Control+K');
    await page.keyboard.type(query);
    await page.waitForSelector('[role=dialog] [role=option]');
  }
  await page.waitForLoadState('networkidle');
  await page.close();
  return { loaded, used: total(true), engine: total(false) };
};
const kB = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
for (const [label, path, query] of [['endpoint', '/guide/', 'tables'], ['Pagefind source', '/indexed/', 'page']]) {
  const { loaded, used, engine } = await weigh(path, query);
  console.log(`check-browser: ${label} page: quire's scripts ${kB(loaded)} gzip on load, ${kB(used)} after a search${engine ? `, plus Pagefind's ${kB(engine)}` : ''}`);
  if (used > 80 * 1024) problems.push(`the ${label} page downloads ${kB(used)} of compressed scripts, over the 80 kB budget`);
  if (engine > 32 * 1024) problems.push(`the ${label} page downloads ${kB(engine)} of Pagefind's compressed scripts, over the 32 kB budget`);
}

await browser.close();
server.close();
if (problems.length) {
  for (const problem of problems) console.error(`check-browser: ${problem}`);
  process.exit(1);
}
console.log('check-browser: themes, code, shell, menu, theme switch, sidebar, contents tree, navigation style, narrow screens and focus, search (endpoint, source, site-driven and Pagefind), tables and source lines ok');
