import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const checker = resolve('scripts/check-references.mjs');
const trackerId = ['EXAMPLE', '123'].join('-');

function repository(t) {
  const root = mkdtempSync(join(tmpdir(), 'quire-references-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  return root;
}

function check(root, args = [], env = {}) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, QUIRE_REFERENCE_DENY_LIST: '', ...env },
  });
}

function track(root, name, content) {
  writeFileSync(join(root, name), content);
  execFileSync('git', ['add', '--', name], { cwd: root });
}

test('checks tracked files, accepts GitHub references and SPDX licenses', (t) => {
  const root = repository(t);
  track(root, 'notes.md', '#12 https://github.com/d0ssant0s/quire/issues/1\nBSD-3-Clause LGPL-3.0-or-later MPL-2.0 UTF-8\n');
  writeFileSync(join(root, 'untracked.md'), trackerId);
  assert.equal(check(root).status, 0);
  track(root, 'notes.md', `See ${trackerId}\n`);
  const result = check(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /notes\.md:1/);
  assert.ok(!result.stderr.includes(trackerId));
});

test('uses an external deny-list for files and messages without disclosing matches', (t) => {
  const root = repository(t);
  const outside = repository(t);
  const denyList = join(outside, 'deny-list');
  const privateName = ['synthetic', 'organisation'].join(' ');
  writeFileSync(denyList, '# One regular expression per line\n\nsynthetic\\s+organisation\n');
  track(root, 'notes.md', privateName.toUpperCase());
  const env = { QUIRE_REFERENCE_DENY_LIST: denyList };
  assert.equal(check(root).status, 0);
  for (const args of [[], ['--message', 'notes.md']]) {
    const result = check(root, args, env);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /deny-list pattern/);
    assert.ok(!result.stderr.toLowerCase().includes(privateName));
    assert.ok(!result.stderr.includes(denyList));
  }
  writeFileSync(denyList, '[invalid');
  const invalid = check(root, [], env);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /invalid deny-list pattern at line 1/);
  assert.ok(!invalid.stderr.includes('[invalid'));
  assert.equal(check(root, [], { QUIRE_REFERENCE_DENY_LIST: join(outside, 'missing') }).status, 1);
});

test('installed commit hook rejects a private message and preserves existing hook configuration', (t) => {
  const root = repository(t);
  const setup = resolve('scripts/setup-hooks.mjs');
  const runSetup = () => spawnSync(process.execPath, [setup], { cwd: root, encoding: 'utf8' });
  execFileSync('git', ['config', 'core.hooksPath', 'custom-hooks'], { cwd: root });
  assert.equal(runSetup().status, 1);
  assert.equal(execFileSync('git', ['config', 'core.hooksPath'], { cwd: root, encoding: 'utf8' }).trim(), 'custom-hooks');
  execFileSync('git', ['config', '--unset', 'core.hooksPath'], { cwd: root });
  const existingHook = join(root, '.git/hooks/pre-commit');
  writeFileSync(existingHook, '#!/bin/sh\nexit 0\n');
  assert.equal(runSetup().status, 1);
  assert.match(runSetup().stderr, /hooks already exist/);
  rmSync(existingHook);
  // Install the tracked hook and checker as they will appear in a fresh clone.
  for (const directory of ['.githooks', 'scripts']) {
    cpSync(resolve(directory), join(root, directory), { recursive: true });
  }
  assert.equal(runSetup().status, 0);
  assert.equal(runSetup().status, 0);
  track(root, 'notes.md', '#12');
  const commit = (message) => spawnSync('git', [
    '-c', 'user.name=Test', '-c', 'user.email=test@example.org',
    'commit', '-m', message,
  ], { cwd: root, encoding: 'utf8', env: { ...process.env, QUIRE_REFERENCE_DENY_LIST: '' } });
  assert.equal(commit(`Fix ${trackerId}`).status, 1);
  const accepted = commit('Fix #12');
  assert.equal(accepted.status, 0, accepted.stderr);
});
