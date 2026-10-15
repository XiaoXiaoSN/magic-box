import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { Scanner } from '@yudiel/react-qr-scanner';
import type React from 'react';

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
        onError={(error) => {
          void import('@sentry/react')
            .then(({ logger }) => logger.error(`failed to scan: ${error}`))
            .catch(() => undefined);
        }}
        onScan={handleScan}
        constraints={{
          facingMode: 'environment',
        }}
      />
    </Box>
  );
};

export default QRCodeReaderWrapper;
