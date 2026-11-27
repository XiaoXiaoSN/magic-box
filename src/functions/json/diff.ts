import { isLosslessNumber, splitNumber } from 'lossless-json';
import {
  errorMessage,
  isJsonObject,
  type JsonValue,
  parseJson,
  stringifyJson,
} from './shared';

export const MAX_JSON_DIFF_LENGTH = 20_000;
const MAX_RESULT_LENGTH = 256 * 1024;

type Change =
  | { op: 'add'; path: string; after: JsonValue }
  | { op: 'remove'; path: string; before: JsonValue }
  | { op: 'replace'; path: string; before: JsonValue; after: JsonValue };

export type JsonDiffResult =
  | { ok: true; output: string; patch: string }
  | { ok: false; message: string };

function numericValue(value: JsonValue): string | undefined {
  if (typeof value !== 'number' && !isLosslessNumber(value)) return undefined;
  const [mantissa, exponent = '0'] = value.toString().toLowerCase().split('e');
  const parts = splitNumber(mantissa);
  if (parts.digits === '0') return '0';
  // Use a BigInt exponent so even enormous JSON exponent literals compare exactly.
  return `${parts.sign}${parts.digits}e${BigInt(exponent) + BigInt(parts.exponent)}`;
}

function appendPath(path: string, key: string): string {
  return `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

function diffValues(
  before: JsonValue,
  after: JsonValue,
  path: string,
  changes: Change[],
): void {
  if (before === after) return;

  if (Array.isArray(before) && Array.isArray(after)) {
    const shared = Math.min(before.length, after.length);
    for (let index = 0; index < shared; index++) {
      diffValues(before[index], after[index], `${path}/${index}`, changes);
    }
    // Removing from the end keeps earlier indexes valid throughout the patch.
    for (let index = before.length - 1; index >= shared; index--) {
      changes.push({
        op: 'remove',
        path: `${path}/${index}`,
        before: before[index],
      });
    }
    for (let index = shared; index < after.length; index++) {
      changes.push({
        op: 'add',
        path: `${path}/${index}`,
        after: after[index],
      });
    }
    return;
  }

  if (isJsonObject(before) && isJsonObject(after)) {
    const keys = [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].sort();
    for (const key of keys) {
      const child = appendPath(path, key);
      if (!Object.hasOwn(before, key)) {
        changes.push({ op: 'add', path: child, after: after[key] });
      } else if (!Object.hasOwn(after, key)) {
        changes.push({ op: 'remove', path: child, before: before[key] });
      } else {
        diffValues(before[key], after[key], child, changes);
      }
    }
    return;
  }

  const beforeNumber = numericValue(before);
  if (beforeNumber !== undefined && beforeNumber === numericValue(after))
    return;
  changes.push({ op: 'replace', path, before, after });
}

export function compareJson(before: string, after: string): JsonDiffResult {
  if (before.length + after.length > MAX_JSON_DIFF_LENGTH) {
    return {
      ok: false,
      message: `The combined JSON inputs exceed ${MAX_JSON_DIFF_LENGTH} characters.`,
    };
  }

  try {
    const changes: Change[] = [];
    diffValues(
      parseJson(before, 'Original input'),
      parseJson(after, 'Second input'),
      '',
      changes,
    );
    const output = stringifyJson(changes, 2);
    if (output.length > MAX_RESULT_LENGTH) {
      return {
        ok: false,
        message: 'The JSON comparison produced too many changes.',
      };
    }
    const patch = stringifyJson(
      changes.map((change) => {
        const { op, path } = change;
        return change.op === 'remove'
          ? { op, path }
          : { op, path, value: change.after };
      }),
      2,
    );
    return { ok: true, output, patch };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
