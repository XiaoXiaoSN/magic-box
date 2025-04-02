import { isString } from '@functions/helper';
import { BoxProps } from '@modules/Box';
import {
  Box, Grid, Paper, Typography,
} from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';
import React, { useEffect, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atelierCaveLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import boxStyles from './styles';

const NotingMatchBox = () => (
  <Grid item xs={12} sm={12} sx={boxStyles.grid} zeroMinWidth>
    <Paper elevation={3} sx={boxStyles.paper}>
      <Typography sx={boxStyles.paperTypography}>nothing match</Typography>
    </Paper>
  </Grid>
);

const DefaultBox = ({ name, stdout, onClick }: BoxProps) => (
  <Grid
    item
    xs={12}
    sm={12}
    sx={boxStyles.grid}
    zeroMinWidth
    onClick={() => onClick(stdout)}
  >
    <Paper elevation={3} sx={boxStyles.paper}>
      <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
        {name}
      </h3>
      <Typography
        data-testid="magic-box-result-text"
        sx={boxStyles.paperTypography}
      >
        {stdout}
      </Typography>
    </Paper>
  </Grid>
);

const CodeBox = ({
  name, stdout, options, onClick,
}: BoxProps) => {
  let language = 'yaml';
  if (
    options
    && 'language' in options
    && typeof options.language === 'string'
  ) {
    language = options.language;
  }

  return (
    <Grid
      item
      xs={12}
      sm={12}
      sx={boxStyles.grid}
      zeroMinWidth
      onClick={() => onClick(stdout)}
    >
      <Paper elevation={3} sx={boxStyles.paper}>
        <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
          {name}
        </h3>
        {/* https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/ */}
        <SyntaxHighlighter
          data-testid="magic-box-result-text"
          language={language}
          sx={atelierCaveLight}
          customStyle={{ maxHeight: '250px' }}
        >
          {stdout}
        </SyntaxHighlighter>
      </Paper>
    </Grid>
  );
};

const QRCodeBox = ({ name, stdout, onClick }: BoxProps) => (
  <Grid
    item
    xs={12}
    sm={12}
    sx={boxStyles.grid}
    zeroMinWidth
    onClick={() => onClick(stdout)}
  >
    <Paper elevation={3} sx={boxStyles.paper}>
      <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
        {name}
      </h3>
      {/* https://github.com/zpao/qrcode.react */}
      <Box sx={boxStyles.alignCenter} id="qrcode-box">
        <QRCodeCanvas value={stdout} size={256} includeMargin />
      </Box>
    </Paper>
  </Grid>
);

const ShortenURLBox = ({ name, stdout, onClick }: BoxProps) => {
  const [shortURL, setShortURL] = useState('');

  const getShortenURL = async (inputURL: string) => {
    const toolBoxHost = process.env.TOOLBOX ?? 'https://tool.10oz.tw';

    await fetch(`${toolBoxHost}/api/v1/surl`, {
      method: 'POST',
      body: JSON.stringify({
        url: inputURL,
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

        setShortURL(`${toolBoxHost}/${result.shorten}`);
      });
  };

  // call Toolbox API to get short url
  useEffect(() => {
    getShortenURL(stdout);
  }, [stdout]);

  return (
    <Grid
      item
      xs={12}
      sm={12}
      sx={boxStyles.grid}
      zeroMinWidth
      onClick={() => onClick(shortURL)}
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

const KeyValueBox = ({ name, stdout, onClick }: BoxProps) => {
  const data = typeof stdout === 'string' ? JSON.parse(stdout) : stdout;

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
      item
      xs={12}
      sm={12}
      sx={boxStyles.grid}
      zeroMinWidth
      onClick={handleTableClick}
    >
      <Paper elevation={3} sx={boxStyles.paper}>
        <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
          {name}
        </h3>
        <Box sx={{ width: '100%', overflow: 'auto', mt: 2 }}>
          <Grid container spacing={1}>
            {Object.entries(data).map(([key, value]) => (
              <Grid item xs={12} key={key}>
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
                    variant="subtitle2"
                    sx={{
                      width: '30%',
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
  CodeBox,
  DefaultBox,
  KeyValueBox,
  NotingMatchBox,
  QRCodeBox,
  ShortenURLBox,
};
