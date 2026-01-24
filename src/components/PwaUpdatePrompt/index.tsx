import { useState } from 'react';

import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRegisterSW } from 'virtual:pwa-register/react';

const checkIntervalMs = 60 * 60 * 1000;

const PwaUpdatePrompt = (): React.JSX.Element => {
  const [open, setOpen] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;
      setInterval(() => {
        registration.update();
      }, checkIntervalMs);
    },
    onNeedRefresh() {
      setOpen(true);
    },
  });

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
        alignItems="center"
        direction="row"
        spacing={1.5}
        sx={{
          bgcolor: 'grey.900',
          color: 'common.white',
          px: 2,
          py: 1.5,
          borderRadius: 1,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="body2">
            New version available.
          </Typography>
          <Typography variant="caption">
            Refresh to update the app.
          </Typography>
        </Stack>
        <Button
          color="inherit"
          onClick={handleRefresh}
          size="small"
          variant="outlined"
        >
          Refresh
        </Button>
        <Button
          color="inherit"
          onClick={() => setOpen(false)}
          size="small"
        >
          Later
        </Button>
      </Stack>
    </Snackbar>
  );
};

export default PwaUpdatePrompt;
