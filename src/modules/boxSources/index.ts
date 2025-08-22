export * from './Base64BoxSource';
export * from './CronExpressionBoxSource';
export * from './DateCalculateBoxSource';
export * from './GenerateQRCodeBoxSource';
export * from './JWTBoxSource';
export * from './K8sSecretBoxSource';
export * from './MathExpressionBoxSource';
export * from './MyIPBoxSource';
export * from './NowBoxSource';
export * from './PrettyJSONBoxSource';
export * from './RandomIntegerBoxSource';
export * from './ReadableBytesBoxSource';
export * from './ShortenURLBoxSource';
export * from './TimeFormatBoxSource';
export * from './TimestampBoxSource';
export * from './URLDecodeBoxSource';
export * from './UuidBoxSource';
export * from './WordCountBoxSource';

import { Base64DecodeBoxSource as _Base64DecodeBoxSource, Base64EncodeBoxSource as _Base64EncodeBoxSource } from './Base64BoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import PrettyJSONBoxSource from './PrettyJSONBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import WordCountBoxSource from './WordCountBoxSource';

const Base64DecodeBoxSource = { ..._Base64DecodeBoxSource, priority: 10 };
const Base64EncodeBoxSource = { ..._Base64EncodeBoxSource, priority: 0 };

export const boxSources = [
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
  { ...CronExpressionBoxSource, priority: 10 },
  { ...DateCalculateBoxSource, priority: 10 },
  { ...GenerateQRCodeBoxSource, priority: 10 },
  { ...JWTBoxSource, priority: 10 },
  { ...K8sSecretBoxSource, priority: 10 },
  { ...MathExpressionBoxSource, priority: 10 },
  { ...MyIPBoxSource, priority: 10 },
  { ...NowBoxSource, priority: 10 },
  { ...PrettyJSONBoxSource, priority: 10 },
  { ...RandomIntegerBoxSource, priority: 10 },
  { ...ReadableBytesBoxSource, priority: 10 },
  { ...ShortenURLBoxSource, priority: 10 },
  { ...TimeFormatBoxSource, priority: 10 },
  { ...TimestampBoxSource, priority: 9 },
  { ...URLDecodeBoxSource, priority: 10 },
  { ...UuidBoxSource, priority: 10 },
  { ...WordCountBoxSource, priority: 0 },
];
