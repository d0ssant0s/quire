// Check that the package carries the license and the third-party notices.
// Adapted material may only be distributed with its notice.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const required = ['LICENSE', 'THIRD-PARTY-NOTICES.md'];
const problems = [];

const packed = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }),
);
const files = new Set(packed[0].files.map((entry) => entry.path));
for (const file of required) {
  if (!files.has(file)) problems.push(`the package does not include ${file}`);
}
// The package is the repository root, so a loose files list would ship the
// example site and the scripts too.
for (const file of files) {
  if (/^(examples|scripts|docs|node_modules)\//.test(file)) problems.push(`the package includes ${file}`);
}
if (!readFileSync(join(root, 'THIRD-PARTY-NOTICES.md'), 'utf8').includes('T3 Tools Inc.')) {
  problems.push('THIRD-PARTY-NOTICES.md lacks the t3code copyright notice');
}

if (problems.length) {
  for (const problem of problems) console.error(`check-license: ${problem}`);
  process.exit(1);
}
console.log(`check-license: the package ships ${required.join(' and ')} and no repository tooling`);
