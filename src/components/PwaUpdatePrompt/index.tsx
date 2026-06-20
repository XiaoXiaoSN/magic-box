import { useRegisterSW } from 'virtual:pwa-register/react';

import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';

const checkIntervalMs = 60 * 60 * 1000;

const PwaUpdatePrompt = (): React.JSX.Element | null => {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const updateIntervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      if (!registration) return;
      if (updateIntervalId.current) {
        clearInterval(updateIntervalId.current);
      }
      updateIntervalId.current = setInterval(() => {
        registration.update();
      }, checkIntervalMs);
    },
    onNeedRefresh() {
      setOpen(true);
    },
  });

  useEffect(() => {
    return () => {
      if (updateIntervalId.current) {
        clearInterval(updateIntervalId.current);
        updateIntervalId.current = null;
      }
    };
  }, []);

  const handleRefresh = () => {
    void updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      open={open}
      sx={{ mb: 6 }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: 'center',
          bgcolor: 'grey.900',
          color: 'common.white',
          px: 2,
          py: 1.5,
          borderRadius: 1,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="body2">{t('pwa.newVersion')}</Typography>
          <Typography variant="caption">{t('pwa.refreshHint')}</Typography>
        </Stack>
        <Button
          color="inherit"
          onClick={handleRefresh}
          size="small"
          variant="outlined"
        >
          {t('pwa.refresh')}
        </Button>
        <Button color="inherit" onClick={() => setOpen(false)} size="small">
          {t('pwa.later')}
        </Button>
      </Stack>
    </Snackbar>
  );
};

export default PwaUpdatePrompt;
