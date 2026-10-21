---
layout: ../layouts/Doc.astro
title: Reading styles
---

<p class="quire-doc-meta"><span class="quire-doc-status">Accepted</span><span>Sections 2–4</span><span><a href="/">Home</a></span></p>

Every element on this page is plain Markdown or the small set of HTML a site's
staging writes into it. A [link](https://example.org) and `inline code` follow
the accent and the code tokens.

## Lists and quotes

- A bullet
- Another, with **strong** text

1. First
2. Second

> A quotation stays muted and indented.

## Code

```js
// Shiki writes both themes; the page's scheme picks one.
const answer = 42;
```

## Tables

| Field | Value |
| --- | --- |
| Status | Done |
| A long cell | Wide tables scroll inside their own frame rather than widening the page. |

## Disclosure

<details><summary>More detail</summary>

Hidden until opened.

</details>

<details class="quire-accordion" open><summary><h3>An accordion term</h3></summary>

The marker turns when it opens.

</details>

## Source view

<pre class="quire-source-view"><span id="L1" class="quire-source-line">first: line</span><span id="L2" class="quire-source-line">second: line</span></pre>

<p class="quire-page-origin">Source: <code>docs/guide.md</code></p>
