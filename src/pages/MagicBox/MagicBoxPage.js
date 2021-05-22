/* eslint-disable */
import React, { } from 'react'
import { injectIntl } from 'react-intl'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
import { Activity } from 'rmw-shell'
import { Container, Grid, TextField, AppBar, Toolbar, Typography } from '@material-ui/core'
import MagicBox from './magicBox'


const theme = createMuiTheme({
  overrides: {
    MuiInput: {
      textarea: {
        fontSize: '1.25rem',
      },
    },
  },
})

const MagicBoxPage = ({intl}) => {
  const MagicBoxTitle = 'Magic Box'
  const [userInput, setUserInput] = React.useState('')
  const [magicIn, setMagicIn] = React.useState('')

  React.useEffect(() => {
    const timeOutID = setTimeout(() => setMagicIn(userInput), 500);
    return () => { clearTimeout(timeOutID) }
  }, [userInput]);

  // style="height: 50px; padding-right: 10px" 
  return (
    <MuiThemeProvider theme={theme}>

      <AppBar position="static" style={{
          color: theme.palette.text.secondary,
          backgroundColor: 'white',
          borderBottom: '1px solid #cdc9c3',
          height: "65px",
       }}>
        <Toolbar>
          <img src="/images/cat-50.png" alt="icon" style={{
            height: "50px",
            paddingRight: "10px",
          }} />
          <Typography variant="h6"> {MagicBoxTitle} </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
        <Grid container spacing={2}
            style={{ marginTop: "30px", padding: "30px" }}>

          {/* Magic Box Input */}
          <Grid item xs={12} sm={12} md={6} >
            <TextField
              name="magicInput"
              multiline
              autoFocus={true}
              fullWidth={true}
              rows={7}
              onChange={(e) => { setUserInput(e.target.value) }}
              style={{ fontSize: "1.25rem" }} // this style attr not work
              variant={"outlined"}
            />
          </Grid>

          {/* Magic Box Output */}
          <MagicBox in={magicIn} />

        </Grid>
      </Container>


      <AppBar position="fixed" style={{
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
      
    </MuiThemeProvider>
    
  )
}

export default injectIntl(MagicBoxPage)
