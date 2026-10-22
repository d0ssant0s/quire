// Conventional commit subjects and the changelog sections built from them.
//
//   node scripts/changelog.mjs   prints the section the next release would get
//
// A subject is `type(scope)!: summary`. The type decides the group a change is
// listed under, a `security` scope moves it under Security, and `!` or a
// `BREAKING CHANGE:` footer under Breaking changes. Types that change nothing
// a site sees stay out of the changelog.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Each type and its group; null keeps the change out of the changelog. */
export const TYPES = {
  feat: 'Features',
  fix: 'Fixed',
  perf: 'Changed',
  revert: 'Changed',
  refactor: null,
  docs: null,
  style: null,
  test: null,
  build: null,
  ci: null,
  chore: null,
};
export const GROUPS = ['Breaking changes', 'Features', 'Changed', 'Fixed', 'Security'];

const SUBJECT = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9][a-z0-9-]*)\))?(?<breaking>!)?: (?<summary>\S.*)$/;
// Messages Git writes itself, which a commit hook sees before they are edited.
const GENERATED = /^(Merge |Revert "|fixup! |squash! |amend! )/;
const MAX_SUBJECT = 100;

/** Why a subject is not a conventional commit, or null when it is one. */
export function problem(subject) {
  if (GENERATED.test(subject)) return null;
  const match = SUBJECT.exec(subject);
  if (!match) return 'write the subject as `type(scope): summary`, for example `fix(sidebar): keep the current page in view`';
  const { type, summary } = match.groups;
  if (!(type in TYPES)) return `\`${type}\` is not a commit type; use one of ${Object.keys(TYPES).join(', ')}`;
  if (summary.endsWith('.')) return 'end the summary without a full stop';
  if (subject.length > MAX_SUBJECT) return `keep the subject within ${MAX_SUBJECT} characters`;
  return null;
}

/** A commit's changelog entry, or null when its type stays out of the changelog. */
export function entry(subject, body = '') {
  const match = SUBJECT.exec(subject);
  if (!match) return null;
  const { type, scope, breaking, summary } = match.groups;
  const footer = /^BREAKING[ -]CHANGE: (.+(?:\n(?!\n).+)*)/m.exec(body);
  const group = breaking || footer ? 'Breaking changes' : scope === 'security' ? 'Security' : TYPES[type];
  if (!group) return null;
  // A breaking change reads as its footer when it has one, which says what a
  // site must do; the subject says only what changed.
  const text = footer ? footer[1].replace(/\s*\n\s*/g, ' ') : summary;
  const label = scope && scope !== 'security' ? `**${scope}:** ` : '';
  return { group, text: `${label}${text}` };
}

/** The commits after `from` (a tag, or none for the whole history) up to HEAD. */
export function commits(root, from) {
  const range = from ? [`${from}..HEAD`] : ['HEAD'];
  const log = execFileSync('git', ['log', '--no-merges', '--reverse', '--format=%s%x00%b%x1e', ...range], { cwd: root, encoding: 'utf8' });
  return log
    .split('\x1e')
    .map((record) => record.replace(/^\n/, ''))
    .filter(Boolean)
    .map((record) => {
      const [subject, body = ''] = record.split('\x00');
      return { subject, body };
    });
}

/** The newest release tag reachable from HEAD, or undefined before the first. */
export function previousTag(root) {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
}

/** The grouped body of a release's section: one `###` heading per group. */
export function render(list, compare) {
  const groups = new Map(GROUPS.map((group) => [group, []]));
  for (const { group, text } of list) groups.get(group).push(text);
  const parts = [...groups].filter(([, texts]) => texts.length).map(([group, texts]) => `### ${group}\n\n${texts.map((text) => `- ${text}`).join('\n')}`);
  if (compare) parts.push(`[All commits](${compare})`);
  return parts.join('\n\n');
}

/**
 * Why `version` cannot follow `previous` given the changes, or null. Before
 * 1.0 a minor version marks a breaking change; from 1.0, a major one.
 */
export function versionProblem(previous, version, list) {
  if (!list.some((item) => item.group === 'Breaking changes')) return null;
  const [major, minor] = version.split('.').map(Number);
  const [lastMajor, lastMinor] = previous.split('.').map(Number);
  if (lastMajor === 0 && major === 0 && minor === lastMinor) return `the changes break sites, so ${version} must raise the minor version, as 0.${lastMinor + 1}.0`;
  if (lastMajor > 0 && major === lastMajor) return `the changes break sites, so ${version} must raise the major version, as ${lastMajor + 1}.0.0`;
  return null;
}

/** The repository's web address, from the package's repository field. */
export function webAddress(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('..', import.meta.url).pathname;
  const from = previousTag(root);
  const list = commits(root, from).map(({ subject, body }) => entry(subject, body)).filter(Boolean);
  console.log(list.length ? render(list) : `No changes for the changelog since ${from ?? 'the first commit'}.`);
}
