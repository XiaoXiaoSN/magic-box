import React, { useEffect, useState } from 'react';

import { Grid, Paper, Typography } from '@mui/material';

import { isString } from '@functions/helper';
import env from '@global/env';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface ShortenURLBoxTemplateProps extends BoxProps {
  largeModal?: boolean;
}

const ShortenURLBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
  largeModal = false,
}: ShortenURLBoxTemplateProps): React.JSX.Element => {
  const [shortURL, setShortURL] = useState('');

  const getShortenURL = async (inputURL: string): Promise<void> => {
    const resp = await fetch(`${env.TOOLBOX_URL}/api/v1/surl`, {
      method: 'POST',
      body: JSON.stringify({ url: inputURL }),
    });
    if (resp.status !== 200) {
      throw Error('The "Shorten URL" request is not success');
    }

    const result = await resp.json();
    if (result == null || !isString(result.shorten) || result.shorten === '') {
      throw Error('The "Shorten URL" not response as expected');
    }

    setShortURL(`${env.TOOLBOX_URL}/${result.shorten}`);
  };

  // call Toolbox API to get short url
  useEffect(() => {
    getShortenURL(plaintextOutput);
  }, [plaintextOutput]);

  return (
    <Grid
      onClick={() => onClick(shortURL)}
      size={{ xs: 12, sm: 12 }}
      sx={boxStyles.grid}
    >
      <Paper elevation={3} sx={(theme) => ({
        ...(typeof boxStyles.paper === 'function' ? boxStyles.paper(theme) : boxStyles.paper),
        ...(largeModal && {
          padding: theme.spacing(4),
        }),
      })}>
        <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
          {name}
        </h3>
        <Typography
          data-testid="magic-box-result-text"
          sx={boxStyles.paperTypography}
        >
          {shortURL}
        </Typography>
      </Paper>
    </Grid>
  );
};

export default ShortenURLBoxTemplate; 