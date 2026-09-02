import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';

import { useLocale } from '../../contexts/LocaleContext';
import { buildVersion, serviceWorkerUrl } from '../../global/buildInfo';

const checkIntervalMs = 60 * 60 * 1000;

interface VersionManifest {
  serviceWorker: string;
  version: string;
}

function isVersionManifest(value: unknown): value is VersionManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'serviceWorker' in value &&
    typeof value.serviceWorker === 'string' &&
    /^\/sw-[a-zA-Z0-9_-]+\.js$/.test(value.serviceWorker) &&
    'version' in value &&
    typeof value.version === 'string'
  );
}

function hasScriptUrl(
  worker: ServiceWorker | null,
  scriptUrl: string,
): worker is ServiceWorker {
  return worker !== null && worker.scriptURL === scriptUrl;
}

const PwaUpdatePrompt = (): React.JSX.Element | null => {
  const { t } = useLocale();
  const [availableUpdate, setAvailableUpdate] =
    useState<VersionManifest | null>(null);
  const [open, setOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const dismissedVersion = useRef<string | null>(null);
  const controlledAtMount = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let disposed = false;
    let checking = false;
    let checkAgain = false;
    const serviceWorker = navigator.serviceWorker;
    controlledAtMount.current = serviceWorker.controller !== null;

    const checkForUpdate = async (): Promise<void> => {
      if (disposed) return;
      if (checking) {
        checkAgain = true;
        return;
      }
      checking = true;
      try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        if (!response.ok) return;
        const manifest: unknown = await response.json();
        if (!isVersionManifest(manifest) || disposed) return;

        if (
          manifest.version === buildVersion &&
          manifest.serviceWorker === serviceWorkerUrl
        ) {
          setAvailableUpdate(null);
          setOpen(false);
          return;
        }

        setAvailableUpdate(manifest);
        if (dismissedVersion.current !== manifest.version) setOpen(true);
      } catch {
        // update discovery is best-effort while offline or during deployment
      } finally {
        checking = false;
        if (checkAgain && !disposed) {
          checkAgain = false;
          void checkForUpdate();
        }
      }
    };

    const checkWhenVisible = (): void => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };
    const reloadControlledClient = (): void => {
      if (controlledAtMount.current) {
        window.location.reload();
      } else {
        controlledAtMount.current = true;
      }
    };

    void serviceWorker
      .register(serviceWorkerUrl, {
        scope: '/',
        updateViaCache: 'none',
      })
      .catch(() => {
        // registration retries on the next app launch
      });
    void checkForUpdate();
    const updateIntervalId = setInterval(checkForUpdate, checkIntervalMs);
    document.addEventListener('visibilitychange', checkWhenVisible);
    window.addEventListener('online', checkForUpdate);
    serviceWorker.addEventListener('controllerchange', reloadControlledClient);

    return () => {
      disposed = true;
      clearInterval(updateIntervalId);
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.removeEventListener('online', checkForUpdate);
      serviceWorker.removeEventListener(
        'controllerchange',
        reloadControlledClient,
      );
    };
  }, []);

  const handleRefresh = async (): Promise<void> => {
    if (!availableUpdate || !('serviceWorker' in navigator)) return;
    setUpgrading(true);

    try {
      const targetUrl = new URL(
        availableUpdate.serviceWorker,
        window.location.origin,
      ).href;
      const registration = await navigator.serviceWorker.register(targetUrl, {
        scope: '/',
        updateViaCache: 'none',
      });

      if (hasScriptUrl(registration.waiting, targetUrl)) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }

      const installingWorker = registration.installing;
      if (!hasScriptUrl(installingWorker, targetUrl)) {
        if (hasScriptUrl(registration.active, targetUrl)) {
          window.location.reload();
          return;
        }
        setUpgrading(false);
        return;
      }

      const handleStateChange = (): void => {
        if (installingWorker.state === 'installed') {
          installingWorker.removeEventListener(
            'statechange',
            handleStateChange,
          );
          const waitingWorker = registration.waiting;
          if (hasScriptUrl(waitingWorker, targetUrl)) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        } else if (installingWorker.state === 'redundant') {
          installingWorker.removeEventListener(
            'statechange',
            handleStateChange,
          );
          setUpgrading(false);
        }
      };
      installingWorker.addEventListener('statechange', handleStateChange);
    } catch {
      setUpgrading(false);
    }
  };

  const handleLater = (): void => {
    dismissedVersion.current = availableUpdate?.version ?? null;
    setOpen(false);
  };

  if (!availableUpdate) return null;

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
          disabled={upgrading}
          onClick={() => void handleRefresh()}
          size="small"
          variant="outlined"
        >
          {t('pwa.refresh')}
        </Button>
        <Button
          color="inherit"
          disabled={upgrading}
          onClick={handleLater}
          size="small"
        >
          {t('pwa.later')}
        </Button>
      </Stack>
    </Snackbar>
  );
};

export default PwaUpdatePrompt;
