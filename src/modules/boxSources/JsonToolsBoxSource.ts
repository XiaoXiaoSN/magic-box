import { CodeBoxTemplate } from '@components/BoxTemplate';
import {
  type RequestedJsonTool,
  requestedJsonTools,
} from '@functions/json/commands';
import { convertJsonl } from '@functions/json/jsonl';
import { mergeDocuments } from '@functions/json/merge';
import { omitKeys, parseKeyList, pickKeys } from '@functions/json/pickOmit';
import { evaluatePointer } from '@functions/json/pointer';
import {
  JsonToolError,
  parseJson,
  parseJsonObject,
} from '@functions/json/shared';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;
const SOURCE_NAME = 'JSON Tools';

interface JsonToolResult {
  name: string;
  output: string;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function keyList(tool: RequestedJsonTool): string[] {
  const keys = typeof tool.value === 'string' ? parseKeyList(tool.value) : [];
  if (keys.length === 0) {
    throw new JsonToolError(
      `Usage: give a comma-separated key list, e.g. ::${tool.key}=a,b`,
    );
  }
  return keys;
}

function runTool(tool: RequestedJsonTool, input: string): JsonToolResult {
  switch (tool.operation) {
    case 'merge':
      return { name: 'JSON Merge', output: pretty(mergeDocuments(input)) };
    case 'pick':
      return {
        name: 'JSON Pick',
        output: pretty(pickKeys(parseJsonObject(input), keyList(tool))),
      };
    case 'omit':
      return {
        name: 'JSON Omit',
        output: pretty(omitKeys(parseJsonObject(input), keyList(tool))),
      };
    case 'pointer': {
      // the parser turns both `::jsonpointer` and `::jsonpointer=` into `true`;
      // either way no pointer was given, and RFC 6901's empty pointer — the
      // whole document — is exactly that
      const pointer = typeof tool.value === 'string' ? tool.value : '';
      return {
        name: 'JSON Pointer',
        output: pretty(evaluatePointer(parseJson(input), pointer)),
      };
    }
    case 'jsonl':
    case 'toJsonl':
    case 'fromJsonl': {
      const mode =
        tool.operation === 'toJsonl'
          ? 'to'
          : tool.operation === 'fromJsonl'
            ? 'from'
            : 'auto';
      const { direction, output } = convertJsonl(input, mode);
      return { name: direction === 'to' ? 'To JSONL' : 'From JSONL', output };
    }
  }
}

export const JsonToolsBoxSource = {
  defaultDisabled: true,
  name: SOURCE_NAME,
  description:
    'Merge, pick/omit, query (RFC 6901 JSON Pointer) and JSONL-convert JSON. ' +
    '::jsonmerge (objects separated by a --- line), ::jsonpick=a,b, ' +
    '::jsonomit=a,b, ::jsonpointer=/a/0, ::tojsonl, ::fromjsonl, ::jsonl (auto).',
  defaultInput: '{"a":1,"b":{"x":1}}\n---\n{"b":{"y":2},"c":3}\n::jsonmerge',
  tag: '{}',
  kind: 'Transform',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const tools = requestedJsonTools(options);
    if (tools.length === 0) return [];

    const trimmed = input.trim();
    // nothing typed yet besides the directive — an error here would only flicker
    if (trimmed === '') return [];

    const fail = (message: string): Box[] => [
      errorBox(SOURCE_NAME, message, { priority: this.priority }),
    ];

    if (tools.length > 1) {
      const given = tools.map((t) => `::${t.key}`).join(', ');
      return fail(`Use one JSON Tools operation at a time (got ${given}).`);
    }
    if (trimmed.length > MAX_INPUT) {
      return fail(
        `Input is too large (${trimmed.length} characters, limit ${MAX_INPUT}).`,
      );
    }

    let result: JsonToolResult;
    try {
      result = runTool(tools[0], trimmed);
    } catch (err) {
      if (err instanceof JsonToolError) return fail(err.message);
      // deep merge and JSON.stringify recurse per nesting level; a document
      // JSON.parse still accepted can overflow the stack
      if (err instanceof RangeError) {
        return fail('The JSON is nested too deeply to process.');
      }
      throw err;
    }

    return [
      new BoxBuilder(result.name, result.output)
        .setOptions({ language: 'json' })
        .setTemplate(CodeBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default JsonToolsBoxSource;
