import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

// token regex: a number followed by a unit label
const TOKEN_RE = /(\d+(?:\.\d+)?)\s*(kg|lb|lbs|cm|m|in|"|ft|')/gi;

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
  let metricHeightUnit: 'm' | 'cm' | null = null;
  let feet: number | null = null;
  let inches: number | null = null;
  let hasImperialHeight = false;

  for (const { value, unit } of tokens) {
    switch (unit) {
      case 'kg':
        if (weightKg !== null) return null;
        weightKg = value;
        break;
      case 'lb':
      case 'lbs':
        if (weightKg !== null) return null;
        weightKg = value * 0.453592;
        break;
      case 'm':
        if (metricHeightUnit !== null || hasImperialHeight) return null;
        metricHeightUnit = 'm';
        heightM = value;
        break;
      case 'cm':
        if (metricHeightUnit !== null || hasImperialHeight) return null;
        metricHeightUnit = 'cm';
        heightM = value / 100;
        break;
      case 'in':
      case '"':
        if (inches !== null || metricHeightUnit !== null) return null;
        hasImperialHeight = true;
        inches = value;
        break;
      case 'ft':
      case "'":
        if (feet !== null || metricHeightUnit !== null) return null;
        hasImperialHeight = true;
        feet = value;
        break;
    }
  }

  if (hasImperialHeight) {
    heightM = (feet ?? 0) * 0.3048 + (inches ?? 0) * 0.0254;
  }

  if (weightKg === null || heightM === null || heightM === 0) return null;

  return { weightKg, heightM };
}

export const BmiBoxSource = {
  defaultDisabled: true,
  name: 'BMI',
  description:
    'Compute Body Mass Index. Input: "<weight>kg <height>m" or "<weight>lb <height>in".',
  defaultInput: '70kg 1.75m\n::bmi',
  tag: '#',
  kind: 'Calculate',

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
        'Example (metric)': '70kg 1.75m\n::bmi',
        'Example (imperial)': '154lb 69in\n::bmi',
      };
      return [
        new BoxBuilder('BMI', kvToPlaintext(guideData))
          .setOptions(guideData)
          .setView('keyValue')

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
        .setView('keyValue')

        .build(),
    ];
  },
};

export default BmiBoxSource;
