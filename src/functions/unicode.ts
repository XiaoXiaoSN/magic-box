const graphemeSegmenter =
  typeof Intl.Segmenter === 'undefined'
    ? null
    : new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const wordSegmenter =
  typeof Intl.Segmenter === 'undefined'
    ? null
    : new Intl.Segmenter(undefined, { granularity: 'word' });

export function* iterateGraphemes(text: string): IterableIterator<string> {
  if (graphemeSegmenter) {
    for (const { segment } of graphemeSegmenter.segment(text)) yield segment;
    return;
  }

  for (let index = 0; index < text.length; ) {
    if (text[index] === '\r' && text[index + 1] === '\n') {
      yield '\r\n';
      index += 2;
      continue;
    }

    const codePoint = text.codePointAt(index) ?? 0;
    const length = codePoint > 0xffff ? 2 : 1;
    yield text.slice(index, index + length);
    index += length;
  }
}

export function graphemes(text: string): string[] {
  return Array.from(iterateGraphemes(text));
}

export function countGraphemes(text: string): number {
  if (graphemeSegmenter) {
    let count = 0;
    for (const _ of graphemeSegmenter.segment(text)) count++;
    return count;
  }

  let count = 0;
  for (let index = 0; index < text.length; count++) {
    if (text[index] === '\r' && text[index + 1] === '\n') {
      index += 2;
    } else {
      index += (text.codePointAt(index) ?? 0) > 0xffff ? 2 : 1;
    }
  }
  return count;
}

export function countWords(text: string): number {
  if (!wordSegmenter) {
    const trimmed = text.trim();
    return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  }

  let count = 0;
  for (const segment of wordSegmenter.segment(text)) {
    if (segment.isWordLike) count++;
  }
  return count;
}

export function compareCodePoints(a: string, b: string): number {
  let aIndex = 0;
  let bIndex = 0;

  while (aIndex < a.length && bIndex < b.length) {
    const aCodePoint = a.codePointAt(aIndex) ?? 0;
    const bCodePoint = b.codePointAt(bIndex) ?? 0;
    if (aCodePoint !== bCodePoint) return aCodePoint - bCodePoint;
    aIndex += aCodePoint > 0xffff ? 2 : 1;
    bIndex += bCodePoint > 0xffff ? 2 : 1;
  }

  if (aIndex === a.length && bIndex === b.length) return 0;
  return aIndex === a.length ? -1 : 1;
}
