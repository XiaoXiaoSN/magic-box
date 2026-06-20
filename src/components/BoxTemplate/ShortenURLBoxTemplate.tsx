import { isString } from '@functions/helper';
import { getToolboxUrl } from '@functions/runtimePrefs';
import type { BoxProps } from '@modules/Box';
import { memo, useCallback, useEffect, useState } from 'react';

const ShortenURLBoxTemplate = memo(
  ({ plaintextOutput, onClick }: BoxProps): React.JSX.Element => {
    const [shortURL, setShortURL] = useState('');

    const getShortenURL = useCallback(
      async (inputURL: string): Promise<void> => {
        const toolboxUrl = getToolboxUrl();
        const resp = await fetch(`${toolboxUrl}/api/v1/surl`, {
          method: 'POST',
          body: JSON.stringify({ url: inputURL }),
        });
        if (resp.status !== 200) {
          throw Error('The "Shorten URL" request is not success');
        }

        const result = await resp.json();
        if (
          result == null ||
          !isString(result.shorten) ||
          result.shorten === ''
        ) {
          throw Error('The "Shorten URL" not response as expected');
        }

        setShortURL(`${toolboxUrl}/${result.shorten}`);
      },
      [],
    );

    useEffect(() => {
      getShortenURL(plaintextOutput);
    }, [plaintextOutput, getShortenURL]);

    return (
      <button
        className="box-out mono"
        data-testid="magic-box-result-text"
        onClick={(e) => {
          e.stopPropagation();
          onClick(shortURL);
        }}
        style={{
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          padding: 0,
          textAlign: 'left',
          width: '100%',
          fontFamily: 'inherit',
          color: 'inherit',
          font: 'inherit',
        }}
        type="button"
      >
        {shortURL}
      </button>
    );
  },
);

export default ShortenURLBoxTemplate;
