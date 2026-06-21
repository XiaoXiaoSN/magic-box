import AtbashBoxSource from './AtbashBoxSource';
import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import HumanizeDurationBoxSource from './HumanizeDurationBoxSource';
import JsonCsvBoxSource from './JsonCsvBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import LeetSpeakBoxSource from './LeetSpeakBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NatoPhoneticBoxSource from './NatoPhoneticBoxSource';
import NowBoxSource from './NowBoxSource';
import NumberBasesBoxSource from './NumberBasesBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import PasswordStrengthBoxSource from './PasswordStrengthBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import Rot47BoxSource from './Rot47BoxSource';
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
  AtbashBoxSource,
  CronExpressionBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  HumanizeDurationBoxSource,
  JsonCsvBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  LeetSpeakBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NatoPhoneticBoxSource,
  NowBoxSource,
  NumberBasesBoxSource,
  PasswordBoxSource,
  PasswordStrengthBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  Rot47BoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  TimestampBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
