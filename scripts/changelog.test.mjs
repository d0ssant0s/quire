import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { commits, entry, previousTag, problem, render, versionProblem } from './changelog.mjs';

const checker = resolve('scripts/check-commit.mjs');

test('a conventional subject passes and others say what to write', () => {
  assert.equal(problem('feat(sidebar): add icons'), null);
  assert.equal(problem('fix!: drop the old storage keys'), null);
  assert.match(problem('Add icons to the sidebar'), /type\(scope\): summary/);
  assert.match(problem('feature: add icons'), /not a commit type/);
  assert.match(problem('fix: keep the page in view.'), /full stop/);
  assert.match(problem(`fix: ${'x'.repeat(100)}`), /100 characters/);
  // Git's own messages reach the hook before the author edits them.
  assert.equal(problem('Merge branch main into topic'), null);
  assert.equal(problem('fixup! feat: add icons'), null);
});

test('each change goes under its group, and housekeeping stays out', () => {
  assert.deepEqual(entry('feat(sidebar): add icons'), { group: 'Features', text: '**sidebar:** add icons' });
  assert.deepEqual(entry('fix: keep the page in view (#24)'), { group: 'Fixed', text: 'keep the page in view (#24)' });
  assert.deepEqual(entry('perf: hydrate search on idle'), { group: 'Changed', text: 'hydrate search on idle' });
  assert.deepEqual(entry('fix(security): escape search excerpts'), { group: 'Security', text: 'escape search excerpts' });
  assert.deepEqual(entry('feat!: rename the storage prefix'), { group: 'Breaking changes', text: 'rename the storage prefix' });
  for (const subject of ['docs: explain tokens', 'ci: pin actions', 'chore(release): v1.0.0', 'refactor: split NavList', 'test: cover the tree']) {
    assert.equal(entry(subject), null, subject);
  }
});

test('a breaking-change footer says what a site must do', () => {
  const body = 'Longer reasoning.\n\nBREAKING CHANGE: sites pass `storage`\nto Sidebar as well.\n';
  assert.deepEqual(entry('feat(sidebar): remember groups', body), { group: 'Breaking changes', text: '**sidebar:** sites pass `storage` to Sidebar as well.' });
});

test('a section lists the groups in a fixed order and links the commits', () => {
  const section = render([entry('fix: b'), entry('feat: a'), entry('feat!: c'), entry('fix(security): d')], 'https://example.org/compare/v1.0.0...v2.0.0');
  assert.equal(section, [
    '### Breaking changes', '', '- c', '',
    '### Features', '', '- a', '',
    '### Fixed', '', '- b', '',
    '### Security', '', '- d', '',
    '[All commits](https://example.org/compare/v1.0.0...v2.0.0)',
  ].join('\n'));
});

test('a breaking change needs a minor version before 1.0 and a major one after', () => {
  const breaking = [entry('feat!: rename')];
  assert.match(versionProblem('0.2.1', '0.2.2', breaking), /0\.3\.0/);
  assert.equal(versionProblem('0.2.1', '0.3.0', breaking), null);
  assert.match(versionProblem('1.4.0', '1.5.0', breaking), /2\.0\.0/);
  assert.equal(versionProblem('1.4.0', '2.0.0', breaking), null);
  assert.equal(versionProblem('0.2.1', '0.2.2', [entry('feat: add')]), null);
});

test('the commits since the previous tag are the next release', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'quire-changelog-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.org', ...args], { cwd: root });
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '-m', 'feat: first');
  git('tag', 'v0.1.0');
  git('commit', '-q', '--allow-empty', '-m', 'fix: second', '-m', 'BREAKING CHANGE: third');
  git('commit', '-q', '--allow-empty', '-m', 'docs: fourth');
  assert.equal(previousTag(root), 'v0.1.0');
  assert.deepEqual(commits(root, 'v0.1.0').map(({ subject }) => subject), ['fix: second', 'docs: fourth']);
  assert.equal(commits(root, 'v0.1.0')[0].body.trim(), 'BREAKING CHANGE: third');
});

test('the checker reads a hook message past Git comments and refuses a bad subject', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'quire-commit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const message = join(root, 'MSG');
  const run = (...args) => spawnSync(process.execPath, [checker, ...args], { encoding: 'utf8' });
  writeFileSync(message, '# Please enter the commit message\nfeat(contents): add a tree\n\nBody.\n');
  assert.equal(run('--message', message).status, 0);
  writeFileSync(message, 'Add a tree\n');
  const refused = run('--message', message);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /commit message "Add a tree"/);
  assert.equal(run('--subject', 'fix: keep the page in view').status, 0);
  assert.equal(run('--subject').status, 2);
});
