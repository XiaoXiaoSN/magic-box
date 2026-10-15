import { lazy } from 'react';
import DefaultBoxTemplate from './DefaultBoxTemplate';
import KeyValueBoxTemplate from './KeyValueBoxTemplate';
import NotingMatchBoxTemplate from './NotingMatchBoxTemplate';
import ShortenURLBoxTemplate from './ShortenURLBoxTemplate';

const CodeBoxTemplate = lazy(async () => import('./CodeBoxTemplate'));
const DiffBoxTemplate = lazy(async () => import('./DiffBoxTemplate'));
const DiceRollBoxTemplate = lazy(async () => import('./DiceRollBoxTemplate'));
const LocalAIBoxTemplate = lazy(async () => import('./LocalAIBoxTemplate'));
const QRCodeBoxTemplate = lazy(async () => import('./QRCodeBoxTemplate'));

export {
  CodeBoxTemplate,
  DefaultBoxTemplate,
  DiceRollBoxTemplate,
  DiffBoxTemplate,
  KeyValueBoxTemplate,
  LocalAIBoxTemplate,
  NotingMatchBoxTemplate,
  QRCodeBoxTemplate,
  ShortenURLBoxTemplate,
};
