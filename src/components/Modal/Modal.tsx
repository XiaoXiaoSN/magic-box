import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Paper } from '@mui/material';

import { extendSxProps } from '@functions/muiHelper';

import type { SxProps, Theme } from '@mui/material/styles';

interface ModalProps {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
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
    <Paper
      elevation={3}
      sx={extendSxProps({ minWidth: 'min(500px, 45vw)' }, sx)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 data-testid={testId} style={{ margin: 0 }}>
          {title}
        </h3>
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
