import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

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

// Parse the whole input as weight and height tokens, with an optional second
// height token for feet and inches.
function parseMeasurements(input: string): ParsedMeasurements | null {
  // Match at the current position so signs and stray text are never skipped.
  // Tokens can be separated by whitespace or adjacent in notation like 5'10".
  const token = /\s*(\+?(?:\d+(?:\.\d+)?|\.\d+))\s*(kg|lbs?|cm|m|in|"|ft|')/iy;

  let weightKg: number | null = null;
  let heightM: number | null = null;
  let feet: number | null = null;
  let inches: number | null = null;

  while (token.lastIndex < input.length) {
    const match = token.exec(input);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    const unit = match[2].toLowerCase();

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
      case 'cm':
        if (heightM !== null || feet !== null || inches !== null) return null;
        heightM = unit === 'cm' ? value / 100 : value;
        break;
      case 'in':
      case '"':
        if (inches !== null || heightM !== null) return null;
        inches = value;
        break;
      case 'ft':
      case "'":
        if (feet !== null || heightM !== null) return null;
        feet = value;
        break;
    }
  }

  if (feet !== null || inches !== null) {
    heightM = (feet ?? 0) * 0.3048 + (inches ?? 0) * 0.0254;
  }

  if (weightKg === null || weightKg <= 0 || heightM === null || heightM <= 0) {
    return null;
  }

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
