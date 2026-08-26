import { applyThemeMode, token } from '@global/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useEffect, useMemo } from 'react';
import useResolvedTheme from '../../hooks/useResolvedTheme';

// keep the browser chrome (mobile address bar, PWA status bar) in step with the
// page background instead of the static value baked into index.html.
const syncThemeColorMeta = (color: string): void => {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (meta) meta.content = color;
};

interface Props {
  children: React.ReactNode;
}

/**
 * Bridges the CSS design tokens into MUI. Without a ThemeProvider every MUI
 * surface (Snackbar, Alert, Modal, Button, CircularProgress) renders against
 * MUI's built-in light palette regardless of the app theme.
 */
const AppThemeProvider = ({ children }: Props): React.JSX.Element => {
  const mode = useResolvedTheme();

  useEffect(() => {
    applyThemeMode(mode);
    syncThemeColorMeta(token(mode, '--bg'));
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: token(mode, '--accent'),
            dark: token(mode, '--accent-ink'),
            contrastText: token(mode, '--on-accent'),
          },
          error: { main: token(mode, '--danger') },
          success: { main: token(mode, '--success') },
          divider: token(mode, '--line'),
          background: {
            default: token(mode, '--bg'),
            paper: token(mode, '--bg-elev'),
          },
          text: {
            primary: token(mode, '--ink'),
            secondary: token(mode, '--ink-3'),
            disabled: token(mode, '--ink-4'),
          },
        },
        typography: {
          fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }),
    [mode],
  );

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstart an elegant, consistent, and simple baseline to
          build upon. It must sit inside ThemeProvider so its body reset uses
          the resolved palette rather than MUI's light default. */}
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default AppThemeProvider;
