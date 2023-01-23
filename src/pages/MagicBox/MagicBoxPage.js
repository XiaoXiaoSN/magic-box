/* eslint-disable */
import React, { useEffect, useState } from 'react'
import { AppBar, Container, Grid, TextField, Toolbar, Typography } from '@mui/material'
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/styles'
import MagicBox from './MagicBox'


const MagicBoxTitle = 'Magic Box'

const theme = createTheme({
  overrides: {
    MuiInput: {
      textarea: {
        fontSize: '1.25rem',
      },
    },
  },
})

const MagicBoxPage = () => {
  const [userInput, setUserInput] = useState('')
  const [magicIn, setMagicIn] = useState('')

  useEffect(() => {
    const timeOutID = setTimeout(() => setMagicIn(userInput), 500);
    return () => { clearTimeout(timeOutID) }
  }, [userInput]);

  // style="height: 50px; padding-right: 10px"
  return (
    <ThemeProvider theme={theme}>

      <AppBar position="static" sx={{
          color: theme.palette.text.secondary,
          backgroundColor: 'white',
          borderBottom: '1px solid #cdc9c3',
          height: "65px",
       }}>
        <Toolbar>
          <img src="/images/logo-50.png" alt="icon" style={{
            height: "50px",
            paddingRight: "10px",
          }} />
          <Typography variant="h6"> {MagicBoxTitle} </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="95vw">
        <Grid container spacing={2} sx={{ marginTop: "30px", padding: "30px" }}>

          {/* Magic Box Input */}
          <Grid item xs={12} sm={12} md={6} >
            <TextField
              name="magicInput"
              multiline
              autoFocus={true}
              fullWidth={true}
              rows={7}
              onChange={(e) => { setUserInput(e.target.value) }}
              sx={{ fontSize: "1.25rem" }} // this style attr not work
              variant='outlined'
            />
          </Grid>

          {/* Magic Box Output */}
          <Grid container item xs={12} sm={12} md={6}
            sx={{ background: "#f5f5f5", overflow: "scroll", maxHeight: "calc(100vh - 100px)" }} >
            <MagicBox in={magicIn} />
          </Grid>

        </Grid>
      </Container>


      <AppBar position="fixed" sx={{
          top: 'auto',
          bottom: 0,
          color: theme.palette.text.secondary,
          backgroundColor: 'white',
          borderBottom: '1px solid #cdc9c3',
          padding: "0.2rem",
        }}
      >
        {`© ${new Date().getFullYear()} Copyright: All Rights Not Reserved`}
      </AppBar>

    </ThemeProvider>
  )
}

export default MagicBoxPage
