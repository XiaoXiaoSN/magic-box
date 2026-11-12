import { CSV_DELIMITER_NAMES } from './commands';
import { resolveTableShape } from './detect';
import { parseDelimited } from './parse';

/** Directive-looking lines inside quoted table cells remain literal data. */
export function quotedCsvDirectiveOffsets(text: string): Set<number> | null {
  if (!text.includes('"') || !text.includes('\n::')) return null;

  // Only table-shaped first records opt into CSV quoting; prose keeps its
  // existing line-anchored directive semantics.
  const first = /^(?!::)([^\n]*\S[^\n]*)/m.exec(text);
  if (first === null || /^[ \t]*[[{<]/.test(first[0])) return null;
  const hints = text.matchAll(/^::(?:sep|delimiter)[= \t]+([^\n]+)$/gim);
  const shape = resolveTableShape(text.slice(first.index));
  let delimiter = shape.delimiter;
  if ((parseDelimited(first[0], delimiter).rows[0]?.length ?? 0) < 2) {
    for (const match of hints) {
      const hint = match[1].trim();
      const explicit = CSV_DELIMITER_NAMES[hint.toLowerCase()] ?? hint;
      if (
        typeof explicit === 'string' &&
        explicit.length === 1 &&
        (parseDelimited(first[0], explicit).rows[0]?.length ?? 0) > 1
      ) {
        delimiter = explicit;
        break;
      }
    }
  }
  const firstRecord = parseDelimited(text.slice(first.index), delimiter, 1)
    .rows[0];
  if ((firstRecord?.length ?? 0) < 2 && !/^sep=./.test(first[0])) return null;

  const protectedLines = new Set<number>();
  let fieldStart = true;
  let quoted = false;
  for (let index = first.index; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') index += 1;
        else quoted = false;
      } else if (char === '\n' && text.startsWith('::', index + 1)) {
        protectedLines.add(index + 1);
      }
    } else if (char === delimiter || char === '\n') {
      fieldStart = true;
    } else if (fieldStart && char === '"') {
      quoted = true;
      fieldStart = false;
    } else if (char !== ' ' && char !== '\t') {
      fieldStart = false;
    }
  }
  return protectedLines;
}
