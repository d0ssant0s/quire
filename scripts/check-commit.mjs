// Refuse a commit subject that is not a conventional commit; the changelog is
// built from them.
//
//   node scripts/check-commit.mjs --message <file>    a commit-msg hook's message
//   node scripts/check-commit.mjs --subject <text>    a pull request title
//   node scripts/check-commit.mjs --range <a>..<b>    every commit in a range
//
// Options combine, so CI checks a pull request's title and commits at once.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { problem } from './changelog.mjs';

const args = process.argv.slice(2);
const usage = () => {
  console.error('usage: node scripts/check-commit.mjs [--message <file>] [--subject <text>] [--range <a>..<b>]');
  process.exit(2);
};
if (!args.length || args.length % 2) usage();
const subjects = [];
for (let index = 0; index < args.length; index += 2) {
  const [option, value] = [args[index], args[index + 1]];
  if (option === '--message') {
    // Git keeps comment lines in the file it hands the hook.
    const line = readFileSync(value, 'utf8').split('\n').find((text) => text.trim() && !text.startsWith('#'));
    subjects.push(['commit message', line ?? '']);
  } else if (option === '--subject') {
    subjects.push(['pull request title', value]);
  } else if (option === '--range') {
    const log = execFileSync('git', ['log', '--no-merges', '--format=%h %s', value], { encoding: 'utf8' });
    for (const line of log.split('\n').filter(Boolean)) subjects.push([`commit ${line.slice(0, line.indexOf(' '))}`, line.slice(line.indexOf(' ') + 1)]);
  } else {
    usage();
  }
}

let failed = false;
for (const [where, subject] of subjects) {
  const reason = problem(subject);
  if (reason) {
    console.error(`check-commit: ${where} "${subject}": ${reason}`);
    failed = true;
  }
}
if (failed) process.exit(1);
