export const SCHEMA_VERSION: 1;
export const CONSENT_VERSION: 'training-v1';
export const MAX_SAMPLE_BYTES: number;
export const MAX_TEXT_LENGTH: number;
export const MAX_CANDIDATES: number;
export interface FeedbackCandidate {
  id: string;
  sourceId: string;
  name: string;
  output: string;
  isError: boolean;
}
export interface FeedbackSample {
  schemaVersion: 1;
  consentVersion: 'training-v1';
  id: string;
  createdAt: string;
  appVersion: string;
  locale: 'en' | 'tw';
  timezone: string;
  timezoneOffset: number;
  timezoneMode: 'fixed' | 'system';
  input: string;
  candidates: FeedbackCandidate[];
  selectedCandidateId: string | null;
  expectedOutput: string;
  comment: string;
  kind: 'selection' | 'expectation';
}
export function isFeedbackSample(value: unknown): value is FeedbackSample;
