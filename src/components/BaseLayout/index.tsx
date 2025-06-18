import {
  AppBar, Toolbar, Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
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
        justifyContent: 'center',
      }}
      data-testid="header"
    >
      <Toolbar>
        {/* NOTE: I used a larger size logo
              since lighthouse say Serves images with low resolution */}
        <img
          src="/images/logo-128.png"
          alt="icon"
          crossOrigin="use-credentials"
          loading="lazy"
          height="50px"
          width="50px"
        />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            marginLeft: '10px',
          }}
        >
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
      data-testid="footer"
    >
      {`© ${new Date().getFullYear()} Copyright: All Rights Reserved`}
    </AppBar>

  </ThemeProvider>
);

export default BaseLayout;
