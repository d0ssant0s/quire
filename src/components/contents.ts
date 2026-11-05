// What the contents rail (Contents) and the narrow-screen disclosure
// (NarrowContents) share: which headings they list, how deep each sits, and
// which heading the reader is on.
import type { MarkdownHeading } from 'astro';

/** A listed heading, `level` deep below the shallowest listed depth. */
export interface ListedHeading extends MarkdownHeading { level: number }
export interface Branch extends ListedHeading { children: Branch[] }

/** The headings between the two depths, in page order. */
export function listedHeadings(headings: MarkdownHeading[], minDepth: number, maxDepth: number): ListedHeading[] {
  return headings
    .filter((heading) => heading.depth >= minDepth && heading.depth <= maxDepth)
    .map((heading) => ({ ...heading, level: heading.depth - minDepth }));
}

/**
 * Nests each heading under the nearest earlier heading shallower than it. With
 * `nest` off every heading stays at the top, as a flat list.
 */
export function contentsTree(listed: ListedHeading[], nest: boolean): Branch[] {
  const roots: Branch[] = [];
  const stack: Branch[] = [];
  for (const heading of listed) {
    const node: Branch = { ...heading, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= heading.depth) stack.pop();
    const parent = nest ? stack[stack.length - 1] : undefined;
    (parent ? parent.children : roots).push(node);
    stack.push(node);
  }
  return roots;
}

/**
 * The index of the heading being read: the last one past the reading line. A
 * heading counts as read once it passes the top quarter of the window, or the
 * scroll margin a link lands it at, whichever is lower.
 */
export function readingIndex(targets: (HTMLElement | null)[]): number {
  const first = targets.find(Boolean);
  const margin = first ? parseFloat(getComputedStyle(first).scrollMarginTop) || 0 : 0;
  const line = Math.max(margin, innerHeight * 0.25);
  let active = 0;
  targets.forEach((target, index) => {
    if (target && target.getBoundingClientRect().top - line <= 0) active = index;
  });
  return active;
}

/** The elements a list of contents links points at, by their hash. */
export function linkTargets(links: HTMLAnchorElement[]): (HTMLElement | null)[] {
  return links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))));
}
