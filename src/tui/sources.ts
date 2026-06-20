import type { BoxSource } from '@modules/BoxSource';
import CronExpressionBoxSource from '@modules/boxSources/CronExpressionBoxSource';
import DateCalculateBoxSource from '@modules/boxSources/DateCalculateBoxSource';
import EscapeStringBoxSource from '@modules/boxSources/EscapeStringBoxSource';
import NowBoxSource from '@modules/boxSources/NowBoxSource';
import RandomIntegerBoxSource from '@modules/boxSources/RandomIntegerBoxSource';
import ReadableBytesBoxSource from '@modules/boxSources/ReadableBytesBoxSource';
import TimeFormatBoxSource from '@modules/boxSources/TimeFormatBoxSource';
import TimestampBoxSource from '@modules/boxSources/TimestampBoxSource';
import URLDecodeBoxSource from '@modules/boxSources/URLDecodeBoxSource';
import UuidBoxSource from '@modules/boxSources/UuidBoxSource';

// node-safe boxSources for the TUI: each is free of react/mui templates, WASM and
// network/browser-only APIs, so it imports cleanly under plain node.
//
// excluded from the foundation (and why):
//   - Base64 (encode/decode): depends on the base64-box WASM module
//   - MathExpression:          depends on the math-box WASM module
//   - DataConverter, JWT:      render via CodeBoxTemplate (react/mui)
//   - GenerateQRCode:          renders via QRCodeBoxTemplate (react/mui, browser canvas)
//   - K8sSecret, WordCount:    render via KeyValueBoxTemplate (react/mui)
//   - MyIP, ShortenURL:        perform network fetch
export const tuiBoxSources: BoxSource[] = [
  EscapeStringBoxSource,
  CronExpressionBoxSource,
  DateCalculateBoxSource,
  NowBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  TimeFormatBoxSource,
  TimestampBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
];

export default tuiBoxSources;
