// Cut a release: npm run release -- <version>
//
// Refuses unless main is clean and matches origin, the version is new and
// higher, every commit since the previous release is a conventional commit,
// at least one belongs in the changelog, and the version marks any breaking
// change. Runs the checks, sets the version, writes the version's changelog
// section grouped from those commits, commits and tags. Pushing the commit and
// the tag is left to the maintainer, so nothing leaves this clone without a
// deliberate step.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { commits, entry, previousTag, problem, render, versionProblem, webAddress } from './changelog.mjs';

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

// The section comes from the commits since the previous release; every one
// must be a conventional commit, so none is silently left out.
const from = previousTag(root);
const history = commits(root, from);
const malformed = history.filter(({ subject }) => problem(subject));
if (malformed.length) fail(`not conventional commits: ${malformed.map(({ subject }) => `"${subject}"`).join(', ')}`);
const entries = history.map(({ subject, body }) => entry(subject, body)).filter(Boolean);
if (!entries.length) fail(`no feat, fix, perf or revert commits since ${from ?? 'the first commit'}; nothing for a release`);
const versionError = versionProblem(manifest.version, version, entries);
if (versionError) fail(versionError);

execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });

execFileSync('npm', ['version', version, '--no-git-tag-version', '--ignore-scripts'], { cwd: root, stdio: 'ignore' });
const date = new Date().toISOString().slice(0, 10);
const compare = from && `${webAddress(root)}/compare/${from}...${tag}`;
const section = `## ${version} (${date})\n\n${render(entries, compare)}\n\n`;
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const first = changelog.search(/^## /m);
writeFileSync(join(root, 'CHANGELOG.md'), first < 0 ? `${changelog.trimEnd()}\n\n${section}` : changelog.slice(0, first) + section + changelog.slice(first));

git('add', 'package.json', 'package-lock.json', 'CHANGELOG.md');
git('commit', '--quiet', '-m', `chore(release): ${tag}`);
git('tag', '--annotate', tag, '-m', `quire ${version}`);
console.log(`release: committed and tagged ${tag}; publish both with: git push origin main ${tag}`);
