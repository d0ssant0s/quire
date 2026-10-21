// Cut a release: npm run release -- <version>
//
// Refuses unless main is clean and matches origin, the version is new and
// higher, and CHANGELOG.md has unreleased entries. Runs the checks, sets the
// version, moves the unreleased entries under it, commits and tags. Pushing the
// commit and the tag is left to the maintainer, so nothing leaves this clone
// without a deliberate step.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const fail = (message) => {
  console.error(`release: ${message}`);
  process.exit(1);
};

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) fail('usage: npm run release -- <major.minor.patch>');
const tag = `v${version}`;

if (git('status', '--porcelain')) fail('the working tree has changes');
if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main') fail('releases are cut from main');
git('fetch', '--quiet', '--tags', 'origin', 'main');
if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) fail('main differs from origin/main');
if (git('tag', '--list', tag)) fail(`${tag} already exists`);

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const parts = (value) => value.split('.').map(Number);
const [a, b] = [parts(version), parts(manifest.version)];
const higher = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
if (higher <= 0) fail(`${version} is not higher than ${manifest.version}`);

const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const unreleased = changelog.match(/^## Unreleased\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
if (!unreleased?.[1].trim()) fail('CHANGELOG.md has no unreleased entries');

execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });

execFileSync('npm', ['version', version, '--no-git-tag-version', '--ignore-scripts'], { cwd: root, stdio: 'ignore' });
const date = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, 'CHANGELOG.md'), changelog.replace(/^## Unreleased\n/m, `## Unreleased\n\n## ${version} (${date})\n`));

git('add', 'package.json', 'package-lock.json', 'CHANGELOG.md');
git('commit', '--quiet', '-m', `Release ${tag}`);
git('tag', '--annotate', tag, '-m', `quire ${version}`);
console.log(`release: committed and tagged ${tag}; publish both with: git push origin main ${tag}`);
