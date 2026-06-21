import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import ColorBoxSource from './ColorBoxSource';
import ColorContrastBoxSource from './ColorContrastBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import CronNextBoxSource from './CronNextBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import InvisibleCharsBoxSource from './InvisibleCharsBoxSource';
import JWTBoxSource from './JWTBoxSource';
import JwtSignBoxSource from './JwtSignBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import LevenshteinBoxSource from './LevenshteinBoxSource';
import MacAddressBoxSource from './MacAddressBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import SemverBoxSource from './SemverBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import SnowflakeBoxSource from './SnowflakeBoxSource';
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
  ColorContrastBoxSource,
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  CronExpressionBoxSource,
  CronNextBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  InvisibleCharsBoxSource,
  JwtSignBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  LevenshteinBoxSource,
  MacAddressBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PasswordBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  SemverBoxSource,
  ShortenURLBoxSource,
  SnowflakeBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  TimestampBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
