// Check that the published package carries the license and the third-party
// notices, and that the repository's copies match the package's. Adapted
// material may only be distributed with its notice.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const required = ['LICENSE', 'THIRD-PARTY-NOTICES.md'];
const problems = [];

for (const file of required) {
  const published = readFileSync(join(root, 'packages/quire', file), 'utf8');
  if (readFileSync(join(root, file), 'utf8') !== published) {
    problems.push(`${file} differs between the repository root and packages/quire`);
  }
}

const packed = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--workspace', 'packages/quire'], {
    cwd: root,
    encoding: 'utf8',
  }),
);
const files = new Set(packed[0].files.map((entry) => entry.path));
for (const file of required) {
  if (!files.has(file)) problems.push(`the published package does not include ${file}`);
}
if (!readFileSync(join(root, 'packages/quire/THIRD-PARTY-NOTICES.md'), 'utf8').includes('T3 Tools Inc.')) {
  problems.push('THIRD-PARTY-NOTICES.md lacks the t3code copyright notice');
}

if (problems.length) {
  for (const problem of problems) console.error(`check-license: ${problem}`);
  process.exit(1);
}
console.log(`check-license: the package ships ${required.join(' and ')}`);
