import { retryableLazy } from '@components/ErrorBoundary';
import DefaultBoxTemplate from './DefaultBoxTemplate';
import KeyValueBoxTemplate from './KeyValueBoxTemplate';
import ShortenURLBoxTemplate from './ShortenURLBoxTemplate';

const CodeBoxTemplate = retryableLazy(() => import('./CodeBoxTemplate'));
const DiffBoxTemplate = retryableLazy(() => import('./DiffBoxTemplate'));
const DiceRollBoxTemplate = retryableLazy(
  () => import('./DiceRollBoxTemplate'),
);
const LocalAIBoxTemplate = retryableLazy(() => import('./LocalAIBoxTemplate'));
const QRCodeBoxTemplate = retryableLazy(() => import('./QRCodeBoxTemplate'));

export {
  CodeBoxTemplate,
  DefaultBoxTemplate,
  DiceRollBoxTemplate,
  DiffBoxTemplate,
  KeyValueBoxTemplate,
  LocalAIBoxTemplate,
  QRCodeBoxTemplate,
  ShortenURLBoxTemplate,
};
