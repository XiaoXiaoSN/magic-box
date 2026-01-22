import { memo, useMemo } from 'react';

import { Box, Grid, Paper, Typography } from '@mui/material';

import Modal from '@components/Modal';
import { extendSxProps } from '@functions/muiHelper';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface KeyValueBoxTemplateProps extends BoxProps {
  largeModal?: boolean;
  onClose?: () => void;
}

const KeyValueBoxTemplateComponent = ({
  name,
  plaintextOutput,
  options,
  onClick,
  largeModal = false,
  onClose,
  selected = false,
}: KeyValueBoxTemplateProps): React.JSX.Element => {
  // memoize data parsing to avoid re-parsing JSON on every render
  const data = useMemo(() => {
    const result: Record<string, string> = {};

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        result[key] = value as string;
      });
    }
    if (plaintextOutput) {
      try {
        const parsedOutput = JSON.parse(plaintextOutput);
        Object.entries(parsedOutput).forEach(([key, value]) => {
          result[key] = value as string;
        });
      } catch {
        /* */
      }
    }

    return result;
  }, [plaintextOutput, options]);

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
      <Modal
        onClose={onClose}
        testId="magic-box-result-title"
        title={name}
        sx={extendSxProps(
          typeof boxStyles.paper === 'function' ? boxStyles.paper : boxStyles.paper,
          largeModal ? ((theme) => ({ padding: theme.spacing(4) })) : undefined,
          selected ? boxStyles.selectedPaper : undefined
        )}
      >
      <Box sx={{ width: '100%', overflowY: 'auto', overflowX: 'hidden', mt: 2, maxHeight: largeModal ? '60vh' : '250px' }}>
        <Grid container spacing={1}>
          {Object.entries(data).map(([key, value]) => (
            <Grid key={key} size={12}>
              <Paper
                data-testid={`magic-box-key-value-pair-${key}`}
                variant="outlined"
                sx={{
                  p: largeModal ? 2 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Typography
                  data-testid={`magic-box-key-${key}`}
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
                  data-testid={`magic-box-value-${key}`}
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
      </Modal>
    </Grid>
  );
};

const KeyValueBoxTemplate = Object.assign(
  memo(KeyValueBoxTemplateComponent),
  { supportsLarge: true }
);

export default KeyValueBoxTemplate; 