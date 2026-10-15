import { Alert, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';

export type SnackbarSeverity = 'success' | 'error';

export interface SnackbarNotification {
  id: number;
  severity: SnackbarSeverity;
}

interface Props {
  notify: SnackbarNotification | null;
  text?: string;
}

const CustomizedSnackbar = ({ notify, text }: Props): React.JSX.Element => {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (notify) {
      setOpen(true);
    }
  }, [notify]);

  const severity = notify?.severity ?? 'success';

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      autoHideDuration={1500}
      key={notify?.id ?? 0}
      onClose={() => setOpen(false)}
      open={open}
    >
      <Alert
        elevation={6}
        onClose={() => setOpen(false)}
        severity={severity}
        variant="filled"
      >
        {text ??
          t(severity === 'success' ? 'snackbar.copied' : 'snackbar.copyFailed')}
      </Alert>
    </Snackbar>
  );
};

CustomizedSnackbar.defaultProps = {
  text: undefined,
};

export default CustomizedSnackbar;
