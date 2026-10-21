# Contributing

This repository is public. In files, commit messages and issues, cite quire's
GitHub issues with `#12` or a github.com URL. Keep other trackers' IDs, private
project and organisation names, local paths, machine names and unrelated
commit hashes out of public text.

After installing dependencies, install the commit-message hook for this clone:

```sh
mise exec -- npm run setup:hooks
```

The hook requires Node on Git's PATH. Use `mise exec -- git commit` if your
shell does not already provide it. Setup refuses to replace existing hooks;
if you maintain your own, add `node scripts/check-references.mjs --message "$1"`
to your commit-msg hook instead.

`mise exec -- npm run check` checks tracked working-tree files. The hook checks
the proposed commit message using the same checker. Uppercase tracker keys
followed by a hyphen and number are rejected; common SPDX license identifiers
and UTF-8 are allowed. Stage new files before running the file check.

For private names or other tracker formats, keep a deny-list outside the
repository and export `QUIRE_REFERENCE_DENY_LIST` with its absolute path.
Each nonempty line is a case-insensitive JavaScript regular expression.
Lines starting with `#` are comments. Escape punctuation when matching it
literally. The checker refuses unreadable files or invalid expressions and
reports matches without printing the private text or patterns.

The deny-list is optional. CI runs `npm run check` without it and still checks
tracker IDs. Never commit the deny-list or put its contents into an issue.
Review text for private references the automated rules cannot recognise.
