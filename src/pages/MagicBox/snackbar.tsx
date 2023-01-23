/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

interface CustomizedSnackbarProps {
  notify: number[],
  text: string,
}

export default function CustomizedSnackbar(props: CustomizedSnackbarProps): JSX.Element {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (props?.notify[0] > 0) {
      setOpen(true)
    }
  }, props.notify)

  return (
    <Snackbar
        open={open}
        autoHideDuration={1500}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert
          onClose={() => setOpen(false)}
          severity='success'
          elevation={6}
          variant='filled'>
        {props.text ?? 'Copied'}
      </Alert>
    </Snackbar>
  );
}
