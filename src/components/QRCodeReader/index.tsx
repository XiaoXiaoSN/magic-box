import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import Box from '@mui/material/Box';
import { SxProps, Theme } from '@mui/material/styles';
import { logger } from '@sentry/react';
import { IDetectedBarcode, Scanner } from '@yudiel/react-qr-scanner';
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
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: '50%',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
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

const QRCodeReaderWrapper = ({ setResult, setShowReader }: QRCodeReaderWrapperProps) => {
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
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <CloseButton setShowReader={setShowReader} />
      <Scanner
        onScan={handleScan}
        onError={(error) => logger.error(`failed to scan: ${error}`)}
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
}: QRCodeReaderProps) => {
  const [showReader, setShowReader] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (showReader && result !== '') {
      setUserInput(result);
      setShowReader(false);
    }
  }, [result, showReader, setUserInput]);

  return (
    <>
      {showReader && (
        <Box
          data-testid="qr-reader-modal"
          onClick={() => setShowReader(false)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            ...sxReader,
          }}
        >
          <Box data-testid="qr-reader-container">
            <QRCodeReaderWrapper
              setResult={setResult}
              setShowReader={setShowReader}
            />
          </Box>
        </Box>
      )}
      <QrCodeScannerIcon
        data-testid="qr-reader-open-button"
        sx={{
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
          ...sxIcon,
        }}
        onClick={() => {
          setShowReader(true);
          setResult('');
        }}
      />
    </>
  );
};

QRCodeReader.defaultProps = {
  sxReader: {},
  sxIcon: {},
};

export default QRCodeReader;
