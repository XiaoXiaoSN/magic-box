import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import CaseConverterBoxSource from './CaseConverterBoxSource';
import ChmodBoxSource from './ChmodBoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import HtmlEntityBoxSource from './HtmlEntityBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import LoremIpsumBoxSource from './LoremIpsumBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MorseCodeBoxSource from './MorseCodeBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import NumberBaseBoxSource from './NumberBaseBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import RomanNumeralBoxSource from './RomanNumeralBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import SlugifyBoxSource from './SlugifyBoxSource';
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
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  CaseConverterBoxSource,
  ChmodBoxSource,
  CronExpressionBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  HtmlEntityBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  LoremIpsumBoxSource,
  MathExpressionBoxSource,
  MorseCodeBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  NumberBaseBoxSource,
  PasswordBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  RomanNumeralBoxSource,
  ShortenURLBoxSource,
  SlugifyBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  TimestampBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
