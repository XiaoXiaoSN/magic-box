/* eslint-disable */
import React, { } from 'react'
import { injectIntl } from 'react-intl'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
import { makeStyles } from '@material-ui/core/styles';
import { Container, Grid, TextField, AppBar, Toolbar, Typography, Paper } from '@material-ui/core'

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
          <Typography variant="h6"> Magic Box </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
        <Grid container spacing={2}
            style={{ marginTop: "30px", padding: "30px" }}>

          {/* Magic Box Output */}
          <PasteBox in={magicIn} />

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

const PasteBox = ({props}) => {
  let boxStyles = makeStyles((theme) => ({
    grid: {
      marginBottom: '.45rem',
    },
    paper: {
      padding: theme.spacing(2),
      color: theme.palette.text.secondary,
      border: '1px solid #cdc9c3',
      borderRadius: '5px',
    },
    paperTypography: {
      textAlign: 'center',
      overflow: 'auto',
    },
    alignCenter: {
      textAlign: 'center',
      overflow: 'auto',
    },
  }));
  const classes = boxStyles();

  return (
    <Grid item xs={12} sm={12}>
      <Paper elevation={3} className={classes.paper}>
        <Typography className={classes.paperTypography}> 
          { "nothing match" }
        </Typography>
      </Paper>
    </Grid>
  );
}

export default injectIntl(MagicBoxPage)
