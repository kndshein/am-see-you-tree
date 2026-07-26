import { Fragment, ReactNode } from 'react';

// Patch notes (assets/patch-notes.json) only ever use <i> to italicize MCU
// titles — this trades a dangerouslySetInnerHTML render for a parser scoped
// to exactly that one tag, rather than pulling in a general-purpose HTML
// sanitizer this site otherwise has no use for.
export function renderItalicMarkup(text: string): ReactNode {
  return text.split(/(<i>.*?<\/i>)/g).map((part, idx) => {
    const match = part.match(/^<i>(.*)<\/i>$/);
    return match ? (
      <i key={idx}>{match[1]}</i>
    ) : (
      <Fragment key={idx}>{part}</Fragment>
    );
  });
}
