import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import ChineseZodiacBoxSource from './ChineseZodiacBoxSource';
import CollatzBoxSource from './CollatzBoxSource';
import ColorBoxSource from './ColorBoxSource';
import ColorMixBoxSource from './ColorMixBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import DivisorsBoxSource from './DivisorsBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import Ipv4IntBoxSource from './Ipv4IntBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import MacAddressBoxSource from './MacAddressBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import PrimeCheckBoxSource from './PrimeCheckBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import WordCountBoxSource from './WordCountBoxSource';
import ZodiacBoxSource from './ZodiacBoxSource';

// Path B: default order is the display order. High-signal sources sit on top;
// catch-all encoders (Base64 Encode, Word Count) sit at the bottom so they
// stay below specific matches without needing per-box priority.
export const boxSources = [
  ColorBoxSource,
  ChineseZodiacBoxSource,
  CollatzBoxSource,
  ColorMixBoxSource,
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  CronExpressionBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  DivisorsBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  Ipv4IntBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MacAddressBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PasswordBoxSource,
  PrimeCheckBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  ZodiacBoxSource,
  TimestampBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
