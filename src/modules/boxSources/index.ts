import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import ExcelColumnBoxSource from './ExcelColumnBoxSource';
import FrequencyConvertBoxSource from './FrequencyConvertBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import HaversineBoxSource from './HaversineBoxSource';
import JsonPickBoxSource from './JsonPickBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import LeapYearBoxSource from './LeapYearBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NatoPhoneticBoxSource from './NatoPhoneticBoxSource';
import NowBoxSource from './NowBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import PortLookupBoxSource from './PortLookupBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ReverseTextBoxSource from './ReverseTextBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
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
  CronExpressionBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  ExcelColumnBoxSource,
  FrequencyConvertBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  HaversineBoxSource,
  JsonPickBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  LeapYearBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NatoPhoneticBoxSource,
  NowBoxSource,
  PasswordBoxSource,
  PortLookupBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ReverseTextBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  TimestampBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
