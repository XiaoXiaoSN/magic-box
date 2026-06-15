import { Alert, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';

interface Props {
  notify: number[];
  text?: string;
}

const CustomizedSnackbar = ({ notify, text }: Props): React.JSX.Element => {
  const { t } = useLocale();
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
        {text ?? t('snackbar.copied')}
      </Alert>
    </Snackbar>
  );
};

CustomizedSnackbar.defaultProps = {
  text: undefined,
};

export default CustomizedSnackbar;
