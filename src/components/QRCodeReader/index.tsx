import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

const QRCodeReaderWrapper = React.lazy(
  async () => import('./QRCodeReaderWrapper'),
);

interface QRCodeReaderProps {
  sxReader?: SxProps<Theme>;
  sxIcon?: SxProps<Theme>;
  setUserInput: React.Dispatch<React.SetStateAction<string>>;
}

const QRCodeReader = ({
  sxReader = {},
  sxIcon = {},
  setUserInput,
}: QRCodeReaderProps): React.JSX.Element => {
  const [showReader, setShowReader] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (showReader && result !== '') {
      setUserInput(result);
      setShowReader(false);
    }
  }, [result, showReader, setUserInput]);

  return (
    <React.Fragment>
      {showReader ? (
        <Box
          data-testid="qr-reader-modal"
          onClick={() => setShowReader(false)}
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
        >
          <Box data-testid="qr-reader-container">
            <React.Suspense fallback={null}>
              <QRCodeReaderWrapper
                setResult={setResult}
                setShowReader={setShowReader}
              />
            </React.Suspense>
          </Box>
        </Box>
      ) : null}

      <QrCodeScannerIcon
        data-testid="qr-reader-open-button"
        onClick={() => {
          setShowReader(true);
          setResult('');
        }}
        sx={[
          {
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8,
            },
          },
          ...(Array.isArray(sxIcon) ? sxIcon : [sxIcon]),
        ]}
      />
    </React.Fragment>
  );
};

export default QRCodeReader;
