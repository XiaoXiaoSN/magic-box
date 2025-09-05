import { useEffect, useState } from 'react';

import { Alert, Snackbar } from '@mui/material';

interface Props {
  notify: number[];
  text?: string;
}

const CustomizedSnackbar = ({ notify, text }: Props): React.JSX.Element => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (notify && notify.length > 0 && notify[0] > 0) {
      setOpen(true);
    }
  }, [notify]);

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      autoHideDuration={1500}
      onClose={() => setOpen(false)}
      open={open}
    >
      <Alert
        elevation={6}
        onClose={() => setOpen(false)}
        severity="success"
        variant="filled"
      >
        {text ?? 'Copied'}
      </Alert>
    </Snackbar>
  );
};

CustomizedSnackbar.defaultProps = {
  text: 'Copied',
};

export default CustomizedSnackbar;
