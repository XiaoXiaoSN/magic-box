import React, { useEffect, useState } from 'react';

import { Box, Grid, Paper, Typography } from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atelierCaveLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import { isString } from '@functions/helper';
import env from '@global/env';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

const NotingMatchBoxTemplate = (): React.JSX.Element => (
  <Grid size={{ xs: 12, sm: 12 }} sx={boxStyles.grid}>
    <Paper elevation={3} sx={boxStyles.paper}>
      <Typography sx={boxStyles.paperTypography}>nothing match</Typography>
    </Paper>
  </Grid>
);

const DefaultBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
}: BoxProps): React.JSX.Element => (
  <Grid
    onClick={() => onClick(plaintextOutput)}
    size={{ xs: 12, sm: 12 }}
    sx={boxStyles.grid}
  >
    <Paper elevation={3} sx={boxStyles.paper}>
      <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
        {name}
      </h3>
      <Typography
        data-testid="magic-box-result-text"
        sx={boxStyles.paperTypography}
      >
        {plaintextOutput}
      </Typography>
    </Paper>
  </Grid>
);

const CodeBoxTemplate = ({
  name,
  plaintextOutput,
  options,
  onClick,
}: BoxProps): React.JSX.Element => {
  let language = 'yaml';
  if (
    options &&
    'language' in options &&
    typeof options.language === 'string'
  ) {
    language = options.language;
  }

  return (
    <Grid
      onClick={() => onClick(plaintextOutput)}
      size={{ xs: 12, sm: 12 }}
      sx={boxStyles.grid}
    >
      <Paper elevation={3} sx={boxStyles.paper}>
        <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
          {name}
        </h3>
        {/* https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/ */}
        <SyntaxHighlighter
          customStyle={{ maxHeight: '250px' }}
          data-testid="magic-box-result-text"
          language={language}
          sx={atelierCaveLight}
        >
          {plaintextOutput}
        </SyntaxHighlighter>
      </Paper>
    </Grid>
  );
};

const QRCodeBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
}: BoxProps): React.JSX.Element => (
  <Grid
    onClick={() => onClick(plaintextOutput)}
    size={{ xs: 12, sm: 12 }}
    sx={boxStyles.grid}
  >
    <Paper elevation={3} sx={boxStyles.paper}>
      <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
        {name}
      </h3>
      {/* https://github.com/zpao/qrcode.react */}
      <Box id="qrcode-box" sx={boxStyles.alignCenter}>
        <QRCodeCanvas size={256} value={plaintextOutput} />
      </Box>
    </Paper>
  </Grid>
);

// NOTE: deprecated
const ShortenURLBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
}: BoxProps): React.JSX.Element => {
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
      <Paper elevation={3} sx={boxStyles.paper}>
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

const KeyValueBoxTemplate = ({
  name,
  plaintextOutput,
  options,
  onClick,
}: BoxProps): React.JSX.Element => {
  const data: Record<string, string> = {};

  if (options) {
    Object.entries(options).forEach(([key, value]) => {
      data[key] = value as string;
    });
  }
  if (plaintextOutput) {
    try {
      const parsedOutput = JSON.parse(plaintextOutput);
      Object.entries(parsedOutput).forEach(([key, value]) => {
        data[key] = value as string;
      });
    } catch {
      /* */
    }
  }

  const handleTableClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('value-cell')) {
      e.stopPropagation();
      return;
    }

    const yamlString = Object.entries(data)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    onClick(yamlString);
  };

  const handleValueClick = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onClick(value);
  };

  return (
    <Grid
      component="div"
      onClick={handleTableClick}
      size={{ xs: 12, sm: 12 }}
      sx={boxStyles.grid}
    >
      <Paper elevation={3} sx={boxStyles.paper}>
        <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
          {name}
        </h3>
        <Box sx={{ width: '100%', overflow: 'auto', mt: 2 }}>
          <Grid container spacing={1}>
            {Object.entries(data).map(([key, value]) => (
              <Grid key={key} size={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Typography
                    title={key}
                    variant="subtitle2"
                    sx={{
                      minWidth: '30%',
                      maxWidth: '50%',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      fontWeight: 'bold',
                      color: 'text.secondary',
                      pr: 2,
                    }}
                  >
                    {key}
                  </Typography>
                  <Typography
                    className="value-cell"
                    onClick={(e) => handleValueClick(e, String(value))}
                    sx={{
                      flex: 1,
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                      },
                      transition: 'all 0.2s',
                    }}
                  >
                    {String(value)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>
    </Grid>
  );
};

export {
  CodeBoxTemplate,
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
  NotingMatchBoxTemplate,
  QRCodeBoxTemplate,
  ShortenURLBoxTemplate,
};
