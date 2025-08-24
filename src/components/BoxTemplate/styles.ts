import type { Theme } from '@mui/material';

export default {
  grid: {
    marginBottom: '.45rem',
  },
  paper: (theme: Theme): object => ({
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
    border: '1px solid #cdc9c3',
    borderRadius: '5px',
    backgroundColor: theme.palette.background.paper,
  }),
  selectedPaper: (theme: Theme): object => ({
    outline: `2px solid ${theme.palette.primary.main}`,
    borderRadius: '6px',
    boxShadow: '0 0 0 2px rgba(25,118,210,0.2) inset',
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
