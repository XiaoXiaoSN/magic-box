// Shared by the browser and the callable. Reject oversized samples instead of
// truncating outputs: a truncated output would be an incorrect training label.
export const SCHEMA_VERSION = 1;
export const CONSENT_VERSION = 'training-v1';
export const MAX_SAMPLE_BYTES = 128 * 1024;
export const MAX_TEXT_LENGTH = 32 * 1024;
export const MAX_CANDIDATES = 100;

const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) =>
  object(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const text = (value, max = MAX_TEXT_LENGTH) =>
  typeof value === 'string' && value.length <= max;
const nonempty = (value, max) => text(value, max) && value.trim() !== '';
const sampleKeys = [
  'schemaVersion',
  'consentVersion',
  'id',
  'createdAt',
  'appVersion',
  'locale',
  'timezone',
  'timezoneOffset',
  'timezoneMode',
  'input',
  'candidates',
  'selectedCandidateId',
  'expectedOutput',
  'comment',
  'kind',
];
const candidateKeys = ['id', 'sourceId', 'name', 'output', 'isError'];

/** @returns {boolean} */
export function isFeedbackSample(value) {
  if (!exactKeys(value, sampleKeys)) return false;
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.consentVersion !== CONSENT_VERSION ||
    !text(value.id, 36) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.id,
    ) ||
    !text(value.createdAt, 24) ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    new Date(value.createdAt).toISOString() !== value.createdAt ||
    !nonempty(value.appVersion, 100) ||
    !['en', 'tw'].includes(value.locale) ||
    !nonempty(value.timezone, 100) ||
    !Number.isFinite(value.timezoneOffset) ||
    value.timezoneOffset < -12 ||
    value.timezoneOffset > 14 ||
    !['fixed', 'system'].includes(value.timezoneMode) ||
    !nonempty(value.input) ||
    !text(value.expectedOutput) ||
    !text(value.comment, 4000) ||
    !Array.isArray(value.candidates) ||
    value.candidates.length > MAX_CANDIDATES
  )
    return false;

  const ids = new Set();
  for (const candidate of value.candidates) {
    if (
      !exactKeys(candidate, candidateKeys) ||
      !nonempty(candidate.id, 256) ||
      ids.has(candidate.id) ||
      !nonempty(candidate.sourceId, 100) ||
      !nonempty(candidate.name, 256) ||
      !text(candidate.output) ||
      typeof candidate.isError !== 'boolean'
    )
      return false;
    ids.add(candidate.id);
  }
  const selected = value.candidates.find(
    (item) => item.id === value.selectedCandidateId,
  );
  if (value.selectedCandidateId !== null && (!selected || selected.isError))
    return false;
  if (value.kind === 'selection') {
    if (!selected || value.expectedOutput !== '') return false;
  } else if (value.kind === 'expectation') {
    if (value.selectedCandidateId !== null || !value.expectedOutput.trim())
      return false;
  } else return false;

  return (
    new TextEncoder().encode(JSON.stringify(value)).byteLength <=
    MAX_SAMPLE_BYTES
  );
}
