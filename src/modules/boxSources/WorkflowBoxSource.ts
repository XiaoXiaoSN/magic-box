import { decodeBase64 } from '@functions/base64';
import { evaluatePointer } from '@functions/json/pointer';
import { errorMessage, parseJson, stringifyJson } from '@functions/json/shared';
import {
  type Box,
  BoxBuilder,
  type BoxOptions,
  errorBox,
  extractOptionKeys,
} from '@modules/Box';
import type { BoxSourceContext } from '@modules/BoxSource';

type Step =
  | { tool: 'base64-decode' }
  | { tool: 'json-pointer'; pointer: string }
  | { tool: 'json-format' };

const MAX_TEXT_LENGTH = 100_000;
const MAX_RECIPE_LENGTH = 4_096;
const MAX_STEPS = 8;

const labels: Record<Step['tool'], string> = {
  'base64-decode': 'Base64 Decode',
  'json-pointer': 'JSON Pointer',
  'json-format': 'Format JSON',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseRecipe(value: string | boolean): Step[] {
  if (typeof value !== 'string' || value.length > MAX_RECIPE_LENGTH) {
    throw new Error(
      'Give ::workflow a JSON recipe of at most 4096 characters.',
    );
  }
  const recipe: unknown = JSON.parse(value);
  if (
    !isObject(recipe) ||
    recipe.version !== 1 ||
    !Array.isArray(recipe.steps)
  ) {
    throw new Error('Expected a version 1 workflow with a steps array.');
  }
  if (recipe.steps.length === 0 || recipe.steps.length > MAX_STEPS) {
    throw new Error('A workflow must contain between 1 and 8 steps.');
  }
  return recipe.steps.map((step: unknown, index: number): Step => {
    if (isObject(step)) {
      if (step.tool === 'base64-decode' || step.tool === 'json-format')
        return { tool: step.tool };
      if (step.tool === 'json-pointer' && typeof step.pointer === 'string')
        return { tool: step.tool, pointer: step.pointer };
    }
    throw new Error(
      `Step ${index + 1} has an unsupported tool or is missing a JSON Pointer.`,
    );
  });
}

function runStep(input: string, step: Step): string {
  switch (step.tool) {
    case 'base64-decode': {
      const decoded = decodeBase64(input).readableText;
      if (decoded === null)
        throw new Error('Decoded bytes are not supported text.');
      return decoded;
    }
    case 'json-pointer':
      return stringifyJson(evaluatePointer(parseJson(input), step.pointer), 2);
    case 'json-format':
      return stringifyJson(parseJson(input), 4);
  }
}

export default {
  name: 'Workflow',
  description:
    'Replay a local sequence of Base64 decode, JSON Pointer and JSON formatting with ::workflow.',
  defaultInput:
    'eyJwYXlsb2FkIjp7Im4iOjQyfX0=\n::workflow={"version":1,"steps":[{"tool":"base64-decode"},{"tool":"json-pointer","pointer":"/payload"},{"tool":"json-format"}]}',
  tag: '→',
  kind: 'Transform',

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
    context?: BoxSourceContext,
  ): Promise<Box[]> {
    const recipe = extractOptionKeys(options, 'workflow');
    if (recipe === null || context?.signal?.aborted) return [];
    if (input.length > MAX_TEXT_LENGTH)
      return [errorBox('Workflow', 'Input exceeds 100000 characters.')];

    let steps: Step[];
    try {
      steps = parseRecipe(recipe);
    } catch (error) {
      return [errorBox('Workflow', errorMessage(error))];
    }

    const boxes: Box[] = [];
    let value = input;
    for (const [index, step] of steps.entries()) {
      if (context?.signal?.aborted) return [];
      const name = `Step ${index + 1} · ${labels[step.tool]}`;
      try {
        value = runStep(value, step);
        if (value.length > MAX_TEXT_LENGTH)
          throw new Error('Output exceeds 100000 characters.');
        boxes.push(
          new BoxBuilder(name, value)
            .setOptions({
              language: step.tool === 'base64-decode' ? 'plaintext' : 'json',
            })
            .setView('code')
            .build(),
        );
      } catch (error) {
        return [...boxes, errorBox(name, errorMessage(error))];
      }
    }
    return boxes;
  },
};
