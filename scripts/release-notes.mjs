// Print a release's section of CHANGELOG.md, for its GitHub release page:
// node scripts/release-notes.mjs <version>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const version = process.argv[2];
const changelog = readFileSync(join(new URL('..', import.meta.url).pathname, 'CHANGELOG.md'), 'utf8');
const escaped = (version ?? '').replace(/\./g, '\\.');
const section = changelog.match(new RegExp(`^## ${escaped} \\([^)]*\\)\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
if (!version || !section?.[1].trim()) {
  console.error(`release-notes: CHANGELOG.md has no entries for ${version ?? '<version>'}`);
  process.exit(1);
}
process.stdout.write(`${section[1].trim()}\n`);
