import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import ColorAdjustBoxSource from './ColorAdjustBoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import CsvColumnBoxSource from './CsvColumnBoxSource';
import CurlToFetchBoxSource from './CurlToFetchBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import JsonToGoBoxSource from './JsonToGoBoxSource';
import JsonToTypescriptBoxSource from './JsonToTypescriptBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import NumberToCurrencyBoxSource from './NumberToCurrencyBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import SqlInBoxSource from './SqlInBoxSource';
import TimeAgoBoxSource from './TimeAgoBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import WordCountBoxSource from './WordCountBoxSource';

// Path B: default order is the display order. High-signal sources sit on top;
// catch-all encoders (Base64 Encode, Word Count) sit at the bottom so they
// stay below specific matches without needing per-box priority.
export const boxSources = [
  ColorBoxSource,
  ColorAdjustBoxSource,
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  CronExpressionBoxSource,
  CsvColumnBoxSource,
  CurlToFetchBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  JsonToGoBoxSource,
  JsonToTypescriptBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  NumberToCurrencyBoxSource,
  PasswordBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  SqlInBoxSource,
  TimeAgoBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  TimestampBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
