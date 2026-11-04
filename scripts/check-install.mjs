// Check quire the way a site gets it: packed, installed into a throwaway site's
// node_modules, and built by Astro. quire exports TypeScript source, and Node
// does not strip types inside node_modules, so Astro loads quire through a Vite
// module runner that is closed once the config has loaded. The workspace
// example resolves quire outside node_modules and never meets that runner, so
// only this check can catch a hook that imports lazily.
//
// Two builds: with `quire({ vue: true })` and a hydrated Search.vue, which must
// build and ship the island; and with `quire()` and no components, whose pages
// must ship no script at all.
//
// The install takes packages from the local npm cache and reaches the registry
// only for those the cache lacks.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const { dependencies } = JSON.parse(readFileSync(join(root, 'examples/basic/package.json'), 'utf8'));
const astro = dependencies.astro;
const tailwindcss = dependencies.tailwindcss;

const npm = process.env.npm_execpath ? [process.execPath, process.env.npm_execpath] : ['npm'];
function run(cwd, command, args, what) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, CI: '1', ASTRO_TELEMETRY_DISABLED: '1' } });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return { ok: result.status === 0, output, what };
}
const runNpm = (cwd, args, what) => run(cwd, npm[0], [...npm.slice(1), ...args], what);

const work = mkdtempSync(join(tmpdir(), 'quire-install-'));
const problems = [];
const fail = (message, output = '') => problems.push(output ? `${message}\n${output.trim().split('\n').slice(-25).join('\n')}` : message);

try {
  const packed = runNpm(root, ['pack', '--silent', '--pack-destination', work], 'npm pack');
  if (!packed.ok) throw new Error(`npm pack failed\n${packed.output}`);
  const tarball = join(work, packed.output.trim().split('\n').pop());

  const site = (name, { config, page }) => {
    const dir = join(work, name);
    mkdirSync(join(dir, 'src/pages'), { recursive: true });
    mkdirSync(join(dir, 'src/styles'), { recursive: true });
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name, private: true, type: 'module', dependencies: { '@d0ssant0s/quire': `file:${tarball}`, astro, tailwindcss } }),
    );
    writeFileSync(join(dir, 'astro.config.mjs'), `import { defineConfig } from 'astro/config';\nimport quire from '@d0ssant0s/quire';\nexport default defineConfig({ integrations: [${config}] });\n`);
    writeFileSync(join(dir, 'src/styles/site.css'), "@import 'tailwindcss';\n@import '@d0ssant0s/quire/theme.css';\n");
    writeFileSync(join(dir, 'src/pages/index.astro'), page);
    return dir;
  };

  const withVue = site('with-vue', {
    config: 'quire({ vue: true })',
    page: `---
import '../styles/site.css';
import Search from '@d0ssant0s/quire/vue/Search.vue';
---
<html lang="en"><head><title>vue</title></head><body><Search client:load endpoint="/api/search" /></body></html>
`,
  });
  const withoutVue = site('without-vue', {
    config: 'quire()',
    page: `---
import '../styles/site.css';
---
<html lang="en"><head><title>plain</title></head><body><h1 class="text-xl">No components</h1></body></html>
`,
  });

  for (const dir of [withVue, withoutVue]) {
    const installed = runNpm(dir, ['install', '--prefer-offline', '--no-audit', '--no-fund'], 'npm install');
    if (!installed.ok) throw new Error(`npm install failed in ${dir}\n${installed.output}`);
    if (!existsSync(join(dir, 'node_modules/@d0ssant0s/quire/src/index.ts'))) throw new Error(`quire is not under node_modules in ${dir}`);
  }

  const build = (dir) => run(dir, process.execPath, [join(dir, 'node_modules/astro/bin/astro.mjs'), 'build'], 'astro build');
  const files = (dir, suffix) => {
    const found = [];
    const walk = (path) => {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(join(path, entry.name));
        else if (entry.name.endsWith(suffix)) found.push(join(path, entry.name));
      }
    };
    if (existsSync(join(dir, 'dist'))) walk(join(dir, 'dist'));
    return found;
  };

  const vue = build(withVue);
  if (!vue.ok) fail('quire({ vue: true }) installed from node_modules: astro build failed', vue.output);
  else {
    const html = readFileSync(join(withVue, 'dist/index.html'), 'utf8');
    if (!html.includes('<astro-island')) fail('quire({ vue: true }): the page has no hydrated Search island');
    if (files(withVue, '.js').length === 0) fail('quire({ vue: true }): the build emitted no script for the island');
  }

  const plain = build(withoutVue);
  if (!plain.ok) fail('quire() installed from node_modules: astro build failed', plain.output);
  else {
    const html = readFileSync(join(withoutVue, 'dist/index.html'), 'utf8');
    if (html.includes('<astro-island') || /<script/.test(html)) fail('quire() without vue: the page ships a script');
    const scripts = files(withoutVue, '.js');
    if (scripts.length > 0) fail(`quire() without vue: the build emitted script files: ${scripts.join(', ')}`);
  }
} catch (error) {
  fail(error.message);
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`check-install: ${problems.length} problem(s)\n\n${problems.join('\n\n')}`);
  process.exit(1);
}
console.log('check-install: quire installed from node_modules builds with and without vue, and a site without vue ships no script');
