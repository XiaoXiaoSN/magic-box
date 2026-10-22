import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import type { SxProps, Theme } from '@mui/material/styles';
import React, { useEffect, useRef, useState } from 'react';

const QRCodeReaderWrapper = React.lazy(
  async () => import('./QRCodeReaderWrapper'),
);

interface QRCodeReaderProps {
  closeLabel: string;
  dialogLabel: string;
  openLabel: string;
  sxReader?: SxProps<Theme>;
  sxIcon?: SxProps<Theme>;
  setUserInput: React.Dispatch<React.SetStateAction<string>>;
}

const QRCodeReader = ({
  closeLabel,
  dialogLabel,
  openLabel,
  sxReader = {},
  sxIcon = {},
  setUserInput,
}: QRCodeReaderProps): React.JSX.Element => {
  const [showReader, setShowReader] = useState(false);
  const [result, setResult] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (showReader && result !== '') {
      setUserInput(result);
      setShowReader(false);
    }
  }, [result, showReader, setUserInput]);

  useEffect(() => {
    if (!showReader) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showReader]);

  return (
    <React.Fragment>
      <button
        aria-haspopup="dialog"
        aria-label={openLabel}
        className="qr-reader-open"
        data-testid="qr-reader-open-button"
        onClick={() => {
          setShowReader(true);
          setResult('');
        }}
        type="button"
      >
        <QrCodeScannerIcon
          aria-hidden="true"
          sx={[
            {
              '&:hover': {
                opacity: 0.8,
              },
            },
            ...(Array.isArray(sxIcon) ? sxIcon : [sxIcon]),
          ]}
        />
      </button>

      <Modal
        aria-labelledby="qr-reader-title"
        onClose={() => setShowReader(false)}
        open={showReader}
      >
        <Box
          aria-label={dialogLabel}
          data-testid="qr-reader-modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowReader(false);
            event.stopPropagation();
          }}
          ref={dialogRef}
          role="dialog"
          sx={[
            {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'var(--scrim)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            },
            ...(Array.isArray(sxReader) ? sxReader : [sxReader]),
          ]}
          tabIndex={-1}
        >
          <h2 className="sr-only" id="qr-reader-title">
            {dialogLabel}
          </h2>
          <Box data-testid="qr-reader-container">
            <React.Suspense fallback={null}>
              <QRCodeReaderWrapper
                closeLabel={closeLabel}
                setResult={setResult}
                setShowReader={setShowReader}
              />
            </React.Suspense>
          </Box>
        </Box>
      </Modal>
    </React.Fragment>
  );
};

export default QRCodeReader;
