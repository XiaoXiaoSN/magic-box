import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import Box from '@mui/material/Box';
import { SxProps, Theme } from '@mui/material/styles';
import { IDetectedBarcode, Scanner } from '@yudiel/react-qr-scanner';
import React, { useEffect, useRef, useState } from 'react';

interface CloseButtonProps {
  setShowReader: React.Dispatch<React.SetStateAction<boolean>>;
}

const CloseButton = ({ setShowReader }: CloseButtonProps) => (
  <CloseIcon
    data-testid="qr-reader-close-button"
    onClick={() => setShowReader(false)}
    sx={{
      position: 'absolute',
      top: 0,
      right: 0,
      margin: '.1rem',
      zIndex: 100,
      fontWeight: 'bold',
      color: '#c7c7c7',
    }}
  />
);

interface QRCodeReaderWrapperProps {
  setResult: React.Dispatch<React.SetStateAction<string>>;
  setShowReader: React.Dispatch<React.SetStateAction<boolean>>;
}

const QRCodeReaderWrapper = ({
  setResult,
  setShowReader,
}: QRCodeReaderWrapperProps) => {
  const lastResult = useRef<string>(null);

  const onScan = (detectedCodes: IDetectedBarcode[]) => {
    if (!detectedCodes.length) return;

    const result = detectedCodes[0].rawValue;
    if (!result) return;

    // This callback will keep existing even after
    // this component is unmounted
    // So ignore it (only in this reference) if result keeps repeating
    if (lastResult.current === result) {
      return;
    }

    lastResult.current = result;
    setResult(result);
  };

  const onError = (error: unknown) => {
    console.error('QR Scanner error:', error);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Scanner
        onScan={onScan}
        onError={onError}
        constraints={{ facingMode: 'environment' }}
        scanDelay={300}
        sound={false}
        styles={{
          video: {
            width: '70vw',
            height: '70vw',
            maxWidth: '500px',
            maxHeight: '500px',
            background: '#646464',
            border: '.2rem solid #c7c7c7',
          },
        }}
      />
      <CloseButton setShowReader={setShowReader} />
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
    // if QR Reader is open and result was changed
    if (showReader && result !== '') {
      setUserInput(result);

      // result updated, close QR Reader
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
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, .5)',
            zIndex: '9999',
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
        sx={sxIcon}
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
