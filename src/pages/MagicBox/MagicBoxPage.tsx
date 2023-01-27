import MagicBox from '@components/MagicBox';
import {
  Container, Grid, TextField,
} from '@mui/material';
// import { useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

const MagicBoxPage = () => {
  // const theme = useTheme();

  const [userInput, setUserInput] = useState('');
  const [magicIn, setMagicIn] = useState('');

  useEffect(() => {
    const timeOutID = setTimeout(() => setMagicIn(userInput), 500);
    return () => { clearTimeout(timeOutID); };
  }, [userInput]);

  // NOTE: material typed defined only support `xs`, `sm`...
  // https://mui.com/material-ui/api/container/#props
  const containerMaxWidth = '95vw' as never;

  // style="height: 50px; padding-right: 10px"
  return (
    <Container maxWidth={containerMaxWidth}>
      <Grid container spacing={2} sx={{ marginTop: '30px', padding: '30px' }}>

        {/* Magic Box Input */}
        <Grid item xs={12} sm={12} md={6}>
          <TextField
            id="magicInput"
            name="magicInput"
            multiline
            autoFocus
            fullWidth
            rows={7}
            onChange={(e) => { setUserInput(e.target.value); }}
            sx={{ fontSize: '1.25rem' }} // this style attr not work
            variant="outlined"
          />
        </Grid>

        {/* Magic Box Output */}
        <Grid
          container
          item
          xs={12}
          sm={12}
          md={6}
          sx={{ background: '#f5f5f5', overflow: 'scroll', maxHeight: 'calc(100vh - 100px)' }}
        >
          <MagicBox in={magicIn} />
        </Grid>

      </Grid>
    </Container>

  );
};

export default MagicBoxPage;
