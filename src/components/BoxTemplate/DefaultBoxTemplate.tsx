import React from 'react';

import { Grid, Typography } from '@mui/material';

import Modal from '@components/Modal';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface DefaultBoxTemplateProps extends BoxProps {
  largeModal?: boolean;
  onClose?: () => void;
}

const DefaultBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
  largeModal = false,
  onClose,
}: DefaultBoxTemplateProps): React.JSX.Element => (
  <Grid
    onClick={() => onClick(plaintextOutput)}
    size={{ xs: 12, sm: 12 }}
    sx={boxStyles.grid}
  >
    <Modal
      onClose={onClose}
      testId="magic-box-result-title"
      title={name}
      sx={(theme) => ({
        ...(typeof boxStyles.paper === 'function' ? boxStyles.paper(theme) : boxStyles.paper),
        ...(largeModal && {
          padding: theme.spacing(4),
        }),
      })}
    >
      <Typography
        data-testid="magic-box-result-text"
        sx={boxStyles.paperTypography}
      >
        {plaintextOutput}
      </Typography>
    </Modal>
  </Grid>
);

DefaultBoxTemplate.supportsLarge = true;

export default DefaultBoxTemplate; 