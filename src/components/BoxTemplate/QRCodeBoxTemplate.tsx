import React from 'react';

import { Box, Grid, Paper } from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface QRCodeBoxTemplateProps extends BoxProps {
  largeModal?: boolean;
}

const QRCodeBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
  largeModal = false,
}: QRCodeBoxTemplateProps): React.JSX.Element => (
  <Grid
    onClick={() => onClick(plaintextOutput)}
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
      {/* https://github.com/zpao/qrcode.react */}
      <Box id="qrcode-box" sx={{ ...boxStyles.alignCenter, p: 2 }}>
        <QRCodeCanvas size={256} value={plaintextOutput} />
      </Box>
    </Paper>
  </Grid>
);

export default QRCodeBoxTemplate; 