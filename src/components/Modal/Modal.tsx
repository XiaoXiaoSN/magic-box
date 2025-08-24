import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Paper } from '@mui/material';

import type { Theme } from '@mui/material';

interface ModalProps {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
  sx?: ((theme: Theme) => object) | object;
  testId?: string;
}

const Modal = ({
  title,
  onClose,
  children,
  sx,
  testId,
}: ModalProps): React.JSX.Element => {
  return (
    <Paper elevation={3} sx={sx}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 data-testid={testId} style={{ margin: 0 }}>{title}</h3>
        {onClose ? (
          <IconButton aria-label="close" onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
      </div>
      {children}
    </Paper>
  );
};

export default Modal;