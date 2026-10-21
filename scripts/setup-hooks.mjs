import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

try {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const configured = spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: root, encoding: 'utf8' });
  if (configured.status !== 0 && configured.status !== 1) throw new Error('cannot read Git hook configuration');
  const current = configured.stdout.trim();
  if (current && current !== '.githooks') {
    throw new Error('core.hooksPath is already configured; integrate the commit-msg check into your existing hooks');
  }
  if (!current) {
    const hookPath = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], { cwd: root, encoding: 'utf8' }).trim();
    const directory = resolve(root, hookPath);
    if (existsSync(directory) && readdirSync(directory).some((name) => !name.endsWith('.sample'))) {
      throw new Error('Git hooks already exist; integrate the commit-msg check into your existing hooks');
    }
  }
  if (!existsSync(join(root, '.githooks/commit-msg'))) throw new Error('tracked commit-msg hook is missing');
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root });
  console.log('setup-hooks: installed .githooks/commit-msg');
} catch (error) {
  console.error(`setup-hooks: ${error.message}`);
  process.exitCode = 1;
}
