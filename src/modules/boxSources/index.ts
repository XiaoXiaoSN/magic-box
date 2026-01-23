import { Base64DecodeBoxSource, Base64EncodeBoxSource } from './Base64BoxSource';
import CronExpressionBoxSource from './CronExpressionBoxSource';
import DateCalculateBoxSource from './DateCalculateBoxSource';
import GenerateQRCodeBoxSource from './GenerateQRCodeBoxSource';
import JWTBoxSource from './JWTBoxSource';
import K8sSecretBoxSource from './K8sSecretBoxSource';
import MathExpressionBoxSource from './MathExpressionBoxSource';
import MyIPBoxSource from './MyIPBoxSource';
import NowBoxSource from './NowBoxSource';
import PrettyJSONBoxSource from './PrettyJSONBoxSource';
import RandomIntegerBoxSource from './RandomIntegerBoxSource';
import ReadableBytesBoxSource from './ReadableBytesBoxSource';
import ShortenURLBoxSource from './ShortenURLBoxSource';
import TimeFormatBoxSource from './TimeFormatBoxSource';
import TimestampBoxSource from './TimestampBoxSource';
import URLDecodeBoxSource from './URLDecodeBoxSource';
import UuidBoxSource from './UuidBoxSource';
import WordCountBoxSource from './WordCountBoxSource';

export const boxSources = [
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
  CronExpressionBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PrettyJSONBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  TimestampBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  WordCountBoxSource,
];
