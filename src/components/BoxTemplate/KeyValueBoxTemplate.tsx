import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { Box, Grid, IconButton, Paper, Typography } from '@mui/material';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface KeyValueBoxTemplateProps extends BoxProps {
  large?: boolean;
  onClose?: () => void;
}

const KeyValueBoxTemplate = ({
  name,
  plaintextOutput,
  options,
  onClick,
  large = false,
  onClose,
}: KeyValueBoxTemplateProps): React.JSX.Element => {
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
      <Paper elevation={3} sx={(theme) => ({
        ...(typeof boxStyles.paper === 'function' ? boxStyles.paper(theme) : boxStyles.paper),
        ...(large && {
          padding: theme.spacing(4),
        }),
      })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>{name}</h3>
          {onClose ? <IconButton aria-label="close" onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton> : null}
        </div>
        <Box sx={{ width: '100%', overflowY: 'auto', overflowX: 'hidden', mt: 2, maxHeight: large ? '60vh' : '250px' }}>
          <Grid container spacing={1}>
            {Object.entries(data).map(([key, value]) => (
              <Grid key={key} size={12}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: large ? 2 : 1,
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

KeyValueBoxTemplate.supportsLarge = true;

export default KeyValueBoxTemplate; 