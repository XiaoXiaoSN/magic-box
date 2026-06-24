import type { BoxSource } from '../BoxSource';
import A1Z26BoxSource from './A1Z26BoxSource';
import AsciiTableBoxSource from './AsciiTableBoxSource';
import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import BinaryTextBoxSource from './BinaryTextBoxSource';
import BmiBoxSource from './BmiBoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import CronNextBoxSource from './CronNextBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import DurationBoxSource from './DurationBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import FractionBoxSource from './FractionBoxSource';
import FrequencyBoxSource from './FrequencyBoxSource';
import GcdLcmBoxSource from './GcdLcmBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import HaversineBoxSource from './HaversineBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import LineToolsBoxSource from './LineToolsBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import PowerConvertBoxSource from './PowerConvertBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import SemverBoxSource from './SemverBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import SnowflakeBoxSource from './SnowflakeBoxSource';
import SortLinesBoxSource from './SortLinesBoxSource';
import SoundexBoxSource from './SoundexBoxSource';
import SpeedConvertBoxSource from './SpeedConvertBoxSource';
import SubnetBoxSource from './SubnetBoxSource';
import TemperatureBoxSource from './TemperatureBoxSource';
import TextReverseBoxSource from './TextReverseBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import TwosComplementBoxSource from './TwosComplementBoxSource';
import UlidBoxSource from './UlidBoxSource';
import UnicodeNormalizeBoxSource from './UnicodeNormalizeBoxSource';
import UnitConverterBoxSource from './UnitConverterBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import WeekNumberBoxSource from './WeekNumberBoxSource';
import WhitespaceCleanBoxSource from './WhitespaceCleanBoxSource';
import WordCountBoxSource from './WordCountBoxSource';
import WordsToNumberBoxSource from './WordsToNumberBoxSource';
import WordWrapBoxSource from './WordWrapBoxSource';
import ZodiacBoxSource from './ZodiacBoxSource';

// Path B: default order is the display order. High-signal sources sit on top;
// catch-all encoders (Base64 Encode, Word Count) sit at the bottom so they
// stay below specific matches without needing per-box priority.
export const boxSources: BoxSource[] = [
  ColorBoxSource,
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  CronExpressionBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  DurationBoxSource,
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
  WordWrapBoxSource,
  A1Z26BoxSource,
  AsciiTableBoxSource,
  BinaryTextBoxSource,
  BmiBoxSource,
  FractionBoxSource,
  FrequencyBoxSource,
  GcdLcmBoxSource,
  HaversineBoxSource,
  LineToolsBoxSource,
  PowerConvertBoxSource,
  SemverBoxSource,
  SnowflakeBoxSource,
  SortLinesBoxSource,
  SoundexBoxSource,
  SpeedConvertBoxSource,
  SubnetBoxSource,
  TemperatureBoxSource,
  TextReverseBoxSource,
  TwosComplementBoxSource,
  UlidBoxSource,
  UnicodeNormalizeBoxSource,
  UnitConverterBoxSource,
  WeekNumberBoxSource,
  WhitespaceCleanBoxSource,
  WordsToNumberBoxSource,
  ZodiacBoxSource,
  WordCountBoxSource,
  CronNextBoxSource,
];
