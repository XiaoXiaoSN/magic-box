// FIXME: In dev mode, QRCodeReader Component will not close after scanning
// https://github.com/JodusNodus/react-qr-reader/issues/156#issuecomment-1362884801

import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import Box from '@mui/material/Box';
import { SxProps, Theme } from '@mui/material/styles';
import React, { useEffect, useRef, useState } from 'react';
import { OnResultFunction, QrReader } from 'react-qr-reader';

interface CloseButtonProps {
  setShowRender: React.Dispatch<React.SetStateAction<boolean>>;
}

const CloseButton = ({ setShowRender }: CloseButtonProps) => (
  <CloseIcon
    onClick={() => setShowRender(false)}
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
  setShowRender: React.Dispatch<React.SetStateAction<boolean>>;
}

const QRCodeReaderWrapper = ({
  setResult,
  setShowRender,
}: QRCodeReaderWrapperProps) => {
  const lastResult = useRef<string>();

  const onReadResult: OnResultFunction = (result) => {
    if (!result) return;

    // This callback will keep existing even after
    // this component is unmounted
    // So ignore it (only in this reference) if result keeps repeating
    const resultText = result.getText();
    if (lastResult.current === resultText) {
      return;
    }

    lastResult.current = resultText;
    setResult(resultText);
  };

  return (
    <QrReader
      scanDelay={300}
      onResult={onReadResult}
      constraints={{ facingMode: 'environment' }}
      containerStyle={{
        width: '70vw',
        height: '70vw',
        maxWidth: '500px',
        maxHeight: '500px',
        background: '#646464',
        border: '.2rem solid #c7c7c7',
      }}
      ViewFinder={() => CloseButton({ setShowRender })}
    />
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
          <QRCodeReaderWrapper
            setResult={setResult}
            setShowRender={setShowReader}
          />
        </Box>
      )}
      <QrCodeScannerIcon
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
