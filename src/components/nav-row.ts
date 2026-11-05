// The one row style the section sidebar and the contents rail share, so both
// columns keep the same rhythm: one line of 14px text in a 32 px row, a 6px
// radius, and the current entry as a filled pill. A row's label goes in a
// `navLabel` span, which truncates a long title rather than wrapping it.

/** A navigation row: a link, a group's summary or a contents entry. */
export const navRow = 'flex h-[32px] min-w-0 items-center gap-[8px] rounded-[6px] px-[8px] text-[14px] leading-[20px] hover:bg-subtle hover:text-fg';

/** The current page (`aria-current=page`) or heading (`aria-current=true`). */
export const navRowCurrent =
  'aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent aria-[current=true]:bg-accent-soft aria-[current=true]:font-medium aria-[current=true]:text-accent';

/** The label inside a row: one line, cut with an ellipsis. */
export const navLabel = 'min-w-0 flex-1 truncate';
