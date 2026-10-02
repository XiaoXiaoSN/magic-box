import type { Box, BoxTemplate, BoxView } from '@modules/Box';
import DiffBoxTemplate from './DiffBoxTemplate';
import {
  CodeBoxTemplate,
  DefaultBoxTemplate,
  DiceRollBoxTemplate,
  KeyValueBoxTemplate,
  LocalAIBoxTemplate,
  QRCodeBoxTemplate,
} from './index';

const webTemplates: Record<BoxView, BoxTemplate> = {
  default: DefaultBoxTemplate,
  code: CodeBoxTemplate,
  diff: DiffBoxTemplate,
  keyValue: KeyValueBoxTemplate,
  qrCode: QRCodeBoxTemplate,
  diceRoll: DiceRollBoxTemplate,
  localAI: LocalAIBoxTemplate,
};

export function resolveBoxTemplate(box: Box): BoxTemplate {
  // Custom templates remain supported for extensions and existing callers.
  return box.boxTemplate ?? webTemplates[box.view ?? 'default'];
}
