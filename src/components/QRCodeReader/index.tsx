import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { logger } from '@sentry/react';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { Scanner } from '@yudiel/react-qr-scanner';
import React, { useEffect, useState } from 'react';

interface CloseButtonProps {
  setShowReader: React.Dispatch<React.SetStateAction<boolean>>;
}

const CloseButton = ({ setShowReader }: CloseButtonProps) => (
  <Box
    data-testid="qr-reader-close-button"
    onClick={() => setShowReader(false)}
    sx={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      cursor: 'pointer',
      zIndex: 1,
      // sits over the live camera feed, so it needs its own opaque-ish plate
      // rather than inheriting the icon colour from the surrounding theme.
      backgroundColor: 'var(--bg-elev)',
      color: 'var(--ink)',
      opacity: 0.85,
      borderRadius: '50%',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&:hover': {
        opacity: 1,
      },
    }}
  >
    <CloseIcon />
  </Box>
);

interface QRCodeReaderWrapperProps {
  setResult: React.Dispatch<React.SetStateAction<string>>;
  setShowReader: React.Dispatch<React.SetStateAction<boolean>>;
}

const QRCodeReaderWrapper = ({
  setResult,
  setShowReader,
}: QRCodeReaderWrapperProps) => {
  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0) {
      setResult(detectedCodes[0].rawValue);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '300px',
        height: '300px',
        backgroundColor: 'var(--bg-elev)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <CloseButton setShowReader={setShowReader} />
      <Scanner
        onError={(error) => logger.error(`failed to scan: ${error}`)}
        onScan={handleScan}
        constraints={{
          facingMode: 'environment',
        }}
      />
    </Box>
  );
};

interface QRCodeReaderProps {
  sxReader?: SxProps<Theme>;
  sxIcon?: SxProps<Theme>;
  setUserInput: React.Dispatch<React.SetStateAction<string>>;
}

const QRCodeReader = ({
  sxReader,
  sxIcon,
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
            <QRCodeReaderWrapper
              setResult={setResult}
              setShowReader={setShowReader}
            />
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

QRCodeReader.defaultProps = {
  sxReader: {},
  sxIcon: {},
};

export default QRCodeReader;
