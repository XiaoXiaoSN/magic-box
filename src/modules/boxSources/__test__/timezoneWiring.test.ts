import { setRuntimePrefs } from '@functions/runtimePrefs';
import { DEFAULT_TIMEZONE_OFFSET } from '@functions/timezone';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NowBoxSource } from '../NowBoxSource';
import { TimestampBoxSource } from '../TimestampBoxSource';

// verifies that the default-timezone preference actually flows through the
// runtime singleton into the time-related box outputs (label + offset suffix).
describe('timezone preference wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    setRuntimePrefs({ timezoneOffset: DEFAULT_TIMEZONE_OFFSET });
  });

  it('NowBoxSource defaults to UTC+8 output', async () => {
    setRuntimePrefs({ timezoneOffset: 8 });
    const boxes = await NowBoxSource.generateBoxes('now');
    expect(boxes[1].props.name).toBe('RFC 3339 (UTC+8)');
    expect(boxes[1].props.plaintextOutput).toBe(
      '2024-01-01T08:00:00.000+08:00',
    );
  });

  it('NowBoxSource follows a changed timezone offset', async () => {
    setRuntimePrefs({ timezoneOffset: -5 });
    const boxes = await NowBoxSource.generateBoxes('now');
    expect(boxes[1].props.name).toBe('RFC 3339 (UTC-5)');
    expect(boxes[1].props.plaintextOutput).toBe(
      '2023-12-31T19:00:00.000-05:00',
    );
  });

  it('TimestampBoxSource follows a changed timezone offset', async () => {
    setRuntimePrefs({ timezoneOffset: 9 });
    const boxes = await TimestampBoxSource.generateBoxes('1704067200');
    expect(boxes[1].props.name).toBe('RFC 3339 (UTC+9)');
    expect(boxes[1].props.plaintextOutput).toBe(
      '2024-01-01T09:00:00.000+09:00',
    );
  });
});
