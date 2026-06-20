import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EmailParseBoxSource from './EmailParseBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import HttpHeadersBoxSource from './HttpHeadersBoxSource';
import IPv6BoxSource from './IPv6BoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import MarkdownTableBoxSource from './MarkdownTableBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import NumberFormatBoxSource from './NumberFormatBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import PasswordStrengthBoxSource from './PasswordStrengthBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import UuidV7BoxSource from './UuidV7BoxSource';
import WhitespaceCleanBoxSource from './WhitespaceCleanBoxSource';
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
  EmailParseBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  HttpHeadersBoxSource,
  IPv6BoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MarkdownTableBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  NumberFormatBoxSource,
  PasswordBoxSource,
  PasswordStrengthBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  UuidV7BoxSource,
  TimestampBoxSource,
  WhitespaceCleanBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
