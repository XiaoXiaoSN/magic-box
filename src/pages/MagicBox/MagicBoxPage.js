/* eslint-disable */
import React, { } from 'react'
import { injectIntl } from 'react-intl'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
import { Container, Grid, TextField } from '@material-ui/core'
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
  const [magicIn, setMagicIn] = React.useState('')

  return (
    <MuiThemeProvider theme={theme}>
      <Container >

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
              onChange={(e) => { setMagicIn(e.target.value) }}
              style={{ fontSize: "1.25rem" }} // this style attr not work
              variant={"outlined"}
            />
          </Grid>

          {/* Magic Box Output */}
          <MagicBox in={magicIn} />

        </Grid>
      </Container>
    </MuiThemeProvider>
    
  )
}

export default injectIntl(MagicBoxPage)
