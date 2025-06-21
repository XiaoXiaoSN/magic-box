import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import env from '@global/env';
import { BoxBuilder, extractOptionKeys } from '@modules/Box';

import type { Box, BoxOptions } from '@modules/Box';

const PriorityShortenURL = 10;

interface Match {
  shortenURL: string,
}

export const ShortenURLBoxSource = {
  name: 'Shorten URL',
  description: 'Shorten a URL using an external API.',
  defaultInput: `https://github.com/XiaoXiaoSN/magic-box
::surl
`,

  async getShortenURL(inputURL: string, shorten: string | null): Promise<string> {
    const toolBoxHost = env.TOOLBOX_URL;
    const shortenURLHost = env.SHORTEN_URL;

    const resp = await fetch(`${toolBoxHost}/api/v1/surl`, {
      method: 'POST',
      body: JSON.stringify({
        url: inputURL,
        shorten,
      }),
    });
    if (resp.status !== 200) {
      throw Error('The "Shorten URL" request is not success');
    }

    const result = await resp.json();
    if (
      result == null
      || !isString(result.shorten)
      || result.shorten === ''
    ) {
      throw Error('The "Shorten URL" not response as expected');
    }

    return `${shortenURLHost}/${result.shorten}`;
  },

  async checkMatch(input: string, options: BoxOptions): Promise<Match | undefined> {
    if (options === null) {
      return undefined;
    }

    let shortenOption = extractOptionKeys(options, 'surl', 'shorten');
    if (shortenOption === null) {
      return undefined;
    }
    // contains the option key, but the value is empty
    if (typeof shortenOption === 'boolean') {
      shortenOption = null;
    }

    if (!isString(input)) {
      return undefined;
    }
    if (input === '' || trim(input) === '') {
      return undefined;
    }

    const regularInput = trim(input);

    try {
      const shortenURL = await this.getShortenURL(regularInput, shortenOption);
      return { shortenURL };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(input: string, options: BoxOptions): Promise<Box[]> {
    const match = await this.checkMatch(input, options);
    if (!match) {
      return [];
    }

    const { shortenURL } = match;
    return [
      new BoxBuilder('Shorten URL', shortenURL)
        .setTemplate(DefaultBoxTemplate)
        .setPriority(PriorityShortenURL)
        .build(),
    ];
  },
};

export default ShortenURLBoxSource;
