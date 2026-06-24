import A1Z26BoxSource from './A1Z26BoxSource';
import AsciiTableBoxSource from './AsciiTableBoxSource';
import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import BmiBoxSource from './BmiBoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import SortLinesBoxSource from './SortLinesBoxSource';
import SpeedConvertBoxSource from './SpeedConvertBoxSource';
import SubnetBoxSource from './SubnetBoxSource';
import TemperatureBoxSource from './TemperatureBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import WhitespaceCleanBoxSource from './WhitespaceCleanBoxSource';
import WordCountBoxSource from './WordCountBoxSource';
import WordWrapBoxSource from './WordWrapBoxSource';
import WordsToNumberBoxSource from './WordsToNumberBoxSource';

// Path B: default order is the display order. High-signal sources sit on top;
// catch-all encoders (Base64 Encode, Word Count) sit at the bottom so they
// stay below specific matches without needing per-box priority.
export const boxSources = [
  ColorBoxSource,
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  CronExpressionBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PasswordBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  TimestampBoxSource,
  Base64EncodeBoxSource,
  BmiBoxSource,
  AsciiTableBoxSource,
  A1Z26BoxSource,
  SortLinesBoxSource,
  SpeedConvertBoxSource,
  SubnetBoxSource,
  TemperatureBoxSource,
  WhitespaceCleanBoxSource,
  WordWrapBoxSource,
  WordsToNumberBoxSource,
  WordCountBoxSource,
];
