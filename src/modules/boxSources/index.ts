import Base58BoxSource from './Base58BoxSource';
import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import CsvJsonBoxSource from './CsvJsonBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import DurationBoxSource from './DurationBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import HmacBoxSource from './HmacBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import LineToolsBoxSource from './LineToolsBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import NumberToWordsBoxSource from './NumberToWordsBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import QueryStringBoxSource from './QueryStringBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import UlidBoxSource from './UlidBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import WordCountBoxSource from './WordCountBoxSource';

// Path B: default order is the display order. High-signal sources sit on top;
// catch-all encoders (Base64 Encode, Word Count) sit at the bottom so they
// stay below specific matches without needing per-box priority.
export const boxSources = [
  ColorBoxSource,
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  Base58BoxSource,
  CronExpressionBoxSource,
  CsvJsonBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  DurationBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  HmacBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  LineToolsBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  NumberToWordsBoxSource,
  PasswordBoxSource,
  QueryStringBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  TimestampBoxSource,
  UlidBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
