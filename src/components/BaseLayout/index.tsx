import {
  AppBar, Toolbar, Typography,
} from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/styles';
import React from 'react';

const MagicBoxTitle = 'Magic Box';

const theme = createTheme({});

interface Props {
  children: React.ReactNode,
}

const BaseLayout = ({ children }: Props) => (
  <ThemeProvider theme={theme}>
    <AppBar
      position="static"
      sx={{
        color: theme.palette.text.secondary,
        backgroundColor: 'white',
        borderBottom: '1px solid #cdc9c3',
        height: '65px',
      }}
    >
      <Toolbar>
        <img
          src="/images/logo-50.png"
          alt="icon"
          style={{
            height: '50px',
            paddingRight: '10px',
          }}
        />
        <Typography variant="h6">
          {MagicBoxTitle}
        </Typography>
      </Toolbar>
    </AppBar>

    { children }

    <AppBar
      position="fixed"
      sx={{
        top: 'auto',
        bottom: 0,
        color: theme.palette.text.secondary,
        backgroundColor: 'white',
        borderBottom: '1px solid #cdc9c3',
        padding: '0.2rem',
      }}
    >
      {`© ${new Date().getFullYear()} Copyright: All Rights Not Reserved`}
    </AppBar>

  </ThemeProvider>
);

export default BaseLayout;
