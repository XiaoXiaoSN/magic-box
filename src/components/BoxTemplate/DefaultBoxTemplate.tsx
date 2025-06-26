import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { Grid, IconButton, Paper, Typography } from '@mui/material';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface DefaultBoxTemplateProps extends BoxProps {
  large?: boolean;
  onClose?: () => void;
}

const DefaultBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
  large = false,
  onClose,
}: DefaultBoxTemplateProps): React.JSX.Element => (
  <Grid
    onClick={() => onClick(plaintextOutput)}
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
        <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>
          {name}
        </h3>
        {onClose ? <IconButton aria-label="close" onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton> : null}
      </div>
      <Typography
        data-testid="magic-box-result-text"
        sx={boxStyles.paperTypography}
      >
        {plaintextOutput}
      </Typography>
    </Paper>
  </Grid>
);

DefaultBoxTemplate.supportsLarge = true;

export default DefaultBoxTemplate; 