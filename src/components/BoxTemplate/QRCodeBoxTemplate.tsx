import React from 'react';

import { Box, Grid } from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';

import Modal from '@components/Modal';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface QRCodeBoxTemplateProps extends BoxProps {
  largeModal?: boolean;
  onClose?: () => void;
}

const QRCodeBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
  largeModal = false,
  onClose,
}: QRCodeBoxTemplateProps): React.JSX.Element => (
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
      {/* https://github.com/zpao/qrcode.react */}
      <Box id="qrcode-box" sx={{ ...boxStyles.alignCenter, p: 2 }}>
        <QRCodeCanvas size={256} value={plaintextOutput} />
      </Box>
    </Modal>
  </Grid>
);

export default QRCodeBoxTemplate; 