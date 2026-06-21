import Ascii85BoxSource from './Ascii85BoxSource';
import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import BinaryTextBoxSource from './BinaryTextBoxSource';
import ColorBoxSource from './ColorBoxSource';
import ColorMixBoxSource from './ColorMixBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import HexDumpBoxSource from './HexDumpBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MorseBoxSource from './MorseBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import NumberSpellBoxSource from './NumberSpellBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import SubnetBoxSource from './SubnetBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import VigenereBoxSource from './VigenereBoxSource';
import WordCountBoxSource from './WordCountBoxSource';

// Path B: default order is the display order. High-signal sources sit on top;
// catch-all encoders (Base64 Encode, Word Count) sit at the bottom so they
// stay below specific matches without needing per-box priority.
export const boxSources = [
  ColorBoxSource,
  ColorMixBoxSource,
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  Ascii85BoxSource,
  BinaryTextBoxSource,
  CronExpressionBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  HexDumpBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MathExpressionBoxSource,
  MorseBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  NumberSpellBoxSource,
  PasswordBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  SubnetBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  VigenereBoxSource,
  TimestampBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
