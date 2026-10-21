// Keep public files and commit messages free of private tracker references.
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';

// SPDX identifiers and character encodings are not tracker keys.
const publicIdentifiers = /\b(?:BSD-[234]-Clause|(?:A?GPL|LGPL)-\d\.\d(?:-only|-or-later)?|MPL-[2]\.0|CC-BY(?:-SA)?-\d\.\d|CC0-[1]\.0|UTF-8)\b/g;
const trackerId = /\b[A-Z][0-9A-Z]*-\d+\b/;

function privatePatterns() {
  const path = process.env.QUIRE_REFERENCE_DENY_LIST;
  if (!path) return [];
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    throw new Error('cannot read QUIRE_REFERENCE_DENY_LIST');
  }
  return content.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return [];
    try {
      return [new RegExp(line, 'i')];
    } catch {
      throw new Error(`invalid deny-list pattern at line ${index + 1}`);
    }
  });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--message')) {
    throw new Error('usage: node scripts/check-references.mjs [--message <file>]');
  }
  const patterns = privatePatterns();
  const files = args.length ? [args[1]] : execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).split('\0').filter(Boolean);
  let failed = false;
  for (const file of files) {
    let content;
    try {
      content = lstatSync(file).isSymbolicLink() ? readlinkSync(file) : readFileSync(file, 'utf8');
    } catch (error) {
      if (!args.length && error.code === 'ENOENT') continue; // Tracked deletion.
      throw new Error('cannot read an input file');
    }
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      if (patterns.some((pattern) => pattern.test(line))) {
        console.error(`check-references: deny-list pattern matched in ${args.length ? 'commit message' : 'tracked file'} at line ${index + 1}`);
        failed = true;
      }
      if (trackerId.test(line.replace(publicIdentifiers, ''))) {
        const label = args.length ? 'commit message' : patterns.some((pattern) => pattern.test(file)) ? '<redacted path>' : file;
        console.error(`check-references: ${label}:${index + 1}: tracker-style ID is not allowed`);
        failed = true;
      }
    }
  }
  if (failed) process.exitCode = 1;
  else console.log('check-references: references ok');
}

try {
  main();
} catch (error) {
  console.error(`check-references: ${error.message}`);
  process.exitCode = 1;
}
