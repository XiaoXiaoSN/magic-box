import { setRuntimePrefs } from '@functions/runtimePrefs';
import { afterEach, describe, expect, it } from 'vitest';

import { CronExpressionBoxSource } from '../CronExpressionBoxSource';

// verifies the active locale flows into cron output without an inline option.
describe('cron locale preference wiring', () => {
  afterEach(() => {
    setRuntimePrefs({ locale: 'en' });
  });

  it('renders english by default', async () => {
    setRuntimePrefs({ locale: 'en' });
    const boxes = await CronExpressionBoxSource.generateBoxes('*/5 * * * *');
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toMatch(/minute/i);
  });

  it('renders zh_TW when the app locale is traditional chinese', async () => {
    setRuntimePrefs({ locale: 'zh_TW' });
    const boxes = await CronExpressionBoxSource.generateBoxes('*/5 * * * *');
    expect(boxes).toHaveLength(1);
    // zh_TW output contains chinese characters, never the english "minute".
    expect(boxes[0].props.plaintextOutput).not.toMatch(/minute/i);
    expect(boxes[0].props.plaintextOutput).toMatch(/[一-鿿]/);
  });

  it('lets an inline ::locale option override the app locale', async () => {
    setRuntimePrefs({ locale: 'zh_TW' });
    const boxes = await CronExpressionBoxSource.generateBoxes('*/5 * * * *', {
      locale: 'en',
    });
    expect(boxes[0].props.plaintextOutput).toMatch(/minute/i);
  });
});
