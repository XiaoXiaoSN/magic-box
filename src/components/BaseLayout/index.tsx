import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  AppBar, Box, IconButton, Toolbar, Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';

import type React from 'react';

const MagicBoxTitle = 'Magic Box';

const theme = createTheme({
  // Add any custom theme configuration here
  palette: {
    text: {
      secondary: 'rgba(0, 0, 0, 0.5)', // Lighter secondary text color
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'white',
          color: 'inherit',
        },
      },
    },
  },
});

interface Props {
  children: React.ReactNode;
}

const BaseLayout = ({ children }: Props) : React.JSX.Element=> {
  return (
  <ThemeProvider theme={theme}>
    <AppBar
      data-testid="header"
      position="static"
      sx={{
        color: theme.palette.text.secondary,
        borderBottom: '1px solid #cdc9c3',
        height: '65px',
        justifyContent: 'center',
      }}
    >
      <Toolbar>
        <Link style={{ alignItems: 'center', color: 'inherit', display: 'flex', textDecoration: 'none' }} to="/">
          <img
            alt="icon"
            crossOrigin="use-credentials"
            height="50px"
            loading="lazy"
            src="/images/logo-128.png"
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
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton color="inherit" component={Link} to="/list">
          <FormatListBulletedIcon />
        </IconButton>
        <IconButton color="inherit" component={Link} to="/settings">
          <SettingsIcon />
        </IconButton>
      </Toolbar>
    </AppBar>

    {children}

    <AppBar
      data-testid="footer"
      position="fixed"
      sx={{
        top: 'auto',
        bottom: 0,
        color: theme.palette.text.secondary,
        borderBottom: '1px solid #cdc9c3',
        padding: '0.2rem',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      {`© ${new Date().getFullYear()} Copyright: All Rights Reserved`}
    </AppBar>
  </ThemeProvider>
  );
};

export default BaseLayout;
