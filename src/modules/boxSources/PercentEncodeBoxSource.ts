import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// RFC 3986 sub-delimiters that encodeURIComponent leaves unescaped
const escapeRfc3986Extras = (s: string): string =>
  s.replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export const PercentEncodeBoxSource = {
  name: 'Percent Encode',
  description:
    'Percent-encode a string for use in a URL (or decode it). ::percentencode / ::percentdecode.',
  defaultInput: 'a b&c=日本 ::percentencode',
  tag: '#',
  kind: 'Encode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    const wantEncode = hasOptionKeys(options, 'percentencode', 'urlencode');
    const wantDecode = hasOptionKeys(options, 'percentdecode');
    if (!wantEncode && !wantDecode) return [];
    if (!isString(input) || input.length === 0 || input.length > MAX_INPUT)
      return [];

    if (wantEncode) {
      // encode as a URI component, then additionally escape RFC 3986 sub-delims
      const encoded = escapeRfc3986Extras(encodeURIComponent(input));
      return [
        new BoxBuilder('Percent Encode', encoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(Priority)
          .build(),
      ];
    }

    // decode path: propagate URIError as a descriptive box
    try {
      const decoded = decodeURIComponent(input);
      return [
        new BoxBuilder('Percent Decode', decoded)
          .setTemplate(DefaultBoxTemplate)
          .setShowExpandButton(false)
          .setPriority(Priority)
          .build(),
      ];
    } catch (e) {
      if (e instanceof URIError) {
        return [
          new BoxBuilder(
            'Percent Decode',
            'Invalid percent-encoding: the input contains malformed sequences.',
          )
            .setTemplate(DefaultBoxTemplate)
            .setShowExpandButton(false)
            .setPriority(Priority)
            .build(),
        ];
      }
      throw e;
    }
  },
};

export default PercentEncodeBoxSource;
