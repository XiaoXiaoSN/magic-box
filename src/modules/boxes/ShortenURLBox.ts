import { DefaultBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import {
  Box, BoxBuilder, BoxOptions, extractOptionKeys,
} from '@modules/Box';

const PriorityShortenURL = 10;

interface Match {
  shortenURL: string,
}

export const ShortenURLBoxSource = {
  async getShortenURL(inputURL: string, shorten: string | null): Promise<string> {
    const toolBoxHost = process.env.TOOLBOX ?? 'https://tool.10oz.tw';
    const shortenURLHost = process.env.SHORTEN_URL ?? 'https://10oz.tw';

    return fetch(`${toolBoxHost}/api/v1/surl`, {
      method: 'POST',
      body: JSON.stringify({
        url: inputURL,
        shorten,
      }),
    })
      .then((resp) => {
        if (resp.status !== 200) {
          throw Error('The "Shorten URL" request is not success');
        }
        return resp.json();
      })
      .then((result) => {
        if (
          result == null
          || !isString(result.shorten)
          || result.shorten === ''
        ) {
          throw Error('The "Shorten URL" not response as expected');
        }

        return `${shortenURLHost}/${result.shorten}`;
      });
  },

  async checkMatch(input: string, options: BoxOptions): Promise<Match | void> {
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
        .setComponent(DefaultBox)
        .setPriority(PriorityShortenURL)
        .build(),
    ];
  },
};

export default ShortenURLBoxSource;
