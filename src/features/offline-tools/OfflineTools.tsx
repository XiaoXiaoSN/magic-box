import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import {
  inspectToolPack,
  installToolPack,
  removeToolPack,
  supportsOfflineTools,
  type ToolPackStatus,
} from './toolPack';

export default function OfflineTools() {
  const { locale, t } = useLocale();
  const [status, setStatus] = useState<ToolPackStatus | null>(null);
  const [notice, setNotice] = useState<
    'offline.failed' | 'offline.quota' | null
  >(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const transfer = useRef<AbortController | null>(null);
  const read = useRef(0);
  const supported = supportsOfflineTools();

  const refresh = useCallback(async () => {
    if (!supported || transfer.current) return;
    const generation = ++read.current;
    try {
      const next = await inspectToolPack();
      if (read.current === generation) setStatus(next);
    } catch {
      if (read.current === generation) setNotice('offline.failed');
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    void refresh();
    window.addEventListener('focus', refresh);
    navigator.serviceWorker.addEventListener('controllerchange', refresh);
    return () => {
      ++read.current;
      transfer.current?.abort();
      window.removeEventListener('focus', refresh);
      navigator.serviceWorker.removeEventListener('controllerchange', refresh);
    };
  }, [refresh, supported]);

  const install = async () => {
    if (!status?.pack || transfer.current) return;
    const handle = new AbortController();
    transfer.current = handle;
    ++read.current;
    setProgress(0);
    setNotice(null);
    try {
      await installToolPack(status.pack, handle.signal, setProgress);
    } catch (error) {
      if (!handle.signal.aborted)
        setNotice(
          error instanceof DOMException && error.name === 'QuotaExceededError'
            ? 'offline.quota'
            : 'offline.failed',
        );
    } finally {
      transfer.current = null;
      setProgress(null);
      await refresh();
    }
  };

  const remove = async () => {
    setRemoving(true);
    setNotice(null);
    try {
      await removeToolPack();
    } catch {
      setNotice('offline.failed');
    } finally {
      setRemoving(false);
      await refresh();
    }
  };

  const message = !supported
    ? 'offline.unsupported'
    : !status
      ? 'offline.checking'
      : status.ready
        ? 'offline.ready'
        : !status.controlled
          ? 'offline.reload'
          : status.installed
            ? 'offline.incomplete'
            : status.pack
              ? 'offline.available'
              : 'offline.unavailable';
  const size = status?.pack?.assets.reduce(
    (sum, asset) => sum + asset.bytes,
    0,
  );
  const busy = progress !== null || removing;
  const formattedSize =
    size === undefined
      ? null
      : new Intl.NumberFormat(locale === 'tw' ? 'zh-TW' : 'en', {
          maximumFractionDigits: 1,
        }).format(size / 1024 / 1024);

  return (
    <>
      <p>
        {t('offline.tools')}
        {formattedSize ? ` (${formattedSize} MiB)` : ''}
      </p>
      <p role="status">
        {progress === null
          ? t(message)
          : t('offline.progress', {
              done: progress,
              total: status?.pack?.assets.length ?? 0,
            })}
      </p>
      {notice ? <p role="alert">{t(notice)}</p> : null}
      <div className="cloud-actions">
        {status?.pack && !status.ready && progress === null ? (
          <button
            className="btn-subtle"
            disabled={busy || !status.controlled}
            onClick={() => void install()}
            type="button"
          >
            {t(status.installed ? 'offline.retry' : 'offline.download')}
          </button>
        ) : null}
        {progress !== null ? (
          <button
            className="btn-subtle"
            onClick={() => transfer.current?.abort()}
            type="button"
          >
            {t('offline.cancel')}
          </button>
        ) : null}
        {status?.installed ? (
          <button
            className="btn-subtle"
            disabled={busy}
            onClick={() => void remove()}
            type="button"
          >
            {t('offline.remove')}
          </button>
        ) : null}
      </div>
    </>
  );
}
