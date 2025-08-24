import React, { Suspense, useEffect, useState } from 'react';

import { Container, Grid, TextField } from '@mui/material';
import Box from '@mui/material/Box';

import MagicBox from '@components/MagicBox';


// Dynamic import
const QRCodeReader = React.lazy(async () => import('@components/QRCodeReader'));

const MagicBoxPage = (): React.JSX.Element => {
  const [userInput, setUserInput] = useState('');
  const [magicIn, setMagicIn] = useState('');

  const inputRef = React.useRef<HTMLInputElement>(null);

  // parse query string at first load
  useEffect(() => {
    // codeql[skip] Safe: Only parses query string and sets input value
    const params = new URLSearchParams(window.location.search);
    const inputValue = params.get('input') && params.get('i');
    if (inputValue) {
      setUserInput(inputValue);
      if (inputRef.current) {
        inputRef.current.value = inputValue;
      }
    }
  }, []);

  useEffect(() => {
    const timeoutID = setTimeout(() => setMagicIn(userInput), 500);
    return () => {
      clearTimeout(timeoutID);
    };
  }, [userInput]);

  // NOTE: material typed defined only support `xs`, `sm`...
  // https://mui.com/material-ui/api/container/#props
  const containerMaxWidth = '100vw' as never;

  return (
    <Container maxWidth={containerMaxWidth}>
      <Grid container spacing={1.5} sx={{ marginTop: '20px', padding: '30px' }}>
        {/* Magic Box Input */}
        <Grid size={{ xs: 12, sm: 12, md: 6 }}>
          <Box sx={{ position: 'relative' }}>
            <TextField
              autoFocus
              fullWidth
              multiline
              id="magicInput"
              inputRef={inputRef}
              name="magicInput"
              rows={7}
              variant="outlined"
              onChange={(e) => {
                setUserInput(e.target.value);
              }}
              sx={{
                fontSize: '1.25rem',
                '& .MuiInputBase-input': {
                  fontSize: '1.25rem',
                },
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                lineHeight: 0,
              }}
            >
              <Suspense fallback={<div />}>
                <QRCodeReader
                  sxIcon={{ m: 1, color: '#666666' }}
                  setUserInput={(input) => {
                    if (inputRef.current) {
                      inputRef.current.value = input as string;
                      setUserInput(input);
                    }
                  }}
                />
              </Suspense>
            </Box>
          </Box>
        </Grid>

        {/* Magic Box Output */}
        <Grid size={{ xs: 12, sm: 12, md: 6 }}>
          <Grid
            container
            alignItems="center"
            justifyContent="center"
            padding=".75rem"
            spacing={0.5}
            sx={{
              background: '#f5f5f5',
              overflow: 'scroll',
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none', // Firefox
              maxHeight: 'calc(100dvh - 150px)',
            }}
          >
            <MagicBox
              input={magicIn}
              onPasteInput={(val: string) => {
                setUserInput(val);
                if (inputRef.current) {
                  inputRef.current.value = val;
                }
              }}
            />
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MagicBoxPage;
