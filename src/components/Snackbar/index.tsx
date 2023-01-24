import { Alert, Snackbar } from '@mui/material';
import React, { useEffect, useState } from 'react';

interface Props {
  notify: number[],
  text?: string,
}

const CustomizedSnackbar = ({ notify, text } : Props) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (notify && notify.length > 0 && notify[0] > 0) {
      setOpen(true);
    }
  }, [notify]);

  return (
    <Snackbar
      open={open}
      autoHideDuration={1500}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => setOpen(false)}
        severity="success"
        elevation={6}
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
