import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
} from './Base64BoxSource';
import Base64UrlBoxSource from './Base64UrlBoxSource';
import ColorBoxSource from './ColorBoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DataConverterBoxSource from './DataConverterBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import EscapeStringBoxSource from './EscapeStringBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import HashBoxSource from './HashBoxSource';
import JsonPathBoxSource from './JsonPathBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import PasswordBoxSource from './PasswordBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ReverseWordsBoxSource from './ReverseWordsBoxSource';
import Rot47BoxSource from './Rot47BoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import SoundexBoxSource from './SoundexBoxSource';
import TabsSpacesBoxSource from './TabsSpacesBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import TwosComplementBoxSource from './TwosComplementBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import WordCountBoxSource from './WordCountBoxSource';
import WordWrapBoxSource from './WordWrapBoxSource';

// Path B: default order is the display order. High-signal sources sit on top;
// catch-all encoders (Base64 Encode, Word Count) sit at the bottom so they
// stay below specific matches without needing per-box priority.
export const boxSources = [
  ColorBoxSource,
  EscapeStringBoxSource,
  Base64DecodeBoxSource,
  Base64UrlBoxSource,
  CronExpressionBoxSource,
  DataConverterBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  HashBoxSource,
  JsonPathBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PasswordBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ReverseWordsBoxSource,
  Rot47BoxSource,
  ShortenURLBoxSource,
  SoundexBoxSource,
  TabsSpacesBoxSource,
  TimeFormatBoxSource,
  TwosComplementBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  TimestampBoxSource,
  WordWrapBoxSource,
  Base64EncodeBoxSource,
  WordCountBoxSource,
];
