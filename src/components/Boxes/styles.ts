import { Theme } from '@mui/material';

export default {
  grid: {
    marginBottom: '.45rem',
  },
  paper: (theme: Theme) => ({
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
    border: '1px solid #cdc9c3',
    borderRadius: '5px',
  }),
  paperTypography: {
    textAlign: 'center',
    overflow: 'auto',
  },
  alignCenter: {
    textAlign: 'center',
    overflow: 'auto',
  },
};
