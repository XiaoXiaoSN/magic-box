import { memo } from 'react';

import { Grid, Paper, Typography } from '@mui/material';

import boxStyles from './styles';

const NotingMatchBoxTemplate = memo((): React.JSX.Element => (
  <Grid size={{ xs: 12, sm: 12 }} sx={boxStyles.grid}>
    <Paper elevation={3} sx={boxStyles.paper}>
      <Typography sx={boxStyles.paperTypography}>nothing match</Typography>
    </Paper>
  </Grid>
));

export default NotingMatchBoxTemplate; 