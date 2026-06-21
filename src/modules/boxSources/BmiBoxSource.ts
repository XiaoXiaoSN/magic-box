import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// token regex: a number followed by a unit label
const TOKEN_RE = /(\d+(?:\.\d+)?)\s*(kg|lb|lbs|cm|m|in|"|ft)/gi;

interface ParsedMeasurements {
  weightKg: number;
  heightM: number;
}

// returns a formatted "k: v\n..." plaintext block for KeyValueBoxTemplate
function kvToPlaintext(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// parse two value+unit tokens from the input, normalize to kg and meters
function parseMeasurements(input: string): ParsedMeasurements | null {
  TOKEN_RE.lastIndex = 0;
  const tokens: Array<{ value: number; unit: string }> = [];

  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard exec-loop idiom
  while ((match = TOKEN_RE.exec(input)) !== null) {
    tokens.push({
      value: Number.parseFloat(match[1]),
      unit: match[2].toLowerCase(),
    });
  }

  if (tokens.length < 2) return null;

  let weightKg: number | null = null;
  let heightM: number | null = null;

  for (const { value, unit } of tokens) {
    switch (unit) {
      case 'kg':
        weightKg = value;
        break;
      case 'lb':
      case 'lbs':
        weightKg = value * 0.453592;
        break;
      case 'm':
        heightM = value;
        break;
      case 'cm':
        heightM = value / 100;
        break;
      case 'in':
      case '"':
        heightM = value * 0.0254;
        break;
      case 'ft':
        heightM = value * 0.3048;
        break;
    }
  }

  if (weightKg === null || heightM === null || heightM === 0) return null;

  return { weightKg, heightM };
}

export const BmiBoxSource = {
  name: 'BMI',
  description:
    'Compute Body Mass Index. Input: "<weight>kg <height>m" or "<weight>lb <height>in".',
  defaultInput: '70kg 1.75m ::bmi',
  tag: '#',
  kind: 'Calculate',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'bmi')) return [];

    const cleaned = trim(input);
    if (!cleaned || cleaned.length > 64) return [];

    const parsed = parseMeasurements(cleaned);

    if (parsed === null) {
      // no valid units found — return a guidance box
      const guideData: Record<string, string> = {
        'Weight units': 'kg  or  lb / lbs',
        'Height units': 'm  or  cm  or  in / "  or  ft',
        'Example (metric)': '70kg 1.75m ::bmi',
        'Example (imperial)': '154lb 69in ::bmi',
      };
      return [
        new BoxBuilder('BMI', kvToPlaintext(guideData))
          .setOptions(guideData)
          .setTemplate(KeyValueBoxTemplate)
          .setPriority(this.priority)
          .build(),
      ];
    }

    const { weightKg, heightM } = parsed;
    const bmi = weightKg / (heightM * heightM);
    const bmiRounded = Math.round(bmi * 10) / 10;
    const category = getBmiCategory(bmiRounded);

    const kvData: Record<string, string> = {
      Weight: `${weightKg.toFixed(2)} kg`,
      Height: `${heightM.toFixed(4)} m`,
      BMI: bmiRounded.toFixed(1),
      Category: category,
    };

    return [
      new BoxBuilder('BMI', kvToPlaintext(kvData))
        .setOptions(kvData)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default BmiBoxSource;
